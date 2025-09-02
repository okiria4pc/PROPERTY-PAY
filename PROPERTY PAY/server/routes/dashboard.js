const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get dashboard data based on user role
router.get('/', authenticateToken, (req, res) => {
  const { userId, role } = req.user;

  if (role === 'tenant') {
    getTenantDashboard(userId, res);
  } else if (role === 'landlord') {
    getLandlordDashboard(userId, res);
  } else if (role === 'property_manager') {
    getPropertyManagerDashboard(userId, res);
  } else {
    res.status(403).json({ message: 'Invalid user role' });
  }
});

function getTenantDashboard(userId, res) {
  // Get tenant's active lease
  const leaseQuery = `
    SELECT l.*, u.unit_number, u.bedrooms, u.bathrooms, u.square_feet,
           p.name as property_name, p.address as property_address
    FROM leases l
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    WHERE l.tenant_id = ? AND l.status = 'active'
    ORDER BY l.start_date DESC
    LIMIT 1
  `;

  db.get(leaseQuery, [userId], (err, activeLease) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!activeLease) {
      return res.json({
        activeLease: null,
        recentPayments: [],
        upcomingPayments: [],
        maintenanceRequests: [],
        notifications: []
      });
    }

    // Get recent payments
    const paymentsQuery = `
      SELECT p.*, l.id as lease_id
      FROM payments p
      JOIN leases l ON p.lease_id = l.id
      WHERE l.tenant_id = ? AND l.id = ?
      ORDER BY p.payment_date DESC
      LIMIT 5
    `;

    // Get upcoming payments (next 3 months)
    const upcomingQuery = `
      SELECT 
        date(l.start_date, '+' || (strftime('%m', 'now') - strftime('%m', l.start_date) + 
        CASE WHEN strftime('%d', 'now') > strftime('%d', l.start_date) THEN 1 ELSE 0 END) || ' months') as due_date,
        l.monthly_rent as amount,
        'rent' as payment_type
      FROM leases l
      WHERE l.tenant_id = ? AND l.status = 'active'
      AND date(l.start_date, '+' || (strftime('%m', 'now') - strftime('%m', l.start_date) + 
        CASE WHEN strftime('%d', 'now') > strftime('%d', l.start_date) THEN 1 ELSE 0 END) || ' months') 
        BETWEEN date('now') AND date('now', '+3 months')
    `;

    // Get recent maintenance requests
    const maintenanceQuery = `
      SELECT mr.*, u.unit_number, p.name as property_name
      FROM maintenance_requests mr
      JOIN units u ON mr.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE mr.tenant_id = ?
      ORDER BY mr.created_at DESC
      LIMIT 5
    `;

    // Get notifications
    const notificationsQuery = `
      SELECT * FROM notifications
      WHERE user_id = ? AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 10
    `;

    db.all(paymentsQuery, [userId, activeLease.id], (err, recentPayments) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.all(upcomingQuery, [userId], (err, upcomingPayments) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        db.all(maintenanceQuery, [userId], (err, maintenanceRequests) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          db.all(notificationsQuery, [userId], (err, notifications) => {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }

            res.json({
              activeLease,
              recentPayments,
              upcomingPayments,
              maintenanceRequests,
              notifications
            });
          });
        });
      });
    });
  });
}

