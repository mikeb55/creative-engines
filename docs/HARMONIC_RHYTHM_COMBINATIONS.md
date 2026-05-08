# Harmonic + rhythm combinations — Composer OS handbook

Reference pairings for **Harmonic Voice** + **Rhythm Engine** in Song Mode. Prefixes match generation context keys: **`fk`** Fela Kuti Afrobeat, **`gr`** Greek Rebetiko, **`br`** Brazilian, **`sl`** New Orleans Second Line, **`cu`** Cuban / Afro-Cuban. UI engine ids: `fela_kuti`, `greek_rebetiko`, `brazilian`, `new_orleans_second_line`, `cuban_afro_cuban`.

**Shipped ids:** This chapter uses harmonic voice ids that exist in Composer OS today. For **Coltrane‑era sheets-of-sound**, **`charlie_parker`** stands in; for **Mingus‑style orchestral blues / episodic form**, **`andrew_hill`**; for **Silver‑room funky minor / gospel lift**, **`herbie_hancock`**. When roadmap adds `john_coltrane`, `charles_mingus`, or `horace_silver`, swap ids and keep the musical logic.

Preset ids are the stable preset strings from the rhythm engines (hyphenated where shipped).

---

## 1. Jazz + Latin

Post-bop and modern jazz harmonic languages sit naturally on clave, montuno feel, or bossa anticipation: extensions stay intelligible when the grid spells syncopation for you. You get **chart jazz** that still moves like dance music.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Bill Evans (`bill_evans`) | Brazilian (`br`) | `bossa-nova-basic` | Rootless colours + bossa **anticipationPush** = floating changes that still lean slightly ahead of the bar. |
| Wayne Shorter (`wayne_shorter`) | Cuban (`cu`) | `mambo` | Upper-structure ambiguity reads as **horn-stack colour** when tumbao and bell accents lock the clave. |
| Duke Ellington (`duke_ellington`) | Second Line (`sl`) | `second-line-big-band` | Ellington voicing density + parade **bigFourWeight** = shout figures that still roll like a brass band. |
| Charlie Parker (`charlie_parker`) | Afrobeat (`fk`) | any | Bebop devices on a static vamp: harmony stays fiery while the grid enforces Yoruba-side **call–response** phrasing. |
| Miles Davis (`miles_davis`) | Brazilian (`br`) | `baiao-jazz-4-4` | Cool / modal spans over **baião** lift — less romance than bossa, more rural bounce under sparse melody. |
| Thelonious Monk (`thelonious_monk`) | Cuban (`cu`) | `cha-cha-cha` | Angular dominants sit oddly right on **cha-cha** lightness — Monk crunch without heavy salsa density. |
| Thad Jones (`thad_jones`) | Cuban (`cu`) | `son-clave-3-2` | Chart-writing clarity + explicit **claveDirection** in preset — horn pillars stay readable for reading-room bands. |

**Stretch pairing:** **Messiaen (`messiaen`)** + **Cuban (`cu`)** · **`bolero`** — Mode-of-limited-transposition washes over slow **bolero** pulse: sacré kitsch on purpose; useful for scoring a frozen tableau while clave still ticks underneath.

---

## 2. Classical + World Rhythm

Concert-harmony voices gain **groove insurance**: odd metres (Greek), clave (Cuban), or swing subdivision (Second Line) stop museum paste and push phrase rhythm.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Debussy (`debussy`) | Greek (`gr`) | `zeibekiko_9_8` | Whole-tone / parallel harmony floats over **2+2+2+3** — phrase accents migrate without jazz swing clichés. |
| Messiaen (`messiaen`) | Brazilian (`br`) | `baiao-basic` | Additive colour chords against **baião** forward motion — ecclesiastical meets plantation groove. |
| Bartók (`bartok`) | Second Line (`sl`) | `brass-band-6-8` | Axis harmony + folk skew meets **6/8** brass-band lift — funeral / procession psychology without Balkan cliché kit. |
| Ravel (`ravel`) | Cuban (`cu`) | `bolero` | Orchestral **bolero** crescendo DNA + Cuban bolero grid — shared name, double dose of obsessive repetition. |
| Bach (`bach`) | Afrobeat (`fk`) | any | Counterpoint clarity over four-on-floor cell — baroque motor rhythm meets Lagos insistence (use sparse melody registration). |
| Beethoven (`beethoven`) | Greek (`gr`) | `hasapiko_4_4` | Driving harmony rhythm + **Hasapiko** doumbek frame — heroic tread without Viennese waltz. |
| Stravinsky (`stravinsky`) | Brazilian (`br`) | `partido-alto-clave-led` | Metric stratification + **partido-alto** cross-rhythms — shared DNA with *Les Noces* punch-through. |

