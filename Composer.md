# Composer OS — Composer & Writer Registry

Snapshot: **2026-06-06**

Canonical sources: `apps/composer-os-app/src/pages/HomeGenerate.tsx` (UI), `engines/composer-os-v2/core/song-mode/songwritingResearchTypes.ts` (`SongwriterRuleId`), `engines/composer-os-v2/core/mosaic-mode/mosaicComposerDispatch.ts` (Mosaic slices), `engines/composer-os-v2/core/composer/voiceRuleBundles.ts` (VRB), `engines/composer-os-v2/core/composer/attachVoiceRuleBundle.ts` (auto-resolve).

---

## Summary

| Category | Count |
|---|---|
| Generate UI songwriter rows (primary + rhythm) | **118** |
| Shipped (full golden-path slice) optgroup | **36** |
| String Quartet VRB family | **14** |
| Arranger dropdown rows | **52** |
| Mosaic Mode slice authorities | **77** |
| `SongwriterRuleId` engine union | **140** |
| Riff-generator VRBs | **15** |
| Auto-resolve songwriter → VRB | **20** |
| Lyric authors | **3** |
| Classical song overlay rules | **3** |

---

## 1. Shipped — Full Golden-Path Slice (36)

Selectable in Generate → **Shipped (full slice)** optgroup.

| id | label |
|---|---|
| `brian_wilson` | Brian Wilson |
| `stevie_wonder` | Stevie Wonder |
| `radiohead` | Radiohead |
| `james_brown` | James Brown |
| `pat_metheny` | Pat Metheny |
| `jim_hall` | Jim Hall |
| `wayne_shorter` | Wayne Shorter |
| `barry_harris` | Barry Harris |
| `stephen_sondheim` | Stephen Sondheim |
| `kate_bush` | Kate Bush |
| `thelonious_monk` | Thelonious Monk |
| `beatles` | Beatles |
| `mccoy_tyner` | McCoy Tyner |
| `gershwin` | Gershwin |
| `cole_porter` | Cole Porter |
| `andrew_hill` | Andrew Hill |
| `charlie_parker` | Charlie Parker |
| `thad_jones` | Thad Jones |
| `count_basie` | Count Basie |
| `bill_evans` | Bill Evans |
| `satie` | Erik Satie |
| `steve_reich` | Steve Reich |
| `fripp_king_crimson` | Fripp / King Crimson |
| `fripp` | Robert Fripp (Systems) |
| `miles_davis` | Miles Davis |
| `bacharach` | Bacharach |
| `donald_fagen` | Donald Fagen |
| `frank_zappa` | Frank Zappa |
| `ecm_chamber` | ECM Chamber |
| `antonio_carlos_jobim` | Antônio Carlos Jobim |
| `herbie_hancock` | Herbie Hancock |
| `billy_strayhorn` | Billy Strayhorn |
| `don_sebesky` | Don Sebesky |
| `johnny_mandel` | Johnny Mandel |
| `claus_ogerman` | Claus Ogerman |
| `joni_mitchell` | Joni Mitchell *(Singer-Songwriter subgroup)* |

---

## 2. Generate UI — Library Songwriters (71)

All other primary `SONGWRITER_OPTIONS` rows (alphabetical in UI).

