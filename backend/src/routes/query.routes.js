import express from 'express';
import { body, param, validationResult } from 'express-validator';

import { QueryHistory } from '../models/QueryHistory.js';
import { SchemaContext } from '../models/SchemaContext.js';
import { requestSqlGeneration } from '../services/aiProxy.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post(
  '/generate',
  [
    body('question').trim().notEmpty().withMessage('Question is required'),
    body('schemaId').optional().isMongoId(),
    body('schemaText').optional().isString(),
    body('dialect').optional().isIn(['postgresql', 'mysql', 'sqlite', 'redshift', 'bigquery'])
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { question, schemaId, schemaText, dialect } = req.body;
    let resolvedSchema = null;

    if (schemaText && schemaText.trim()) {
      resolvedSchema = {
        schemaText,
        dialect: dialect || 'postgresql',
        _id: null
      };
    } else if (schemaId) {
      resolvedSchema = await SchemaContext.findOne({ _id: schemaId, userId: req.user.id });
    } else {
      resolvedSchema = await SchemaContext.findOne({ userId: req.user.id, isDefault: true });
    }

    if (!resolvedSchema) {
      return res.status(400).json({ error: 'Schema is required. Upload or select a schema first.' });
    }

    const aiResult = await requestSqlGeneration({
      question,
      schemaText: resolvedSchema.schemaText,
      dialect: dialect || resolvedSchema.dialect
    });

    const historyItem = await QueryHistory.create({
      userId: req.user.id,
      schemaId: resolvedSchema._id,
      question,
      generatedSql: aiResult.sql,
      dialect: aiResult.dialect,
      sourceLatencyMs: aiResult.latency_ms,
      provider: aiResult.provider,
      model: aiResult.model
    });

    return res.json({
      sql: aiResult.sql,
      prompt: aiResult.prompt,
      dialect: aiResult.dialect,
      provider: aiResult.provider,
      model: aiResult.model,
      latencyMs: aiResult.latency_ms,
      bridgeLatencyMs: aiResult.bridgeLatencyMs,
      linkedSchema: aiResult.linked_schema,
      historyId: historyItem._id
    });
  })
);

router.post(
  '/rerun/:historyId',
  [param('historyId').isMongoId().withMessage('historyId must be a valid MongoDB id')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const historyItem = await QueryHistory.findOne({ _id: req.params.historyId, userId: req.user.id });

    if (!historyItem) {
      return res.status(404).json({ error: 'History item not found' });
    }

    const schema = historyItem.schemaId
      ? await SchemaContext.findOne({ _id: historyItem.schemaId, userId: req.user.id })
      : null;

    if (!schema) {
      return res.status(400).json({ error: 'Source schema was removed. Provide schemaText to rerun.' });
    }

    const aiResult = await requestSqlGeneration({
      question: historyItem.question,
      schemaText: schema.schemaText,
      dialect: historyItem.dialect
    });

    const newHistoryItem = await QueryHistory.create({
      userId: req.user.id,
      schemaId: schema._id,
      question: historyItem.question,
      generatedSql: aiResult.sql,
      dialect: aiResult.dialect,
      sourceLatencyMs: aiResult.latency_ms,
      provider: aiResult.provider,
      model: aiResult.model
    });

    return res.json({
      sql: aiResult.sql,
      prompt: aiResult.prompt,
      dialect: aiResult.dialect,
      provider: aiResult.provider,
      model: aiResult.model,
      latencyMs: aiResult.latency_ms,
      bridgeLatencyMs: aiResult.bridgeLatencyMs,
      linkedSchema: aiResult.linked_schema,
      historyId: newHistoryItem._id
    });
  })
);

export default router;
