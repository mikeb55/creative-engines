export interface SubjectiveScores {
  emotionalCore: { score: number; justification: string };
  arrangement: { score: number; justification: string };
  afterglow: { score: number; justification: string };
  lyricCraft: { score: number; justification: string };
}

export async function scoreSubjectiveCategories(
  chords: string[],
  songwriterStyle: string,
  noteCount: number,
  restRatio: number
): Promise<SubjectiveScores> {
  const apiKey = typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined;
  if (!apiKey?.trim()) {
    const j = 'Skipped (set ANTHROPIC_API_KEY for Claude subjective categories)';
    return {
      emotionalCore: { score: 5, justification: j },
      arrangement: { score: 5, justification: j },
      afterglow: { score: 5, justification: j },
      lyricCraft: { score: 5, justification: j },
    };
  }

  const prompt = `You are a GCE music evaluator. Score 0-10
with one-line justification per category.

Songwriter style: ${songwriterStyle}
Chord progression (${chords.length} bars):
${chords.slice(0, 16).join(' | ')}
${chords.slice(16).join(' | ')}
Melody: ${noteCount} notes, ${Math.round(restRatio * 100)}% rests

Score these four categories honestly and critically:

1. EMOTIONAL CORE: Does the harmonic language suggest a
   clear emotional identity consistent with ${songwriterStyle}?
   FAIL if vague or generic jazz.

2. ARRANGEMENT: Based on chord density and variety, does
   this suggest foreground/background hierarchy and
   section-based variation?
   FAIL if everything plays constantly.

3. AFTERGLOW: Is there a memorable harmonic identity or
   standout progression moment?
   FAIL if forgettable or interchangeable with any style.

4. LYRIC CRAFT POTENTIAL: Does the harmonic rhythm and
   phrasing suggest space for lyrics and melodic hooks?
   FAIL if too dense or too sparse for vocal phrasing.

Respond ONLY as valid JSON, no markdown:
{
  "emotionalCore": {"score": 0, "justification": "..."},
  "arrangement": {"score": 0, "justification": "..."},
  "afterglow": {"score": 0, "justification": "..."},
  "lyricCraft": {"score": 0, "justification": "..."}
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey
        ? {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          }
        : {}),
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('') ?? '';

  return JSON.parse(text) as SubjectiveScores;
}
