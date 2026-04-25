import axios from 'axios';
import http from 'node:http';
import https from 'node:https';

import { env } from '../config/env.js';

const keepAliveHttpAgent = new http.Agent({ keepAlive: true });
const keepAliveHttpsAgent = new https.Agent({ keepAlive: true });

const aiClient = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: env.aiTimeoutMs,
  httpAgent: keepAliveHttpAgent,
  httpsAgent: keepAliveHttpsAgent
});

export async function requestSqlGeneration({ question, schemaText, dialect, userId }) {
  if (!question || !schemaText) {
    throw new Error('Missing required SQL generation inputs');
  }

  if (!userId) {
    throw new Error('requestSqlGeneration requires userId for AI rate limiting');
  }

  const startedAt = Date.now();

  const response = await aiClient.post('/generate-sql', {
    user_query: question,
    schema_context: schemaText,
    dialect
  }, {
    headers: {
      'X-Internal-Service-Token': env.aiServiceToken,
      'X-User-Id': userId
    }
  });

  return {
    ...response.data,
    bridgeLatencyMs: Date.now() - startedAt
  };
}
