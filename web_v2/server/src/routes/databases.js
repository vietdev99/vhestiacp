import express from 'express';
import fs from 'fs';
import path from 'path';
import { execHestia, execHestiaJson } from '../utils/hestia.js';

const router = express.Router();
const HESTIA = process.env.HESTIA || '/usr/local/hestia';

// Helper: Get user's databases from config file
function getUserDatabases(username, type) {
  try {
    const userDir = path.join(HESTIA, 'data/users', username);
    const configFile = path.join(userDir, `${type}.conf`);
    
    if (!fs.existsSync(configFile)) {
      return [];
    }
    
    const content = fs.readFileSync(configFile, 'utf8');
    const databases = [];
    
    content.split('\n').filter(line => line.trim()).forEach(line => {
      const db = {};
      // Parse KEY='value' format
      line.match(/(\w+)='([^']*)'/g)?.forEach(match => {
        const [key, value] = match.split('=');
        db[key] = value.replace(/'/g, '');
      });
      if (db.DB) {
        databases.push({
          database: db.DB,
          user: db.USER,
          host: db.HOST || 'localhost',
          port: db.PORT || (type === 'mongodb' ? '27017' : type === 'pgsql' ? '5432' : '3306'),
          instance: db.INSTANCE || 'default',
          date: db.DATE,
          type: db.TYPE || type
        });
      }
    });
    
    return databases;
  } catch (error) {
    console.error(`Error reading ${type} config:`, error);
    return [];
  }
}

// ============================================================
// MariaDB/MySQL
// ============================================================

// List MariaDB databases (instance-aware)
router.get('/mariadb', async (req, res) => {
  try {
    const { instance = 'default' } = req.query;
    const username = req.user.user;

    // Read from both old db.conf (HestiaCP standard) and new mariadb.conf
    let databases = [];
    
    // Read HestiaCP standard db.conf for default instance
    if (instance === 'default') {
      try {
        const data = await execHestiaJson('v-list-databases', [username]);
        const hestiaDBs = Object.entries(data).map(([name, info]) => ({
          database: name,
          user: info.DBUSER,
          host: info.HOST || 'localhost',
          port: '3306',
          instance: 'default',
          date: info.DATE,
          type: info.TYPE
        })).filter(db => db.type === 'mysql');
        databases = [...databases, ...hestiaDBs];
      } catch (e) {
        console.error('Error reading HestiaCP databases:', e);
      }
    }
    
    // Also read from mariadb.conf (new instance-aware format)
    const instanceDBs = getUserDatabases(username, 'mariadb');
    const filtered = instanceDBs.filter(db => (db.instance || 'default') === instance);
    databases = [...databases, ...filtered];

    res.json({ databases });
  } catch (error) {
    console.error('Error listing MariaDB databases:', error);
    res.json({ databases: [] });
  }
});

// Create MariaDB database (instance-aware)
router.post('/mariadb', async (req, res) => {
  try {
    const { database, password, instance = 'default' } = req.body;
    const username = req.user.user;

    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }

    // v-add-database-mariadb-instance USER DATABASE DBUSER DBPASSWORD INSTANCE
    const args = [username, database, database, password || '', instance];
    await execHestia('v-add-database-mariadb-instance', args);
    res.json({ success: true, message: 'MariaDB database created successfully' });
  } catch (error) {
    console.error('Error creating MariaDB database:', error);
    res.status(500).json({ error: error.message || 'Failed to create MariaDB database' });
  }
});