**Stretch pairing:** **Satie (`satie`)** + **Afrobeat (`fk`)** · **any** — Gymnopédie stasis vs Afrobeat motor: only works if you treat harmony as **loop patches** and let percussion invent phrase boundaries.

---

## 3. Rock + Groove

Rock and art-rock voices want **backbeat or parade pocket**, not classical metre only. Engines supply snare ghosts, BD syncopation, or rebetiko lift so guitars don’t float in soup.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Beatles (`beatles`) | Second Line (`sl`) | `second-line-basic` | Song-form hooks + NOLA **snare ruffs** — Abbey Road parade fantasy without Beatles pastiche loops. |
| Radiohead (`radiohead`) | Afrobeat (`fk`) | any | Modal drift + static vamp psychology — **Afrobeat** grid supplies deterministic tension/release for ostinato harmony. |
| Jeff Lynne (`jeff_lynne`) | Brazilian (`br`) | `samba-de-gafieira-big-band` | Jet glossy chords + **gafieira** dance clarity — ELO lift with Rio floor-logic. |
| Bob Dylan (`bob_dylan`) | Greek (`gr`) | `zeibekiko_9_8` | Harmonica-blues narrative harmony over **9/8** — speech rhythm vs irregular metre (folk singer vs zeibek dancer). |
| Kate Bush (`kate_bush`) | Cuban (`cu`) | `cha-cha-cha` | Theatrical chromatic pivots + light **cha-cha** — drama without heavy mambo brass demand. |
| Joni Mitchell (`joni_mitchell`) | Second Line (`sl`) | `second-line-slow` | Open-tuning harmony clouds + slow **second-line** drag — emotional procession under ambiguous roots. |
| Carole King (`carole_king`) | Brazilian (`br`) | `bossa-nova-drumset-light` | Tapestry-era extensions + **dry bossa** kit — songwriter confession over breathable café groove. |

**Stretch pairing:** **Frank Zappa (`frank_zappa`)** + **Second Line (`sl`)** · **`mardi-gras-indian`** — Polytonal absurdity vs ritual street beat; works as cartoon antagonist cue when metre stays stubbornly danceable.

---

## 4. Funk + Soul

Hard-bop minor lines, R&B lifts, and gospel side-slips want **funk or parade swing**. Afrobeat and NOLA engines align horn kicks with backbeat architecture.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Herbie Hancock (`herbie_hancock`) | Second Line (`sl`) | `new-orleans-funk` | Fusion voicings + **NO funk** pocket — Meters-adjacent glue under altered dominants. |
| Quincy Jones (`quincy_jones_film`) | Afrobeat (`fk`) | any | Film-score brass grammar + **Tony Allen** subdivision — soundtrack chase energy without Hollywood click-track blandness. |
| Carole King (`carole_king`) | Brazilian (`br`) | `bossa-nova-basic` | Soul-ballad changes + bossa lift — Carole warmth with Rio-side breath (lighter than samba batucada). |
| Stevie Wonder (`stevie_wonder`) | Afrobeat (`fk`) | any | R&B chromatic side-slips locked to **cross-rhythm** grid — groove carries harmonic daring. |
| James Brown (`james_brown`) | Second Line (`sl`) | `second-line-fast` | Funk one-chord obsessives meet brass-band forward motion — shared DNA of **accent displacement**. |
| Prince (`prince`) | Cuban (`cu`) | `mozambique` | Minneapolis purple harmony + **Mozambique** bell ride — dance-floor fusion without disco four-on-floor default. |
| Barry Harris (`barry_harris`) | Brazilian (`br`) | `baiao-jazz-4-4` | Sixth-diminished motion over **baião** — functional clarity without swing-era ride cymbal wash. |

