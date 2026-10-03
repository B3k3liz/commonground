# Exploration Prompt — Linking CommonGround ↔ Common Aura into a real-time, real-weather, real-education world

> Paste this into a fresh Claude Code session (ideally with BOTH the CommonGround
> repo and the Common Aura demo available). It is written to make Claude
> *investigate and propose*, not build — nothing ships without your say-so.
>
> **Before you run it:** fill in the four `‹FILL IN›` blocks below. They are the
> only things Claude can't discover on its own.

---

## Context I'm giving you

I have two things I built:

1. **CommonGround** — a local-first "Homestead & Co-op OS" (vanilla JS, no build).
   It already has: a crop growth planner (real planting-date math), a co-op task
   board, a cooperative ledger with Supabase + row-level security, a **local-first
   sync engine with a Hybrid Logical Clock** (offline edits on many devices that
   converge), an **edge-telemetry webhook** (HMAC-signed gate/sensor packets), an
   **agronomy engine** (`climateCalculators.js` — carrying capacity from real
   temperature/humidity/rainfall), and a **live public weather feed**
   (`weatherService.js`, Open-Meteo, no API key) that now drives the dashboard and
   can feed the agronomy engine real conditions.

2. **Common Aura** — ‹FILL IN: what Common Aura is in one paragraph. What does the
   demo actually do? What's it built in (engine/framework/stack)? Is it a map, an
   avatar/world, a visual/"aura" layer, a social layer, something else? Link or
   path to the demo if you have one.›

## What I'm dreaming toward

A **real-life, real-time, real-weather, real-education game**. The world works like
the newer World of Warcraft map sense: **it starts local** (my own garden / plot /
homestead) **and expands horizontally** as more people start their own gardens —
neighbors' plots knit into a shared, living map. Real weather drives what grows.
Playing teaches real skills (planting, grazing, water, soil, seasons). Common Aura
is ‹FILL IN: the role you imagine it playing — the visual world? the avatar/identity
layer? the "aura"/mood/energy layer over a plot? the thing that makes it feel like a
game instead of a dashboard?›.

- **Audience / purpose:** ‹FILL IN: who is this for, and is it a game, a teaching
  tool, a community organizer, or all three? Any ethos constraints — e.g.
  CommonGround's "data sovereignty / works offline / free to everyone" values?›
- **Where I want to end up (rough):** ‹FILL IN: a sentence on the dream — e.g.
  "a free, browser-based world where a classroom or a neighborhood grows real and
  virtual gardens together and the map fills in as they do."›

## What I want FROM you in this session (investigate + propose, don't build)

1. **Inventory both projects as they really are.** Read the CommonGround repo
   (start with `README.md`, `app.js`, `commonGroundSyncEngine.js`,
   `climateCalculators.js`, `weatherService.js`, `telemetryIngestor.js`, the
   `supabase/` schema, and `CommonGround_Phase2_Audit.md`). Then inspect the Common
   Aura demo. Report what each actually is today — capabilities, data models, and
   the honest gap between them. Correct anything I got wrong above.

2. **Find the real seams.** Where do the two genuinely connect? I suspect the
   strongest ones are: the **sync engine + HLC** (already a multi-device/multi-user
   convergence layer — is it the multiplayer backbone?), the **cooperative/RLS data
   model** (could a "coop" become a "region/guild"?), the **agronomy + live weather**
   (the simulation core — real weather already maps to real growth), and the
   **crop/plot state** (the thing a world would render). Tell me which seams are
   load-bearing and which are red herrings.

3. **Lay out 3–4 concrete architecture OPTIONS** for the "starts local, expands
   horizontally" world, each with: what it reuses vs. builds new, the multiplayer /
   shared-world model (does the existing HLC sync scale to a shared map, or does a
   shared world need an authoritative server — and what does that cost the offline/
   sovereignty ethos?), the map/tiling model for horizontal expansion (how do plots
   become adjacent tiles; how does a new gardener "appear next to" others), how
   real weather per-location drives each plot, the **education layer** (what a player
   learns and how it's assessed/surfaced), and where Common Aura plugs in as the
   visual/world/identity layer. Give each option a tradeoff table and a **kill
   criterion** (the thing that would make me abandon it).

4. **Name the hard problems honestly** — the ones that sink projects like this:
   multiplayer state & conflict at map scale, per-location weather at many plots
   (Open-Meteo rate/usage limits, batching, caching), moderation & safety for a
   shared/social world (especially if minors or classrooms are involved), identity
   without surveillance, hosting cost vs. "free to everyone," and scope (what is the
   smallest first world that is still fun and still teaches?).

5. **Recommend ONE path for a first playable slice** — a single-screen, 2–4 player
   (or 2–4 plot) "one neighborhood" vertical slice that proves the core loop:
   real weather → real growth → a plot that visibly changes → a second gardener's
   plot appears next to mine → I learn one real thing. Tell me what to build first,
   what to fake, and what success looks like.

## Ground rules

- Verify against the actual code and the actual demo before asserting anything;
  flag assumptions. Don't invent capabilities either project doesn't have.
- Respect CommonGround's constraints: vanilla JS / no heavy build, offline-first,
  free and public data sources where possible, data sovereignty.
- Protect people: if the world is social or involves classrooms/minors, treat
  safety, moderation, and data minimization as design requirements, not add-ons.
- End with: the ONE recommended first slice, a short ranked backlog, and the single
  biggest risk — ranked by how hard it is to reverse later.

## Deliverable

A written proposal (markdown) with the option tables, the recommended first slice,
and the risk ranking. **No code and no commits in this session** unless I explicitly
ask after reading it.
```
```
```
<!-- Fill the four ‹FILL IN› blocks above, then paste everything from
     "## Context I'm giving you" down to here into the new session. -->
```
