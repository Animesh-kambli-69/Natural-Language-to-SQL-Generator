import { useEffect, useMemo, useState } from 'react';

import {
  createSchema,
  fetchHistory,
  fetchSchemas,
  generateQuery,
  loginUser,
  logoutUser,
  registerUser,
  rerunHistoryItem
} from './api/client';
import AuthPanel from './components/AuthPanel';
import HistoryPanel from './components/HistoryPanel';
import QueryPanel from './components/QueryPanel';
import SchemaPanel from './components/SchemaPanel';
import SqlOutput from './components/SqlOutput';

function loadStoredSession() {
  const user = window.localStorage.getItem('nl2sql.user');

  if (!user) {
    return { token: null, user: null };
  }

  try {
    return { token: 'cookie', user: JSON.parse(user) };
  } catch {
    return { token: null, user: null };
  }
}

export default function App() {
  const [{ token, user }, setSession] = useState(loadStoredSession);
  const [authBusy, setAuthBusy] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const [schemas, setSchemas] = useState([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState(null);
  const [history, setHistory] = useState([]);

  const [savingSchema, setSavingSchema] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rerunningId, setRerunningId] = useState(null);

  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [sessionTurns, setSessionTurns] = useState([]);

  const selectedSchema = useMemo(
    () => schemas.find((schema) => schema._id === selectedSchemaId) || null,
    [schemas, selectedSchemaId]
  );

  async function loadWorkspace() {
    const [schemasPayload, historyPayload] = await Promise.all([
      fetchSchemas(),
      fetchHistory()
    ]);

    setSchemas(schemasPayload.schemas || []);
    setHistory(historyPayload.history || []);

    const defaultSchema = (schemasPayload.schemas || []).find((schema) => schema.isDefault);
    setSelectedSchemaId(defaultSchema?._id || schemasPayload.schemas?.[0]?._id || null);
  }

  useEffect(() => {
    if (!token) {
      return;
    }

    loadWorkspace().catch((error) => {
      if (error.message.toLowerCase().includes('authentication') || error.message.toLowerCase().includes('token')) {
        window.localStorage.removeItem('nl2sql.user');
        setSession({ token: null, user: null });
      } else {
        setGlobalError(error.message);
      }
    });
  }, [token]);

  async function handleAuth({ mode, email, password }) {
    setAuthBusy(true);
    setGlobalError('');

    try {
      const authPayload =
        mode === 'register' ? await registerUser(email, password) : await loginUser(email, password);

      const nextSession = {
        token: 'cookie',
        user: authPayload.user
      };

      window.localStorage.setItem('nl2sql.user', JSON.stringify(nextSession.user));

      setSession(nextSession);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      // Best effort logout even if network request fails.
    }

    window.localStorage.removeItem('nl2sql.user');

    setSession({ token: null, user: null });
    setSchemas([]);
    setSelectedSchemaId(null);
    setHistory([]);
    setQuestion('');
    setResult(null);
    setSessionTurns([]);
    setGlobalError('');
  }

  async function handleSaveSchema(schemaPayload) {
    if (!token) return;

    setSavingSchema(true);
    setGlobalError('');

    try {
      const response = await createSchema(schemaPayload);
      const created = response.schema;
      setSchemas((previous) => [created, ...previous.filter((item) => item._id !== created._id)]);
      setSelectedSchemaId(created._id);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setSavingSchema(false);
    }
  }

  async function handleGenerate() {
    if (!token || !question.trim()) {
      return;
    }

    if (!selectedSchema) {
      setGlobalError('Select or upload a schema before generating SQL.');
      return;
    }

    setGenerating(true);
    setGlobalError('');

    const userTurn = { id: crypto.randomUUID(), role: 'user', text: question.trim() };
    setSessionTurns((previous) => [...previous, userTurn]);

    try {
      const response = await generateQuery({
        question: question.trim(),
        schemaId: selectedSchema._id,
        dialect: selectedSchema.dialect
      });

      setResult(response);
      setSessionTurns((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `Generated query in ${response.latencyMs} ms using ${response.provider}.`
        }
      ]);
      setQuestion('');

      const historyPayload = await fetchHistory();
      setHistory(historyPayload.history || []);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRerun(historyId) {
    if (!token) return;

    setRerunningId(historyId);
    setGlobalError('');

    try {
      const response = await rerunHistoryItem(historyId);
      setResult(response);

      setSessionTurns((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `Reran historical query in ${response.latencyMs} ms.`
        }
      ]);

      const historyPayload = await fetchHistory();
      setHistory(historyPayload.history || []);
    } catch (error) {
      setGlobalError(error.message);
    } finally {
      setRerunningId(null);
    }
  }

  if (!token || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <div className="w-full">
          <AuthPanel onSubmit={handleAuth} loading={authBusy} />
          {globalError ? <p className="mt-4 text-center text-sm text-rose-300">{globalError}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-[1440px] gap-4 px-4 py-4 lg:grid-cols-[320px_1fr]">
      <HistoryPanel
        history={history}
        onRerun={handleRerun}
        onReusePrompt={setQuestion}
        rerunningId={rerunningId}
      />

      <section className="grid gap-4">
        <header className="console-panel animate-rise flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Amazon Q Inspired Console</p>
            <h1 className="font-display text-2xl text-slate-100">Natural Language to SQL</h1>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-300">{user.email}</p>
            <button
              type="button"
              className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-rose-400"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {globalError ? (
          <p className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {globalError}
          </p>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <SchemaPanel
            schemas={schemas}
            selectedSchemaId={selectedSchemaId}
            onSelectSchema={setSelectedSchemaId}
            onSaveSchema={handleSaveSchema}
            saving={savingSchema}
          />

          <QueryPanel
            question={question}
            onChangeQuestion={setQuestion}
            onGenerate={handleGenerate}
            generating={generating}
            sessionTurns={sessionTurns}
            selectedSchemaName={selectedSchema?.name}
          />
        </div>

        <SqlOutput result={result} loading={generating} />
      </section>
    </main>
  );
}
