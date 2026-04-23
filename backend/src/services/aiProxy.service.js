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

export async function requestSqlGeneration({ question, schemaText, dialect }) {
  const startedAt = Date.now();

  const response = await aiClient.post('/generate-sql', {
    user_query: question,
    schema_context: schemaText,
    dialect
  }, {
    headers: {
      'X-Internal-Service-Token': env.aiServiceToken
    }
  });

  return {
    ...response.data,
    bridgeLatencyMs: Date.now() - startedAt
  };
}