| id | label |
|---|---|
| `allan_holdsworth` | Allan Holdsworth |
| `angelo_badalamenti` | Angelo Badalamenti |
| `arvo_part` | Arvo Pärt (Tintinnabuli) |
| `bach` | Bach |
| `beefheart` | Captain Beefheart |
| `beethoven` | Beethoven |
| `beethoven_late` | Beethoven (Late Quartets) |
| `bartok` | Bartók (String Quartets) |
| `bernard_herrmann` | Bernard Herrmann |
| `bill_holman` | Bill Holman |
| `carla_bley` | Carla Bley |
| `bob_dylan` | Bob Dylan |
| `carole_king` | Carole King |
| `crumb_black_angels` | Crumb (Black Angels) |
| `debussy` | Debussy |
| `dutilleux` | Dutilleux |
| `duke_ellington` | Duke Ellington |
| `eddie_van_halen` | Eddie Van Halen |
| `eberhard_weber` | Eberhard Weber |
| `ennio_morricone` | Ennio Morricone |
| `gil_evans` | Gil Evans |
| `hans_zimmer` | Hans Zimmer |
| `henry_threadgill` | Henry Threadgill |
| `charles_mingus` | Charles Mingus |
| `holland_dozier_holland` | Holland-Dozier-Holland |
| `jack_white` | Jack White |
| `jan_garbarek` | Jan Garbarek |
| `jeff_lynne` | Jeff Lynne |
| `jeff_tweedy` | Jeff Tweedy |
| `jerry_goldsmith` | Jerry Goldsmith |
| `joe_pass` | Joe Pass |
| `john_barry` | John Barry |
| `john_coltrane` | John Coltrane |
| `john_surman` | John Surman |
| `john_williams` | John Williams |
| `kendrick_lamar` | Kendrick Lamar |
| `kenny_wheeler` | Kenny Wheeler |
| `kurt_weill` | Kurt Weill |
| `lachenmann` | Lachenmann |
| `lalo_schifrin` | Lalo Schifrin |
| `ligeti` | Ligeti |
| `mahler` | Mahler |
| `maria_schneider` | Maria Schneider |
| `max_martin` | Max Martin |
| `marr` | Johnny Marr |
| `messiaen` | Messiaen |
| `nino_rota` | Nino Rota |
| `norman_whitfield` | Norman Whitfield |
| `ornette_coleman` | Ornette Coleman (Harmolodics) |
| `paul_mccartney` | Paul McCartney |
| `paul_simon` | Paul Simon |
| `philip_glass` | Philip Glass |
| `prince` | Prince |
| `prokofiev` | Prokofiev |
| `quincy_jones_film` | Quincy Jones |
| `ralph_towner` | Ralph Towner |
| `randy_newman` | Randy Newman |
| `ravel` | Ravel |
| `reich_glass` | Reich / Glass |
| `richard_thompson` | Richard Thompson |
| `schubert` | Schubert |
| `scott_henderson` | Scott Henderson |
| `shostakovich` | Shostakovich |
| `smokey_robinson` | Smokey Robinson |
| `sonic_youth` | Sonic Youth |
| `stravinsky` | Stravinsky |
| `turtle_island` | Turtle Island Quartet |
| `dave_brubeck` | Dave Brubeck |
| `verlaine` | Tom Verlaine |
| `wes_montgomery` | Wes Montgomery |
| `xtc` | XTC |

---

## 3. Rhythm Engines (11)

Rhythm-only blend rows — excluded from primary Style Panel; available in rhythm blend dropdown.

| id | label |
|---|---|
| `fela_kuti` | Fela Kuti / Tony Allen |
| `greek_rebetiko` | Greek Rebetiko |
| `brazilian` | Brazilian |
| `new_orleans_second_line` | New Orleans Second Line |
| `cuban_afro_cuban` | Cuban / Afro-Cuban |
| `bartok_bulgarian_aksak` | Bartók / Bulgarian Aksak |
| `free_proportional` | Free / Proportional |
| `baroque_dance` | Baroque Dance |
| `reich_phasing_grid` | Reich / Phasing Grid |
| `viennese_waltz` | Viennese Waltz |
| `jewish_klezmer` | Jewish / Klezmer |

---

## 4. String Quartet VRB Family (14)

Harmonic-voice optgroup on String Quartet preset. Each has a shipped `VoiceRuleBundle`.

