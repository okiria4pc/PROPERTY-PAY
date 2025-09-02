const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get payments (filtered by user role)
router.get('/', authenticateToken, (req, res) => {
  const { userId, role } = req.user;
  const { leaseId, status, startDate, endDate } = req.query;

  let query = `
    SELECT p.*, l.id as lease_id, l.monthly_rent,
           u.unit_number, prop.name as property_name, prop.address as property_address,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name
    FROM payments p
    JOIN leases l ON p.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    JOIN users t ON l.tenant_id = t.id
    WHERE 1=1
  `;

  const params = [];

  // Filter by user role
  if (role === 'tenant') {
    query += ' AND l.tenant_id = ?';
    params.push(userId);
  } else if (role === 'landlord') {
    query += ' AND prop.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' AND prop.manager_id = ?';
    params.push(userId);
  }

  // Additional filters
  if (leaseId) {
    query += ' AND p.lease_id = ?';
    params.push(leaseId);
  }

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  if (startDate) {
    query += ' AND p.payment_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND p.payment_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY p.payment_date DESC';

  db.all(query, params, (err, payments) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(payments);
  });
});

// Get single payment
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.user;

  let query = `
    SELECT p.*, l.id as lease_id, l.monthly_rent,
           u.unit_number, prop.name as property_name, prop.address as property_address,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name
    FROM payments p
    JOIN leases l ON p.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    JOIN users t ON l.tenant_id = t.id
    WHERE p.id = ?
  `;

  const params = [id];

  // Filter by user role
  if (role === 'tenant') {
    query += ' AND l.tenant_id = ?';
    params.push(userId);
  } else if (role === 'landlord') {
    query += ' AND prop.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' AND prop.manager_id = ?';
    params.push(userId);
  }

  db.get(query, params, (err, payment) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json(payment);
  });
});

// Create new payment
router.post('/', authenticateToken, [
  body('leaseId').isInt(),
  body('amount').isDecimal(),
  body('paymentType').isIn(['rent', 'deposit', 'late_fee', 'maintenance', 'other']),
  body('paymentMethod').isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'online']),
  body('paymentDate').isISO8601()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { leaseId, amount, paymentType, paymentMethod, paymentDate, dueDate, notes } = req.body;
    const { userId, role } = req.user;

    // Verify lease exists and user has access
    let leaseQuery = `
      SELECT l.id, l.tenant_id, l.monthly_rent,
             prop.owner_id, prop.manager_id
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties prop ON u.property_id = prop.id
      WHERE l.id = ? AND l.status = 'active'
    `;

    const leaseParams = [leaseId];

    if (role === 'tenant') {
      leaseQuery += ' AND l.tenant_id = ?';
      leaseParams.push(userId);
    } else if (role === 'landlord') {
      leaseQuery += ' AND prop.owner_id = ?';
      leaseParams.push(userId);
    } else if (role === 'property_manager') {
      leaseQuery += ' AND prop.manager_id = ?';
      leaseParams.push(userId);
    }

    db.get(leaseQuery, leaseParams, (err, lease) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!lease) {
        return res.status(404).json({ message: 'Lease not found or access denied' });
      }

      // Create payment
      db.run(
        `INSERT INTO payments (lease_id, amount, payment_type, payment_method, payment_date, due_date, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [leaseId, amount, paymentType, paymentMethod, paymentDate, dueDate, notes],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Failed to create payment' });
          }

          res.status(201).json({
            message: 'Payment created successfully',
            paymentId: this.lastID
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment status
router.put('/:id/status', authenticateToken, authorizeRole(['landlord', 'property_manager']), [
  body('status').isIn(['pending', 'completed', 'failed', 'refunded']),
  body('transactionId').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, transactionId } = req.body;
    const { userId, role } = req.user;

    // Verify payment exists and user has access
    let paymentQuery = `
      SELECT p.id, prop.owner_id, prop.manager_id
      FROM payments p
      JOIN leases l ON p.lease_id = l.id
      JOIN units u ON l.unit_id = u.id
      JOIN properties prop ON u.property_id = prop.id
      WHERE p.id = ?
    `;

    const paymentParams = [id];

    if (role === 'landlord') {
      paymentQuery += ' AND prop.owner_id = ?';
      paymentParams.push(userId);
    } else if (role === 'property_manager') {
      paymentQuery += ' AND prop.manager_id = ?';
      paymentParams.push(userId);
    }

    db.get(paymentQuery, paymentParams, (err, payment) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found or access denied' });
      }

      // Update payment
      const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
      const values = [status];

      if (transactionId) {
        updates.push('transaction_id = ?');
        values.push(transactionId);
      }

      values.push(id);

      const query = `UPDATE payments SET ${updates.join(', ')} WHERE id = ?`;

      db.run(query, values, function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to update payment' });
        }

        res.json({ message: 'Payment status updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get payment statistics
router.get('/stats/summary', authenticateToken, (req, res) => {
  const { userId, role } = req.user;
  const { startDate, endDate } = req.query;

  let baseQuery = `
    FROM payments p
    JOIN leases l ON p.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    WHERE p.status = 'completed'
  `;

  const params = [];

  // Filter by user role
  if (role === 'tenant') {
    baseQuery += ' AND l.tenant_id = ?';
    params.push(userId);
  } else if (role === 'landlord') {
    baseQuery += ' AND prop.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    baseQuery += ' AND prop.manager_id = ?';
    params.push(userId);
  }

  if (startDate) {
    baseQuery += ' AND p.payment_date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    baseQuery += ' AND p.payment_date <= ?';
    params.push(endDate);
  }

  // Get total collected
  const totalQuery = `SELECT COALESCE(SUM(amount), 0) as total ${baseQuery}`;
  
  // Get payments by type
  const typeQuery = `
    SELECT payment_type, COUNT(*) as count, SUM(amount) as total 
    ${baseQuery} 
    GROUP BY payment_type
  `;

  // Get monthly breakdown
  const monthlyQuery = `
    SELECT strftime('%Y-%m', payment_date) as month, 
           COUNT(*) as count, 
           SUM(amount) as total 
    ${baseQuery} 
    GROUP BY strftime('%Y-%m', payment_date) 
    ORDER BY month DESC 
    LIMIT 12
  `;

  db.get(totalQuery, params, (err, totalResult) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    db.all(typeQuery, params, (err, typeResults) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.all(monthlyQuery, params, (err, monthlyResults) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        res.json({
          totalCollected: totalResult.total,
          byType: typeResults,
          monthlyBreakdown: monthlyResults
        });
      });
    });
  });
});

module.exports = router;
