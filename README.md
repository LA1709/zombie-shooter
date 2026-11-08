# DEADLANE

A portrait, 3D single-hero lane zombie shooter. Hold one of three bridge lanes, auto-fire into a growing crowd, shoot gates to upgrade your gun, switch lanes to manage the horde, and chase a higher score every run.

> Three lanes. Zero mercy.

![DEADLANE start screen](docs/preview-start.png)
![DEADLANE gameplay](docs/preview-gameplay.png)

## Framework choice

**React 19 + TypeScript + Vite for the UI shell, with Three.js for the high-end 3D renderer.**

Why this stack for this game:

- The mockups call for a 3D bridge, city depth, squad, giant zombie boss, and cinematic bullet streams. Three.js gives that presentation while keeping the simulation framework-agnostic.
- The simulation is plain TypeScript and has no React dependency. React only renders screens, HUD, and overlays. This keeps the game loop out of component state and avoids the usual React game-loop spaghetti.
- `Renderer` is isolated behind `GameEngine` and the `GameWorld` snapshot contract, so the 3D presentation can be improved without rewriting simulation logic.
- Vite keeps the dev/build loop tiny. The current production build is about **224 KB gzipped for JS + CSS**, plus ~89 KB of self-hosted font files. Code-splitting Three.js remains a future optimization.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Production check:

```bash
npm run typecheck
npm run build
npm run preview
```

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Switch lane | `A` / `D` or arrow keys | Drag into the left/center/right lane |
| Aim / fire | Automatic down the current lane | Automatic down the current lane |
| Dash | `Space` or dash button | Dash button |
| Pause | `P` / `Escape` | Pause button |
| Start / restart | `Enter` or button | Button |

Dash gives brief invulnerability. Keep a streak alive to raise the score multiplier. A wave clear patches up some health and pays a bonus.

Auto-fire only shoots down the squad's current lane. The closest zombie in that lane is the target, unless a gate is in front of it; a gate blocks shots only in its own lane. Zombies stop behind intact gates until the gate is destroyed. Gates are the main choice: shoot a gate to grow your squad, upgrade your gun, heal, or raise your bullet multiplier. Most zombies are lane-locked; the red-shirt zombies are the subset that can switch lanes toward you. Zombies that cross the red HOME LINE breach and subtract life. At 0 HP the player is swarmed, then the run ends.

## What is in the current build

- Start, pause, overrun, game-over, and restart flow
- Local best-score and sound-preference persistence
- Fixed-timestep simulation, independent of frame rate
- Three-lane movement with keyboard lane steps and pointer/touch lane selection
- Same-lane auto-targeting with tracers, critical hits, hit flashes, and target reticle
- Animated projectile bullets with bullet multipliers
- Combo multiplier and floating score feedback
- Endless escalating waves with close-range vanguard spawns
- Shooter gates with squad, gun, heal, penalty, and bullet-multiplier choices
- Large 3D gates with readable labels, lane-blocking shots, same-lane blast damage, and score
- Zombies stop behind intact gates instead of walking through them
- Squad size and gun level persist through the run
- Lane-locked zombies; red-shirt zombies can switch lanes toward the player
- Zombie breaches: zombies reaching the home line crash through and subtract life
- Overrun sequence and result screen when the player is reached at 0 HP
- Three.js bridge/city scene, particles, bullet streams, screen shake, and hurt effects
- Procedural WebAudio sound effects (no audio assets required)
- Responsive portrait, desktop, and landscape layouts

Deliberately **not** in this slice: lane-blocking barricades, tap/click focus targeting, 3-choice upgrade screens, zombie variants that interact with caches, bosses, vehicles, permanent meta progression, missions, cosmetics, analytics, and PWA/offline packaging. Those are sequenced in [docs/ROADMAP.md](docs/ROADMAP.md).

## Architecture

```text
src/
  game/
    GameEngine.ts       Loop, fixed timestep, snapshots, audio/input wiring
    GameWorld.ts        Pure simulation: player, zombies, caches, contact, waves, effects
    Renderer.ts         Three.js bridge/city scene, gates, squad, zombies, FX
    SpriteBank.ts       Legacy procedural sprite utilities
    InputController.ts  Keyboard + pointer lane selection
    AudioEngine.ts      Tiny WebAudio synthesizer
    config.ts           All balance and tuning constants
    types.ts            Shared simulation/UI contracts
    math.ts, storage.ts
  components/
    GameStage.tsx       React <-> engine bridge
    Hud.tsx             In-game HUD, grab warning, buff timer
    Overlays.tsx        Start / pause / overrun / game-over screens
    Icons.tsx
  styles.css
```

### Data flow

```text
keyboard / pointer
        │
        ▼
InputController ──► GameWorld (fixed 60 Hz) ──► Renderer (every RAF)
                         │
                         └── GameSnapshot (10 Hz) ──► React HUD / overlays
```

React never mutates the simulation. It only calls engine commands (`start`, `togglePause`, `requestDash`, `toggleMute`) and renders the latest snapshot. The game can be rendered and tested without React, and the HUD can be redesigned without touching the simulation.

### Tuning

Most feel changes live in `src/game/config.ts`:

- Player damage, fire rate, lane-switch speed, bullet multiplier duration, dash, crit chance, overdrive fire-rate multiplier
- Zombie count/HP/speed/spawn interval scaling and lane-switch interval
- Wave break length and heal amount
- Spawn depth, attack depth, grab duration/depth, and grab slow
- Cache HP, blast radius/damage, rewards, and alignment window

The vanguard spawn logic and cache placement are in `GameWorld.beginWave()`. The zombie-vs-cache aim-target scoring is in `GameWorld.findTarget()`. Contact and overrun timing live under `GAME.contact`.

## Design notes

- **The horde is the spectacle.** Close-range vanguard spawns were added specifically so waves do not become a shooting gallery at the horizon.
- **Three lanes, not free movement.** The player's job is lane positioning, dash timing, and streak preservation. Shooting, cache blocking, and grabs are all resolved in the current lane, so the road guide, dividers, chevrons, and L/C/R markers are part of the readability system.
- **Choose the lane with the best multiplier.** The visible cache number tells you what your next shots are worth. A stronger multiplier may be worth diverting fire from the immediate horde.
- **Only some zombies chase your lane.** Most zombies stay lane-locked. Red-shirt zombies can step sideways toward the player's lane, which makes lane switches dangerous without turning every zombie into a homing enemy.
- **Caches physically block their lane.** Zombies stop behind intact caches, so the cache reads as a barrier between the player and the horde. Destroying it spends time and diverts fire, but the blast and bullet multiplier can flip the lane.
- **Contact must be readable.** Zombies do not just chip health from a distance; they lunge closer, glow red, claw the player, and show a floating `GRABBED` warning. The dash or a lane switch is the escape. At 0 HP the player is swarmed, then the run ends.
- **No asset dependency.** Sprites are drawn once into offscreen canvases; the renderer only scales and composites them. This keeps placeholder art consistent and fast.

## Quality checks used

- `npm run typecheck`
- `npm run build`
- Headless mobile (390×844), desktop, and landscape (844×390) visual passes
- Start, pause, resume, keyboard pause, lane switching, projectile hits, gate blocking, gate destruction, bullet multiplier pickup, zombie breach, wave clear, best-score persistence, overrun, and game-over/restart flow exercised in-browser
