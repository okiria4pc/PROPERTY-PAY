const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all tenants (for landlords/managers)
router.get('/', authenticateToken, authorizeRole(['landlord', 'property_manager']), (req, res) => {
  const { userId, role } = req.user;
  
  let query = `
    SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at,
           COUNT(l.id) as active_leases,
           GROUP_CONCAT(DISTINCT p.name) as properties
    FROM users u
    JOIN leases l ON u.id = l.tenant_id
    JOIN units un ON l.unit_id = un.id
    JOIN properties p ON un.property_id = p.id
    WHERE u.role = 'tenant' AND l.status = 'active'
  `;
  
  const params = [];
  
  if (role === 'landlord') {
    query += ' AND p.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' AND p.manager_id = ?';
    params.push(userId);
  }
  
  query += ' GROUP BY u.id ORDER BY u.last_name, u.first_name';
  
  db.all(query, params, (err, tenants) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(tenants);
  });
});

// Get single tenant details
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.user;

  // Check if user has access to this tenant
  if (role === 'tenant' && parseInt(id) !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Get tenant basic info
  db.get('SELECT id, email, first_name, last_name, phone, created_at FROM users WHERE id = ? AND role = "tenant"', 
    [id], (err, tenant) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Get tenant's leases
    const leaseQuery = `
      SELECT l.*, u.unit_number, u.bedrooms, u.bathrooms, u.square_feet,
             p.name as property_name, p.address as property_address
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE l.tenant_id = ?
      ORDER BY l.start_date DESC
    `;

    db.all(leaseQuery, [id], (err, leases) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Get recent payments
      const paymentQuery = `
        SELECT p.*, l.id as lease_id, u.unit_number, prop.name as property_name
        FROM payments p
        JOIN leases l ON p.lease_id = l.id
        JOIN units u ON l.unit_id = u.id
        JOIN properties prop ON u.property_id = prop.id
        WHERE l.tenant_id = ?
        ORDER BY p.payment_date DESC
        LIMIT 10
      `;

      db.all(paymentQuery, [id], (err, payments) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        res.json({
          ...tenant,
          leases,
          recentPayments: payments
        });
      });
    });
  });
});

// Create new lease
router.post('/:id/leases', authenticateToken, authorizeRole(['landlord', 'property_manager']), [
  body('unitId').isInt(),
  body('startDate').isISO8601(),
  body('endDate').isISO8601(),
  body('monthlyRent').isDecimal(),
  body('depositAmount').isDecimal()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: tenantId } = req.params;
    const { unitId, startDate, endDate, monthlyRent, depositAmount, leaseTerms } = req.body;
    const { userId, role } = req.user;

    // Verify tenant exists
    db.get('SELECT id FROM users WHERE id = ? AND role = "tenant"', [tenantId], (err, tenant) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      // Verify unit exists and user has access
      let unitQuery = `
        SELECT u.id, u.rent_amount, u.status, p.owner_id, p.manager_id
        FROM units u
        JOIN properties p ON u.property_id = p.id
        WHERE u.id = ?
      `;
      
      const unitParams = [unitId];
      
      if (role === 'landlord') {
        unitQuery += ' AND p.owner_id = ?';
        unitParams.push(userId);
      } else if (role === 'property_manager') {
        unitQuery += ' AND p.manager_id = ?';
        unitParams.push(userId);
      }

      db.get(unitQuery, unitParams, (err, unit) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (!unit) {
          return res.status(404).json({ message: 'Unit not found or access denied' });
        }

        if (unit.status !== 'available') {
          return res.status(400).json({ message: 'Unit is not available' });
        }

        // Check for overlapping leases
        db.get(`
          SELECT id FROM leases 
          WHERE unit_id = ? AND status = 'active' 
          AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))
        `, [unitId, startDate, startDate, endDate, endDate], (err, existingLease) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          if (existingLease) {
            return res.status(400).json({ message: 'Unit has overlapping lease' });
          }

          // Create lease
          db.run(
            `INSERT INTO leases (unit_id, tenant_id, start_date, end_date, monthly_rent, deposit_amount, lease_terms)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [unitId, tenantId, startDate, endDate, monthlyRent, depositAmount, leaseTerms],
            function(err) {
              if (err) {
                return res.status(500).json({ message: 'Failed to create lease' });
              }

              // Update unit status
              db.run('UPDATE units SET status = "occupied" WHERE id = ?', [unitId], (err) => {
                if (err) {
                  console.error('Failed to update unit status:', err);
                }

                // Create deposit payment record
                db.run(
                  `INSERT INTO payments (lease_id, amount, payment_type, payment_method, payment_date, status)
                   VALUES (?, ?, 'deposit', 'pending', ?, 'pending')`,
                  [this.lastID, depositAmount, startDate],
                  (err) => {
                    if (err) {
                      console.error('Failed to create deposit payment record:', err);
                    }

                    res.status(201).json({
                      message: 'Lease created successfully',
                      leaseId: this.lastID
                    });
                  }
                );
              });
            }
          );
        });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tenant's maintenance requests
router.get('/:id/maintenance', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.user;

  // Check access
  if (role === 'tenant' && parseInt(id) !== userId) {
    return res.status(403).json({ message: 'Access denied' });
  }

  let query = `
    SELECT mr.*, u.unit_number, p.name as property_name
    FROM maintenance_requests mr
    JOIN units u ON mr.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE mr.tenant_id = ?
  `;

  const params = [id];

  // For landlords/managers, check if they have access to the property
  if (role === 'landlord') {
    query += ' AND p.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' AND p.manager_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY mr.created_at DESC';

  db.all(query, params, (err, requests) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(requests);
  });
});

// Create maintenance request
router.post('/:id/maintenance', authenticateToken, [
  body('unitId').isInt(),
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'emergency'])
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id: tenantId } = req.params;
    const { unitId, title, description, priority = 'medium' } = req.body;
    const { userId, role } = req.user;

    // Verify tenant access
    if (role === 'tenant' && parseInt(tenantId) !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Verify unit belongs to tenant
    db.get(`
      SELECT l.id as lease_id
      FROM leases l
      JOIN units u ON l.unit_id = u.id
      WHERE l.tenant_id = ? AND u.id = ? AND l.status = 'active'
    `, [tenantId, unitId], (err, lease) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!lease) {
        return res.status(404).json({ message: 'Unit not found or not leased to tenant' });
      }

      // Create maintenance request
      db.run(
        `INSERT INTO maintenance_requests (unit_id, tenant_id, title, description, priority)
         VALUES (?, ?, ?, ?, ?)`,
        [unitId, tenantId, title, description, priority],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Failed to create maintenance request' });
          }

          res.status(201).json({
            message: 'Maintenance request created successfully',
            requestId: this.lastID
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