**Stretch pairing:** **ECM Chamber (`ecm_chamber`)** + **Afrobeat (`fk`)** · **any** — Nordic sparse pads vs dense Lagos pulse; viable when treble voices stay minimal and bass spells changes once per bar.

---

## 5. Film Soundtrack

Film harmonic voices are built for **long lens**: pedals, clusters, jazz-ballad loops. Pair each engine once to show how rhythm reframes the same harmony — chase (Afrobeat), lyric float (bossa), dread procession (Greek), ritual clave (Cuban), parade catharsis (Second Line).

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Bernard Herrmann (`herrmann`) | Greek (`gr`) | `zeibekiko_9_8` | Cluster strings + **additive 9/8** — obsessive repetition à la *Vertigo* staircase without American march metre. |
| Ennio Morricone (`morricone`) | Brazilian (`br`) | `bossa-nova-basic` | Italian pastoral modal pads + dry bossa — Mediterranean melancholy without Hollywood swing section. |
| Angelo Badalamenti (`badalamenti`) | Brazilian (`br`) | `bossa-nova-drumset-light` | Minor–maj7 dream jazz + light bossa hat — *Twin Peaks* café logic with clearer pulse for big-band arranging. |
| Quincy Jones (`quincy_jones_film`) | Second Line (`sl`) | `second-line-big-band` | Film-era shout orchestration + NOLA brass-band density — crossover climax cues. |
| Herrmann (`herrmann`) | Afrobeat (`fk`) | any | Hitchcock anxiety over Lagos motor — modern thriller chase scoring experiment. |
| Morricone (`morricone`) | Cuban (`cu`) | `bolero` | Epic pedal tones + **bolero** inevitability — military/western showdown slowed to Habanera gravity. |
| Badalamenti (`badalamenti`) | Greek (`gr`) | `hasapiko_4_4` | Lynchian drift over **Hasapiko** floor — uneasy lyricism with tavern gravity (odd sibling to jazz waltz). |

**Stretch pairing:** **Badalamenti (`badalamenti`)** + **Afrobeat (`fk`)** · **any** — Hypnotic jazz loops vs polymetric insistence; works when treated as **sound-design collision**, not polite lounge.

---

## 6. Experimental / Microtonal / Noise

Lean on **odd metres**, asymmetric percussion lanes, and harmony that refuses cadences — Greek additive grids and Afrobeat sixteen-step logic stretch phrases past four-bar tyranny.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Herrmann (`herrmann`) | Greek (`gr`) | `zeibekiko_9_8` | Cluster harmony + **18-step** bar — bar-line becomes psychological, not decorative. |
| Messiaen (`messiaen`) | Greek (`gr`) | `zeibekiko_9_8` | Limited modes + zeibekiko **long-cell** accents — sacred time stretched over dance metre. |
| Andrew Hill (`andrew_hill`) | Afrobeat (`fk`) | any | Non-functional fields + repeating harmonic cycles — Hill ambiguity rides Fela-style **no cadence** continuity. |
| Bartók (`bartok`) | Afrobeat (`fk`) | any | Folk-axis kernels vs layered percussion strata — both systems resist symmetrical phrase rounding. |
| Stravinsky (`stravinsky`) | Cuban (`cu`) | `afro-6-8` | Ritual ostinati + Afro-Cuban **6/8** grid — shared primitivist toolkit without pastiche melody kits. |
| Radiohead (`radiohead`) | Greek (`gr`) | `hasapiko_4_4` | Electronics-era harmony suspicion + acoustic tavern pulse — alien folk hybrid. |
| Sonic Youth (`sonic_youth`) | Second Line (`sl`) | `second-line-shuffle` | Noise-rock harmonic avoidance + NOLA shuffle **warp** — groove as unstable terrain. |

