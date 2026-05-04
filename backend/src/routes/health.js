import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LoadVault API',
    version: '1.0.0',
    build: 1,
    timestamp: new Date().toISOString(),
  });
});

export default router;
