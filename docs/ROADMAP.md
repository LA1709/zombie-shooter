# DEADLANE — phase plan

The plan is intentionally sequenced so each phase adds **one new source of fun** and can ship as a playable build. Do not combine the barrel loop, boss fight, and meta progression into one milestone; each needs tuning time.

## Product north star

- 60-second runs that turn into "one more run"
- Readable chaos: hundreds of silhouettes, but the player always knows what is threatening them
- A strong identity from the reference: a lone shooter, a lane, a crowd, and destructible numbered objects
- Mobile-first portrait play, with desktop and landscape as first-class fallbacks

## Phase 1 — MVP vertical slice (complete)

**Goal:** prove the core shooting loop is fun before adding content.

**Delivered**

- React + TypeScript + Vite shell and custom Canvas 2D engine
- Start, pause, game over, restart
- Move / auto-fire / dash / combo / crits
- Fixed-timestep simulation and decoupled render loop
- Endless escalating waves, close-range vanguard spawns, wave-clear heal
- Procedural sprites, bridge scene, tracers, particles, screen shake, hurt feedback
- Procedural sound effects, mute and best-score persistence
- Responsive portrait, desktop, and landscape layouts

**Exit criteria**

- A new player can start, understand movement, and survive at least wave 1 without instructions
- No console errors; production build passes
- 60 fps target on a mid-range phone with the current horde
- Run ends with a readable result screen and a persisted best score

**Cut from this phase:** barrels, upgrades, bosses, vehicles, meta progression, multiple maps, music.

## Phase 2 — Barrel loop and contact threat (in progress)

**Goal:** turn the shooting gallery into a target-priority game with decisions, and make close-range contact a real threat.

**Why this next:** the numbered caches are the most distinctive visual in the references. Contact turns the horde from a score stream into pressure the player must answer.

**Delivered in the current slice**

- Destructible supply caches with large color-coded HP labels
- Alignment-based auto-targeting: line up with a cache to spend fire on it; otherwise the closest zombie wins
- Cache destruction: blast damage, score, and one of medkit / overdrive / score
- Contact grab: zombies lunge, slow the player, deal damage; dash breaks grabs
- Overrun sequence: at 0 HP the player is swarmed, then the run ends
- HUD grab warning and overdrive timer

**Next in this phase**

- Optional tap/click focus targeting if alignment-only targeting tests poorly
- Lane-blocking barricades and variants (runner slips past, brute breaks caches)
- 3-choice upgrade screen on wave clear
- More cache rewards / pickup drops
- Tune waves 2–5 around cache and grab decisions

**Exit criteria**

- Waves without caches feel noticeably less interesting
- Player can explain when to shoot a cache vs. a zombie
- Player understands why a cache is not being shot when not aligned
- Grab and overrun are readable on a 390 px-wide screen
- Upgrade choices create at least two distinct run builds
- No unwinnable cache placement; spawn logic validates lanes

**Do not add yet:** boss, permanent upgrades, new maps.

## Phase 3 — Bosses and spectacle

**Goal:** give each 5-wave block a memorable climax.

**Scope**

- Boss encounter every 5 waves
- Boss weak point with a large reticle and damage multiplier
- Telegraphed slam / sweep / summon attacks
- Arena modifier: barrels spawn during boss fight for cover and damage windows
- One set-piece powerup: helicopter strafe, vehicle-mounted gun, or airstrike
- Boss health bar, intro banner, death explosion, wave reward

**Exit criteria**

- Boss fight is readable on a 390 px-wide screen
- A boss can be defeated with the starter build if the player uses barrels and dash
- Boss does not invalidate the existing horde systems

## Phase 4 — Meta progression and content

**Goal:** give players a reason to return after a failed run.

**Scope**

- Soft currency earned per run
- Permanent upgrade tree with meaningful but not mandatory power
- Daily challenge / modifier runs
- Unlockable weapons with different feel (shotgun, SMG, marksman)
- 2 additional environments (city street, harbor) using the same lane simulation
- Missions (kill X, clear wave Y, no-dash challenge)
- Cosmetics: player outfits, tracers, muzzle flashes

**Exit criteria**

- New player can still reach wave 3 with no meta upgrades
- Returning player sees a clear next unlock goal
- Meta upgrades do not turn the game into an idle stat check

## Phase 5 — Production and launch

**Goal:** make it shippable, measurable, and maintainable.

**Scope**

- Final art direction: sprite-sheet pipeline or a renderer swap to 3D if the references demand it
- Music loop and layered combat mix
- Accessibility: reduced shake, flash intensity, colorblind-safe HUD, larger touch target option
- Performance budgets and profiling on low-end Android
- PWA / offline install, share card, store metadata
- Analytics: run start, wave reached, upgrade picks, retention, ad/revive points
- Automated smoke tests for start → play → pause → death → restart
- Release checklist and rollback plan

## Cross-cutting priorities

1. **Readability over realism.** A close zombie must never be confused with the player. Grabs need a clear silhouette, grab warning, and escape cue. Keep outlines and contrast.
2. **Mobile ergonomics.** Thumb reach, safe areas, 44 px minimum touch targets, no scroll traps.
3. **Data-driven tuning.** Keep balance in `src/game/config.ts`; move to JSON/remote config only when live tuning is needed.
4. **Renderer boundary.** Simulation stays framework-agnostic. If 3D becomes necessary, replace `Renderer` and `SpriteBank`, not `GameWorld`.
5. **Ship small.** Every phase should end with a playable build and a short playtest note.

## Suggested next tasks after this slice

1. Playtest the new grab/overrun and cache loop on a real phone.
2. Add tap-to-focus targeting if alignment-only targeting feels opaque.
3. Add the 3-choice upgrade screen on wave clear.
4. Add runner/brute variants and lane-blocking barricades if they improve decisions.
5. Tune waves 2–5 around the new decisions.
6. Add the first boss after the cache/contact loop is stable.
