/**
 * Prosody placeholders — uses author overlay when present (Pattison / Webb / Perricone).
 */

import type { AuthorOverlayBehaviour } from './authorOverlayResolver';
import type { LeadMelodyPlan, MelodyRepetitionTag } from './leadMelodyTypes';
import type { ProsodyPlaceholderPlan, ProsodyLinePlaceholder } from './lyricProsodyTypes';

function authorAlignmentFromOverlay(author: AuthorOverlayBehaviour | null): ProsodyPlaceholderPlan['authorAlignment'] {
  if (!author) return 'none';
  if (author.authorId === 'pat_pattison') return 'pat_pattison';
  if (author.authorId === 'jimmy_webb') return 'jimmy_webb';
  if (author.authorId === 'jack_perricone') return 'jack_perricone';
  return 'none';
}

function stressPatternForBars(barCount: number, seed: number): import('./lyricProsodyTypes').StressCell[] {
  const pat: import('./lyricProsodyTypes').StressCell[] = [];
  for (let i = 0; i < Math.max(4, barCount * 2); i++) {
    pat.push((seed + i) % 3 === 0 ? 'S' : 'w');
  }
  return pat.slice(0, barCount * 2);
}

function emotionalTagForPhrase(
  sectionKind: string,
  repetitionTag: MelodyRepetitionTag
): ProsodyLinePlaceholder['emotionalContourTag'] {
  if (repetitionTag === 'hook_return') return 'lift';
  if (sectionKind === 'bridge') return 'tension';
  if (sectionKind === 'chorus') return 'lift';
  if (sectionKind === 'verse') return 'intimate';
  return 'resolve';
}

export function planProsodyPlaceholders(
  melody: LeadMelodyPlan,
  author: AuthorOverlayBehaviour | null,
  seed: number
): ProsodyPlaceholderPlan {
  const lines: ProsodyLinePlaceholder[] = melody.phrases.map((ph, idx) => {
    const slots = Array.from({ length: ph.phraseLengthBars }, (_, i) => 3 + ((seed + idx + i) % 3));
    return {
      phraseId: ph.phraseId,
      syllableSlots: slots,
      stressPattern: stressPatternForBars(ph.phraseLengthBars, seed + idx),
      emotionalContourTag: emotionalTagForPhrase(ph.sectionKind, ph.repetitionTag),
    };
  });

  let melodicStressAlignmentScore = 0.55;
  if (author?.authorId === 'pat_pattison') melodicStressAlignmentScore = 0.78;
  if (author?.authorId === 'jimmy_webb') melodicStressAlignmentScore = 0.62;
  if (author?.authorId === 'jack_perricone') melodicStressAlignmentScore = 0.7;

  return {
    lines,
    authorAlignment: authorAlignmentFromOverlay(author),
    melodicStressAlignmentScore,
  };
}
