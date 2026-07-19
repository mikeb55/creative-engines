import type { RiffPhraseCorpusDto } from '../../services/api';

function histTable(title: string, hist: Record<string, number>) {
  const entries = Object.entries(hist).sort((a, b) => {
    const an = Number(a[0]);
    const bn = Number(b[0]);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return a[0].localeCompare(b[0]);
  });
  return (
    <section style={{ marginBottom: '1rem' }}>
      <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>{title}</h4>
      {entries.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>None</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <tbody>
            {entries.map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '0.2rem 0.4rem', borderBottom: '1px solid var(--border)' }}>{k}</td>
                <td
                  style={{
                    padding: '0.2rem 0.4rem',
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'right',
                  }}
                >
                  {v}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function RiffGenCorpusQaPanel({ corpus }: { corpus: RiffPhraseCorpusDto }) {
  const { stats, source } = corpus;
  const t = stats.totals;
  const mismatch =
    t.auditPhrasesOutSum !== t.phrases
      ? `audit phrasesOut sum ${t.auditPhrasesOutSum} ≠ phrases.jsonl ${t.phrases}`
      : null;

  const cats = Object.entries(stats.byCategory)
    .filter(([, s]) => s.files > 0 || s.phrases > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <section
      style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 4,
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Corpus QA</h3>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Loaded {source.loadedAt}
        {source.phrasesExists ? ' · phrases.jsonl' : ''}
        {source.auditExists ? ' · audit.csv' : ''}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.85rem',
        }}
      >
        <div>Files: <strong>{t.files}</strong></div>
        <div>Parse OK: <strong>{t.parseOk}</strong></div>
        <div>Phrases: <strong>{t.phrases}</strong></div>
        <div>Tie fixups: <strong>{t.tieFixups}</strong></div>
        <div>Ornaments dropped: <strong>{t.droppedOrnaments}</strong></div>
        <div>Invalid skipped: <strong>{t.phrasesInvalidSkipped}</strong></div>
      </div>

      {mismatch ? (
        <p role="alert" style={{ color: 'salmon', fontSize: '0.85rem' }}>
          {mismatch}
        </p>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          phrases.jsonl count matches audit phrasesOut sum ({t.phrases}).
        </p>
      )}

      <h4 style={{ margin: '1rem 0 0.4rem', fontSize: '0.95rem' }}>Category counts</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
        <thead>
          <tr>
            <th align="left">Category</th>
            <th align="right">Files</th>
            <th align="right">Phrases</th>
            <th align="right">Bars</th>
            <th align="right">Ties</th>
            <th align="right">Orn. drop</th>
            <th align="right">Meter≠</th>
          </tr>
        </thead>
        <tbody>
          {cats.map(([id, s]) => (
            <tr key={id}>
              <td style={{ borderBottom: '1px solid var(--border)', padding: '0.25rem 0.35rem' }}>{id}</td>
              <td align="right" style={{ borderBottom: '1px solid var(--border)', padding: '0.25rem 0.35rem' }}>
                {s.files}
              </td>
              <td align="right" style={{ borderBottom: '1px solid var(--border)', padding: '0.25rem 0.35rem' }}>
                {s.phrases}
              </td>
              <td align="right" style={{ borderBottom: '1px solid var(--border)', padding: '0.25rem 0.35rem' }}>
                {s.barsIn}
              </td>
              <td align="right" style={{ borderBottom: '1px solid var(--border)', padding: '0.25rem 0.35rem' }}>
                {s.tieFixups}
              </td>
              <td align="right" style={{ borderBottom: '1px solid var(--border)', padding: '0.25rem 0.35rem' }}>
                {s.droppedOrnaments}
              </td>
              <td align="right" style={{ borderBottom: '1px solid var(--border)', padding: '0.25rem 0.35rem' }}>
                {s.meterMismatch}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        {histTable('Phrase length (bars)', stats.barCountHist)}
        {histTable('Start type', stats.startTypeHist)}
        {histTable('End type', stats.endTypeHist)}
      </div>

      <h4 style={{ margin: '0.5rem 0 0.4rem', fontSize: '0.95rem' }}>Meter mismatch warnings</h4>
      {stats.meterMismatchFiles.length === 0 ? (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>None</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem' }}>
          {stats.meterMismatchFiles.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
    </section>
  );
}