import express from 'express';
import { body, param, validationResult } from 'express-validator';

import { SchemaContext } from '../models/SchemaContext.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const schemas = await SchemaContext.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json({ schemas });
  })
);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Schema name is required'),
    body('schemaText').trim().notEmpty().withMessage('Schema text is required'),
    body('dialect').optional().isIn(['postgresql', 'mysql', 'sqlite', 'redshift', 'bigquery']),
    body('isDefault').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, schemaText, dialect = 'postgresql', isDefault = false } = req.body;

    if (isDefault) {
      await SchemaContext.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const schema = await SchemaContext.create({
      userId: req.user.id,
      name,
      schemaText,
      dialect,
      isDefault
    });

    return res.status(201).json({ schema });
  })
);

router.patch(
  '/:schemaId',
  [
    param('schemaId').isMongoId(),
    body('name').optional().trim().notEmpty(),
    body('schemaText').optional().trim().notEmpty(),
    body('dialect').optional().isIn(['postgresql', 'mysql', 'sqlite', 'redshift', 'bigquery']),
    body('isDefault').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.body.isDefault === true) {
      await SchemaContext.updateMany({ userId: req.user.id }, { isDefault: false });
    }

    const schema = await SchemaContext.findOneAndUpdate(
      { _id: req.params.schemaId, userId: req.user.id },
      { ...req.body },
      { new: true }
    );

    if (!schema) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    return res.json({ schema });
  })
);

export default router;
