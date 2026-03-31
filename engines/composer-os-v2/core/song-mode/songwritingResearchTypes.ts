/**
 * Structured songwriting research types (Songwriting.md → rules; no prose API surface).
 */

export type SongwriterRuleId =
  | 'bacharach'
  | 'stevie_wonder'
  | 'beatles'
  | 'joni_mitchell'
  | 'donald_fagen'
  | 'bob_dylan'
  | 'paul_simon'
  | 'jeff_tweedy'
  | 'carole_king'
  | 'smokey_robinson'
  | 'randy_newman'
  | 'richard_thompson'
  | 'max_martin'
  | 'brian_wilson'
  | 'paul_mccartney'
  | 'jeff_lynne'
  | 'xtc'
  | 'kurt_weill'
  | 'holland_dozier_holland'
  | 'norman_whitfield'
  | 'bach'
  | 'beethoven'
  | 'debussy'
  | 'stravinsky'
  | 'ravel'
  | 'schubert'
  | 'mahler'
  | 'prokofiev'
  | 'shostakovich'
  | 'messiaen'
  | 'duke_ellington'
  | 'billy_strayhorn'
  | 'james_brown'
  | 'prince'
  | 'kendrick_lamar'
  | 'gil_evans'
  | 'thad_jones'
  | 'sammy_nestico'
  | 'quincy_jones'
  | 'bob_brookmeyer'
  | 'maria_schneider'
  | 'clare_fischer'
  | 'manny_albam'
  | 'oliver_nelson'
  | 'gerald_wilson'
  | 'neal_hefti'
  | 'don_sebesky';

export type AuthorRuleId = 'jimmy_webb' | 'pat_pattison' | 'jack_perricone';

export type ClassicalSongRuleId = 'schubert' | 'schumann' | 'faure';

export type FoundationalRuleCategory = 'hook' | 'melody' | 'harmony' | 'lyric_prosody';

export type SongwritingEffectType =
  | 'melody'
  | 'harmony'
  | 'form'
  | 'hook'
  | 'lyric'
  | 'rhythm';

export interface SongwritingRuleEntry {
  id: string;
  description: string;
  category: 'songwriter' | 'author' | 'classical' | 'foundational';
  effectType: SongwritingEffectType;
  /** 1 = low, 10 = high — planning tie-breaker. */
  priority: number;
  /** Where the rule is intended to apply in planning. */
  applicability: 'global' | 'verse' | 'chorus' | 'bridge' | 'pre_chorus' | 'form';
}

export interface SongwriterResearchBlock {
  songwriterId: SongwriterRuleId;
  displayName: string;
  engineRuleLines: string[];
}

export interface AuthorResearchBlock {
  authorId: AuthorRuleId;
  displayName: string;
  engineRuleLines: string[];
}

export interface ClassicalResearchBlock {
  classicalId: ClassicalSongRuleId;
  displayName: string;
  engineRuleLines: string[];
}

export interface ParsedSongwritingResearch {
  ok: boolean;
  errors: string[];
  songwriters: Partial<Record<SongwriterRuleId, SongwriterResearchBlock>>;
  authors: Partial<Record<AuthorRuleId, AuthorResearchBlock>>;
  classical: Partial<Record<ClassicalSongRuleId, ClassicalResearchBlock>>;
  hooksAndStructure: string[];
  melodySystems: string[];
  harmonySystems: string[];
  lyricProsody: string[];
  minimumViableEngine: string[];
  stats: {
    songwriterRuleLines: number;
    authorRuleLines: number;
    classicalRuleLines: number;
    hooksAndStructureLines: number;
    melodySystemsLines: number;
    harmonySystemsLines: number;
    lyricProsodyLines: number;
    minimumViableLines: number;
  };
}

export interface SongwritingRuleRegistryShape {
  songwriterRules: Record<SongwriterRuleId, SongwritingRuleEntry[]>;
  authorRules: Record<AuthorRuleId, SongwritingRuleEntry[]>;
  classicalSongRules: Record<ClassicalSongRuleId, SongwritingRuleEntry[]>;
  foundationalRules: Record<FoundationalRuleCategory, SongwritingRuleEntry[]>;
}
