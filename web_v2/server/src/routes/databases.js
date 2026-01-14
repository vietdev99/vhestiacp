import express from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';

const router = express.Router();

// List databases (MySQL/PostgreSQL)
router.get('/', async (req, res) => {
  try {
    const { type = 'mysql' } = req.query;
    const username = req.user.username;

    const data = await execHestiaJson('v-list-databases', [username]);

    // Filter by type if specified
    let databases = Object.entries(data).map(([name, info]) => ({
      database: name,
      ...info
    }));

    if (type === 'mysql') {
      databases = databases.filter(db => db.TYPE === 'mysql');
    } else if (type === 'pgsql') {
      databases = databases.filter(db => db.TYPE === 'pgsql');
    }

    res.json({ databases });
  } catch (error) {
    console.error('Error listing databases:', error);
    res.json({ databases: [] });
  }
});

// Create database (MySQL/PostgreSQL)
router.post('/', async (req, res) => {
  try {
    const { database, dbuser, password, type = 'mysql' } = req.body;
    const username = req.user.username;

    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }

    // Build args based on type
    const args = [username, database, dbuser || database, password || ''];
    if (type === 'pgsql') {
      args.push('pgsql');
    } else {
      args.push('mysql');
    }

    await execHestia('v-add-database', args);
    res.json({ success: true, message: 'Database created successfully' });
  } catch (error) {
    console.error('Error creating database:', error);
    res.status(500).json({ error: error.message || 'Failed to create database' });
  }
});

// Delete database
router.delete('/:database', async (req, res) => {
  try {
    const { database } = req.params;
    const username = req.user.username;

    await execHestia('v-delete-database', [username, database]);
    res.json({ success: true, message: 'Database deleted successfully' });
  } catch (error) {
    console.error('Error deleting database:', error);
    res.status(500).json({ error: error.message || 'Failed to delete database' });
  }
});

// List MongoDB databases
router.get('/mongodb', async (req, res) => {
  try {
    const username = req.user.username;

    const data = await execHestiaJson('v-list-database-mongo', [username]);
    const databases = Object.entries(data).map(([name, info]) => ({
      database: name,
      ...info
    }));

    res.json({ databases });
  } catch (error) {
    console.error('Error listing MongoDB databases:', error);
    res.json({ databases: [] });
  }
});

// Create MongoDB database
router.post('/mongodb', async (req, res) => {
  try {
    const { database, password } = req.body;
    const username = req.user.username;

    if (!database) {
      return res.status(400).json({ error: 'Database name is required' });
    }

    const args = [username, database];
    if (password) {
      args.push(password);
    }

    await execHestia('v-add-database-mongo', args);
    res.json({ success: true, message: 'MongoDB database created successfully' });
  } catch (error) {
    console.error('Error creating MongoDB database:', error);
    res.status(500).json({ error: error.message || 'Failed to create MongoDB database' });
  }
});

// Delete MongoDB database
router.delete('/mongodb/:database', async (req, res) => {
  try {
    const { database } = req.params;
    const username = req.user.username;

    await execHestia('v-delete-database-mongo', [username, database]);
    res.json({ success: true, message: 'MongoDB database deleted successfully' });
  } catch (error) {
    console.error('Error deleting MongoDB database:', error);
    res.status(500).json({ error: error.message || 'Failed to delete MongoDB database' });
  }
});

export default router;