**Stretch pairing:** **Frank Zappa (`frank_zappa`)** + **Greek (`gr`)** · **`zeibekiko_9_8`** — Absurd juxtaposition by design; phrase rhythm comes from metre friction, not lyric empathy.

---

## 7. Avant-garde / Free

Pairings that **shouldn’t work on paper** but share structural tactics: polycentrism, abrupt sectional lifts, or groove as irony device.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Charlie Parker (`charlie_parker`) | Greek (`gr`) | `zeibekiko_9_8` | Bebop chromatic approach tones vs **9/8** lift — metric modulation without a rhythm-section lecture. |
| Bartók (`bartok`) | Cuban (`cu`) | `rumba-clave-3-2` | Axis harmony + rumba **clave** tension — both traditions privilege rhythmic displacement over functional release. |
| Stravinsky (`stravinsky`) | Second Line (`sl`) | `brass-band-6-8` | Ballet-machine ostinati + brass-band **6/8** dirge — ritual collision of European and Gulf Coast processional. |
| Andrew Hill (`andrew_hill`) | Cuban (`cu`) | `mambo` | Angular post-bop harmony + horn-stack salsa density — intellectual friction on the dancefloor. |
| Wayne Shorter (`wayne_shorter`) | Greek (`gr`) | `hasapiko_4_4` | Wayne ambiguity grounded by tavern **4/4** motor — removes ECM float without forcing swing. |
| Messiaen (`messiaen`) | Afrobeat (`fk`) | any | Mystic chords vs secular persistence — useful for scored hallucination sequences. |
| Debussy (`debussy`) | Second Line (`sl`) | `second-line-slow` | Impressionist wash + funeral-speed parade — memory-as-procession soundtracking. |

**Stretch pairing:** **Bach (`bach`)** + **Cuban (`cu`)** · **`cha-cha-cha`** — Baroque voice-leading exhibits against cha-cha lightness; viable only as **arranger stunt** with trio reduction and aggressive octave displacement.

---

## 8. Big Band Specific

Voices with **chart DNA** need engines that leave air for brass kicks and reed pads: Afro-Cuban **montuno** alignment, Afrobeat horn punches, Second Line **big band** preset, Brazilian **gafieira**.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Thad Jones (`thad_jones`) | Afrobeat (`fk`) | any | Thad shout vocabulary + layered percussion — sectional kicks stay articulated under repeating harmony. |
| Duke Ellington (`duke_ellington`) | Cuban (`cu`) | `mambo` | Ellington colour moves + **mambo** brass idioms — shared golden-age big-band lineage. |
| Quincy Jones (`quincy_jones`) | Brazilian (`br`) | `samba-de-gafieira-big-band` | LA studio precision + Rio big-band dance clarity — doubles-down on sectional brass voicings. |
| Andrew Hill (`andrew_hill`) | Second Line (`sl`) | `second-line-big-band` | Mingus-adjacent episodic harmony + parade shout grammar — blues irony under festive orchestration. |
| Gil Evans (`gil_evans`) | Cuban (`cu`) | `son-clave-2-3` | Cool-cloud voicings + explicit **2-3** orientation — Evans pastel over Cuban rhythmic chess. |
| Maria Schneider (`maria_schneider`) | Brazilian (`br`) | `partido-alto-clave-led` | Long-form landscape harmony + **partido-alto** conversation — momentum without dance-chart stupidity. |
| Billy Strayhorn (`billy_strayhorn`) | Second Line (`sl`) | `second-line-fast` | Lush extensions + uptempo parade — Ellington family romance at Mardi Gras velocity. |

**Stretch pairing:** **Pat Metheny (`pat_metheny`)** + **Cuban (`cu`)** · **`mozambique`** — Lyrical ECM pastoral vs dense percussion; works when guitar comps stay sparse and horns carry montuno alignment.

---

## 9. Contemporary Pop / Singer-Songwriter