| UI id | label | VRB `voiceId` |
|---|---|---|
| `beethoven_late` | Beethoven (Late Quartets) | `beethoven_late` |
| `bartok` | Bartók (String Quartets) | `bartok` |
| `ravel` | Ravel | `ravel` |
| `debussy` | Debussy | `debussy` |
| `dutilleux` | Dutilleux | `dutilleux` |
| `messiaen` | Messiaen | `messiaen` |
| `ligeti` | Ligeti | `ligeti` |
| `arvo_part` | Arvo Pärt (Tintinnabuli) | `part` |
| `satie` | Erik Satie | `satie` |
| `reich_glass` | Reich / Glass | `reich_glass` |
| `shostakovich` | Shostakovich | `shostakovich` |
| `turtle_island` | Turtle Island Quartet | `turtle_island` |
| `crumb_black_angels` | Crumb (Black Angels) | `crumb_black_angels` |
| `lachenmann` | Lachenmann | `lachenmann` |

**Additional shipped VRBs** (not SQ-family): `gershwin`, `cole_porter`, `ornette_coleman`, `coltrane`, `jobim`, `berg`, `radiohead`, `thelonious_monk`.

---

## 5. Harmonic Voice Subgroups

### Jazz Masters (10)

`gil_evans` · `john_coltrane` · `jim_hall` · `maria_schneider` · `kenny_wheeler` · `wayne_shorter` · `henry_threadgill` · `charles_mingus` · `count_basie` · `pat_metheny`

### Film (11)

`ennio_morricone` · `bernard_herrmann` · `john_williams` · `nino_rota` · `jerry_goldsmith` · `lalo_schifrin` · `john_barry` · `philip_glass` · `hans_zimmer` · `angelo_badalamenti` · `quincy_jones_film`

---

## 6. Arrangers (52)

### Big Band Core (11)

| arranger id | label |
|---|---|
| `ellington` | Duke Ellington |
| `strayhorn` | Billy Strayhorn |
| `basie` | Count Basie |
| `thad` | Thad Jones |
| `schneider` | Maria Schneider |
| `wheeler` | Kenny Wheeler |
| `quincy_jones` | Quincy Jones |
| `gil_evans` | Gil Evans |
| `bob_brookmeyer` | Bob Brookmeyer |
| `holman` | Bill Holman |
| `clare_fischer` | Clare Fischer |

### SQ VRB Arrangers — String Quartet preset only (15)

`beethoven_late` · `bartok` · `ravel` · `dutilleux` · `ligeti` · `reich_glass` · `shostakovich` · `turtle_island` · `crumb_black_angels` · `lachenmann` · `arvo_part` · `satie` · `gershwin` · `cole_porter` · `ornette_coleman`

### Extended / Charts & Studio / Guitar (26)

| arranger id | label |
|---|---|
| `sammy_nestico` | Sammy Nestico |
| `bley` | Carla Bley |
| `manny_albam` | Manny Albam |
| `oliver_nelson` | Oliver Nelson |
| `gerald_wilson` | Gerald Wilson |
| `neal_hefti` | Neal Hefti |
| `don_sebesky` | Don Sebesky |
| `mandel` | Johnny Mandel |
| `ogerman` | Claus Ogerman |
| `schifrin` | Lalo Schifrin |
| `barry` | John Barry |
| `garbarek` | Jan Garbarek |
| `surman` | John Surman |
| `towner` | Ralph Towner |
| `evh` | Eddie Van Halen |
| `holdsworth` | Allan Holdsworth |
| `jack_white` | Jack White |
| `beefheart` | Captain Beefheart |
| `fripp` | Robert Fripp (Systems) |
| `marr` | Johnny Marr |
| `sonic_youth` | Sonic Youth |
| `wes` | Wes Montgomery |
| `pass` | Joe Pass |
| `scott_henderson` | Scott Henderson |

---

## 7. Mosaic Mode — Slice Authorities (77)

Composers with `precompute*EffectiveHarmonyBars` wiring in `mosaicComposerDispatch.ts`.

