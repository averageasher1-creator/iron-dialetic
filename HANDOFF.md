# IRON DIALECTIC — build handoff

Read this first if you are picking the project up mid-build. It records what exists, what is
verified, what is left, and the conventions the code relies on. `DESIGN.md` is the design
document (pillars, systems, data schema, art direction); this file is the working state.

The original brief is a browser grand-strategy game "in the spirit of Hearts of Iron IV"
where politics and ideology are the core and combat is OpenFront-style. Hard requirements:
static site (HTML/CSS/JS, **no build step, no backend**) for GitHub Pages; **no right-click
anywhere** (trackpad: left-click, drag, scroll/pinch, keyboard); canvas map at 60fps;
localStorage saves with multiple slots + autosave; pause on space with adjustable speed;
readable text (no tiny fonts, good contrast, tooltips on everything).

The user's feedback on earlier games built this way, which this build must not repeat:
laggy, odd sound effects, unreadable text, unclear visuals, "not fun", nothing that makes
people want to keep playing. Prioritise legibility, performance, and a clear reason to act.

## Status

| Layer | State |
|---|---|
| Design doc (`DESIGN.md`) | written |
| Data: terrain, buildings, laws, recruitment, styles, factions, eras (`js/data/base.js`) | done |
| Data: 22 ideologies (`js/data/ideologies.js`) | done |
| Data: names, handcrafted scenario, situations, challenges (`js/data/names.js`) | done |
| Data: ~75 events and ~45 decisions (`js/data/events.js`) | done |
| Sim: mapgen, world, combat, economy, politics, diplomacy, events engine, AI, game loop/save | done, runs headless |
| AI-vs-AI balance | three passes done; see "Balance" |
| Fonts (`fonts/`, Barlow + Barlow Condensed, OFL) | copied in |
| UI: `index.html`, `css/style.css`, `js/ui/render.js` (canvas map), `audio.js` (WebAudio synth), `ui.js` (top band, rail, selection card, attack bar, alerts, events, tooltips, keys), `panels.js` (State/Economy/Laws/War/Foreign/World/Handbook), `screens.js` (title, setup, saves, settings, challenges, records, end screens), `tutorial.js` (coach as Cassine), `main.js` (loop, pointer input) | written, loads with no console errors in headless Chrome |
| Browser test harness: `/home/claude/scripts/shot.js` (puppeteer-core in /tmp/pp; serve with `python3 -m http.server 8765` from the project root) | working |
| Browser passes (session 2): title, setup, all panels, tutorial to the war step, save/load round trip, forced defeat post-mortem, chronicle, retry, victory — no console errors. Perf in 1944 at speed 5: every frame on the 60fps budget, a month of sim 2–5 ms, save 158 KB | done |
| README, zip, publish | done at the end of session 2 (see below) |

## How to run what exists

```
node tools/simulate.js --runs 5 --years 66            # full AI-vs-AI campaigns, summary table
node tools/simulate.js --runs 1 --years 20 --verbose  # with 6-yearly snapshots
node tools/probe.js 5 18 meridia                      # per-nation internals every 6 years
node tools/fates.js ml,agrarian,trot 66               # why did states of these ideologies end?
```

A 66-year campaign on the standard map takes about 5 seconds in Node. `/usr/bin/google-chrome`
exists in the sandbox for headless browser checks (use puppeteer-core from npm or Chrome's
`--headless --screenshot`).

## Architecture and conventions

- Plain `<script>` tags, no modules. Every file is an IIFE that hangs things off one global,
  `ID` (`globalThis.ID`). Load order: `core/util` → `data/base` → `data/ideologies` →
  `data/names` → `data/events` → `data/focus` → `sim/mapgen` → `sim/world` → `sim/combat` →
  `sim/economy` → `sim/politics` → `sim/diplomacy` → `sim/events` → `sim/focus` → `sim/ai` →
  `sim/game` → `ui/*` (`ui/programme.js` after `ui/panels.js`). Every tool in `tools/` has its
  own copy of this list: add new files there too.
- **`js/sim` and `js/data` never touch the DOM.** The UI reads the game object `G` and calls
  sim functions. Keep it that way so the Node tools keep working.
