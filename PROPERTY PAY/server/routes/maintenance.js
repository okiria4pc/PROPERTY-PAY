const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get maintenance requests (filtered by user role)
router.get('/', authenticateToken, (req, res) => {
  const { userId, role } = req.user;
  const { status, priority, propertyId } = req.query;

  let query = `
    SELECT mr.*, u.unit_number, p.name as property_name, p.address as property_address,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name,
           a.first_name as assigned_first_name, a.last_name as assigned_last_name
    FROM maintenance_requests mr
    JOIN units u ON mr.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN users t ON mr.tenant_id = t.id
    LEFT JOIN users a ON mr.assigned_to = a.id
    WHERE 1=1
  `;

  const params = [];

  // Filter by user role
  if (role === 'tenant') {
    query += ' AND mr.tenant_id = ?';
    params.push(userId);
  } else if (role === 'landlord') {
    query += ' AND p.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' AND p.manager_id = ?';
    params.push(userId);
  }

  // Additional filters
  if (status) {
    query += ' AND mr.status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND mr.priority = ?';
    params.push(priority);
  }

  if (propertyId) {
    query += ' AND p.id = ?';
    params.push(propertyId);
  }

  query += ' ORDER BY mr.priority DESC, mr.created_at DESC';

  db.all(query, params, (err, requests) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(requests);
  });
});

// Get single maintenance request
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.user;

  let query = `
    SELECT mr.*, u.unit_number, p.name as property_name, p.address as property_address,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name,
           a.first_name as assigned_first_name, a.last_name as assigned_last_name
    FROM maintenance_requests mr
    JOIN units u ON mr.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN users t ON mr.tenant_id = t.id
    LEFT JOIN users a ON mr.assigned_to = a.id
    WHERE mr.id = ?
  `;

  const params = [id];

  // Filter by user role
  if (role === 'tenant') {
    query += ' AND mr.tenant_id = ?';
    params.push(userId);
  } else if (role === 'landlord') {
    query += ' AND p.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' AND p.manager_id = ?';
    params.push(userId);
  }

  db.get(query, params, (err, request) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    res.json(request);
  });
});

// Update maintenance request (for landlords/managers)
router.put('/:id', authenticateToken, authorizeRole(['landlord', 'property_manager']), [
  body('status').optional().isIn(['open', 'in_progress', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'emergency']),
  body('estimatedCost').optional().isDecimal(),
  body('actualCost').optional().isDecimal(),
  body('assignedTo').optional().isInt()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, priority, estimatedCost, actualCost, assignedTo } = req.body;
    const { userId, role } = req.user;

    // Verify request exists and user has access
    let requestQuery = `
      SELECT mr.id, prop.owner_id, prop.manager_id
      FROM maintenance_requests mr
      JOIN units u ON mr.unit_id = u.id
      JOIN properties prop ON u.property_id = prop.id
      WHERE mr.id = ?
    `;

    const requestParams = [id];

    if (role === 'landlord') {
      requestQuery += ' AND prop.owner_id = ?';
      requestParams.push(userId);
    } else if (role === 'property_manager') {
      requestQuery += ' AND prop.manager_id = ?';
      requestParams.push(userId);
    }

    db.get(requestQuery, requestParams, (err, request) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!request) {
        return res.status(404).json({ message: 'Maintenance request not found or access denied' });
      }

      // Build update query
      const updates = [];
      const values = [];

      if (status) {
        updates.push('status = ?');
        values.push(status);
      }
      if (priority) {
        updates.push('priority = ?');
        values.push(priority);
      }
      if (estimatedCost !== undefined) {
        updates.push('estimated_cost = ?');
        values.push(estimatedCost);
      }
      if (actualCost !== undefined) {
        updates.push('actual_cost = ?');
        values.push(actualCost);
      }
      if (assignedTo) {
        updates.push('assigned_to = ?');
        values.push(assignedTo);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `UPDATE maintenance_requests SET ${updates.join(', ')} WHERE id = ?`;

      db.run(query, values, function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to update maintenance request' });
        }

        res.json({ message: 'Maintenance request updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get maintenance statistics
router.get('/stats/summary', authenticateToken, authorizeRole(['landlord', 'property_manager']), (req, res) => {
  const { userId, role } = req.user;
  const { startDate, endDate } = req.query;

  let baseQuery = `
    FROM maintenance_requests mr
    JOIN units u ON mr.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    WHERE 1=1
  `;

  const params = [];

  // Filter by user role
  if (role === 'landlord') {
    baseQuery += ' AND prop.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    baseQuery += ' AND prop.manager_id = ?';
    params.push(userId);
  }

  if (startDate) {
    baseQuery += ' AND mr.created_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    baseQuery += ' AND mr.created_at <= ?';
    params.push(endDate);
  }

  // Get total requests
  const totalQuery = `SELECT COUNT(*) as total ${baseQuery}`;
  
  // Get requests by status
  const statusQuery = `
    SELECT status, COUNT(*) as count 
    ${baseQuery} 
    GROUP BY status
  `;

  // Get requests by priority
  const priorityQuery = `
    SELECT priority, COUNT(*) as count 
    ${baseQuery} 
    GROUP BY priority
  `;

  // Get average completion time
  const completionQuery = `
    SELECT AVG(julianday(updated_at) - julianday(created_at)) as avg_days
    ${baseQuery} 
    AND status = 'completed'
  `;

  // Get total costs
  const costQuery = `
    SELECT 
      COALESCE(SUM(estimated_cost), 0) as total_estimated,
      COALESCE(SUM(actual_cost), 0) as total_actual
    ${baseQuery}
  `;

  db.get(totalQuery, params, (err, totalResult) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    db.all(statusQuery, params, (err, statusResults) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.all(priorityQuery, params, (err, priorityResults) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        db.get(completionQuery, params, (err, completionResult) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          db.get(costQuery, params, (err, costResult) => {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }

            res.json({
              totalRequests: totalResult.total,
              byStatus: statusResults,
              byPriority: priorityResults,
              averageCompletionDays: completionResult.avg_days || 0,
              totalEstimatedCost: costResult.total_estimated,
              totalActualCost: costResult.total_actual
            });
          });
        });
      });
    });
  });
});

module.exports = router;
