import { useState } from 'react';

export default function AuthPanel({ onSubmit, loading }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isLogin = mode === 'login';

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit({ mode, email, password });
  }

  return (
    <section className="console-panel mx-auto max-w-lg animate-rise p-6">
      <p className="mb-2 text-xs uppercase tracking-[0.22em] text-cyan-300">NL to SQL Console</p>
      <h1 className="font-display text-3xl font-semibold text-slate-100">Sign in to query your data</h1>
      <p className="mt-2 text-sm text-slate-300">
        Upload schema metadata, ask in plain English, and generate SQL with low-latency inference.
      </p>

      <div className="mt-5 inline-flex rounded-lg border border-slate-700 bg-slate-800/70 p-1">
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm ${isLogin ? 'bg-cyan-600 text-white' : 'text-slate-300'}`}
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`rounded-md px-4 py-2 text-sm ${!isLogin ? 'bg-amber-500 text-slate-900' : 'text-slate-300'}`}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm text-slate-300">
          Email
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          Password
          <input
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create account'}
        </button>
      </form>
    </section>
  );
}
