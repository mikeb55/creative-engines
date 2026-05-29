import {
  formatMartinoRuleDisplay,
  martinoRuleTooltip,
  martinoActivityHumanLabel,
  martinoActivityCodeTooltip,
} from '../../lib/martinoGeneratePipeline.js';
import MartinoScorePanel from './MartinoScorePanel.jsx';
import MartinoAudioPlayer from './MartinoAudioPlayer.jsx';

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

function buildBarExplainRows(phrasePlan, barTelemetry) {
  const planByBar = new Map();
  for (const row of Array.isArray(phrasePlan) ? phrasePlan : []) {
    const bar = Number(row?.bar);
    if (bar) planByBar.set(bar, row);
  }
  const telemByBar = new Map();
  for (const row of Array.isArray(barTelemetry) ? barTelemetry : []) {
    const bar = Number(row?.bar);
    if (bar) telemByBar.set(bar, row);
  }
  const bars = [...new Set([...planByBar.keys(), ...telemByBar.keys()])].sort((a, b) => a - b);
  return bars.map((bar) => ({
    bar,
    plan: planByBar.get(bar),
    telemetry: telemByBar.get(bar),
  }));
}

function formatExplainBar({ bar, plan, telemetry }) {
  if (!plan) return { bar, headline: `Bar ${bar}`, detail: '—' };
  const chord = String(plan.chord ?? '—');
  const reduction = String(plan.reduction ?? '—');
  const activityId = String(plan.activity ?? '');
  const activity = martinoActivityHumanLabel(activityId);
  const activityCode = martinoActivityCodeTooltip(activityId);
  const ruleKey = String(plan.book_rule ?? '');
  const rule = formatMartinoRuleDisplay(ruleKey);
  const ruleTip = martinoRuleTooltip(ruleKey);
  const direction = String(plan.direction_vector ?? telemetry?.direction_vector ?? '—');
  const lfvOk = plan.lfv_ok !== false;
  const antiLoop = telemetry?.anti_loop_triggered === true;
  const headline = `Bar ${bar}: ${chord} → ${reduction}`;
  const detail = `${activity} (${activityCode}) · ${rule} · ${direction} · LFV ${lfvOk ? '✓' : '⚠'}${antiLoop ? ' · anti-loop' : ''}`;
  return { bar, headline, detail, ruleTip };
}

export default function MartinoResultPanel({ feedback, onOpenFolder, explainMode, xmlString }) {
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

  const { summary, gateFailed, phrasePlan = [], barTelemetry = [] } = feedback;
  const explainBars =
    explainMode && phrasePlan.length > 0
      ? buildBarExplainRows(phrasePlan, barTelemetry).map(formatExplainBar)
      : [];

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
      <MartinoScorePanel xmlString={xmlString ?? null} showTab />
      <MartinoAudioPlayer xmlString={xmlString ?? null} barTelemetry={barTelemetry} />
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
      {explainBars.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <p style={{ margin: '0 0 0.45rem', fontWeight: 600, fontSize: '0.88rem' }}>
            Bar-by-bar reasoning
          </p>
          {explainBars.map((row) => (
            <div key={row.bar} style={{ marginBottom: '0.45rem', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 500 }}>{row.headline}</div>
              <div style={{ color: 'var(--text-muted)' }} title={row.ruleTip || undefined}>
                {row.detail}
              </div>
            </div>
          ))}
        </div>
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
