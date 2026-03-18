# Zico Phase 1 — Setup Guide

## What's in this package

```
zico-phase1/
├── CLAUDE.md                      # Zico Jr identity (Claude Code reads this automatically)
├── scripts/bootstrap.sh           # One-time directory scaffolding
├── src/
│   ├── cli/index.ts               # CLI entry point (zico start/plan/skills/hooks/cost)
│   ├── intake/parser.ts           # Multi-format input parser
│   ├── planning/
│   │   ├── engine.ts              # Convoy plan generator with auto skill selection
│   │   └── permission-gate.ts     # AUTO/GATED/BLOCKED enforcement
│   ├── hooks/index.ts             # JSON persistence with git tracking
│   └── skills/loader.ts           # Auto-discovery from skills/*/SKILL.md
└── SETUP.md                       # This file
```

## Quick start (5 minutes)

```bash
# 1. Create repo
mkdir zico && cd zico && git init

# 2. Copy this package into it
cp -r <path-to-zico-phase1>/* .

# 3. Run bootstrap
bash scripts/bootstrap.sh

# 4. Copy your skills
cp -r ~/.claude/skills/figma-design-system-rules skills/
cp -r ~/.claude/skills/humanizer skills/
cp -r ~/.claude/skills/local-web-scraper skills/
cp -r ~/.claude/skills/ui-ux-pro-max skills/
# Repeat for all 27+ skills

# 5. First commit
git add -A && git commit -m "Phase 1: scaffold + core modules + skills"

# 6. Push to GitHub
gh repo create sauronnitin/zico --public --source=. --push
```

## Adding skills (token-efficient way)

The entire skill system is auto-discovered. To add a new skill:

```bash
# Just drop the folder in
cp -r ~/.claude/skills/my-new-skill skills/

# Verify it was picked up
npx tsx src/cli/index.ts skills
```

That's it. No edits to CLAUDE.md, no registry updates, no config changes.
The skill loader reads `skills/*/SKILL.md`, parses the YAML frontmatter, and
auto-registers the skill with trigger keywords and polecat affinity.

### What the skill loader extracts from SKILL.md

```yaml
---
name: my-skill              # → registered name
version: 1.0.0              # → shown in `zico skills`
description: >
  Does X when Y happens.    # → parsed for trigger keywords
  Triggers: "keyword1",     # → auto-activation rules
  "keyword2", "keyword3"
allowed-tools:              # → MCP tools this skill uses
  - Figma:get_design_context
---
```

Polecat affinity is auto-detected from the SKILL.md content:
- Mentions "figma" or "design system" → figma-scout
- Mentions "spec" or "handoff" → spec-writer
- Mentions "email" or "message" → comms-drafter
- Mentions "audit" or "security" → design-auditor
- Mentions "ticket" or "linear" → linear-tracker

## For the 27 symlinked skills (Obra, Trail of Bits, thedotmack)

These were aliases on your Mac. To get the actual files:

```bash
# Option A: Copy from the plugin marketplace cache
cp -r ~/.claude/plugins/marketplaces/obra/superpowers/skills/* skills/
cp -r ~/.claude/plugins/marketplaces/trailofbits/*/skills/* skills/
cp -r ~/.claude/plugins/marketplaces/thedotmack/plugin/skills/* skills/

# Option B: Clone the repos directly
git clone https://github.com/obra/superpowers /tmp/superpowers
cp -r /tmp/superpowers/skills/* skills/
```

## What to build next (Phase 2)

Open Claude Code in the zico repo and say:

> "Read CLAUDE.md and build the Figma Scout polecat. It should use the Figma MCP
> tools listed in the strategic plan. Start with read-only operations."

Claude Code will:
1. Read CLAUDE.md automatically
2. See the skill auto-discovery system
3. Build on top of the existing modules
4. Not need the full strategic plan re-explained

This is the token efficiency win: CLAUDE.md is ~80 lines, not 1200.
