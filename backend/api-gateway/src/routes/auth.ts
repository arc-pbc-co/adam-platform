import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../database';
import { generateToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user by email
    const result = await db.query(
      'SELECT id, email, name, role, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // For development, allow login without password check if no hash exists
    let passwordValid = false;
    if (user.password_hash) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else if (process.env.NODE_ENV === 'development') {
      // Development mode: accept any password if no hash is set
      passwordValid = true;
      logger.warn(`Development login for ${email} - no password hash set`);
    }

    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user,
  });
});

// Refresh token
router.post('/refresh', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const token = generateToken(req.user);
  res.json({ token });
});

export default router;
