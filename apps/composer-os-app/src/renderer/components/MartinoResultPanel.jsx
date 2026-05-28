const panelStyle = {
  marginTop: '0.75rem',
  marginBottom: '1rem',
  maxWidth: 560,
  padding: '0.85rem 1rem',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-panel)',
  fontSize: '0.9rem',
  lineHeight: 1.5,
  color: 'var(--text)',
};

const rowStyle = { margin: '0.35rem 0' };
const labelStyle = { color: 'var(--text-muted)' };

export default function MartinoResultPanel({ feedback, onOpenFolder }) {
  if (!feedback) return null;

  if (feedback.type === 'failed') {
    return (
      <div style={panelStyle} role="status" aria-live="polite">
        <p style={{ margin: 0, color: '#e88' }}>
          ✗ Generation failed — {feedback.message}
        </p>
      </div>
    );
  }

  const { summary, gateFailed } = feedback;

  return (
    <div style={panelStyle} role="status" aria-live="polite">
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>
        ✓ {summary.tuneName} generated
      </p>
      <p style={rowStyle}>
        <span style={labelStyle}>Line character</span>{' '}
        {summary.lineCharacter}
      </p>
      <p style={rowStyle}>
        <span style={labelStyle}>Activities used</span>{' '}
        {summary.activitiesUsed}
      </p>
      <p style={rowStyle}>
        <span style={labelStyle}>Overall score</span>{' '}
        {summary.overallScore} / 10
      </p>
      <p style={rowStyle}>
        <span style={labelStyle}>File</span> {summary.filename}
      </p>
      {gateFailed && (
        <p
          style={{
            margin: '0.65rem 0 0',
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
            background: 'rgba(234,179,8,0.12)',
            border: '1px solid rgba(234,179,8,0.35)',
            color: 'var(--text)',
            fontSize: '0.85rem',
          }}
        >
          ⚠ Line is outside ideal range — open in Sibelius to review
        </p>
      )}
      {summary.outputDir && onOpenFolder && (
        <button
          type="button"
          className="secondary"
          style={{ marginTop: '0.65rem' }}
          onClick={() => onOpenFolder(summary.outputDir)}
        >
          Open folder
        </button>
      )}
    </div>
  );
}
