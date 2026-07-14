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

# Roles

See Architecture.md for what React, the Engine, Simulations, and Characters each own, and Skills.md for the skill contract. This file does not repeat them — if the two ever disagree, Architecture.md wins.

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