- `G` is one plain object made by `ID.newGame(opts)` (`sim/world.js`). `ID.setPlayer(G, id,
  ideoOverride)` hands a nation to the human. `ID.Game.tick(G)` advances one day.
- Time: 1 tick = 1 day, 30-day months, 360-day years, 1910 → 1976. Monthly logic runs in
  `ID.Game.month`. Eras at 1910 / 1925 / 1940 / 1957.
- Map: `G.W × G.H` tiles (std 384×216). Typed arrays indexed by `y*W+x`: `terrain`, `river`,
  `coast`, `prov` (province id), `owner` (nation id, 0 = none/sea), `bld`, `cut` (0 supplied,
  1 cut off, 2 sea-supplied), `cutAge`, `fortCov`, `rad`.
  **Always change ownership through `ID.setOwner(G, i, to)`** — it maintains every aggregate.
- Nations: `G.nations[id]` (index 0 is null). Fields are listed in `ID.makeNation`. Scratch
  and cached values live in `n.a` (e.g. `n.a.atk`, `n.a.unrest`, `n.a.dem`, `n.a.mv`).
  `n.fs` = true faction support, `n.rep` = what the player is *shown* (biased under
  censorship), `n.fp` = faction power %, `n.src` = legitimacy sources.
- Provinces: `G.provinces[p]` with `owner` (majority holder), `core`, `unrest`, `opp`
  (opposition ideology id), `oppStr`, `integ`, `urban`, `cnt` (tiles per nation), `center`.
