const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'okiria.db');
const db = new sqlite3.Database(dbPath);

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table (landlords, property managers, tenants)
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT,
          role TEXT NOT NULL CHECK(role IN ('landlord', 'property_manager', 'tenant')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Properties table
      db.run(`
        CREATE TABLE IF NOT EXISTS properties (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          city TEXT NOT NULL,
          state TEXT NOT NULL,
          zip_code TEXT NOT NULL,
          property_type TEXT NOT NULL CHECK(property_type IN ('apartment', 'house', 'condo', 'townhouse', 'commercial')),
          total_units INTEGER DEFAULT 1,
          owner_id INTEGER NOT NULL,
          manager_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users (id),
          FOREIGN KEY (manager_id) REFERENCES users (id)
        )
      `);

      // Units table
      db.run(`
        CREATE TABLE IF NOT EXISTS units (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER NOT NULL,
          unit_number TEXT NOT NULL,
          bedrooms INTEGER NOT NULL,
          bathrooms REAL NOT NULL,
          square_feet INTEGER,
          rent_amount DECIMAL(10,2) NOT NULL,
          deposit_amount DECIMAL(10,2) DEFAULT 0,
          status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'maintenance', 'renovation')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (property_id) REFERENCES properties (id)
        )
      `);

      // Leases table
      db.run(`
        CREATE TABLE IF NOT EXISTS leases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          unit_id INTEGER NOT NULL,
          tenant_id INTEGER NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          monthly_rent DECIMAL(10,2) NOT NULL,
          deposit_amount DECIMAL(10,2) NOT NULL,
          lease_terms TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'terminated')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (unit_id) REFERENCES units (id),
          FOREIGN KEY (tenant_id) REFERENCES users (id)
        )
      `);

      // Payments table
      db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lease_id INTEGER NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          payment_type TEXT NOT NULL CHECK(payment_type IN ('rent', 'deposit', 'late_fee', 'maintenance', 'other')),
          payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'online')),
          payment_date DATE NOT NULL,
          due_date DATE,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
          transaction_id TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (lease_id) REFERENCES leases (id)
        )
      `);

      // Maintenance requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS maintenance_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          unit_id INTEGER NOT NULL,
          tenant_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'emergency')),
          status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'completed', 'cancelled')),
          estimated_cost DECIMAL(10,2),
          actual_cost DECIMAL(10,2),
          assigned_to INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (unit_id) REFERENCES units (id),
          FOREIGN KEY (tenant_id) REFERENCES users (id),
          FOREIGN KEY (assigned_to) REFERENCES users (id)
        )
      `);

      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('payment', 'maintenance', 'lease', 'general')),
          is_read BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_payments_lease ON payments(lease_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_maintenance_unit ON maintenance_requests(unit_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);

      console.log('Database initialized successfully');
      resolve();
    });
  });
};

module.exports = { db, initializeDatabase };
