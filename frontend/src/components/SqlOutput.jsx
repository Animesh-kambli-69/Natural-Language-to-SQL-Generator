import { useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function SqlOutput({ result, loading }) {
  const [copied, setCopied] = useState(false);

  const sqlText = useMemo(() => {
    if (!result?.sql) {
      return '-- SQL output appears here after generation --';
    }

    return result.sql;
  }, [result]);

  async function copySql() {
    if (!result?.sql) {
      return;
    }

    await navigator.clipboard.writeText(result.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="console-panel animate-rise p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-slate-100">Generated SQL</h2>
        <button
          type="button"
          onClick={copySql}
          disabled={!result?.sql}
          className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-400 disabled:opacity-40"
        >
          {copied ? 'Copied' : 'Copy SQL'}
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-slate-700/80">
        <SyntaxHighlighter
          language="sql"
          style={atomDark}
          customStyle={{ margin: 0, minHeight: 210, fontSize: '0.84rem' }}
          wrapLongLines
        >
          {loading ? '-- Generating SQL...' : sqlText}
        </SyntaxHighlighter>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metadata label="Provider" value={result?.provider || '-'} />
        <Metadata label="Model" value={result?.model || '-'} />
        <Metadata label="Dialect" value={result?.dialect || '-'} />
        <Metadata label="AI Latency" value={result ? `${result.latencyMs} ms` : '-'} />
        <Metadata label="Bridge" value={result ? `${result.bridgeLatencyMs} ms` : '-'} />
        <Metadata label="Linked Tables" value={result?.linkedSchema ? String(result.linkedSchema.split('\n').length) : '-'} />
      </div>
    </section>
  );
}

function Metadata({ label, value }) {
  return (
    <article className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs text-slate-200">{value}</p>
    </article>
  );
}
