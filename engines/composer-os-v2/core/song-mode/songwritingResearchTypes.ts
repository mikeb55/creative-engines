/**
 * Structured songwriting research types (Songwriting.md → rules; no prose API surface).
 */

export type SongwriterRuleId =
  | 'bacharach'
  | 'barry_harris'
  | 'ecm_chamber'
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
  | 'bill_evans'
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
  | 'kenny_wheeler'
  | 'jan_garbarek'
  | 'bill_holman'
  | 'carla_bley'
  | 'clare_fischer'
  | 'manny_albam'
  | 'oliver_nelson'
  | 'gerald_wilson'
  | 'neal_hefti'
  | 'don_sebesky'
  | 'arcade_fire'
  | 'blur'
  | 'pavement'
  | 'radiohead'
  | 'sonic_youth'
  | 'wayne_shorter'
  | 'pat_metheny'
  | 'andrew_hill'
  | 'antonio_carlos_jobim'
  | 'herbie_hancock'
  | 'henry_threadgill'
  | 'charles_mingus'
  | 'count_basie'
  | 'stephen_sondheim'
  | 'kate_bush'
  | 'thelonious_monk'
  | 'charlie_parker'
  | 'cole_porter'
  | 'dave_brubeck'
  | 'miles_davis'
  | 'mccoy_tyner'
  | 'bartok'
  | 'berg'
  | 'gershwin'
  | 'arvo_part'
  | 'satie'
  | 'fela_kuti'
  | 'greek_rebetiko'
  | 'brazilian'
  | 'new_orleans_second_line'
  | 'cuban_afro_cuban'
  | 'bartok_bulgarian_aksak'
  | 'free_proportional'
  | 'baroque_dance'
  | 'reich_phasing_grid'
  | 'viennese_waltz'
  | 'jewish_klezmer'
  | 'bernard_herrmann'
  | 'john_williams'
  | 'ennio_morricone'
  | 'nino_rota'
  | 'jerry_goldsmith'
  | 'philip_glass'
  | 'hans_zimmer'
  | 'angelo_badalamenti'
  | 'quincy_jones_film'
  | 'john_coltrane'
  | 'jim_hall'
  | 'steve_reich'
  | 'frank_zappa'
  | 'nile_rodgers'
  | 'larry_carlton'
  | 'wes_montgomery'
  | 'joe_pass'
  | 'allan_holdsworth'
  | 'scott_henderson'
  | 'sly_stone'
  | 'iommi'
  | 'david_gilmour'
  | 'hendrix'
  | 'eddie_van_halen'
  | 'led_zeppelin'
  | 'weather_report'
  | 'mahavishnu'
  | 'verlaine'
  | 'morello'
  | 'fripp'
  | 'fripp_king_crimson'
  | 'beethoven_late'
  | 'turtle_island'
  | 'reich_glass'
  | 'lachenmann'
  | 'ligeti'
  | 'crumb_black_angels'
  | 'dutilleux'
  | 'ornette_coleman';

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