- Diplomacy state: `ID.dipOf(G,a,b)` → `{war, truce, nap, trade, embargo}`; `ID.atWar`;
  opinions `ID.op(G,a,b)` (a's view of b); blocs in `G.blocs`.
- UI hooks the sim already fills (only when `!G.headless`): `G.dirty` (tile indices to
  repaint), `G.dirtyAll`, `G.fx` (visual effects: `{type,i,t,d}` with types build, revolt,
  ideology, nuke, boom, land, capital, subvert), `G.sfx` (sound cue names: tick, build, boat,
  launch, boom, nuke, war, revolt, event, alarm, stamp, good, bad, victory, defeat, crash,
  era), `G.news` (ticker), `G.chronicle`, `G.evq` (events awaiting the player), `G.over`
  (end state with `pm` post-mortem), `G.uiDirty`, `G.wantAutosave`, `G.world.waves`.
- Player actions the UI should call:
  - war/peace: `ID.Diplomacy.declare`, `.propose(G, from, to, kind)` (trade, nap, ally,
    peace, embargo, cancel_trade, cancel_nap), `.evalProposal`, `.casusBelli`, `.warBlock`
  - combat: `ID.Combat.launch(G, from, to, troops, style)`, `.cancel`, `.planBoat`,
    `.launchBoat`, `.canMissile`, `.launchMissile`, `.styleOk`
  - building: `ID.canBuild`, `ID.buildCost`, `ID.startBuild`
  - politics: `ID.Politics.setLaw`, `.lawAllowed`, `.lawCost`, `.vote`, `.demands`,
    `.electionForecast`, `.coupOdds`
  - economy: `ID.Economy.setBudget`, `.budgetLock`, `.budgetMax`, `.motion`, `.debtCap`;
    direct fields `n.tax`, `n.rent`, `n.pact`, `n.mob`, `n.focus`
  - events/decisions: `ID.Events.choose(G, k)`, `.options`, `.describe`, `.txt`,
    `.decisionsFor`, `.decisionBlock`, `.runDecision`, `.embrace`, `.embraceBlock`
  - covert: `ID.Diplomacy.startOp(G, n, 'fund'|'coup'|'strike', target)`, `.stopOp`, `.opCost`
  - victory: `ID.Victory.progress(G, n)`; end screens: `G.over`, `ID.Game.chronicle(G)`
  - saves: `ID.Game.save(G)` → JSON string, `ID.Game.load(str)` → `G`
- Events and decisions are data. Effects are arrays like `['sup','workers',10]`; the
  vocabulary is in `ID.Events.applyFx` and `ID.Events.describe` (`sim/events.js`).
- Player events pause nothing in the sim by themselves: the UI must stop ticking while
  `G.evq.length > 0` and show the event at the head of the queue.
- `G.autoPlayer = true` makes the AI play the player's nation too (useful for soak tests).

## Planned UI (agreed art direction)

"Constructivist plotting table": a **light** paper chart, not a dark dashboard.
Palette: paper `#ebe2cc`, ink `#17140f`, signal red `#c8281e`, chart sea `#abbcb8`,
ochre `#c99a2e`, steel `#3d5a6c`, olive `#5d7a3a` (good values). Type: Barlow for body
(14.5px base, never under 13px), Barlow Condensed 700/800 for headings and the poster title;
fonts are local in `fonts/` via `@font-face`. Hard offset shadows, ink borders, one diagonal
cut on panel headers; caps only for major titles.

Layout: ink top band (nation, ideology, gold/industry/food/pop/troops, stability /
legitimacy / authority, date, pause + speeds 1–5, menu) · left rail of tabs · 410px drawer
panel · map · selection card top-right · alerts · attack bar bottom-centre · map-mode
switch · news ticker along the bottom. Event "dispatch" modal in the centre.

Keys: Space pause, 1–5 speed, arrows/WASD pan, +/− zoom, G government, E economy, L laws,
P programme, M military, F foreign, O world, H handbook, Z X C V B N map modes (political, ideology,
opposition, stability, supply, terrain), Esc close.

Map renderer: one offscreen canvas at 1px per tile (ImageData via a Uint32Array), repaint
only `G.dirty` tiles plus neighbours, `drawImage` scaled with smoothing off; vector overlays
per frame for buildings, capitals, labels, fronts, boats, missiles, effects, wave rings.
Title screen: the poster title over a live AI-vs-AI world running in the background.

Screens still to build: title/new game (scenario, seed, size, difficulty, nation pick with
situation blurbs and an ideology override), load/save slots (3 + autosave), challenges and
run records (localStorage key suggestion `id_meta`), encyclopedia generated from
`ID.IDEOLOGIES` / `ID.ECON` / `ID.CONTROL` / `ID.LAWS`, guided tutorial as Cassine in the
handcrafted scenario (nation has `tutorial: 1`; script a neighbour's attack so the war is
defensive and needs no vote), defeat post-mortem (`G.over.pm`), victory + chronicle.

## Balance — where it stands

Economy pass after the UI went in (session 2): upkeep cut ~40% so default budgets run a small surplus;
1910 starts with trade treaties between friendly reachable states; trade income now uses production
(`n.prod`) not GDP, removing a feedback loop that made merchant republics absurdly rich; research
cost is `200 × 1.55^level` so era ceilings are reached late in each era; newGame runs one economy
month so the opening screen shows real figures. `tools/budget.js` shows every nation's treasury if
left on defaults.


Tuning so far, all in the sim files (search for the constants):
- conquest pace `BASE_RATE` 0.095 and ratio factor capped at 1.8 (`combat.js`)
- limited vs total war aims, so most wars end in border changes, not annexation
  (`diplomacy.js: startWar / wantsPeace`); capitulation needs the capital and <34% of
  pre-war land
- rivals intervene for much weaker victims; AI counts likely interveners before declaring
- AI grace period of 2–4.5 years at game start; era aggression `[0.7, 1.0, 1.4, 1.15]`
- faction support is squashed with tanh so it sits mostly in 15–85 (`politics.js: support`)
- baseline unrest tied to living standards; legitimacy sources no longer saturate

Typical 66-year AI world now: 18 states → 12–18 alive, largest holds ~20–26% of land,
13–50 wars, 7–15 civil wars, a few dozen ideology changes by coup, revolution, election,
drift and imposition. Every ideology survives somewhere; juntas and liberal states are the
most common end states.

Known soft spots to revisit once a human-facing build exists:
- some worlds have a single country that relapses into civil war repeatedly
- the social-democrat objective (living standards ≥ 82) may be too easy; check thresholds
- rich AI states can hoard gold
- player-side difficulty has only been reasoned about, not played: run soak tests with
  `G.autoPlayer` on a chosen nation and read the post-mortems

## Soak tests (session 2)

`node tools/soak.js meridia iron` — passive player (never touches a lever): 14 of 17 starts fall,
mostly conquered 1917–1930. `node tools/soak.js meridia iron auto` — AI plays the player's nation:
8 of 17 fall, 2 win (Karsova ideological 1973, Meridia grand objective 1970). That is the intended
"hard by default" curve: competent humans should beat the AI-played results.

AI diplomatic offers to the player (trade, pact, alliance, peace) are non-blocking cards in the
alert column (`G.offers`), not dispatches; they lapse after 120 days.

## Session 3: "more immersive and more action"

- Hinterland land race: `world.js` (generation: each state's farthest 30% of tiles left unclaimed,
  `opts.wild`), `combat.js` (`seedWild`, `processExpand`, `C.launch(G, from, 0, ...)`, settler
  landings), `ai.js` (`expand`), `G.wildB[id]` = frontier length with unclaimed land.
- War orders: `combat.js` `C.ABIL`, `abilBlock`, `useAbil`, `G.shock` (shaken areas); AI uses them
  on its busiest front. UI: war-bar buttons plus click-to-aim (`UI.aim`, `UI.fireAbil`).
- Headlines: sim calls `ID.headline(G, {kicker,title,sub,a,b,tone})`; UI shows one card at a time
  (`UI.tickHeadlines`), 4.6 s, click to dismiss.
- `js/ui/flags.js`: `ID.Flags.svg/html/img/banner`; `R.swatch` now returns a mini flag everywhere.
- Render: particle system (`R.burst`, `R.floatText`), attack arrows square to the local front,
  troop counts and flags under map labels, sea waves, screen shake on big moments.
- Score: `ID.Music` in `audio.js`, moods title / peace / war / crisis chosen in `main.js` each
  frame; music volume and toggle in Settings (`UI.settings.music`, `musicOn`).
- Soak after these changes: passive player falls in 10 of 17 starts; AI-played player falls in 6,
  no outright wins. The hinterland makes the opening gentler; if playtesting says it is too easy,
  raise `aiAgg` on Iron or shorten the AI grace period in `ai.js considerWar`.

## Session 4: programmes and historical mode

The user asked for "a toggleable historical mode similar to HOI4's where there's a fixed storyline
with multiple progression paths for countries". What exists:

- **Programmes (focus trees).** `js/data/focus.js` → `ID.FOCUS = { general, nations: {Base: [...]}}`.
  24 general programmes for every state (industry, farming, army, state, foreign columns plus three
  repeatables) and 8–12 national ones for each of the 17 countries of The Two Continents (138 in
  all). Fields: `{id, name, x, y, days, req, reqAny, excl, year, after, ideos, fams, can, fx, hist,
  ai, repeat, desc}`. `hist: 1` marks the path taken in history. `after: 'st_x'` makes a programme
  wait for that story beat, but only in historical mode (used where a programme and a story event
  would otherwise collide, e.g. Cassine's New Deal waits for the 1932 election).
- **Engine** `js/sim/focus.js`: `ID.Focus` (`trees`, `block`, `state`, `available`, `start`,
  `cancel`, `tick` every 5 days, `complete`, `aiPick` monthly from `AI.month`, `progress`,
  `current`). State per nation: `n.path = {cur, start, end, done: {id: tick}}`; `n.tree` = the
  national tree key (set in `newGame` for scenario nations; rebels inherit it). One programme at a
  time. Ideology-changing programmes are blocked during a civil war.
- **New effect vocabulary** (handled by `ID.Focus.FX` / `ID.Focus.DESC`, reached from the default
  branch of `Events.applyFx` / `describe`, so events and decisions can use them too):
  `['ideology', id, mode]`, `['claim', Base]`, `['claimsAll']`, `['war', Base, cb]`,
  `['ally', Base]`, `['op', Base, v]`, `['build', B.TYPE, k]`, `['techUp', 'ind'|'mil'|'agr']`,
  `['law', cat, opt]`, `['subvert', Base, v]`, `['civilwar', ideo, share]`, `['protector']`.
  Countries are named by base name and resolved with `ID.byBase(G, base)` (the lawful government
  over rebels, then the largest).
- **Storyline** `ID.STORY` (25 beats, 1911–1973) at the bottom of `data/focus.js`. A beat with
  `nation` queues the story event of the same id to that country (`sys: 1, story: 1`, options
  with `hist: 1`); a beat with `run(G)` is a world beat. Helpers: `ID.storyWar` (asks the player
  through the `story_war` dispatch instead of declaring for them), `ID.storyBloc`, `ID.storyPeace`
  (offers peace to the player instead of forcing it), `ID.storyUnion` / `ID.storyAnnex`
  (Hesperia–Pavon; the `st_ultimatum` dispatch if the player is the target). `ID.Story.month`
  runs from `Game.month` and only when `G.historical`; `ID.Story.upcoming`, `.past`, `.init`.
  `G.story.done[id]` is 1 when fired, 2 when skipped because its condition failed, 3 when it
  falls before the campaign's start date.
- **Historical mode** (`G.historical`, meridia only, saved and loaded): story beats fire; AI
  countries take `hist` options of story events (`Events.auto`) and weight `hist` national
  programmes 40 and non-historical ones 0; the Slump is fixed at October 1929; before 1939 AI war
  scores take −0.45 and AI states cannot found new blocs (`ai.js`). Free mode: no story, AI picks
  programmes freely (war and ideology programmes weighted down).
- **UI**: setup screen History toggle (Historical / Free, default Historical, hidden for random
  worlds and challenges); `Programme` rail tab (key P) with a red progress strip; panel
  `ID.Panels.prog` and the tree modal (kind `'tree'`, `UI.renderTree`, `acts.tree`,
  `acts.startFocus`, `acts.cancelFocus`) in `js/ui/programme.js`; "No programme" alert; story
  dispatches are labelled HISTORY and their historical option is tagged "as it happened";
  Handbook page "Programmes and history"; World panel shows the mode. Alerts move up above the
  attack bar while a drawer is open (`#alerts.shift`).
- **Tools**: `node tools/history.js --runs 3 [--free] [--verbose] [--start 1925]` runs The Two
  Continents headless and prints which beats fired, which programmes each country completed,
  and the final regimes. `node tools/soak.js meridia iron [auto] [hist]`. Browser check:
  `/home/claude/scripts/hist.js`.

- **Balance notes (session 4).** The first version of the general tree made AI worlds much calmer
  (random maps: wars 28 → 19, civil wars 8 → 5.6 on the same nine seeds) because it handed every
  state free factories, technology levels, missile silos and permanent stability. Now general
  programmes trade off (gold costs, faction costs, temporary rather than permanent stability, research
  points instead of free tech levels, no free silos) and the same seeds give about 23 wars and 6–8
  civil wars. `node tools/simulate.js --nofocus` turns AI programmes off for comparison; seed-to-seed
  variance is large (4–49 wars), so compare at least nine runs. Historical mode on The Two
  Continents is busier than free mode (25–45 wars, many civil wars after 1950 in the east); that is
  intended. Soak with the AI playing the player's nation: free mode 10 of 17 fall, historical 9 of
  17 fall and Antara reached its objective in 1924. A passive player (no programmes, no levers)
  now falls in 16 of 17 starts, because every AI state develops through its programmes. AI gold
  hoarding got worse with programme income (thousands by the 1950s); still on the soft-spot list.

## Published (end of session 2)

- Playable artifact: slug `b44285db-2e8b-4266-bfe0-39315542a8b3` (https://claude.ai/artifact/PG38qVqd6iMyayLf4gaVKx), live version `1794534637-cfe2` after session 3,
  published from files (index.html, css, js, fonts). To update after edits, republish with
  `publish_files` using the slug and the live version from `get_artifact`.
- GitHub Pages zip: `/home/claude/iron-dialectic.zip` (rebuild with the zip command in the session log:
  `zip -rq ../iron-dialectic.zip index.html README.md DESIGN.md HANDOFF.md css js fonts tools`).

Ideas not yet done, in rough priority: a second handcrafted scenario; per-ideology unique events
for the rarer systems (cybernetic, minarchy, merchant have few); a "keep watching" mode after
defeat; touch-screen layout for tablets; translating the handbook theory text into in-game
examples drawn from the current campaign.

## Deliverables at the end

1. The folder zipped for GitHub Pages (upload contents to a repo, enable Pages on the root).
2. `README.md` with controls and how to host.
3. Optionally a single-file bundle for an instant-play artifact (inline CSS/JS/fonts).
4. Update `DESIGN.md` §8 if file layout changes, and delete or update this handoff file.
