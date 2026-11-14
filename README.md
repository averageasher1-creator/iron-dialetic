# Iron Dialectic

A grand strategy of belief and power, playable in the browser. You run a state from 1910 to
1976. War is simple to operate (one troop pool, a percentage slider, a fluid pixel front); the
depth is in politics. Each of the 22 ideologies changes how the economy works, how the army is
raised, which factions can bring you down, where legitimacy comes from, what you are allowed to
order directly, and what winning means.

No build step, no backend, no dependencies. Open `index.html` through any static web server.

## Host it on GitHub Pages

1. Create a new public repository on GitHub.
2. Upload the **contents** of this folder (so `index.html` sits at the repository root).
3. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
4. After a minute the game is live at `https://<your-username>.github.io/<repository>/`.

To play locally, run a static server from this folder, for example `python3 -m http.server`,
then open `http://localhost:8000`. (Opening the file directly with `file://` also works in most
browsers.)

## Controls

Everything works with a trackpad. Nothing needs a right-click.

| Action | Input |
|---|---|
| Pan | drag the map, two-finger scroll, arrow keys or WASD |
| Zoom | pinch, mouse wheel, `+` / `−` |
| Select a tile or state | click |
| Attack the selected enemy, or expand into selected hinterland | `Enter`, the Attack/Expand button, or double-click |
| Artillery barrage / air raid | click the order on the war bar, then click enemy land (`Esc` cancels) |
| Pause / speed | `Space` / `1`–`5` |
| Panels | `R` ministers' report · `G` state · `E` economy · `L` laws · `P` programme · `M` war · `F` foreign · `O` world · `H` handbook |
| Map modes | `Z` political · `X` ideology · `C` opposition · `V` unrest · `B` supply · `N` terrain |
| Close / menu | `Esc` |
| Answer a dispatch | click an option (crises stop the clock; ordinary dispatches wait at the left of the map), or press its number |

Hover anything for an explanation. If two-finger scrolling zooms instead of panning on your
machine, change it in **Settings**.

## What is in it

- **22 ideologies** in six families, each with its own economy model (market, mixed, plan,
  workers' councils, corporatist pact, agrarian rent, commercial, cybernetic), decision-making
  rules, recruitment laws, attack doctrine, legitimacy sources, drift paths and grand objective.
  Sectarian rivals inside a family treat each other as enemies.
- **Seven factions** with power drawn from the country's structure and support driven by
  visible, itemised demands. Censorship makes the numbers you see lie.
- **Regime change**: elections, coups, uprisings, reforms, drift and imposed regimes. Civil
  wars split the map along the provinces where the rebels are strong, and you choose a side.
- **Historical mode** on *The Two Continents*: a storyline runs from 1910 to 1976 (a great war,
  revolutions, the Slump of October 1929, a second war, the blocs, a crisis over the straits).
  Other countries follow the paths they took in history. When history reaches your country you
  choose, and the option history took is marked. Turn it off for a world with no script.
- **Programmes**: every state works through long projects that pay out when they finish. Each of
  the 17 countries of *The Two Continents* has its own branching tree, with paths that rule each
  other out, change the system of government or start wars; every state shares a general tree
  for industry, farming, the army, the state and foreign policy.
- **The ministers' report**: when the state starts to crumble, open the Report (`R`). It names
  each problem, what is causing it, and the levers that answer it, one click away.
- **Emergency measures**: a tree of short measures that open only in trouble (hunger, an empty
  treasury, unrest, a falling government, a drifting regime, restless officers, a losing war,
  civil war). Starting one shelves the programme under way without losing its progress.
- **Home fronts**: every national tree has a domestic branch with a choice of two roads.
- **Destinies**: every country's programme branches into three or more endings. Reach one and
  the state takes a new name and a new flag, with a moment to match ("Ring the bells backward. We
  are returning to the hour before the fall."). Every country on every map has a tree: the 17 of
  *The Two Continents* have their own, and every other state gets one for its family of ideas.
- **The Nation screen**: click your flag for your motto, your anthem (each state has its own
  march, written from its name), its history, its national spirit, the titles it has earned and
  the destinies still open to it.
- **A land race from the first day**: about a quarter of the world starts as unclaimed
  hinterland. Every state pushes into it with troops, no war needed, until the borders close.
- **OpenFront-style war**: fronts advance tile by tile by troop density, terrain, rivers and
  forts; five attack styles; naval landings and settler landings; encircled pockets surrender;
  artillery barrages, air raids and emergency call-ups; missiles and atomic weapons with
  political costs.
- **War you can see and hear**: shell bursts and smoke along every front, attack arrows with
  troop counts, captured-tile counters, screen shake, a generative score that turns martial in
  wartime, and newspaper front pages for wars, revolutions, fallen capitals and new eras.
- **Absolute rule looks the part**: under an absolute monarch or a personal dictator the screen
  turns gold or red, slogans crowd in, the numbers lie, and at the height of the cult the whole
  display glitches. It can be switched off in Settings.
- **Flags** for every state, generated from its name and ideology, that change when the regime does.
- **A living world**: blocs, coalitions against the leader, foreign-funded movements, general
  strikes called from abroad, revolutionary waves, a Great Slump, four eras.
- **81 events and 47 decisions**, many with delayed consequences.
- **A post-mortem when you fall** naming the faction that turned, what turned it, the last
  years of warnings and what to try next. A chronicle when the campaign ends.
- A handcrafted scenario (*The Two Continents, 1910*), seeded random worlds in three sizes,
  three difficulties, six unlockable challenges, three save slots plus autosave, run records,
  a guided tutorial and an in-game handbook covering every system and ideology.

## For developers

```
js/core/util.js      RNG, noise, heap, formatting
js/data/*.js         ideologies, laws, factions, buildings, events, decisions, names, scenario
js/sim/*.js          map generation, world, combat, economy, politics, diplomacy, events, AI, loop, saves
js/ui/*.js           canvas renderer, sound, interface, panels, screens, tutorial, main loop
tools/*.js           headless balance tools (Node 18+)
```

The simulation never touches the DOM, so whole campaigns run in Node:

```
node tools/simulate.js --runs 5 --years 66      # AI-vs-AI campaigns with a summary table
node tools/soak.js meridia iron                 # how long a passive human lasts in each nation
node tools/soak.js meridia iron auto            # the same with the AI playing your nation
node tools/budget.js                            # every nation's treasury on default settings
node tools/history.js --runs 3 --verbose        # The Two Continents in historical mode: beats, programmes, regimes
node tools/history.js --runs 3 --free           # the same world with no storyline
```

Ideologies, events, programmes and the storyline are plain data: add an ideology by adding one
object to `js/data/ideologies.js`, an event to `js/data/events.js`, a programme or a story beat
to `js/data/focus.js`. `DESIGN.md`
describes the systems and the data schema.

## Credits

Typefaces: Barlow and Barlow Condensed by Jeremy Tribby, SIL Open Font License 1.1; Special Elite by Astigmatic, Apache License 2.0
(`fonts/OFL.txt`). All sound is synthesised in the browser.