function getLandlordDashboard(userId, res) {
  // Get properties summary
  const propertiesQuery = `
    SELECT 
      COUNT(*) as total_properties,
      SUM(total_units) as total_units,
      COUNT(CASE WHEN p.id IN (SELECT DISTINCT property_id FROM units WHERE status = 'occupied') THEN 1 END) as occupied_properties
    FROM properties p
    WHERE p.owner_id = ?
  `;

  // Get units summary
  const unitsQuery = `
    SELECT 
      COUNT(*) as total_units,
      COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_units,
      COUNT(CASE WHEN status = 'available' THEN 1 END) as available_units,
      COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_units
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.owner_id = ?
  `;

  // Get recent payments
  const paymentsQuery = `
    SELECT p.*, l.id as lease_id,
           u.unit_number, prop.name as property_name,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name
    FROM payments p
    JOIN leases l ON p.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    JOIN users t ON l.tenant_id = t.id
    WHERE prop.owner_id = ?
    ORDER BY p.payment_date DESC
    LIMIT 10
  `;

  // Get pending maintenance requests
  const maintenanceQuery = `
    SELECT mr.*, u.unit_number, prop.name as property_name,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name
    FROM maintenance_requests mr
    JOIN units u ON mr.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    JOIN users t ON mr.tenant_id = t.id
    WHERE prop.owner_id = ? AND mr.status IN ('open', 'in_progress')
    ORDER BY mr.priority DESC, mr.created_at DESC
    LIMIT 10
  `;

  // Get monthly revenue
  const revenueQuery = `
    SELECT 
      strftime('%Y-%m', payment_date) as month,
      SUM(amount) as total
    FROM payments p
    JOIN leases l ON p.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    WHERE prop.owner_id = ? AND p.status = 'completed'
    AND payment_date >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', payment_date)
    ORDER BY month DESC
  `;

  db.get(propertiesQuery, [userId], (err, propertiesSummary) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    db.get(unitsQuery, [userId], (err, unitsSummary) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.all(paymentsQuery, [userId], (err, recentPayments) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        db.all(maintenanceQuery, [userId], (err, pendingMaintenance) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          db.all(revenueQuery, [userId], (err, monthlyRevenue) => {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }

            res.json({
              propertiesSummary,
              unitsSummary,
              recentPayments,
              pendingMaintenance,
              monthlyRevenue
            });
          });
        });
      });
    });
  });
}

function getPropertyManagerDashboard(userId, res) {
  // Get managed properties summary
  const propertiesQuery = `
    SELECT 
      COUNT(*) as total_properties,
      SUM(total_units) as total_units,
      COUNT(CASE WHEN p.id IN (SELECT DISTINCT property_id FROM units WHERE status = 'occupied') THEN 1 END) as occupied_properties
    FROM properties p
    WHERE p.manager_id = ?
  `;

  // Get units summary
  const unitsQuery = `
    SELECT 
      COUNT(*) as total_units,
      COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_units,
      COUNT(CASE WHEN status = 'available' THEN 1 END) as available_units,
      COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_units
    FROM units u
    JOIN properties p ON u.property_id = p.id
    WHERE p.manager_id = ?
  `;

  // Get recent payments
  const paymentsQuery = `
    SELECT p.*, l.id as lease_id,
           u.unit_number, prop.name as property_name,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name
    FROM payments p
    JOIN leases l ON p.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    JOIN users t ON l.tenant_id = t.id
    WHERE prop.manager_id = ?
    ORDER BY p.payment_date DESC
    LIMIT 10
  `;

  // Get pending maintenance requests
  const maintenanceQuery = `
    SELECT mr.*, u.unit_number, prop.name as property_name,
           t.first_name as tenant_first_name, t.last_name as tenant_last_name
    FROM maintenance_requests mr
    JOIN units u ON mr.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    JOIN users t ON mr.tenant_id = t.id
    WHERE prop.manager_id = ? AND mr.status IN ('open', 'in_progress')
    ORDER BY mr.priority DESC, mr.created_at DESC
    LIMIT 10
  `;

  // Get monthly revenue
  const revenueQuery = `
    SELECT 
      strftime('%Y-%m', payment_date) as month,
      SUM(amount) as total
    FROM payments p
    JOIN leases l ON p.lease_id = l.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties prop ON u.property_id = prop.id
    WHERE prop.manager_id = ? AND p.status = 'completed'
    AND payment_date >= date('now', '-12 months')
    GROUP BY strftime('%Y-%m', payment_date)
    ORDER BY month DESC
  `;

  db.get(propertiesQuery, [userId], (err, propertiesSummary) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    db.get(unitsQuery, [userId], (err, unitsSummary) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      db.all(paymentsQuery, [userId], (err, recentPayments) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        db.all(maintenanceQuery, [userId], (err, pendingMaintenance) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }

          db.all(revenueQuery, [userId], (err, monthlyRevenue) => {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }

            res.json({
              propertiesSummary,
              unitsSummary,
              recentPayments,
              pendingMaintenance,
              monthlyRevenue
            });
          });
        });
      });
    });
  });
}

module.exports = router;
