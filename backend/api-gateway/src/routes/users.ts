import { Router } from 'express';
import { db } from '../database';

const router = Router();

// Get all users
router.get('/', async (_req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users ORDER BY name ASC'
    );

    res.json({
      users: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