`andrew_hill` · `angelo_badalamenti` · `antonio_carlos_jobim` · `arvo_part` · `bacharach` · `barry_harris` · `bartok` · `beatles` · `beefheart` · `berg` · `bernard_herrmann` · `bill_evans` · `bill_holman` · `billy_strayhorn` · `bob_brookmeyer` · `brian_wilson` · `carla_bley` · `charles_mingus` · `charlie_parker` · `clare_fischer` · `claus_ogerman` · `cole_porter` · `count_basie` · `debussy` · `don_sebesky` · `donald_fagen` · `duke_ellington` · `ecm_chamber` · `eberhard_weber` · `ennio_morricone` · `fela_kuti` · `frank_zappa` · `fripp` · `fripp_king_crimson` · `gershwin` · `gil_evans` · `hans_zimmer` · `henry_threadgill` · `herbie_hancock` · `jack_white` · `james_brown` · `jan_garbarek` · `jim_hall` · `jerry_goldsmith` · `john_barry` · `john_coltrane` · `john_surman` · `john_williams` · `johnny_mandel` · `joni_mitchell` · `kate_bush` · `kenny_wheeler` · `lalo_schifrin` · `marr` · `maria_schneider` · `mccoy_tyner` · `messiaen` · `miles_davis` · `nino_rota` · `oliver_nelson` · `pat_metheny` · `philip_glass` · `prince` · `quincy_jones` · `radiohead` · `ralph_towner` · `sammy_nestico` · `satie` · `sonic_youth` · `stephen_sondheim` · `steve_reich` · `stevie_wonder` · `thad_jones` · `thelonious_monk` · `verlaine` · `wayne_shorter` · `allan_holdsworth`

### Mosaic Motif Transform Prefixes

| songwriter id | prefix | notes |
|---|---|---|
| `fripp` | `rf` | sequence + onset rotation |
| `fripp_king_crimson` | `fk` | |
| `jack_white` | `jw` | blues interior snap |
| `verlaine` | `tv` | stepwise bias |
| `marr` | `jma` | +1 semitone sequence |
| `wayne_shorter` | `ws` | interpolation + onset shift |
| *(others)* | first token of id | e.g. `brian` ← `brian_wilson` |

**Prefix collision note:** `bh:*` = Barry Harris (not James Brown `jb:*`). `ah:*` = Andrew Hill (not Allan Holdsworth). `jw:*` = Jack White (not John Williams `jwill:*`).

---

## 8. Auto-Resolve Songwriter → VRB (20)

Picking these as primary songwriter auto-attaches matching VRB without explicit harmonic-voice selection.

`radiohead` · `debussy` · `beethoven_late` · `turtle_island` · `reich_glass` · `shostakovich` · `lachenmann` · `ligeti` · `crumb_black_angels` · `dutilleux` · `antonio_carlos_jobim` · `arvo_part` · `satie` · `ornette_coleman` · `gershwin` · `cole_porter` · `billy_strayhorn` · `don_sebesky` · `johnny_mandel` · `john_barry`

---

## 9. Riff-Generator VRBs (15)

| id | family |
|---|---|
| `james_brown` | funk |
| `nile_rodgers` | funk |
| `larry_carlton` | funk |
| `sly_stone` | funk |
| `iommi` | rock |
| `david_gilmour` | rock |
| `hendrix` | rock |
| `led_zeppelin` | rock |
| `eddie_van_halen` | rock |
| `weather_report` | fusion |
| `mahavishnu` | fusion |
| `verlaine` | art_rock |
| `morello` | art_rock |
| `fripp` | art_rock |
| `frank_zappa` | rock |

---

## 10. Engine-Only — In `SongwriterRuleId` but Not in Generate UI (22)

| id | notes |
|---|---|
| `sammy_nestico` | arranger dropdown only |
| `bob_brookmeyer` | arranger dropdown only |
| `clare_fischer` | arranger dropdown only |
| `manny_albam` | arranger dropdown only |
| `gerald_wilson` | arranger dropdown only |
| `neal_hefti` | arranger dropdown only |
| `quincy_jones` | distinct from UI `quincy_jones_film` |
| `berg` | mosaic slice; no UI row |
| `arcade_fire` | profile stub |
| `blur` | profile stub |
| `pavement` | profile stub |
| `nile_rodgers` | riff VRB |
| `larry_carlton` | riff VRB |
| `sly_stone` | riff VRB |
| `iommi` | riff VRB |
| `david_gilmour` | riff VRB |
| `hendrix` | riff VRB |
| `led_zeppelin` | riff VRB |
| `weather_report` | riff VRB |
| `mahavishnu` | riff VRB |
| `morello` | riff VRB |
| `ornette_coleman` | in UI; also VRB |

