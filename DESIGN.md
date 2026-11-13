# IRON DIALECTIC — design document

*A grand strategy of belief and power.* You do not command units. You run a state, and
everything the state can do follows from what it believes and how it is organised.

## 1. Pillars

1. **Ideology is the rulebook, not a bonus.** Each of the 22 ideologies swaps out parts of the
   rules: who sets the budget, how troops are raised, which factions can bring you down, where
   legitimacy comes from, what you are allowed to order directly.
2. **War is simple to operate and hard to master.** OpenFront-style: one troop pool, a
   percentage slider, a fluid pixel front. No unit counters, no templates.
3. **The state can fall, and you will know why.** Every collapse ends in a post-mortem that
   names the faction that turned, the trigger, and the numbers behind it.
4. **Size is a problem, not a solution.** Occupied land resists, coalitions form against the
   leader, revolutionary regimes bureaucratise, elected ones slide in a crisis.

## 2. Core loop

```
            ┌──────────────── every day (tick) ────────────────┐
            │ fronts advance · boats sail · pockets starve      │
            └───────────────────────┬───────────────────────────┘
                                    │
   ┌──────────────── every month ───▼──────────────────────────────────────────┐
   │ ECONOMY (by ideology's model) → revenue → budget                          │
   │ FACTIONS: power from social structure, support from met/unmet demands     │
   │ LEGITIMACY from the ideology's own sources → STABILITY                    │
   │ PROVINCES: unrest, opposition movements, foreign subversion, integration  │
   │ CRISES: strikes, plots, uprisings, secession, elections, drift            │
   │ EVENTS with delayed consequences · AI turns · diplomacy                   │
   └───────────────────────────────┬───────────────────────────────────────────┘
                                   │
   player: set budget/laws/decisions · answer events · make and break treaties
           declare wars · commit % of troops · build · subvert neighbours
```

A campaign runs 1910 → 1976 across four eras (Empires, Masses, Total War, Atomic). One day is
one tick; the default speed is 10 days per second.

## 3. Systems

| System | What it is | Where ideology bites |
|---|---|---|
| **Map & combat** | 384×216 tile grid, fluid borders, troop pool, % commit, 5 attack styles, forts/cities/ports/factories/silos, naval landings, encirclement | recruitment laws available, style multipliers, morale source, max % per attack, whether losing the capital matters |
| **Economy** | 8 models: `market`, `mixed`, `plan`, `council`, `pact`, `manor`, `trade`, `cyber` | each model has different levers and a different failure mode (bust, distortion, deadlock, pact breakdown, rent revolt, blockade, overload) |
| **Factions** | workers, peasants, capital, military, clergy, intelligentsia, bureaucracy; each has power and support | base support, power multipliers, ruling coalition, what each faction does when it turns |
| **Legitimacy** | weighted mix of 11 sources (mandate, fervour, tradition, prosperity, victory, discipline, participation, divine, order, competence, charisma) | the weights; lose your main source and stability follows |
| **Control** | `decree`, `party`, `parliament`, `court`, `assembly` | decrees are instant but breed grievance; assemblies vote, take time and cap offensives, but cannot be couped or decapitated |
| **Diplomacy** | opinion from ideological distance, sectarian rivalry, threat; pacts, blocs, trade, embargo; covert funding of movements and coups | distance on 4 axes, declared rivals inside the same family, export strength, casus belli |
| **Information** | press law × security law | censorship buys calm and corrupts your own statistics; free press tells the truth, including to your enemies |
| **Change** | elections, reforms, drift, coups, uprisings, civil war, imposed regimes | each ideology has named drift paths with visible pressure and causes |
| **Victory** | domination, ideological, economic hegemony, grand objective, verdict of history | one grand objective per ideology |

### Hinterland and war orders (added after the first build)
About 30% of land starts unclaimed: each state's farthest provinces at generation, plus islands no
capital reaches. Expansion uses the same attack machinery with `to = 0`: no war, no defender, a
flat troop cost per tile scaled by terrain (`Combat.WILD_LOSS`). Settled hinterland starts 55%
integrated and integrates three times faster than conquered land. Three war orders with costs
and cooldowns sit on the war bar: artillery barrage (short range, kills troops, wrecks forts,
leaves the area "shaken" so attacks there cost 40% less), air raid (military technology 3, deep
range, can destroy factories, cities and ports), and calling up the reserves (instant 2% of the
population beyond the ceiling, at a cost in support, weariness and equipment).

