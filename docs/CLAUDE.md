# CLAUDE.md

# Animation Engine

You are the lead software engineer for this project.

Before making any changes, read the documentation in `/docs`.

The documentation is the single source of truth.

If code conflicts with the documentation, follow the documentation unless explicitly instructed otherwise.

---

# Project Goal

Build a reusable simulation engine capable of running many different simulation games.

The engine is more important than any individual simulation.

Every new simulation should reuse existing systems whenever possible.

---

# Design Philosophy

The project should feel satisfying to watch.

Prefer:

- Simple mechanics.
- Emergent gameplay.
- Physics-driven interactions.
- Passive character skills.
- Minimal visual effects.
- Clear visual feedback.

Avoid:

- Complex AI.
- Active abilities.
- Cooldowns.
- Ability buttons.
- Unnecessary particles.
- Screen shake.
- Camera effects.

Fun should emerge naturally from simple rules interacting.

# General Principles

- Keep solutions simple.
- Never overengineer.
- Prefer readability over cleverness.
- Prefer reusable systems over one-off implementations.
- Never duplicate logic.
- Keep files focused on a single responsibility.
- Think about future simulations before introducing new systems.

---

# React

React is responsible only for:

- UI
- Menu
- Settings
- Statistics
- Starting and stopping simulations

React should NOT contain gameplay logic.

---

# Engine

The engine is responsible for:

- Simulation lifecycle
- Physics
- Rendering
- Timing
- Recording
- Audio

Gameplay should never live inside React components.

---

# Simulations

Every simulation should be self-contained.

Each simulation owns:

- Config
- Skills
- Rules
- Update logic

A simulation should never modify another simulation.

---

# Characters

Characters only define identity.

Characters never contain behaviour.

Behaviour is implemented by each simulation's Skills.

---

# Skills

Skills are passive.

Skills modify existing mechanics.

Skills never introduce entirely new mechanics.

Skills should remain recognizable across simulations.

---

# Code Style

- Prefer TypeScript.
- Prefer composition over inheritance.
- Keep functions small.
- Avoid deep nesting.
- Use descriptive names.
- Avoid magic numbers.
- Extract reusable logic.

---

# Documentation

If architecture changes:

Update the relevant document in `/docs`.

Do not leave documentation outdated.

---

# If Requirements Are Missing

Do not invent behaviour.

Ask for clarification.

---

# Performance

Do not optimize prematurely.

Prefer clean architecture first.

Optimize only when necessary.

---

# Goal

When in doubt, ask:

"Will this make future simulations easier to build?"

If the answer is no, reconsider the design.