Accessible harmony **needs friendly grids**: bossa anticipation, clear clave, or second-line swing ratio — keeps vocal melodies intelligible while rhythm reads as “world colour.”

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Joni Mitchell (`joni_mitchell`) | Brazilian (`br`) | `bossa-nova-basic` | Alternate-tuning pastoralism + bossa oxygen — singer-songwriter intimacy with Rio-side phrasing room. |
| Kate Bush (`kate_bush`) | Greek (`gr`) | `zeibekiko_9_8` | Theatrical chromatic pivots + zeibekiko drama — both built on **non-equal phrase lengths**. |
| Beatles (`beatles`) | Cuban (`cu`) | `cha-cha-cha` | Song-form genius + light Cuban dance — Rubber Soul harmonic curiosity without heavy salsa arrangements. |
| Radiohead (`radiohead`) | Second Line (`sl`) | `second-line-basic` | Rock electronica harmony + acoustic parade snare — humanises alien textures for stage charts. |
| Bob Dylan (`bob_dylan`) | Brazilian (`br`) | `bossa-nova-drumset-light` | Folk harmonic simplicity + gentle bossa — protest-ballad intimacy with pulse. |
| Carole King (`carole_king`) | Cuban (`cu`) | `bolero` | Tapestry harmonic warmth + slow **bolero** — torch-song arc suitable for strings + rhythm section. |
| Jeff Lynne (`jeff_lynne`) | Second Line (`sl`) | `second-line-shuffle` | Arena-pop chromatic lifts + shuffle **warp** — Travelling Wilburys bounce meets Gulf Coast lope. |

**Stretch pairing:** **Paul Simon (`paul_simon`)** + **Afrobeat (`fk`)** · **any** — Graceland lineage made explicit; useful when arranging guitar-forward charts that still need deterministic percussion matrices.

---

## 10. Cross-cultural Blends

Deliberately **hybrid identities**: rhythm blend lab can stack engines; this table names single-engine seeds that imply fusion logic for sketching.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Morricone (`morricone`) | Greek (`gr`) | `zeibekiko_9_8` | Italian epic pastoral + Balkan/Mediterranean metre — shared film geography without clichéd mandolin tropes. |
| Debussy (`debussy`) | Afrobeat (`fk`) | any | Impressionist wash vs West African motor — “Paris meets Lagos” timbral laboratory (colour percussion vs harmony rhythm). |
| Duke Ellington (`duke_ellington`) | Brazilian (`br`) | `son-clave-basic` | Harlem orchestration + Brazilian **son-clave** orientation — Pan-American big-band conceptualiser sketch. |
| Wayne Shorter (`wayne_shorter`) | Second Line (`sl`) | `second-line-big-band` | Wayne ambiguity grounded in NOLA brass lineage — modern jazz + carnival genealogy. |
| Bartók (`bartok`) | Cuban (`cu`) | `cha-cha-cha` | Folk-axis rhythm meets Cuban dance clarity — asymmetry on both sides of the fusion. |
| Kate Bush (`kate_bush`) | Afrobeat (`fk`) | any | English art-rock chromatic theatre + Afrobeat grid — narrative hysteria with procedural groove insurance. |
| Badalamenti (`badalamenti`) | Cuban (`cu`) | `bolero` | Lynch lounge noir + Cuban bolero gravity — slow-burn dread with dance-proof metre. |

**Stretch pairing:** **Blend lab note** — Stack **Brazilian (`br`) `bossa-nova-basic`** + **Second Line (`sl`) `second-line-slow`** (see **`docs/RHYTHM_ENGINES.md`** blend LCM rules): bossa anticipation against draggy parade backbeat yields **unfinished lyric space**; pair with **Morricone (`morricone`)** or **Radiohead (`radiohead`)** harmonic voices for widescreen ambiguity.

---

## How to use this handbook

Open **Generate → Song Mode** (or any surface that shows **Style**). In **`StylePanel`**, set **Harmonic Voice** (library or Film optgroup) and **Rhythm Engine** independently — they do not gate each other. Pick a preset from the rhythm controls for that engine so **`styleGenerationContextKeys`** carry both `hv:*` and rhythm prefix keys (`fk:`, `gr:`, …). Use this chapter to short-list combinations; dial **chromatic strength**, **blend**, and section forms in the main Generate controls as usual. When a pairing feels too polite, switch only the rhythm preset first — harmonic identity stays put.

---

## Deep Harmonic Voice Combinations (V45+)