### Programmes and historical mode (added in session 4)
A **programme** is a long project (75–140 days) that pays out when it finishes; one runs at a
time. Every state shares a general tree (industry, agriculture, army, state, foreign policy and
three repeatable campaigns). On *The Two Continents* each country also has a national tree of 8–12
programmes whose branches are real political choices: some rule each other out ("Strengthen the
Okhrana" or "The October Manifesto"), some change the system of government, some claim land or
start wars. Ideological programmes are what make a country's trajectory a choice rather than
only a drift.

**Historical mode** (a setup toggle, on by default for The Two Continents) adds a storyline of 25
dated beats from 1911 to 1973. World beats act directly (the Steel Accord forms, the great war
breaks out, the armistice, the atomic test, the iron curtain); nation beats are dispatches to one
country (the February days in Aurelia, the Fourteenth Congress in Karsova, the generals' rising
in Verano). AI countries take the option history took and follow their historical programmes;
the player chooses freely, and the historical option is marked "as it happened". Every beat has a
condition, so once the world diverges the script adapts or skips what no longer fits. When a world
beat would make the player's country declare war, the player gets the choice instead; when it
would force the player into peace or an alliance, it arrives as an offer. Before 1939 AI states
start fewer wars of their own and found no new blocs, so the great wars come from the script.

### Destinies and identity (added in session 5)
The aim is attachment: a player should finish a campaign proud of what their country became. Every
national tree has three or more **destinies**, the end points of its branches. A destiny renames the
state, raises a new flag, installs a named leader and arrives as a full-screen moment with a line
meant to be remembered. Destinies are written as short, specific, slightly ominous scenes rather than
bonuses: "Your request was anticipated in 1951." States without a national tree get a family tree
with destinies of their own, so every country on every map has somewhere to go. Each country of The
Two Continents also has a motto, an anthem (generated from its name), a short history and two
national spirits; titles ("Victor over Hesperia", "Born of Revolution") accumulate as it plays.

### Combat in five sentences
Troops are a share of your population set by the mobilisation slider; soldiers are not
workers. To attack, pick a neighbour you are at war with, set the commit slider, choose a
style, click. The committed troops leave your pool and eat into enemy tiles; each tile costs
more where the defender is dense, the terrain is rough, or a fort covers it. Land cut off from
the capital with no port loses supply and surrenders with the troops inside it. Boats carry a
landing force from any port to any coast in range.

### Information problem (the dictator's dilemma)
Under censorship the faction-support numbers you are shown are *reported* figures: biased
upward and noisy. The simulation uses the true ones. Plan economies add output inflation on
top. A free press shows exact numbers and costs you scandals and easier foreign influence.

### Provinces
The map is partitioned into ~200 fixed provinces. Ownership is per tile, politics is per
province: unrest, the leading opposition movement and its strength, occupation resistance and
integration. Civil wars hand the rebels the provinces where the movement is strongest.

## 4. How each ideology modifies each system

Economy model · control · recruitment · legitimacy · signature rule. Full numbers live in
`js/data/ideologies.js`.

| Ideology | Economy | Control | Army | Legitimacy | Signature |
|---|---|---|---|---|---|
| Marxist-Leninist | plan | party | conscript / levy | discipline, fervour | Five-Year Plans lock the budget; purges; satellites |
| Trotskyist | plan | party | levy | fervour | fervour dies unless revolution spreads; cheap, strong export |
| Council communist | council | assembly | militia | participation | congress sets the budget and votes on war; no coups, weak central command |
| Maoist | plan (rural) | party | people's war | fervour, peasants | partisans in occupied land; mass campaigns; rough-terrain warfare |
| Market socialist | mixed | parliament | conscript | prosperity, mandate | co-ops in a market; trades with every camp; restoration drift |
| Democratic socialist | mixed | parliament | volunteer | mandate | nationalisations provoke capital strike and coup plots; no repression tools |
| Anarcho-syndicalist | council | assembly | militia | participation | can call general strikes abroad; no state security at all |
| Anarcho-communist | council | assembly | militia | participation | no capital to take, never capitulates; 25% cap per offensive |
| Classical liberal | market | parliament | professional | mandate, prosperity | private capital builds for you; booms and crashes |
| Social democrat | mixed | parliament | conscript | mandate, prosperity | class compromise must hold on both sides |
| Minarchist | market | parliament | volunteer / mercenary | prosperity | 15% tax ceiling, no public welfare or science; hired guns |
| Constitutional monarchy | market | parliament | professional | tradition, mandate | two legitimacies; slow to move |
| Absolute monarchy | manor | court | feudal levy | tradition, divine | succession crises; modernisation breeds your gravediggers |
| Theocracy | manor | court | levy | divine | holy war; conversion abroad; schism |
| Agrarian traditionalist | manor | assembly | militia | tradition, participation | factories raise unrest; depression-proof; partisans |
| Military junta | pact | decree | professional | order, victory | garrisons suppress unrest; colonels' coups |
| Corporatist | pact | decree | conscript | order, victory | labour–capital pact slider; breakdown halts production |
| Technocrat | cyber-lite plan | decree | professional | competence | every crisis hits double; research edge |
| Personalist | plan / pact | decree | conscript | charisma | the leader ages; succession can end the state |
| Merchant republic | trade | parliament | mercenary | prosperity | income is trade; buy troops and peace with gold |
| Cybernetic planner | cyber | party | conscript | competence, participation | no distortion while compute keeps up; censorship poisons the data |
| National populist | pact | decree | conscript | charisma, victory | plebiscites and scapegoats: support now, isolation later |

## 5. Data schema

Everything below is plain data in `js/data/*.js`; the simulation interprets it.

```js
ideology = {
  id, name, family, color, short, theory,          // text for encyclopedia
  axes: { econ, auth, trad, intl },                // -1..1, used for ideological distance
  rivals: [ideologyId],                            // sectarian enemies inside the family
  econ: { model, ...modelParams },
  control: { type, body, authGain, warVote, offensiveCap, lawCost, decreeGrievance },
  elections: 0 | years,
  recruit: { allowed: [lawId], def },
  doctrine: { atk, def, home, moraleFrom, styles: {advance, assault, blitz, infiltrate, siege} },
  factions: { base: {factionId: +/-}, power: {factionId: mult}, ruling: [factionId], names: {} },
  legit: { sourceId: weight },                     // weights sum to 1
  laws: { category: [allowed option ids] }, lawDefaults: { category: optionId },
  dip: { export, aggression, cb: [...], trade },
  flags: { noCoup, noDecapitation, partisans, succession, holyWar, ... },
  drift: [{ to, label, why, pressure(n, G) }],     // points per month, can be negative
  objective: { name, desc, progress(n, G) },       // 0..1
  decisions: [decisionId], perks: [text], flaws: [text]
}

faction  = { id, name, icon, powerFrom(n), demands: [{ id, label, value(n) }], turn: eventId }
law      = { cat, id, name, desc, effects... }
building = { id, name, cost, upkeep, desc, needs }
decision = { id, name, desc, cost: {auth, gold}, cooldown, vote, can(n, G), effects: [...] }
event    = { id, title, text, weight(n, G), once, options: [{ label, tip, effects, ai, hist }] }
effect   = ['stab', -5] | ['sup', 'workers', +10] | ['mod', 'prod', -0.2, 12, 'Strike']
         | ['later', 6, 'eventId'] | ['drift', 'ml', +15] | ['flag', 'x'] | ...
         | ['ideology', 'socdem', 'reform'] | ['claim', 'Drava'] | ['war', 'Verano', 'claims']
         | ['ally', 'Norvik'] | ['build', B.FACTORY, 2] | ['techUp', 'mil'] | ['law', 'land', 'commune']
         | ['subvert', 'Suyan', 15] | ['civilwar', 'council', 0.42] | ['protector']
programme = { id, name, x, y, days, req: [id], reqAny: [id], excl: [id], year, after: storyBeatId,
              ideos: [ideologyId], can(n, G), fx: [effect], hist, repeat: years, desc }
storyBeat = { id, date: [year, month], cond(G), nation: base } | { id, date, cond(G), title, run(G) }
```

Adding an ideology is one object in `ideologies.js`; adding an event is one object in
`events.js`. Nothing else needs to change unless it introduces a new flag.

## 6. Failure and victory

**You lose when** the state is conquered, a coup you resisted succeeds, you lose a civil war,
or stability sits at zero long enough for the country to break apart. Elections you lose are
not a defeat; the country carries on under new management.

**You win by** holding 55% of the world's land (Domination); 60% of the world's people living
under your ideological family with you as its largest state (Ideological); 35% of world output
plus trade treaties with most of the world for five years (Hegemony); or your ideology's grand
objective. If nobody has won by 1976, history delivers a verdict by score.

## 7. Art direction

**Constructivist war room.** Three inks on newsprint: ink black `#14110f`, paper `#e9dfc8`,
signal red `#d93a2b`, with ochre as the only accent. The map is a printed plotting chart:
flat poster colours, ink borders, dithered terrain hatching, a faint grid on the sea. UI is
dark slabs with paper text, condensed uppercase headers, hard diagonals, no gradients, no
rounded pills. Type never drops below 13px. Sound is small and percussive: telegraph, paper,
drum, brass.

## 8. Code layout

```
index.html            no build step; plain <script> tags, one global `ID`
css/style.css         the whole interface
fonts/                Barlow + Barlow Condensed (OFL)
js/core/util.js       RNG, noise, heap, formatting, calendar
js/data/*.js          base (terrain, laws, buildings...), ideologies, names + scenario, events + decisions,
                      focus (programme trees and the historical storyline)
js/sim/*.js           mapgen, world, combat, economy, politics, diplomacy, events, focus (programmes and
                      storyline engine), ai, game (loop, victory, saves)
js/ui/render.js       canvas map: 1px-per-tile offscreen image, dirty-tile repaint, vector overlays
js/ui/audio.js        synthesised sound cues and the generative score (ID.Music)
js/ui/flags.js        procedural flags, ideology emblems, dispatch poster banners
js/ui/ui.js           top band, rail, selection card, attack bar, alerts, offers, dispatches, tooltips, keys
js/ui/panels.js       State, Economy, Laws, War, Foreign, World, Handbook
js/ui/programme.js    Programme panel, the programme tree, history timeline, handbook page
js/ui/screens.js      title, campaign setup, saves, settings, challenges, records, post-mortem, chronicle
js/ui/tutorial.js     guided first campaign as Cassine
js/ui/main.js         boot, main loop, pointer and wheel input
tools/                simulate.js, soak.js, budget.js, probe.js, fates.js, history.js (headless, Node)
```

The `sim` layer never touches the DOM, so whole campaigns run in Node for balance testing.
