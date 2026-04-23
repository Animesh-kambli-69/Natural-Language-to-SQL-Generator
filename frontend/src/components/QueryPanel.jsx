export default function QueryPanel({
  question,
  onChangeQuestion,
  onGenerate,
  generating,
  sessionTurns,
  selectedSchemaName
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onGenerate();
  }

  return (
    <section className="console-panel animate-rise p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-slate-100">Query Interface</h2>
          <p className="mt-1 text-xs text-slate-400">
            Ask in plain English. Active schema: {selectedSchemaName || 'none selected'}
          </p>
        </div>
      </div>

      <div className="subtle-scrollbar mt-4 h-52 overflow-y-auto rounded-xl border border-slate-700/70 bg-slate-950/40 p-3">
        {sessionTurns.length === 0 ? (
          <p className="text-sm text-slate-400">
            Start the conversation by asking something like “Top 10 customers by revenue this month”.
          </p>
        ) : (
          <div className="grid gap-3">
            {sessionTurns.map((turn) => (
              <div
                key={turn.id}
                className={
                  turn.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-cyan-700/70 px-3 py-2 text-sm text-cyan-50'
                    : 'mr-auto max-w-[90%] rounded-2xl rounded-bl-sm border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100'
                }
              >
                {turn.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <textarea
          value={question}
          onChange={(event) => onChangeQuestion(event.target.value)}
          rows={4}
          placeholder="Example: Show monthly active users for the last 6 months"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
        />

        <button
          type="submit"
          disabled={generating}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? 'Generating SQL...' : 'Generate SQL'}
        </button>
      </form>
    </section>
  );
}