**Note:** The rows below assume the **Deep Harmonic Voice** layer — **Harmonic Voice** dropdown in **`StylePanel`** — **not** the Songwriter preset alone. Songwriter primaries and harmonic voices can stack; see **`docs/DEEP_HARMONIC_VOICES_GUIDE.md`** for the two-layer distinction and when to use each.

### Wayne Shorter (deep harmonic voice)

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Wayne Shorter (`wayne_shorter`) | Cuban (`cu`) | `mambo` | Neighbour stacks read as horn colour when tumbao/bell lock clave — Footprints-family ambiguity stays dance-literate. |
| Wayne Shorter (`wayne_shorter`) | Brazilian (`br`) | `bossa-nova-basic` | Static plateaus + anticipation — Infant Eyes/Miyako lyrical float without ECM-only drift. |
| Wayne Shorter (`wayne_shorter`) | Second Line (`sl`) | `second-line-big-band` | Parade brass grammar carries Wayne chromatic mediant hits without swing-era ride wash. |
| Wayne Shorter (`wayne_shorter`) | Afrobeat (`fk`) | any | Ostinato grid gives deterministic phrase boundaries for motivic cells — no textbook cadence relief. |
| Wayne Shorter (`wayne_shorter`) | Greek (`gr`) | `hasapiko_4_4` | Tavern motor removes ECM float without forcing straight-ahead swing ii–V. |
| Wayne Shorter (`wayne_shorter`) | Cuban (`cu`) | `afro-6-8` | Ritual 6/8 + vamp modal layers — late-period plateau logic with dance-proof metre. |
| Wayne Shorter (`wayne_shorter`) | Brazilian (`br`) | `baiao-jazz-4-4` | Rural bounce under axis harmony — breath between phrases stays folk-sized. |
| Wayne Shorter (`wayne_shorter`) | Second Line (`sl`) | `second-line-slow` | Funeral-speed parade — silence-as-device gets groove insurance. |

### Gil Evans

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Gil Evans (`gil_evans`) | Brazilian (`br`) | `bossa-nova-basic` | Dry bossa lets pastel clusters breathe — cloud harmony over breathable pulse. |
| Gil Evans (`gil_evans`) | Cuban (`cu`) | `son-clave-3-2` | Explicit clave orientation — Evans bass gap reads over Cuban rhythmic chess. |
| Gil Evans (`gil_evans`) | Afrobeat (`fk`) | any | Long vamps hold modal planing — Lagos motor vs slow harmonic rhythm. |
| Gil Evans (`gil_evans`) | Second Line (`sl`) | `second-line-slow` | Parade drag supports wide bass-to-cluster spacing without march cliché. |
| Gil Evans (`gil_evans`) | Cuban (`cu`) | `bolero` | Slow Habanera gravity matches Sketches-era pedal scenes. |
| Gil Evans (`gil_evans`) | Brazilian (`br`) | `partido-alto-clave-led` | Partido conversation — momentum without forcing functional topside changes. |
| Gil Evans (`gil_evans`) | Cuban (`cu`) | `mambo` | Horn-stack density meets mid-register cluster voicings. |
| Gil Evans (`gil_evans`) | Brazilian (`br`) | `baiao-basic` | Baião forward motion under parallel modal slabs. |

### Maria Schneider

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Maria Schneider (`maria_schneider`) | Brazilian (`br`) | `partido-alto-clave-led` | Documented Hang Gliding lineage — landscape harmony over understated groove. |
| Maria Schneider (`maria_schneider`) | Cuban (`cu`) | `mambo` | Layered propulsion under pastoral modal scenes — climax coupling without salsa stupidity. |
| Maria Schneider (`maria_schneider`) | Afrobeat (`fk`) | any | Technological ostinato field for Data Lords darkness — narrative arc stays cumulative. |
| Maria Schneider (`maria_schneider`) | Brazilian (`br`) | `bossa-nova-drumset-light` | Light hat — singer-songwriter transparency for woodwind tops. |
| Maria Schneider (`maria_schneider`) | Cuban (`cu`) | `son-clave-2-3` | 2-3 orientation locks horn pillars for common-tone morphing. |
| Maria Schneider (`maria_schneider`) | Second Line (`sl`) | `second-line-basic` | Parade snare humanises orchestral swell — brass kicks stay sectional. |
| Maria Schneider (`maria_schneider`) | Brazilian (`br`) | `samba-de-gafieira-big-band` | Rio big-band dance clarity for sectional voicings. |
| Maria Schneider (`maria_schneider`) | Cuban (`cu`) | `cha-cha-cha` | Light danceframe — drama without heavy mambo brass demand. |

