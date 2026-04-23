import { useState } from 'react';

const DIALECT_OPTIONS = ['postgresql', 'redshift', 'mysql', 'sqlite', 'bigquery'];

export default function SchemaPanel({ schemas, selectedSchemaId, onSelectSchema, onSaveSchema, saving }) {
  const [name, setName] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [dialect, setDialect] = useState('postgresql');

  async function handleSubmit(event) {
    event.preventDefault();
    await onSaveSchema({
      name,
      schemaText,
      dialect,
      isDefault: schemas.length === 0
    });

    setName('');
    setSchemaText('');
  }

  return (
    <section className="console-panel animate-rise p-4">
      <h2 className="font-display text-lg text-slate-100">Schema Upload</h2>
      <p className="mt-1 text-xs text-slate-400">Schema context improves table/column linking accuracy.</p>

      <div className="mt-3 grid gap-2">
        <label className="text-xs uppercase tracking-wider text-slate-400">Saved Schemas</label>
        <select
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={selectedSchemaId || ''}
          onChange={(event) => onSelectSchema(event.target.value || null)}
        >
          <option value="">Select schema</option>
          {schemas.map((schema) => (
            <option key={schema._id} value={schema._id}>
              {schema.name} ({schema.dialect})
            </option>
          ))}
        </select>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          placeholder="Schema name (e.g. ecommerce_prod)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <select
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          value={dialect}
          onChange={(event) => setDialect(event.target.value)}
        >
          {DIALECT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <textarea
          className="h-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-200"
          placeholder="Paste CREATE TABLE statements..."
          value={schemaText}
          onChange={(event) => setSchemaText(event.target.value)}
          required
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Schema'}
        </button>
      </form>
    </section>
  );
}
