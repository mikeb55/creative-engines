/**
 * Evaluation dashboard route and score loading.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { act, create } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { apiEvaluateMusicalScore } from '@composer-os/app-api/evaluationApp';
import { hashForRoute, routeFromLocation, routeNavLabel } from '../src/router/appRouter';
import { EvaluationDashboardPage } from '../src/evaluation/EvaluationDashboardPage';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><grace/><pitch><step>B</step><octave>3</octave></pitch></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;

function find(tree: ReturnType<typeof create>, testId: string) {
  return tree.root.findAll((node) => node.props?.['data-testid'] === testId)[0];
}

describe('evaluation route', () => {
  it('opens beside BHL, pentatonic and hexatonic', () => {
    expect(routeFromLocation({ hash: '#/evaluation', pathname: '/index.html' })).toBe('evaluation');
    expect(hashForRoute('evaluation')).toBe('#/evaluation');
    expect(routeNavLabel('evaluation')).toBe('Evaluation');
    expect(routeFromLocation({ hash: '#/bhl', pathname: '/evaluation' })).toBe('bhl');
    expect(routeFromLocation({ hash: '#/pentatonic', pathname: '/evaluation' })).toBe('pentatonic');
    expect(routeFromLocation({ hash: '#/hexatonic', pathname: '/evaluation' })).toBe('hexatonic');
  });

  it('registers the desktop evaluation channel without replacing project routes', () => {
    const ipc = fs.readFileSync(path.resolve(__dirname, '../../composer-os-desktop/electron/ipcEntry.ts'), 'utf8');
    expect(ipc).toContain("ipcMain.handle('composer-os-api:evaluation-score'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:evaluation-compare'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:evaluation-review-save'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:bhl-inspect'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:pentatonic-project-save'");
    expect(ipc).toContain("ipcMain.handle('composer-os-api:hexatonic-project-open'");
  });
});

describe('evaluation dashboard', () => {
  it('shows an empty state, then technical findings with bar and event ids', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(EvaluationDashboardPage, {
        transport: { evaluate: async (body) => apiEvaluateMusicalScore(body) as unknown as Record<string, unknown> },
      }));
    });
    expect(find(tree!, 'evaluation-empty').children.join('')).toMatch(/No score loaded/);
    expect(find(tree!, 'evaluation-view-harmonic')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-rhythm')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-comparison')).toBeTruthy();
    expect(find(tree!, 'evaluation-view-review')).toBeTruthy();
    await act(async () => {
      find(tree!, 'evaluation-xml').props.onChange({ target: { value: xml } });
    });
    await act(async () => {
      await find(tree!, 'evaluation-run').props.onClick();
    });
    const sha = find(tree!, 'evaluation-sha256').children.join('');
    expect(sha).toMatch(/SHA-256 [a-f0-9]{64}/);
    const parts = tree!.root.findAll((node) => node.props?.['data-testid'] === 'evaluation-part');
    expect(parts.map((node) => node.props['data-part-id'])).toEqual(['P1', 'P2']);
    const findings = tree!.root.findAll((node) => node.props?.['data-testid'] === 'evaluation-finding');
    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toMatch(/grace:/);
    const graceRow = findings.find((node) => node.props['data-bar'] === 1);
    expect(graceRow).toBeTruthy();
    expect(String(find(tree!, 'evaluation-summary-parse').props['data-status'])).toBe('pass');
    expect(rendered).not.toMatch(/musicalQualityScore/);
    await act(async () => {
      graceRow!.props.onClick();
    });
    expect(find(tree!, 'evaluation-selected-finding').children.join('')).toMatch(/bar 1/);
  });

  it('shows an understandable error for empty MusicXML', async () => {
    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(React.createElement(EvaluationDashboardPage, {
        transport: { evaluate: async (body) => apiEvaluateMusicalScore(body) as unknown as Record<string, unknown> },
      }));
    });
    await act(async () => {
      await find(tree!, 'evaluation-run').props.onClick();
    });
    expect(find(tree!, 'evaluation-error').children.join('')).toMatch(/empty/i);
  });
});
