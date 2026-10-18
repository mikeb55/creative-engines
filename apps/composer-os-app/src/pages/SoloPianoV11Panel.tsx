import React from 'react';
import {
  V11_METRE_OPTIONS,
  acceptanceRegionDrafts,
  cycleMeterRows,
  emptyPolychordDraft,
  emptyWindowDraft,
  meterRowStatus,
  parentMemberText,
  phraseRegions,
  sourceChordContext,
  uniformMeterRows,
  windowContinuationText,
  type MeterDraftRow,
  type MeterMode,
  type PolychordDraft,
  type PolychordMode,
  type Polyrhythm,
  type SoloPianoFormState,
  type TriadQuality,
  type WindowDraft,
} from './soloPianoV11Editor';
import type { PianoFieldError } from '@composer-os/core/piano/pianoV11Windows';

const QUALITY_OPTIONS: TriadQuality[] = ['major', 'minor', 'augmented', 'diminished'];
const SUBDIVISIONS = ['3:2', '5:4', 'straight-eighths', 'straight-sixteenths'];
const MATERIALS = ['parent-stack', 'parent-repeated', 'given-pitches'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginTop: '0.35rem' }}>
      <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</span>
      {children}
    </label>
  );
}

export function SoloPianoV11Panel(props: {
  form: SoloPianoFormState;
  identity: string;
  fieldErrors: PianoFieldError[];
  configText: string;
  onForm: (next: SoloPianoFormState) => void;
  onLoadDemonstration: () => void;
  onConfigText: (text: string) => void;
  onSave: () => void;
  onReload: () => void;
}) {
  const { form } = props;
  function patch(next: Partial<SoloPianoFormState>) {
    props.onForm({ ...form, ...next });
  }
  function patchWindow(index: number, next: Partial<WindowDraft>) {
    patch({ windows: form.windows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)) });
  }
  function patchRegion(index: number, next: Partial<PolychordDraft>) {
    patch({
      polychordRegions: form.polychordRegions.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)),
    });
  }
  function patchMeter(index: number, next: Partial<MeterDraftRow>) {
    patch({ meterRows: form.meterRows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...next } : row)) });
  }

  const rh = form.windows.map((row, index) => ({ row, index })).filter((item) => item.row.hand === 'RH');
  const lh = form.windows.map((row, index) => ({ row, index })).filter((item) => item.row.hand === 'LH');

  function windowTable(title: string, rows: { row: WindowDraft; index: number }[], testId: string) {
    return (
      <div data-testid={testId} style={{ marginTop: '0.75rem' }}>
        <h4 style={{ margin: '0 0 0.35rem' }}>{title}</h4>
        {rows.length === 0 && <p style={{ margin: 0, color: 'var(--text-muted)' }}>No {title} windows.</p>}
        {rows.map(({ row, index }) => (
          <fieldset key={`${row.id}-${index}`} style={{ marginTop: '0.5rem', border: '1px solid var(--border, #444)', padding: '0.5rem' }}>
            <legend>{row.id || `Window ${index + 1}`}</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.4rem' }}>
              <Field label="Id">
                <input aria-label={`Window ${index + 1} id`} value={row.id} onChange={(event) => patchWindow(index, { id: event.target.value })} />
              </Field>
              <Field label="Hand">
                <select aria-label={`Window ${index + 1} hand`} value={row.hand} onChange={(event) => patchWindow(index, { hand: event.target.value as 'RH' | 'LH' })}>
                  <option value="RH">RH</option>
                  <option value="LH">LH</option>
                </select>
              </Field>
              <Field label="Bar">
                <input aria-label={`Window ${index + 1} bar`} value={row.bar} onChange={(event) => patchWindow(index, { bar: event.target.value })} />
              </Field>
              <Field label="Subdivision">
                <select aria-label={`Window ${index + 1} subdivision`} value={row.subdivision} onChange={(event) => patchWindow(index, { subdivision: event.target.value })}>
                  {SUBDIVISIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Offset numerator">
                <input aria-label={`Window ${index + 1} offset numerator`} value={row.offsetN} onChange={(event) => patchWindow(index, { offsetN: event.target.value })} />
              </Field>
              <Field label="Offset denominator">
                <input aria-label={`Window ${index + 1} offset denominator`} value={row.offsetD} onChange={(event) => patchWindow(index, { offsetD: event.target.value })} />
              </Field>
              <Field label="Extent numerator">
                <input aria-label={`Window ${index + 1} extent numerator`} value={row.extentN} onChange={(event) => patchWindow(index, { extentN: event.target.value })} />
              </Field>
              <Field label="Extent denominator">
                <input aria-label={`Window ${index + 1} extent denominator`} value={row.extentD} onChange={(event) => patchWindow(index, { extentD: event.target.value })} />
              </Field>
              <Field label="Rest mask">
                <input aria-label={`Window ${index + 1} rest mask`} value={row.rests} onChange={(event) => patchWindow(index, { rests: event.target.value })} placeholder="false,true,false" />
              </Field>
              <Field label="Material policy">
                <select aria-label={`Window ${index + 1} material`} value={row.material} onChange={(event) => patchWindow(index, { material: event.target.value })}>
                  {MATERIALS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
              <Field label="Linked opposite-hand subdivision">
                <select aria-label={`Window ${index + 1} opposite hand`} value={row.against} onChange={(event) => patchWindow(index, { against: event.target.value })}>
                  <option value="">none</option>
                  {SUBDIVISIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>
            </div>
            <p data-testid={`solo-piano-v11-continuation-${index}`} style={{ margin: '0.4rem 0 0' }}>{windowContinuationText(form, index)}</p>
            <button type="button" className="secondary" onClick={() => patch({ windows: form.windows.filter((_, rowIndex) => rowIndex !== index) })}>
              Remove window
            </button>
          </fieldset>
        ))}
      </div>
    );
  }

  return (
    <fieldset data-testid="solo-piano-v11-controls" style={{ marginTop: '0.75rem', border: '1px solid var(--border, #444)', padding: '0.75rem' }}>
      <legend>Advanced Piano V1.1</legend>
      <button type="button" data-testid="solo-piano-v11-load-demo" onClick={props.onLoadDemonstration}>
        Load Full V1.1 Demonstration
      </button>
      <p data-testid="solo-piano-v11-fingerprint" style={{ marginBottom: 0 }}>
        Request fingerprint {props.identity}
      </p>

      <label htmlFor="solo-piano-v11-phrase" style={{ display: 'block', marginTop: '0.75rem' }}>Phrase development</label>
      <select
        id="solo-piano-v11-phrase"
        data-testid="solo-piano-v11-phrase"
        value={form.phraseDevelopment}
        onChange={(event) => patch({ phraseDevelopment: event.target.value as 'off' | 'on' })}
      >
        <option value="off">OFF</option>
        <option value="on">ON</option>
      </select>
      <label htmlFor="solo-piano-v11-stage-d" style={{ display: 'block', marginTop: '0.75rem' }}>Stage D musical refinement</label>
      <select
        id="solo-piano-v11-stage-d"
        data-testid="solo-piano-v11-stage-d"
        value={form.musicalRefinement}
        onChange={(event) => patch({ musicalRefinement: event.target.value as 'off' | 'on' })}
      >
        <option value="off">OFF — Stage C baseline</option>
        <option value="on">ON — refined dynamics and phrase</option>
      </select>
      {form.phraseDevelopment === 'on' && (
        <ol data-testid="solo-piano-v11-phrase-regions" style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
          {phraseRegions().map((region) => (
            <li key={region.span}>Bars {region.bars[0]}–{region.bars[1]}: {region.intent}</li>
          ))}
        </ol>
      )}

      <label htmlFor="solo-piano-v11-polychord" style={{ display: 'block', marginTop: '0.75rem' }}>Structured upper/lower polychords</label>
      <select
        id="solo-piano-v11-polychord"
        data-testid="solo-piano-v11-polychord"
        value={form.polychordMode}
        onChange={(event) => {
          const mode = event.target.value as PolychordMode;
          patch({
            polychordMode: mode,
            ...(mode === 'acceptance' ? { polychordRegions: acceptanceRegionDrafts() } : {}),
          });
        }}
      >
        <option value="off">OFF</option>
        <option value="acceptance">Acceptance regions (24 bars)</option>
        <option value="single">One polychord for every bar</option>
      </select>
      {form.polychordMode === 'single' && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <input aria-label="Upper root" data-testid="solo-piano-v11-upper-root" value={form.upperRoot} onChange={(event) => patch({ upperRoot: event.target.value })} style={{ width: '4rem' }} />
          <select aria-label="Upper quality" data-testid="solo-piano-v11-upper-quality" value={form.upperQuality} onChange={(event) => patch({ upperQuality: event.target.value as TriadQuality })}>
            {QUALITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input aria-label="Lower root" data-testid="solo-piano-v11-lower-root" value={form.lowerRoot} onChange={(event) => patch({ lowerRoot: event.target.value })} style={{ width: '4rem' }} />
          <select aria-label="Lower quality" data-testid="solo-piano-v11-lower-quality" value={form.lowerQuality} onChange={(event) => patch({ lowerQuality: event.target.value as TriadQuality })}>
            {QUALITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      )}
      {form.polychordMode === 'acceptance' && (
        <div data-testid="solo-piano-v11-polychord-regions" style={{ marginTop: '0.5rem' }}>
          <p style={{ margin: '0 0 0.35rem', color: 'var(--text-muted)' }}>
            Source chord context is the harmony column. Polychord ownership is the upper and lower triads below.
          </p>
          {form.polychordRegions.map((region, index) => (
            <fieldset key={index} style={{ marginTop: '0.45rem', border: '1px solid var(--border, #444)', padding: '0.5rem' }}>
              <legend>Region {index + 1}</legend>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Field label="Start bar">
                  <input aria-label={`Polychord ${index + 1} start`} value={region.startBar} onChange={(event) => patchRegion(index, { startBar: event.target.value })} style={{ width: '4rem' }} />
                </Field>
                <Field label="End bar">
                  <input aria-label={`Polychord ${index + 1} end`} value={region.endBar} onChange={(event) => patchRegion(index, { endBar: event.target.value })} style={{ width: '4rem' }} />
                </Field>
                <Field label="Upper root">
                  <input aria-label={`Polychord ${index + 1} upper root`} value={region.upperRoot} onChange={(event) => patchRegion(index, { upperRoot: event.target.value })} style={{ width: '4rem' }} />
                </Field>
                <Field label="Upper quality">
                  <select aria-label={`Polychord ${index + 1} upper quality`} value={region.upperQuality} onChange={(event) => patchRegion(index, { upperQuality: event.target.value })}>
                    {QUALITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </Field>
                <Field label="Lower root">
                  <input aria-label={`Polychord ${index + 1} lower root`} value={region.lowerRoot} onChange={(event) => patchRegion(index, { lowerRoot: event.target.value })} style={{ width: '4rem' }} />
                </Field>
                <Field label="Lower quality">
                  <select aria-label={`Polychord ${index + 1} lower quality`} value={region.lowerQuality} onChange={(event) => patchRegion(index, { lowerQuality: event.target.value })}>
                    {QUALITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </Field>
              </div>
              <p style={{ margin: '0.35rem 0 0' }}>Source chord context: {sourceChordContext(form.harmony, region)}</p>
              <p style={{ margin: '0.2rem 0 0' }}>
                Polychord ownership: {region.upperRoot || 'missing'} {region.upperQuality} over {region.lowerRoot || 'missing'} {region.lowerQuality}
              </p>
              <p style={{ margin: '0.2rem 0 0' }}>Upper parent members: {parentMemberText(region.upperRoot, region.upperQuality)}</p>
              <p style={{ margin: '0.2rem 0 0' }}>Lower parent members: {parentMemberText(region.lowerRoot, region.lowerQuality)}</p>
              <button type="button" className="secondary" onClick={() => patch({ polychordRegions: form.polychordRegions.filter((_, rowIndex) => rowIndex !== index) })}>
                Remove region
              </button>
            </fieldset>
          ))}
          <button type="button" className="secondary" style={{ marginTop: '0.45rem' }} onClick={() => patch({ polychordRegions: [...form.polychordRegions, emptyPolychordDraft()] })}>
            Add polychord region
          </button>
        </div>
      )}

      <label htmlFor="solo-piano-v11-meter" style={{ display: 'block', marginTop: '0.75rem' }}>Per-bar metre plan</label>
      <select
        id="solo-piano-v11-meter"
        data-testid="solo-piano-v11-meter"
        value={form.meterMode}
        onChange={(event) => {
          const mode = event.target.value as MeterMode;
          patch({
            meterMode: mode,
            ...(mode === 'cycle' ? { meterRows: cycleMeterRows(form.bars) } : {}),
            ...(mode === 'uniform' ? { meterRows: uniformMeterRows(form.bars, form.uniformMeter) } : {}),
          });
        }}
      >
        <option value="legacy">Legacy 4/4</option>
        <option value="uniform">One metre for every bar</option>
        <option value="cycle">Six-metre cycle</option>
      </select>
      {form.meterMode === 'uniform' && (
        <select
          aria-label="Uniform metre"
          data-testid="solo-piano-v11-uniform"
          value={form.uniformMeter}
          onChange={(event) => patch({ uniformMeter: event.target.value, meterRows: uniformMeterRows(form.bars, event.target.value) })}
          style={{ marginLeft: '0.5rem' }}
        >
          {V11_METRE_OPTIONS.map((meter) => <option key={meter.id} value={meter.id}>{meter.id} [{meter.groups.join(',')}]</option>)}
        </select>
      )}
      {form.meterMode !== 'legacy' && (
        <div data-testid="solo-piano-v11-meter-table" style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th>Bar</th>
                <th>Time signature</th>
                <th>Beat grouping</th>
                <th>Validation</th>
              </tr>
            </thead>
            <tbody>
              {form.meterRows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input aria-label={`Metre bar ${index + 1}`} value={row.bar} onChange={(event) => patchMeter(index, { bar: event.target.value })} style={{ width: '3.2rem' }} />
                  </td>
                  <td>
                    <input aria-label={`Metre ${index + 1} numerator`} value={row.numerator} onChange={(event) => patchMeter(index, { numerator: event.target.value })} style={{ width: '3rem' }} />
                    /
                    <input aria-label={`Metre ${index + 1} denominator`} value={row.denominator} onChange={(event) => patchMeter(index, { denominator: event.target.value })} style={{ width: '3rem' }} />
                  </td>
                  <td>
                    <input aria-label={`Metre ${index + 1} grouping`} value={row.groups} onChange={(event) => patchMeter(index, { groups: event.target.value })} style={{ width: '6rem' }} />
                  </td>
                  <td data-testid={`solo-piano-v11-meter-status-${index}`}>{meterRowStatus(row, form.meterRows)}</td>
                  <td>
                    <button type="button" className="secondary" aria-label={`Remove metre bar ${index + 1}`} onClick={() => patch({ meterRows: form.meterRows.filter((_, rowIndex) => rowIndex !== index) })}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label htmlFor="solo-piano-v11-polyrhythm" style={{ display: 'block', marginTop: '0.75rem' }}>Polyrhythm windows</label>
      <select
        id="solo-piano-v11-polyrhythm"
        data-testid="solo-piano-v11-polyrhythm"
        value={form.polyrhythm}
        onChange={(event) => patch({ polyrhythm: event.target.value as Polyrhythm })}
      >
        <option value="off">OFF</option>
        <option value="3:2">3:2</option>
        <option value="5:4">5:4</option>
        <option value="both">3:2 and 5:4</option>
      </select>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <input
          data-testid="solo-piano-v11-explicit-windows"
          type="checkbox"
          checked={form.useExplicitWindows}
          onChange={(event) => patch({ useExplicitWindows: event.target.checked })}
        />
        Edit rhythmic windows
      </label>
      {form.useExplicitWindows && (
        <div data-testid="solo-piano-v11-rhythm-editor">
          {windowTable('RH', rh, 'solo-piano-v11-windows-rh')}
          {windowTable('LH', lh, 'solo-piano-v11-windows-lh')}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <button type="button" className="secondary" onClick={() => patch({ windows: [...form.windows, emptyWindowDraft('RH', form.windows.length)] })}>Add RH window</button>
            <button type="button" className="secondary" onClick={() => patch({ windows: [...form.windows, emptyWindowDraft('LH', form.windows.length)] })}>Add LH window</button>
          </div>
        </div>
      )}

      {props.fieldErrors.length > 0 && (
        <ul data-testid="solo-piano-v11-field-errors" style={{ color: 'var(--danger, #a33)', margin: '0.75rem 0 0', paddingLeft: '1.2rem' }}>
          {props.fieldErrors.map((item) => (
            <li key={`${item.field}:${item.message}`}>{item.field}: {item.message}</li>
          ))}
        </ul>
      )}
      {props.fieldErrors.length > 0 && (
        <p data-testid="solo-piano-v11-error" style={{ color: 'var(--danger, #a33)' }}>
          {props.fieldErrors.map((item) => `${item.field}: ${item.message}`).join('; ')}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" data-testid="solo-piano-v11-save" className="secondary" onClick={props.onSave}>Save configuration</button>
        <button type="button" data-testid="solo-piano-v11-reload" className="secondary" onClick={props.onReload}>Reload configuration</button>
      </div>
      <label htmlFor="solo-piano-v11-config" style={{ display: 'block', marginTop: '0.5rem' }}>Saved configuration</label>
      <textarea
        id="solo-piano-v11-config"
        data-testid="solo-piano-v11-config"
        value={props.configText}
        onChange={(event) => props.onConfigText(event.target.value)}
        rows={8}
        style={{ width: '100%', marginTop: '0.25rem' }}
      />
    </fieldset>
  );
}