### John Coltrane

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| John Coltrane (`john_coltrane`) | Afrobeat (`fk`) | any | One–two chord cells + layered ostinati — modal period pentatonic/quartal stacks stay grounded. |
| John Coltrane (`john_coltrane`) | Brazilian (`br`) | `bossa-nova-basic` | Continuous eighth support for changes-era burst harmony — forward motion without bop ride wash. |
| John Coltrane (`john_coltrane`) | Cuban (`cu`) | `afro-6-8` | Ritual tension + percussion strata — late sheets-of-sound alongside clave gravity. |
| John Coltrane (`john_coltrane`) | Cuban (`cu`) | `mambo` | Horn-favouring density for sheets cells in sectional stacks. |
| John Coltrane (`john_coltrane`) | Brazilian (`br`) | `baiao-jazz-4-4` | Rural lift under quartal Tyner voicings — fewer romance clichés than bossa. |
| John Coltrane (`john_coltrane`) | Second Line (`sl`) | `second-line-fast` | Parade velocity for Trane-era urgency without swing tropes. |
| John Coltrane (`john_coltrane`) | Afrobeat (`fk`) | any | Deterministic vamp boundaries for cyclical augmented-tonic lattice practice. |
| John Coltrane (`john_coltrane`) | Cuban (`cu`) | `rumba-clave-3-2` | Displacement ethics align with interval-cell melody — both resist four-bar rounding. |

### Pat Metheny

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Pat Metheny (`pat_metheny`) | Brazilian (`br`) | `bossa-nova-basic` | Primary documented pairing — Lydian/add9 majesty over dry bossa anticipation. |
| Pat Metheny (`pat_metheny`) | Cuban (`cu`) | `mozambique` | Dense tumbao family — intense pieces without losing modal brightness. |
| Pat Metheny (`pat_metheny`) | Second Line (`sl`) | `second-line-slow` | Swampy Americana procession under pentatonic seeds + luminous endings. |
| Pat Metheny (`pat_metheny`) | Brazilian (`br`) | `baiao-jazz-4-4` | Baião bounce — Letter From Home rural lift against ECM pastoral pads. |
| Pat Metheny (`pat_metheny`) | Cuban (`cu`) | `bolero` | Slow romantic grid for orchestral-period cantabile peaks. |
| Pat Metheny (`pat_metheny`) | Afrobeat (`fk`) | any | Layered ostinati echo PMG cumulative forms — guitar comps stay sparse. |
| Pat Metheny (`pat_metheny`) | Brazilian (`br`) | `partido-alto-clave-led` | Conversation rhythm — odd-metre phrases cross barlines with clarity. |
| Pat Metheny (`pat_metheny`) | Second Line (`sl`) | `second-line-shuffle` | Shuffle warp — rotary feel without locking accents to bar 1 (Metheny groove irony). |

### Henry Threadgill

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Henry Threadgill (`henry_threadgill`) | Second Line (`sl`) | `second-line-basic` | March/blues DNA immediately destabilised — anti-metric layers vs parade roots. |
| Henry Threadgill (`henry_threadgill`) | Afrobeat (`fk`) | any | Long-phase ostinati carry interval-pool riff classes — modular cumulative form. |
| Henry Threadgill (`henry_threadgill`) | Cuban (`cu`) | `son-clave-3-2` | Clave as ghost grid — melodic strata avoid downbeat lock with percussion. |
| Henry Threadgill (`henry_threadgill`) | Brazilian (`br`) | `partido-alto-clave-led` | Cross-rhythmic conversation without functional harmony clutter. |
| Henry Threadgill (`henry_threadgill`) | Greek (`gr`) | `zeibekiko_9_8` | Additive bar warps phrase cells — matches multi-metre streams. |
| Henry Threadgill (`henry_threadgill`) | Second Line (`sl`) | `brass-band-6-8` | Brass-band lift without tutti block stacks — hocket-friendly. |
| Henry Threadgill (`henry_threadgill`) | Afrobeat (`fk`) | any | Mismatched loop lengths — anti-metric drum conduct vs Fela motor. |
| Henry Threadgill (`henry_threadgill`) | Cuban (`cu`) | `cha-cha-cha` | Light dance surface — threads chromatic cells without ii–V flavour. |

