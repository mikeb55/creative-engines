/**
 * Phase 1.5 RiffGen — corpus QA + phrase browser + GenerateIsland (S3).
 * Phrase library stays read-only; generate uses presetId riff_generator only.
 */
import { useEffect, useMemo, useState } from 'react';
import { api, type RiffPhraseCorpusDto } from '../services/api';
import { RiffGenCorpusQaPanel } from '../components/riffgen/RiffGenCorpusQaPanel';
import { RiffGenPhraseBrowser } from '../components/riffgen/RiffGenPhraseBrowser';
import { RiffGenGenerateIsland } from '../components/riffgen/RiffGenGenerateIsland';

export function RiffGenPage() {
  const [corpus, setCorpus] = useState<RiffPhraseCorpusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .getRiffPhraseCorpus()
      .then((data) => {
        if (cancelled) return;
        setCorpus(data);
        if (!data.ok) setError(data.error ?? 'Corpus not available');
      })
      .catch((e) => {
        if (cancelled) return;
        setCorpus(null);
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const banner = useMemo(() => {
    if (loading) return 'Loading derived corpus…';
    if (error) return error;
    if (!corpus?.ok) return corpus?.error ?? 'Corpus unavailable';
    return null;
  }, [loading, error, corpus]);

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>RiffGen</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Phase 1.5 — corpus inspect + generate island. Melody path unchanged. Generate uses{' '}
          <code>presetId: riff_generator</code> (same as Home). Phrases.jsonl not wired into engine.
        </p>
      </header>

      {banner ? (
        <p
          role="status"
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid var(--border)',
            borderRadius: 4,
            marginBottom: '1rem',
            background: 'var(--surface-2, transparent)',
          }}
        >
          {banner}
        </p>
      ) : null}

      {corpus ? (
        <>
          <RiffGenCorpusQaPanel corpus={corpus} />
          <RiffGenPhraseBrowser
            phrases={corpus.phrases}
            registeredCategories={Object.keys(corpus.stats.byCategory)}
          />
        </>
      ) : null}

      <RiffGenGenerateIsland />
    </div>
  );
}