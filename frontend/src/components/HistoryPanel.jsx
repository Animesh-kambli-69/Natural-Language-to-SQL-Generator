export default function HistoryPanel({ history, onRerun, onReusePrompt, rerunningId }) {
  return (
    <aside className="console-panel subtle-scrollbar animate-rise h-[calc(100vh-6.5rem)] overflow-y-auto p-4">
      <h2 className="font-display text-lg text-slate-100">History</h2>
      <p className="mt-1 text-xs text-slate-400">Replay previous prompts from MongoDB.</p>

      <div className="mt-4 grid gap-3">
        {history.length === 0 ? (
          <p className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3 text-xs text-slate-400">
            No queries yet.
          </p>
        ) : (
          history.map((item) => (
            <article key={item._id} className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3">
              <p className="text-sm text-slate-200">{item.question}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{item.dialect}</span>
                <span>·</span>
                <span>{item.sourceLatencyMs} ms</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-500"
                  onClick={() => onReusePrompt(item.question)}
                >
                  Use Prompt
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:border-amber-400"
                  onClick={() => onRerun(item._id)}
                  disabled={rerunningId === item._id}
                >
                  {rerunningId === item._id ? 'Rerunning...' : 'Rerun'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
