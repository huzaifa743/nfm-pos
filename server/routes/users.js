const express = require('express');
const bcrypt = require('bcryptjs');
const { query, run, get } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const users = await query('SELECT id, username, email, role, full_name, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user
router.get('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const user = await get('SELECT id, username, email, role, full_name, created_at FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await run(
      'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name || null, role || 'cashier']
    );

    const user = await get('SELECT id, username, email, role, full_name, created_at FROM users WHERE id = ?', [result.id]);
    res.status(201).json(user);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await run(
        'UPDATE users SET username = ?, email = ?, password = ?, full_name = ?, role = ? WHERE id = ?',
        [username, email, hashedPassword, full_name || null, role, req.params.id]
      );
    } else {
      await run(
        'UPDATE users SET username = ?, email = ?, full_name = ?, role = ? WHERE id = ?',
        [username, email, full_name || null, role, req.params.id]
      );
    }

    const user = await get('SELECT id, username, email, role, full_name, created_at FROM users WHERE id = ?', [req.params.id]);
    res.json(user);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
