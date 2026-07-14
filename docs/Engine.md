# Engine

## Stack

- React
- Vite
- Localhost only

## Principles

- Reuse systems whenever possible.
- Never duplicate simulation logic.
- React handles UI only.
- Engine handles gameplay.
- Simulations plug into the engine.

## Main Loop

There is exactly one loop. There is never a separate render loop and simulation loop.

requestAnimationFrame
↓
Engine Tick
↓
Simulation Update
↓
Rendering

The engine drives this loop. React never drives it — React only starts and stops it.

## Determinism

Simulation updates run on a fixed timestep, independent of rendering FPS.

Rendering may still run at whatever frame rate the browser provides. Only the simulation update step is fixed-timestep.

The same random seed must always produce the same result — same winner, same statistics — regardless of machine performance or frame rate.

## Menu

- Select Simulation
- Select participating characters (2–4, one per player slot)
- Simulation-specific settings
- Aspect Ratio (16:9 / 9:16)
- Start

## Timeline

- Intro
- Simulation
- Winner

## Recording

- Starts automatically when simulation starts.
- Stops automatically when winner screen appears.
- Exports MP4.

## Arena

- Universal square arena.
- Same dimensions for every simulation.

## UI

- Shared layout across every simulation.
- Intro screen.
- Live stats.
- Winner screen.
- Owned by the engine (engine/ui), not by React's Menu. The Menu only handles setup before a simulation starts.

## Sound

- Shared reusable sound system.
- Only simulation sounds (no UI clicks).

## TODO

- Final arena dimensions.
