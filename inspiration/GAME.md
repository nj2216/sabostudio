# 🎬 Final Cut — Horror Redesign of Sabotage Studio

> *"Quiet on set."*

A DBD-style asymmetric horror redesign of Sabotage Studio: one Director hunts a crew of Talent trying to survive a movie shoot that never wrapped.

---

## 📖 Table of Contents

- [Story & Lore](#story--lore)
- [Core Concept](#core-concept)
- [Roles](#roles)
- [Match Structure & Phases](#match-structure--phases)
- [The Lot (Map)](#the-lot-map)
- [Stations (Tasks)](#stations-tasks)
- [Director's Kit](#directors-kit)
- [Chase, Down & Wrap System](#chase-down--wrap-system)
- [Escape / Wrap-Up Phase](#escape--wrap-up-phase)
- [Eliminated Players — "Crew" Spectate Mode](#eliminated-players--crew-spectate-mode)
- [Numbers Reference Sheet](#numbers-reference-sheet)
- [DBD → Sabotage Studio Mapping](#dbd--sabotage-studio-mapping)
- [Open Design Questions](#open-design-questions)

---

## Story & Lore

### The Vanishing

In 1987, a low-budget practical-effects slasher called ***The Understudy*** was in production at Highline Studios. It was meant to be the breakout film for its director — ambitious, obsessive, and three weeks into a brutal shoot.

Then the entire cast and crew vanished overnight.

No bodies. No ransom note. No struggle. Just an empty lot, half-dressed sets still standing, coffee gone cold in the break room — and one reel of film left behind in the editing bay. Nobody who watched that reel all the way through ever spoke about it again.

The production was quietly buried. The studio sat abandoned for years before being rezoned and rebuilt as a modern broadcast facility — the Lot players know today. Red tape and "structural concerns" kept large sections of the old backlot permanently sealed off behind the new sets.

They were never actually empty.

### The Director's Cut

The vanished director never left. He is still trying to finish his movie — and somewhere along the way, the script stopped being fiction and became the rules of the world itself. Every Talent who sets foot on the Lot is treated as an actor who unknowingly signed on to his production.

He does not hunt at random. He **directs a scene**:

- He chases Talent into "frame."
- He corners them on **Marks** — chalk-taped floor spots left over from the original shoot.
- He calls "**cut**" when a scene is over, and "**wrap**" when a performer's part is finished — permanently.

His presence is broadcast across the Lot's old PA system in film-production terminology, which doubles as the game's core diegetic UI:

| Line (PA Bark) | Meaning |
|---|---|
| *"Quiet on set."* | Pre-match countdown — Director is sealed in the booth, Talent may not be hunted yet |
| *"And... action!"* | Director has spotted and committed to a chase |
| *"Cut!"* | Chase has broken off — **may or may not be genuine**, sometimes used as a fake-out |
| *"That's a wrap on [name]."* | A Talent has been eliminated |
| *"Print it!"* | A station/task has just been completed (heard by everyone) |

### Bleed-Through

Sealed-off sections of the original 1987 backlot still exist, layered underneath the modern Lot. Under the right conditions, reality "bleeds through" — a corridor briefly reverts to its 1987 geometry, tighter and more dangerous, sightlines shorten, and the air fills with static. These zones hide both extra risk and lore fragments (props, call sheets, unexposed film) hinting at what actually happened to the original cast.

### Why Talent Are There

Talent don't know they're in danger until it's too late — they were told this was a broadcast job, an audition, a tour, a dare. The specific hook doesn't matter mechanically, but it should stay consistent per-season/theme for flavor text, loading screens, etc.

### Win Framing

Talent aren't trying to *defeat* the Director — you can't defeat a force that owns the set. They're trying to either:
1. Complete enough of his scenes that he lets the picture "wrap" naturally, or
2. Find a way to walk off set entirely before he decides otherwise.

---

## Core Concept

**Genre:** Asymmetric multiplayer horror (Dead by Daylight structure), browser-based, P2P.

**Players:** 1 Director vs. 3–5 Talent per match.

**Match length target:** 6–10 minutes (faster than DBD's 8–12 min, suited to a browser party audience).

**Tone:** Diegetic dread over jump-scare spam — most tension comes from audio cues, PA announcements, and not knowing if "Cut!" is real.

---

## Roles

### Talent (3–5 players)
- Same free-roam movement and **100° FOV viewcone / fog-of-war** system as the original game — kept almost entirely as-is.
- No offensive abilities. Only movement, stealth (crouch/hide), and station interaction.
- Goal: complete stations, avoid or survive chases, escape.

### The Director (1 player)
- Full map vision — **no fog-of-war** for this role.
- Can see "aura" reads of Talent near active stations (brief, not constant tracking).
- Slightly faster base move speed than Talent (~110–115%).
- Has an ability kit built from the old Sabotage Arsenal categories (see [Director's Kit](#directors-kit)).
- Cannot act during Pre-Production phase — sealed in the booth to give Talent a scatter window.

---

## Match Structure & Phases

### Phase 1 — Pre-Production (15s)
- Lobby countdown. PA: *"Quiet on set."*
- Talent spawn scattered across the Lot.
- Director spawns locked in a sealed booth, immobile — mirrors DBD's opening gen-rush window, giving Talent a fair scatter.

### Phase 2 — Rolling (main phase)
- Talent roam and complete stations.
- Director hunts, uses ability kit, applies pressure.
- This is where the majority of the match plays out.

### Phase 3 — Wrap-Up
- Triggers once the required number of stations are completed.
- Backlot loading doors power on.
- Remaining Talent rush to reach and open exits (see [Escape / Wrap-Up Phase](#escape--wrap-up-phase)).

---

## The Lot (Map)

- Retains the existing multi-room layout connected by corridors.
- Keeps the **100° FOV viewcone** and fog-of-war for Talent exactly as originally built.
- Adds **Bleed-Through Zones**: pre-built alternate geometry chunks that can be swapped into specific corridors/rooms when the Director triggers his power. Not procedural — hand-authored "1987 mode" variants of select rooms.
- Chalk **Marks** are placed at fixed points around the Lot — these are where downed Talent get dragged (see below).
- Backlot loading doors (exit gates) are placed at 2 fixed locations, sealed until Wrap-Up phase.

---

## Stations (Tasks)

Existing minigame stations are kept, reframed narratively as "completing the scene" rather than generic tasks. Examples carried over:

| Station | Category | Reframed Purpose |
|---|---|---|
| 💣 Bomb Set (Wire Cutter) | Technical | Practical effects rig — defuse a prop explosive before a "take" ruins it |
| 🍔 Patty Flipper | Timing & Sequence | Craft services scene — feed the crew before a break-related crisis |
| 📻 Frequency Tuner | Precision | Sound department — clear audio static for a usable take |
| 🔐 Safe Cracker (Vault) | Memory / QTE | Studio vault — recover old production files/lore fragments |
| 🔑 Key Duplicator | Pattern Match | Recreate access keys to unlock sealed backlot sections |

**Completion requirement:** 5 of ~8–10 stations placed on the Lot (mirrors DBD's 5-of-7 generator structure).

**Shared audio cue:** Every completed station triggers a Lot-wide PA bark — *"Cut — print it!"* — a shared tension beat everyone hears, including the Director.

---

## Director's Kit

The original Sabotage Arsenal is **no longer symmetric** (Talent-vs-Talent). It becomes the Director's exclusive toolkit, used against Talent only. This is the single largest structural change from the original design.

### 👁️ Visual (Dread) Abilities
- **Flashbang** → used offensively on a spotted Talent to disorient during a chase.
- **Screen Crack** → triggered near-miss effect, simulates a violent near-catch.
- **Night Vision inversion** → briefly forces a targeted Talent's screen into high-contrast distorted vision.

### 🎮 Input (Possession) Abilities
- **Invert Controls** → brief "possession" effect on a nearby Talent.
- **Ghost Input** → injects phantom keypresses, reframed as the Director "directing" the Talent's body against their will.

### 🗣️ Social (Paranoia) Abilities
- **Fake Screen Swap** → renders a decoy of another Talent's view to sow confusion/misdirection among the group.

### 🏗️ Structural Abilities
- **Task Rewind** → resets a station's progress if the Director disrupts it mid-attempt.
- **Station Freeze** → locks a station's controls briefly, useful for area denial.

### Signature Power — Bleed-Through
- Cooldown-based unique ability (~40–60s cooldown, 8–10s duration).
- Forces a local zone into "1987 mode": shrinks affected Talent's FOV cone from 100° down to ~60°, swaps in alternate room geometry, adds static/audio distortion.
- This is the Director's answer to a DBD "killer power" — distinct, ability-defining, cooldown-gated rather than resource-purchased.

---

## Chase, Down & Wrap System

- **Chase commitment:** Once the Director closes to melee range and locks in, a visible/audible sting fires — *"And... action!"* — the formal start-of-chase signal (equivalent to DBD's chase music).
- **Terror Radius equivalent:** PA static/heartbeat audio begins at ~25–30 tile radius from the Director, scaling in volume/intensity as distance closes.
- **Down:** A caught Talent is downed, not instantly eliminated.
- **Crawl:** Downed Talent can crawl briefly before being picked up.
- **Mark (Hook equivalent):** Director drags downed Talent to the nearest chalk Mark.
- **Wrap timer:** ~60 seconds once placed on a Mark. If not rescued, the Talent is "wrapped" (eliminated) — PA: *"That's a wrap on [name]."*
- **Rescue:** Other Talent can interrupt the wrap timer. A brief invulnerability window is granted post-rescue to prevent instant re-down camping at the same Mark.

---

## Escape / Wrap-Up Phase

- Triggers once 5 of the required stations are completed.
- Backlot loading doors power on at their fixed locations.
- Opening a door uses a skill-check-style minigame (reusing existing precision/QTE minigame tech).
- Remaining Talent must reach and clear a door to escape; Director gets a final pressure window to prevent escapes.

---

## Eliminated Players — "Crew" Spectate Mode

Wrapped Talent are not fully removed from the match. They become **Crew**:

- Fully safe — cannot be targeted or interacted with by the Director.
- Can trigger minor environmental distractions to help remaining Talent: flicker studio lights, swing a locked-off camera, knock over a prop.
- Limited charges per environmental trigger type, to prevent infinite distraction spam.
- Reuses existing environmental-trigger plumbing from the original Studio Crisis system — low additional engineering cost.

---

## Numbers Reference Sheet

| Parameter | Value | Notes |
|---|---|---|
| Talent count | 3–5 | vs. original 2–8 |
| Director count | 1 | New dedicated role |
| Match length target | 6–10 min | Faster than DBD's 8–12 min |
| Pre-Production countdown | 15s | Director immobile |
| Stations required | 5 of ~8–10 | Mirrors DBD 5-of-7 |
| Director base speed | ~110–115% of Talent | Deliberate, not stealthy-fast |
| Terror radius (audio) | ~25–30 tiles | Scales with proximity |
| Wrap timer (on Mark) | ~60s | Interruptible by rescue |
| Bleed-Through cooldown | ~40–60s | 8–10s duration |
| Bleed-Through FOV effect | 100° → ~60° | For affected Talent only |
| Exit gate count | 2 fixed locations | Skill-check to open |

*(All numbers are starting points for playtesting, not final balance.)*

---

## DBD → Sabotage Studio Mapping

| DBD Concept | Final Cut Equivalent |
|---|---|
| The Killer | The Director |
| Survivors | Talent |
| Generators | Stations (5 of ~8–10 required) |
| Terror Radius | PA static/heartbeat, ~25–30 tile radius |
| Chase music sting | *"And... action!"* PA bark |
| Hooks / sacrifice | Marks / Wrap timer |
| Exit gates | Backlot loading doors |
| Perks / add-ons | Director's Kit (former Sabotage Arsenal, now asymmetric) |
| Killer power | Bleed-Through |
| Post-mortem spectating | Crew mode (active, not passive — can still assist) |

---

## Open Design Questions

- **Trust boundary:** In the current P2P/host-authoritative architecture, the Director needs privileged info (full map vision, aura reads) that Talent clients must never receive — even encrypted-in-transit — since a Talent could read local game state via devtools. Needs a server/host trust model decision before this is buildable as designed.
- **Director's full ability list & cooldown/resource model:** buy-with-points (original model) vs. pure cooldown-gated (DBD-style) — leaning cooldown-gated per this doc, needs confirmation.
- **Station list finalization:** which of the original 10 stations carry over vs. get cut/replaced for pacing at 5-of-8-10.
- **Bleed-Through zone authoring:** how many alternate geometry chunks are needed for a first playable build, and which rooms get them first.
- **Balance pass:** all values in the Numbers Reference Sheet are unplaytested starting points.