---

## 11. Lyric Authors (3)

Separate from `SongwriterRuleId` — `AuthorRuleId` in `songwritingResearchTypes.ts`.

| id | |
|---|---|
| `jimmy_webb` | |
| `pat_pattison` | |
| `jack_perricone` | |

---

## 12. Classical Song Overlay Rules (3)

`ClassicalSongRuleId` — blended scalar nudges beside lyric author in Song Mode.

| id | |
|---|---|
| `schubert` | also in UI as planning stub |
| `schumann` | |
| `faure` | |

---

## 13. Master Alphabetical Index — All UI Composers (118)

Sorted by display label. Includes primary + rhythm rows.

| label | id |
|---|---|
| Allan Holdsworth | `allan_holdsworth` |
| Andrew Hill | `andrew_hill` |
| Angelo Badalamenti | `angelo_badalamenti` |
| Antônio Carlos Jobim | `antonio_carlos_jobim` |
| Arvo Pärt (Tintinnabuli) | `arvo_part` |
| Bach | `bach` |
| Bacharach | `bacharach` |
| Barry Harris | `barry_harris` |
| Bartók (String Quartets) | `bartok` |
| Bartók / Bulgarian Aksak | `bartok_bulgarian_aksak` |
| Baroque Dance | `baroque_dance` |
| Beatles | `beatles` |
| Beethoven | `beethoven` |
| Beethoven (Late Quartets) | `beethoven_late` |
| Bernard Herrmann | `bernard_herrmann` |
| Bill Evans | `bill_evans` |
| Bill Holman | `bill_holman` |
| Billy Strayhorn | `billy_strayhorn` |
| Bob Dylan | `bob_dylan` |
| Brazilian | `brazilian` |
| Brian Wilson | `brian_wilson` |
| Captain Beefheart | `beefheart` |
| Carla Bley | `carla_bley` |
| Carole King | `carole_king` |
| Charlie Parker | `charlie_parker` |
| Charles Mingus | `charles_mingus` |
| Claus Ogerman | `claus_ogerman` |
| Cole Porter | `cole_porter` |
| Count Basie | `count_basie` |
| Crumb (Black Angels) | `crumb_black_angels` |
| Cuban / Afro-Cuban | `cuban_afro_cuban` |
| Dave Brubeck | `dave_brubeck` |
| Debussy | `debussy` |
| Donald Fagen | `donald_fagen` |
| Don Sebesky | `don_sebesky` |
| Duke Ellington | `duke_ellington` |
| Dutilleux | `dutilleux` |
| ECM Chamber | `ecm_chamber` |
| Eddie Van Halen | `eddie_van_halen` |
| Eberhard Weber | `eberhard_weber` |
| Ennio Morricone | `ennio_morricone` |
| Erik Satie | `satie` |
| Fela Kuti / Tony Allen | `fela_kuti` |
| Frank Zappa | `frank_zappa` |
| Fripp / King Crimson | `fripp_king_crimson` |
| Free / Proportional | `free_proportional` |
| Gershwin | `gershwin` |
| Gil Evans | `gil_evans` |
| Greek Rebetiko | `greek_rebetiko` |
| Hans Zimmer | `hans_zimmer` |
| Henry Threadgill | `henry_threadgill` |
| Herbie Hancock | `herbie_hancock` |
| Holland-Dozier-Holland | `holland_dozier_holland` |
| Jack White | `jack_white` |
| James Brown | `james_brown` |
| Jan Garbarek | `jan_garbarek` |
| Jeff Lynne | `jeff_lynne` |
| Jeff Tweedy | `jeff_tweedy` |
| Jerry Goldsmith | `jerry_goldsmith` |
| Jewish / Klezmer | `jewish_klezmer` |
| Jim Hall | `jim_hall` |
| Joe Pass | `joe_pass` |
| John Barry | `john_barry` |
| John Coltrane | `john_coltrane` |
| John Surman | `john_surman` |
| John Williams | `john_williams` |
| Johnny Mandel | `johnny_mandel` |
| Johnny Marr | `marr` |
| Joni Mitchell | `joni_mitchell` |
| Kate Bush | `kate_bush` |
| Kendrick Lamar | `kendrick_lamar` |
| Kenny Wheeler | `kenny_wheeler` |
| Kurt Weill | `kurt_weill` |
| Lachenmann | `lachenmann` |
| Lalo Schifrin | `lalo_schifrin` |
| Ligeti | `ligeti` |
| Mahler | `mahler` |
| Maria Schneider | `maria_schneider` |
| Max Martin | `max_martin` |
| McCoy Tyner | `mccoy_tyner` |
| Messiaen | `messiaen` |
| Miles Davis | `miles_davis` |
| New Orleans Second Line | `new_orleans_second_line` |
| Nino Rota | `nino_rota` |
| Norman Whitfield | `norman_whitfield` |
| Ornette Coleman (Harmolodics) | `ornette_coleman` |
| Pat Metheny | `pat_metheny` |
| Paul McCartney | `paul_mccartney` |
| Paul Simon | `paul_simon` |
| Philip Glass | `philip_glass` |
| Prince | `prince` |
| Prokofiev | `prokofiev` |
| Quincy Jones | `quincy_jones_film` |
| Radiohead | `radiohead` |
| Randy Newman | `randy_newman` |
| Ravel | `ravel` |
| Reich / Glass | `reich_glass` |
| Reich / Phasing Grid | `reich_phasing_grid` |
| Richard Thompson | `richard_thompson` |
| Robert Fripp (Systems) | `fripp` |
| Schubert | `schubert` |
| Scott Henderson | `scott_henderson` |
| Shostakovich | `shostakovich` |
| Smokey Robinson | `smokey_robinson` |
| Sonic Youth | `sonic_youth` |
| Stephen Sondheim | `stephen_sondheim` |
| Steve Reich | `steve_reich` |
| Stevie Wonder | `stevie_wonder` |
| Stravinsky | `stravinsky` |
| Thad Jones | `thad_jones` |
| Thelonious Monk | `thelonious_monk` |
| Tom Verlaine | `verlaine` |
| Turtle Island Quartet | `turtle_island` |
| Viennese Waltz | `viennese_waltz` |
| Wayne Shorter | `wayne_shorter` |
| Wes Montgomery | `wes_montgomery` |
| XTC | `xtc` |

---

## Registry File Reference

| What | Where |
|---|---|
| UI songwriter dropdown | `apps/composer-os-app/src/pages/HomeGenerate.tsx` → `SONGWRITER_OPTIONS` |
| Shipped optgroup order | `SONGWRITER_GROUP_SHIPPED_ORDER` |
| Arranger dropdown | `ARRANGER_OPTIONS` |
| Engine type union | `engines/composer-os-v2/core/song-mode/songwritingResearchTypes.ts` |
| Style profiles | `engines/composer-os-v2/core/song-mode/songwriterStyleProfiles.ts` |
| VRB bundles | `engines/composer-os-v2/core/composer/voiceRuleBundles.ts` |
| Mosaic slices | `engines/composer-os-v2/core/mosaic-mode/mosaicComposerDispatch.ts` |
| Mosaic motif prefixes | `engines/composer-os-v2/core/mosaic-mode/mosaicMotifEngine.ts` |
| Riff VRBs | `engines/composer-os-v2/core/riff-generator/riffVrbRegistry.ts` |
| Line-first duo VRBs | `engines/composer-os-v2/core/goldenPath/lineFirstDuoEngineVrbIds.ts` |