// Change MariaDB database password (instance-aware)
router.put('/mariadb/:database/password', async (req, res) => {
  try {
    const { database } = req.params;
    const { password, instance = 'default' } = req.body;
    const username = req.user.user;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // v-change-database-mariadb-password USER DATABASE DBUSER PASSWORD INSTANCE
    const args = [username, database, database, password, instance];
    await execHestia('v-change-database-mariadb-password', args);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing MariaDB password:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

// ============================================================
// PostgreSQL
// ============================================================

// List PostgreSQL databases (instance-aware)
router.get('/pgsql', async (req, res) => {
  try {
    const { instance = 'default' } = req.query;
    const username = req.user.user;

    // Read from both old db.conf (HestiaCP standard) and new pgsql.conf
    let databases = [];
    
    // Read HestiaCP standard db.conf for default instance
    if (instance === 'default') {
      try {
        const data = await execHestiaJson('v-list-databases', [username]);
        const hestiaDBs = Object.entries(data).map(([name, info]) => ({
          database: name,
          user: info.DBUSER,
          host: info.HOST || 'localhost',
          port: '5432',
          instance: 'default',
          date: info.DATE,
          type: info.TYPE
        })).filter(db => db.type === 'pgsql');
        databases = [...databases, ...hestiaDBs];
      } catch (e) {
        console.error('Error reading HestiaCP databases:', e);
      }
    }
    
    // Also read from pgsql.conf (new instance-aware format)
    const instanceDBs = getUserDatabases(username, 'pgsql');
    const filtered = instanceDBs.filter(db => (db.instance || 'default') === instance);
    databases = [...databases, ...filtered];

    res.json({ databases });
  } catch (error) {
    console.error('Error listing PostgreSQL databases:', error);
    res.json({ databases: [] });
  }
});

// Create PostgreSQL database (instance-aware)
router.post('/pgsql', async (req, res) => {
  try {
    const { database, password, instance = 'default' } = req.body;
    const username = req.user.user;

    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }

    // v-add-database-pgsql-instance USER DATABASE DBUSER DBPASSWORD INSTANCE
    const args = [username, database, database, password || '', instance];
    await execHestia('v-add-database-pgsql-instance', args);
    res.json({ success: true, message: 'PostgreSQL database created successfully' });
  } catch (error) {
    console.error('Error creating PostgreSQL database:', error);
    res.status(500).json({ error: error.message || 'Failed to create PostgreSQL database' });
  }
});

// Change PostgreSQL database password (instance-aware)
router.put('/pgsql/:database/password', async (req, res) => {
  try {
    const { database } = req.params;
    const { password, instance = 'default' } = req.body;
    const username = req.user.user;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // v-change-database-pgsql-password USER DATABASE DBUSER PASSWORD INSTANCE
    const args = [username, database, database, password, instance];
    await execHestia('v-change-database-pgsql-password', args);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing PostgreSQL password:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

// ============================================================
// Legacy routes (MySQL/PostgreSQL via HestiaCP standard)
// ============================================================

// List databases (MySQL/PostgreSQL) - legacy
router.get('/', async (req, res) => {
  try {
    const { type = 'mysql', instance = 'default' } = req.query;
    const username = req.user.user;

    // Try instance-aware config first
    const confType = type === 'mysql' ? 'mariadb' : type;
    const databases = getUserDatabases(username, confType);
    
    if (databases.length > 0) {
      const filtered = databases.filter(db => (db.instance || 'default') === instance);
      return res.json({ databases: filtered });
    }

    // Fallback to HestiaCP standard
    const data = await execHestiaJson('v-list-databases', [username]);
    let dbList = Object.entries(data).map(([name, info]) => ({
      database: name,
      instance: 'default',
      ...info
    }));

    if (type === 'mysql') {
      dbList = dbList.filter(db => db.TYPE === 'mysql');
    } else if (type === 'pgsql') {
      dbList = dbList.filter(db => db.TYPE === 'pgsql');
    }

    res.json({ databases: dbList });
  } catch (error) {
    console.error('Error listing databases:', error);
    res.json({ databases: [] });
  }
});

// Create database (MySQL/PostgreSQL) - legacy
router.post('/', async (req, res) => {
  try {
    const { database, dbuser, password, type = 'mysql', instance = 'default' } = req.body;
    const username = req.user.user;

    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }

    // Use instance-aware scripts if instance specified
    if (instance && instance !== 'default') {
      if (type === 'mysql') {
        const args = [username, database, dbuser || database, password || '', instance];
        await execHestia('v-add-database-mariadb-instance', args);
      } else if (type === 'pgsql') {
        const args = [username, database, dbuser || database, password || '', instance];
        await execHestia('v-add-database-pgsql-instance', args);
      }
    } else {
      // Use standard HestiaCP script for default instance
      const args = [username, database, dbuser || database, password || ''];
      if (type === 'pgsql') {
        args.push('pgsql');
      } else {
        args.push('mysql');
      }
      await execHestia('v-add-database', args);
    }
    
    res.json({ success: true, message: 'Database created successfully' });
  } catch (error) {
    console.error('Error creating database:', error);
    res.status(500).json({ error: error.message || 'Failed to create database' });
  }
});

// Change database password
router.put('/:database/password', async (req, res) => {
  try {
    const { database } = req.params;
    const { password } = req.body;
    const username = req.user.user;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    await execHestia('v-change-database-password', [username, database, database, password]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing database password:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

// Delete database
router.delete('/:database', async (req, res) => {
  try {
    const { database } = req.params;
    const username = req.user.user;

    await execHestia('v-delete-database', [username, database]);
    res.json({ success: true, message: 'Database deleted successfully' });
  } catch (error) {
    console.error('Error deleting database:', error);
    res.status(500).json({ error: error.message || 'Failed to delete database' });
  }
});

// ============================================================
// MongoDB
// ============================================================

// List MongoDB databases
router.get('/mongodb', async (req, res) => {
  try {
    const { instance = 'default' } = req.query;
    const username = req.user.user;

    const databases = getUserDatabases(username, 'mongodb');
    const filtered = databases.filter(db => (db.instance || 'default') === instance);

    res.json({ databases: filtered });
  } catch (error) {
    console.error('Error listing MongoDB databases:', error);
    res.json({ databases: [] });
  }
});

// Create MongoDB database
router.post('/mongodb', async (req, res) => {
  try {
    const { database, password, instance = 'default' } = req.body;
    const username = req.user.user;

    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }

    // v-add-database-mongo USER DATABASE [PASSWORD] [INSTANCE]
    const args = [username, database, password || '', instance];
    await execHestia('v-add-database-mongo', args);
    res.json({ success: true, message: 'MongoDB database created successfully' });
  } catch (error) {
    console.error('Error creating MongoDB database:', error);
    res.status(500).json({ error: error.message || 'Failed to create MongoDB database' });
  }
});

// Change MongoDB database password
router.put('/mongodb/:database/password', async (req, res) => {
  try {
    const { database } = req.params;
    const { password, instance = 'default' } = req.body;
    const username = req.user.user;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const args = [username, database, password];
    if (instance !== 'default') {
      args.push(instance);
    }
    
    await execHestia('v-change-database-mongo-password', args);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing MongoDB password:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

// Delete MongoDB database
router.delete('/mongodb/:database', async (req, res) => {
  try {
    const { database } = req.params;
    const { instance = 'default' } = req.query;
    const username = req.user.user;

    const args = [username, database];
    if (instance !== 'default') {
      args.push(instance);
    }

    await execHestia('v-delete-database-mongo', args);
    res.json({ success: true, message: 'MongoDB database deleted successfully' });
  } catch (error) {
    console.error('Error deleting MongoDB database:', error);
    res.status(500).json({ error: error.message || 'Failed to delete MongoDB database' });
  }
});

export default router;
