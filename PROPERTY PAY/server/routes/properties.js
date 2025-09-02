const express = require('express');
const { body, validationResult } = require('express-validator');
const { db } = require('../database/init');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all properties (for landlords/managers)
router.get('/', authenticateToken, authorizeRole(['landlord', 'property_manager']), (req, res) => {
  const { userId, role } = req.user;
  
  let query = `
    SELECT p.*, u.first_name as owner_name, u.last_name as owner_last_name,
           COUNT(units.id) as total_units,
           COUNT(CASE WHEN units.status = 'occupied' THEN 1 END) as occupied_units
    FROM properties p
    LEFT JOIN users u ON p.owner_id = u.id
    LEFT JOIN units ON p.id = units.property_id
  `;
  
  const params = [];
  
  if (role === 'landlord') {
    query += ' WHERE p.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' WHERE p.manager_id = ?';
    params.push(userId);
  }
  
  query += ' GROUP BY p.id ORDER BY p.created_at DESC';
  
  db.all(query, params, (err, properties) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(properties);
  });
});

// Get single property
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.user;
  
  let query = `
    SELECT p.*, u.first_name as owner_name, u.last_name as owner_last_name
    FROM properties p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `;
  
  const params = [id];
  
  if (role === 'landlord') {
    query += ' AND p.owner_id = ?';
    params.push(userId);
  } else if (role === 'property_manager') {
    query += ' AND p.manager_id = ?';
    params.push(userId);
  }
  
  db.get(query, params, (err, property) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Get units for this property
    db.all('SELECT * FROM units WHERE property_id = ? ORDER BY unit_number', [id], (err, units) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      
      res.json({ ...property, units });
    });
  });
});

// Create new property
router.post('/', authenticateToken, authorizeRole(['landlord', 'property_manager']), [
  body('name').notEmpty().trim(),
  body('address').notEmpty().trim(),
  body('city').notEmpty().trim(),
  body('state').notEmpty().trim(),
  body('zipCode').notEmpty().trim(),
  body('propertyType').isIn(['apartment', 'house', 'condo', 'townhouse', 'commercial']),
  body('totalUnits').isInt({ min: 1 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, address, city, state, zipCode, propertyType, totalUnits } = req.body;
    const { userId, role } = req.user;
    
    const ownerId = role === 'landlord' ? userId : req.body.ownerId;
    const managerId = role === 'property_manager' ? userId : null;
    
    if (!ownerId && role === 'property_manager') {
      return res.status(400).json({ message: 'Owner ID required for property managers' });
    }

    db.run(
      `INSERT INTO properties (name, address, city, state, zip_code, property_type, total_units, owner_id, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, address, city, state, zipCode, propertyType, totalUnits, ownerId, managerId],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to create property' });
        }

        res.status(201).json({
          message: 'Property created successfully',
          propertyId: this.lastID
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update property
router.put('/:id', authenticateToken, authorizeRole(['landlord', 'property_manager']), [
  body('name').optional().notEmpty().trim(),
  body('address').optional().notEmpty().trim(),
  body('city').optional().notEmpty().trim(),
  body('state').optional().notEmpty().trim(),
  body('zipCode').optional().notEmpty().trim(),
  body('propertyType').optional().isIn(['apartment', 'house', 'condo', 'townhouse', 'commercial']),
  body('totalUnits').optional().isInt({ min: 1 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { userId, role } = req.user;
    const updates = [];
    const values = [];

    // Check if user has permission to update this property
    let checkQuery = 'SELECT owner_id, manager_id FROM properties WHERE id = ?';
    const checkParams = [id];
    
    if (role === 'landlord') {
      checkQuery += ' AND owner_id = ?';
      checkParams.push(userId);
    } else if (role === 'property_manager') {
      checkQuery += ' AND manager_id = ?';
      checkParams.push(userId);
    }

    db.get(checkQuery, checkParams, (err, property) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!property) {
        return res.status(404).json({ message: 'Property not found or access denied' });
      }

      // Build update query
      const { name, address, city, state, zipCode, propertyType, totalUnits } = req.body;

      if (name) {
        updates.push('name = ?');
        values.push(name);
      }
      if (address) {
        updates.push('address = ?');
        values.push(address);
      }
      if (city) {
        updates.push('city = ?');
        values.push(city);
      }
      if (state) {
        updates.push('state = ?');
        values.push(state);
      }
      if (zipCode) {
        updates.push('zip_code = ?');
        values.push(zipCode);
      }
      if (propertyType) {
        updates.push('property_type = ?');
        values.push(propertyType);
      }
      if (totalUnits) {
        updates.push('total_units = ?');
        values.push(totalUnits);
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `UPDATE properties SET ${updates.join(', ')} WHERE id = ?`;
      
      db.run(query, values, function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to update property' });
        }

        res.json({ message: 'Property updated successfully' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete property
router.delete('/:id', authenticateToken, authorizeRole(['landlord']), (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;

  // Check if property exists and user owns it
  db.get('SELECT id FROM properties WHERE id = ? AND owner_id = ?', [id, userId], (err, property) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!property) {
      return res.status(404).json({ message: 'Property not found or access denied' });
    }

    // Check if property has active leases
    db.get('SELECT COUNT(*) as count FROM leases l JOIN units u ON l.unit_id = u.id WHERE u.property_id = ? AND l.status = "active"', 
      [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (result.count > 0) {
        return res.status(400).json({ message: 'Cannot delete property with active leases' });
      }

      // Delete property (cascade will handle units)
      db.run('DELETE FROM properties WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to delete property' });
        }

        res.json({ message: 'Property deleted successfully' });
      });
    });
  });
});

// Get units for a property
router.get('/:id/units', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { userId, role } = req.user;

  // Check if user has access to this property
  let accessQuery = 'SELECT id FROM properties WHERE id = ?';
  const accessParams = [id];
  
  if (role === 'landlord') {
    accessQuery += ' AND owner_id = ?';
    accessParams.push(userId);
  } else if (role === 'property_manager') {
    accessQuery += ' AND manager_id = ?';
    accessParams.push(userId);
  }

  db.get(accessQuery, accessParams, (err, property) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!property) {
      return res.status(404).json({ message: 'Property not found or access denied' });
    }

    // Get units with lease information
    const query = `
      SELECT u.*, l.id as lease_id, l.tenant_id, l.status as lease_status,
             t.first_name as tenant_first_name, t.last_name as tenant_last_name
      FROM units u
      LEFT JOIN leases l ON u.id = l.unit_id AND l.status = 'active'
      LEFT JOIN users t ON l.tenant_id = t.id
      WHERE u.property_id = ?
      ORDER BY u.unit_number
    `;

    db.all(query, [id], (err, units) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(units);
    });
  });
});

module.exports = router;
