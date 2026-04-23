import express from 'express';
import { query, validationResult } from 'express-validator';

import { QueryHistory } from '../models/QueryHistory.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get(
  '/',
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const limit = Number(req.query.limit || 25);

    const history = await QueryHistory.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ history });
  })
);

export default router;
