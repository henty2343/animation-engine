# Animation Engine Blueprint

This document is the entry point for the project documentation.

## Project Vision

The goal of this project is to build a reusable **Animation Engine** capable of generating high-quality simulation videos.

This is **not** a game, so no user controls.

It is a **content creation tool** that automatically generates simulation animations and exports them as MP4 videos.

Supported output formats:

- 16:9
- 9:16

The generated videos are intended for platforms such as:

- YouTube
- YouTube Shorts
- TikTok
- Instagram Reels

The long-term goal is for creating content to be as simple as:

1. Select a simulation.
2. Select the participating characters.
3. Configure the simulation.
4. Choose the output format.
5. Click **Generate**.
6. Download the finished MP4.

The engine is the product.

Simulations are reusable modules built on top of the engine.

---

Read the following documents before making changes to the project.

## Documentation

- Architecture.md
- Engine.md
- Characters.md
- Skills.md
- Simulations.md
- ColorExpansion.md
- WeaponClash.md
- Roadmap.md
- Todo.md

## Rules

- The documentation is the project's source of truth.
- If implementation conflicts with the documentation, follow the documentation.
- Every new simulation must be documented before implementation.
- Update the documentation whenever mechanics change.
