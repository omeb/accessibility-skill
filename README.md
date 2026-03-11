# Wix Accessibility Skills

AI-powered accessibility guardrails for Wix developers and AI generation pipelines.

## The Problem

LLMs produce inaccessible code the majority of the time. Telling them "make it accessible" often makes it worse. No amount of documentation helps — because models (and developers) don't read docs consistently.

## The Solution

A set of AI skills that inject accessibility knowledge directly into coding agents (Cursor, Claude Code, Windsurf, etc.) so that generated and human-written code is **WCAG 2.2 AA compliant by default**.

The knowledge is injected into the AI's context automatically. The model can't forget or skip what's in its system prompt.

## Skills Included

| Skill | What It Does | When It Activates |
|-------|-------------|-------------------|
| **web-accessibility** | Core WCAG rules, anti-patterns, verification checklist | Every time you write UI code |
| **a11y-react-patterns** | Accessible component patterns (Modal, Tabs, Combobox, etc.) | When building interactive components |
| **a11y-rules-reference** | Detailed guidance for all 26 WCAG 2.2 AA rules | When you need specifics beyond the critical rules |
| **a11y-harmony-pipeline** | Pipeline integration for AI code generation | When building/maintaining Harmony's generation pipeline |

### What Each Skill Covers

**web-accessibility** (~3,000 tokens) — The core skill everyone should install:
- 7 critical rules that cause 96% of real-world accessibility errors
- Anti-patterns quick-lookup table (30+ patterns with fixes)
- Common AI-generation mistakes to watch for
- Verification checklist with ESLint jsx-a11y
- Wix-specific guidance (`@wix/design-system`, CI/CD integration)

**a11y-react-patterns** — Loaded on-demand when building components:
- Modal/Dialog with focus trapping
- Dropdown/Menu with arrow key navigation
- Tabs with roving tabindex
- Accordion, Data Table, Toast/Notification
- Combobox/Autocomplete
- Toggle/Switch (WAI-ARIA APG pattern)
- Navigation, Skip Link, Sortable List, Tooltip, Confirmation Dialog

**a11y-rules-reference** — Loaded on-demand for detailed rule guidance:
- Rules 4, 9-26 with full code examples
- Canvas, SVG, and icon library accessibility
- Media, reflow, authentication, error handling
- Visual/cognitive accessibility (motion, contrast, seizure safety)
- Performance considerations for assistive technology
- Test-first development patterns with jest-axe

**a11y-harmony-pipeline** — For the Harmony team:
- 3-layer pipeline architecture (prompt injection → lint gate → fix-up loop)
- ESLint programmatic linting configuration
- AST-based pattern scanner (TypeScript)
- Fix-up re-prompt with structural integrity checks
- Confidence scoring and metrics
- Phased rollout strategy

## Installation

### Quick Install

```bash
# Clone the repo
git clone git@github.com:wix-private/accessibility-skills.git

# Run the installer
cd accessibility-skills
./install.sh
```

The installer will detect your setup and guide you through installation.

### Cursor — Global (All Projects)

Installs skills system-wide so every project benefits:

```bash
./install.sh --cursor-global
```

This copies skills to `~/.cursor/skills/`. They activate automatically in every Cursor workspace.

### Cursor — Per-Project

Installs skills into a specific project:

```bash
cd /path/to/your/project
/path/to/accessibility-skills/install.sh --cursor-project
```

This copies skills to `.cursor/skills/` in your project directory. Commit this to your repo so all team members benefit.

### Claude Code / Codex

```bash
./install.sh --codex
```

This copies skills to `~/.codex/skills/`.

### Manual Installation

Copy the skills you need to your tool's skills directory:

```bash
# Cursor (global)
cp -r skills/* ~/.cursor/skills/

# Cursor (per-project) — from the project root
mkdir -p .cursor/skills
cp -r /path/to/accessibility-skills/skills/* .cursor/skills/

# Claude Code / Codex
cp -r skills/* ~/.codex/skills/
```

### Which Skills to Install

| You Are | Install |
|---------|---------|
| Any Wix developer writing UI code | `web-accessibility` (minimum) |
| Building React components | `web-accessibility` + `a11y-react-patterns` |
| Need full WCAG reference | All three: `web-accessibility` + `a11y-react-patterns` + `a11y-rules-reference` |
| Harmony team | All four skills |

For most developers, installing all skills is recommended — they only activate when relevant, so there's no overhead when you're not writing UI code.

## How It Works

Once installed, the skills activate automatically based on what you're doing:

1. **Writing a React component?** → `web-accessibility` loads, giving you the critical rules and anti-patterns
2. **Building a modal or combobox?** → `a11y-react-patterns` loads with the full implementation pattern
3. **Need details on a specific WCAG rule?** → Ask about it and `a11y-rules-reference` provides full examples

No manual action needed. The AI agent picks up the relevant skill based on your task.

### Three-Layer Defense (for Harmony Pipeline)

1. **Knowledge Injection** — Skill content is injected into the AI's system prompt so it knows accessibility rules before writing code
2. **Automated Enforcement** — ESLint jsx-a11y + AST pattern scanner catch what the model gets wrong (~100ms)
3. **Self-Healing Loop** — Violations are fed back to the model with specific fix instructions. 2 iterations fixes ~95% of remaining issues

## Updating

Pull the latest version and re-run the installer:

```bash
cd /path/to/accessibility-skills
git pull
./install.sh          # re-run with your previous flags
```

## Verifying Installation

After installing, start a new conversation in Cursor or Claude Code and ask:

> "Create a pricing card component with a select plan button"

The AI should automatically:
- Use `<button>` (not `<div onClick>`) for the select action
- Include proper heading hierarchy
- Add focus-visible styles
- Use semantic HTML throughout

If it doesn't, verify the skills directory is correct for your tool.

## Contributing

### Adding Rules

When new WCAG criteria or common patterns emerge:

1. Add the rule to the appropriate skill file
2. Add a code example (both correct and incorrect)
3. Add the anti-pattern to the quick-lookup table in `web-accessibility`
4. If it's a common LLM failure, add it to the "Common AI-Generation Mistakes" section
5. Test with a fresh conversation to verify the AI follows the new rule

### Reporting Issues

If you find that the AI consistently gets a pattern wrong despite the skill:

1. Note the specific violation and what the AI generated
2. Open an issue with the prompt you used and the output
3. We'll add targeted guidance to the skill

## Related Wix Infrastructure

These skills complement existing accessibility infrastructure:

| System | What It Does | When It Runs |
|--------|-------------|--------------|
| **These skills** | Prevent a11y issues during code writing | During development (IDE) |
| **axe linter** | Static analysis on PRs | Pull request review |
| **a11y-audit-tool-plugin** | Playwright a11y checks (axe + focus-ring + tab order) | CI/CD build |
| **Lighthouse audits** | Rendered page a11y scoring | CI/CD build |
| **A11y Wizard** | User-facing tool for site creators | Production |
| **Manual audits** | Expert review of products | Scheduled reviews |

## License

Internal Wix use only.