### Charles Mingus

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Charles Mingus (`charles_mingus`) | Second Line (`sl`) | `second-line-big-band` | Parade collective energy — gospel shout + blues architecture share NOLA DNA. |
| Charles Mingus (`charles_mingus`) | Cuban (`cu`) | `mambo` | Horn-stack salsa density meets Mingus mid-register shout voicings. |
| Charles Mingus (`charles_mingus`) | Afrobeat (`fk`) | any | Protest ostinato + repeating riff cycles — Epitaph-scale cumulative tension. |
| Charles Mingus (`charles_mingus`) | Cuban (`cu`) | `son-clave-2-3` | Clave grid for blues harmony — Latin suite episodes without ECM cleanliness. |
| Charles Mingus (`charles_mingus`) | Second Line (`sl`) | `new-orleans-funk` | Meters-adjacent pocket under chromatic bass drivers — grease without hard-bop churn. |
| Charles Mingus (`charles_mingus`) | Brazilian (`br`) | `bossa-nova-basic` | *(Stretch)* Lush chords — only if bass-led dirt stays foremost; otherwise prefer **`sl`**/**`cu`**. |
| Charles Mingus (`charles_mingus`) | Second Line (`sl`) | `second-line-fast` | Uptempo shout psychology — collective improv hits stay ritual. |
| Charles Mingus (`charles_mingus`) | Cuban (`cu`) | `bolero` | Slow bolero for elegy_coda psychology — tension without polite resolution. |

---

## 11. Deep System Composers

Focus: **Threadgill** interval systems + **Mingus** blues suites + **Shorter** motivic harmony — architecturally demanding harmonic voices. Use these when form, ensemble stratification, or non-functional grammar matters more than generic jazz flavour.

| Harmonic Voice | Rhythm Engine | Preset Suggestion | Why It Works |
|---|---|---|---|
| Henry Threadgill (`henry_threadgill`) | Afrobeat (`fk`) | any | Ostinato pitch classes stay interval-locked — Lagos persistence carries Zooid-ish loops without chord-symbol rows. |
| Henry Threadgill (`henry_threadgill`) | Cuban (`cu`) | `afro-6-8` | 6/8 ritual grid — melodic agents dodge implicit downbeats while drums stay contrapuntal. |
| Charles Mingus (`charles_mingus`) | Afrobeat (`fk`) | any | Extended protest vocabulary — repeating cells support chromatic bass-first counterpoint. |
| Charles Mingus (`charles_mingus`) | Greek (`gr`) | `zeibekiko_9_8` | Additive metre vs episodic suite sections — monumental procession without Viennese symmetry. |
| Wayne Shorter (`wayne_shorter`) | Afrobeat (`fk`) | any | Motivic development vs no-cadence continuity — both postpone tonal closure deliberately. |
| Wayne Shorter (`wayne_shorter`) | Greek (`gr`) | `zeibekiko_9_8` | Long-cell zeibekiko accents — matches asymmetric silence + axis harmony plateaus. |
| Henry Threadgill (`henry_threadgill`) | Brazilian (`br`) | `bossa-nova-basic` | *(Contrarian stretch)* Bossa breath vs interval pools — viable only if drums stay anti-metric and harmony refuses ii–V. |
| Charles Mingus (`charles_mingus`) | Second Line (`sl`) | `mardi-gras-indian` | Ritual street vocabulary — collective improvisation form meets ceremonial groove. |
