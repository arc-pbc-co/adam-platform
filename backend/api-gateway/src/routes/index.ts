import { Router } from 'express';
import experimentsRouter from './experiments';
import hardwareRouter from './hardware';
import agentsRouter from './agents';
import usersRouter from './users';
import authRouter from './auth';
import intersectRouter from './intersect';

const router = Router();

// API version
router.get('/', (_req, res) => {
  res.json({
    name: 'ADAM Platform API',
    version: '1.0.0',
    description: 'Autonomous Discovery and Advanced Manufacturing Platform',
  });
});

// Route modules
router.use('/auth', authRouter);
router.use('/experiments', experimentsRouter);
router.use('/hardware', hardwareRouter);
router.use('/agents', agentsRouter);
router.use('/users', usersRouter);
router.use('/intersect', intersectRouter);

export default router;
