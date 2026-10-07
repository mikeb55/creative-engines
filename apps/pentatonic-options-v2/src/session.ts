/**
 * Local practice memory. No musical decisions.
 */

export interface HistoryRow {
  id: string;
  category: string;
  field: string;
  operator: string;
  notes: string;
  exported: boolean;
  favourite: boolean;
  variation: number;
}

export interface PracticeSession {
  cursor: number;
  rows: HistoryRow[];
}

export function emptySession(): PracticeSession {
  return { cursor: -1, rows: [] };
}

export function rememberExample(session: PracticeSession, row: Omit<HistoryRow, 'id' | 'favourite'> & { id?: string }): PracticeSession {
  const next: HistoryRow = {
    id: row.id ?? `ex-${session.rows.length + 1}`,
    category: row.category,
    field: row.field,
    operator: row.operator,
    notes: row.notes,
    exported: row.exported,
    favourite: false,
    variation: row.variation,
  };
  const rows = [...session.rows, next];
  return { rows, cursor: rows.length - 1 };
}

export function stepSession(session: PracticeSession, direction: -1 | 1): PracticeSession {
  if (session.rows.length === 0) return session;
  const cursor = Math.min(session.rows.length - 1, Math.max(0, session.cursor + direction));
  return { ...session, cursor };
}

export function markExported(session: PracticeSession, id: string): PracticeSession {
  return {
    ...session,
    rows: session.rows.map((row) => (row.id === id ? { ...row, exported: true } : row)),
  };
}

export function toggleFavourite(session: PracticeSession, id: string): PracticeSession {
  return {
    ...session,
    rows: session.rows.map((row) => (row.id === id ? { ...row, favourite: !row.favourite } : row)),
  };
}

export function favouriteRows(session: PracticeSession): HistoryRow[] {
  return session.rows.filter((row) => row.favourite);
}
