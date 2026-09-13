# AGENTS.md

## Purpose
This repo started as a planning/bootstrap repo for an AI study club Discord learning bot.
It now includes early runnable scaffolding alongside the product, architecture, schema, and ops docs.
Keep changes minimal, traceable, and aligned with the docs.

## Current State
- Main contents are `README.md`, `FILE_TREE.md`, `docs/*.md`, `src/`, and `scripts/`.
- `requirements.txt` and `requirements-dev.txt` exist for the initial Python scaffold.
- The checked-in Python tree currently lives under `src/bot`, `src/services`, `src/repositories`, `src/models`, and `src/core`.
- `FILE_TREE.md` should be kept in sync with the implemented structure.
- Ignore `.DS_Store` and `._*` files.

## Product Priorities
Optimize in this order: accuracy, learning experience, traceability, operational simplicity. This is a learning service, not just a notification bot.

## Read Before Larger Changes
Read the relevant docs before implementing:
- `README.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DISCORD_BOT_SPEC.md`
- `docs/CONTENT_PIPELINE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/OPERATIONS.md`
- `docs/ROADMAP.md`
- `docs/LINUX_OPENCODE_SETUP.md`

For DB, grading, publishing, scheduling, or workflow changes, read the matching doc first.

## Non-Negotiable Domain Rules
- Keep `discussion_prompt` separate from graded quiz data.
- Never expose `answer_key`, `accepted_keywords`, grading logic, or unrevealed explanations in public Discord messages.
- Store source metadata structurally, not as one display string.
- Preserve internal ID to Discord ID mappings.
- Treat trend/research briefs without sources as blocked or admin-review only.
- Keep public feedback aggregated; detailed grading belongs in ephemeral responses or DMs.

## Preferred Stack
Use Python 3.11+, `discord.py`, SQLAlchemy + Alembic, SQLite for local dev, PostgreSQL for production, and Linux deployment with `systemd`/cron.
All secrets must come from environment variables.

## Target Layout
Follow the implemented `src/bot`, `src/services`, `src/repositories`, `src/models`, `src/core`, and `scripts/` layout from `README.md` and keep Discord interaction, business logic, data access, and content generation separate.

## Build, Lint, Test Commands
Use the commands below for the current scaffold unless explicit tooling config changes them.

### Environment Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
```

### Dependency Install
If using `requirements.txt`:
```bash
python -m pip install -r requirements.txt
python -m pip install -r requirements-dev.txt
```
If using `uv` instead:
```bash
uv venv
uv pip install -r requirements.txt
uv pip install -r requirements-dev.txt
```

### Run The App
```bash
PYTHONPATH=src python -m bot.app
PYTHONPATH=src python scripts/publish_daily.py
PYTHONPATH=src python scripts/bootstrap_sqlite.py
```

### Lint, Format, Types
```bash
ruff check .
ruff format .
mypy src scripts
```

### Full Test Suite
```bash
pytest
```

### Single Test Commands
Use one of these exact forms:
```bash
pytest tests/path/test_file.py
pytest tests/path/test_file.py::test_function_name
pytest tests/path/test_file.py::TestClass::test_method_name
pytest -k "keyword" tests/path/test_file.py
```

### Focused Test Runs
```bash
pytest tests/services
pytest tests/db
pytest tests/bot
pytest --maxfail=1 -x
pytest -q
```

## Workflow
- Plan first for new features, schema changes, grading changes, pipeline changes, or deployment changes; direct implementation is fine for small commands, copy tweaks, tests, logging improvements, and simple refactors.
- Update the relevant docs whenever behavior, schema, architecture, or operations change, and keep changes incremental.

## Code Style Guidelines

### Imports
- Group imports as standard library, third-party, then local.
- Prefer absolute imports from top-level packages.
- Avoid wildcard imports.
- Keep imports side-effect free where practical.

### Formatting
- Follow PEP 8 and default `ruff format` behavior.
- Use 4 spaces for indentation.
- Prefer an 88-character line length.
- Keep functions small enough that control flow is easy to scan.
- Add comments only for non-obvious decisions.

### Types
- Use type hints by default for new code.
- Annotate public functions, methods, and module-level constants.
- Prefer explicit domain models over loose `dict[str, Any]` when shape is known.
- Use `TypedDict`, `dataclass`, or Pydantic models for structured payloads when helpful.
- Keep Discord-facing payloads and DB models explicitly typed.

### Naming
- Use English for code identifiers, module names, and filenames.
- Use Korean for most user-facing strings.
- Use `snake_case` for functions, variables, and modules.
- Use `PascalCase` for classes and `UPPER_SNAKE_CASE` for constants.
- Prefer domain terms such as `content`, `quiz`, `attempt`, `publish_log`, and `user_stats`.

### Design
- Keep Discord UI handlers thin; move logic into services.
- Encapsulate DB access in repository/service layers.
- Separate grading, publishing, retrieval, and rendering concerns.
- Make retry behavior and duplicate-submission policy explicit.
- Prefer pure functions for normalization and scoring rules.

### Error Handling And Security
- Fail loudly for invariant violations; fail gracefully for user-facing operational issues.
- Never swallow exceptions silently.
- Log enough context to debug: action, content ID, quiz ID, user ID, Discord message ID, and exception details.
- Do not log tokens, webhook URLs, answer keys, or sensitive grading details.
- Make writes affecting grading and attempt history as atomic as practical.
- Secrets must come from environment variables only.
- Never hardcode bot tokens, webhook URLs, or API keys.
- Never leak answer data into public embeds, command output, logs, fixtures, or docs.

## Testing Expectations
- Add or update tests for grading, duplicate handling, stats aggregation, and repository/service logic.
- Prefer service/repository tests over brittle Discord UI mocks, and add a regression test first for bugs when practical.
- Keep fixtures free of real secrets and answer leaks; if no test harness exists yet, say so clearly in the final note.

## Documentation Sync Rules
Update the matching docs when these areas change:
- DB tables or fields -> `docs/DATABASE_SCHEMA.md`
- Commands, buttons, modals, or interaction flows -> `docs/DISCORD_BOT_SPEC.md`
- Architecture or service boundaries -> `docs/ARCHITECTURE.md`
- Deployment or runtime operations -> `docs/OPERATIONS.md`
- Scope or MVP definition -> `docs/PRD.md` or `docs/ROADMAP.md`

## Cursor And Copilot Rules
At analysis time, no repository-level agent rule files were present:
- No `.cursorrules`
- No `.cursor/rules/`
- No `.github/copilot-instructions.md`

If any of those files are added later, treat them as first-class instructions and merge them into future edits of this file.

## Practical Reminders
- Start from the docs, be explicit about data-model and ops impact, and prefer incremental scaffolding over giant one-shot implementations.
- When introducing tooling, add the config files and update this `AGENTS.md` with the exact commands.

## Cloudflare Technical Probe (2026-09-13)

- User-approved migration direction: isolated TypeScript Worker/Workflow under `cloudflare/`; existing Python/GAS trees are historical references and local authoring tools.
- No Discord sending or cron triggers in this first-stage probe. Do not add them while fixing probe issues.
- Secrets stay in ignored `.env` / Cloudflare Secrets. Never print values, copy secrets into bundles, or expose probe results without admin authentication.
- Run from the repository root, using Node 24:

```bash
npm ci
npm run cf:typecheck
npm run cf:test
npm run cf:build
node cloudflare/scripts/check-persistence.mjs
npm run cf:probe -- --ids 2609.09143,2609.10745,2609.10445
```

- `cf:test` is offline with mocked HTTP, using real local Workflows/D1. `cf:probe` makes paid API calls using `.env`, capped at 3 papers per job, 6 reserved calls per UTC day per probe DB, and 1,200 output tokens per call.
- Local tests do not establish Cloudflare CPU limits. Remote free-plan deployment and telemetry are required before declaring feasibility.
- Update `docs/CLOUDFLARE_TECH_PROBE.md` with measured results and unresolved limitations.
- Remote secrets setup: `npm run cf:secrets`; reads `.env` and sends credentials through stdin, never command arguments. The user approved Secrets storage for `discord-study-probe` on 2026-09-13.
- Read-only remote metrics: `node cloudflare/scripts/metrics.mjs`. This uses the existing Wrangler OAuth session; subscription information may require separate dashboard verification.
- Keep `LIVE_ENABLED=false` after verification. A source-only restart (`cf:probe -- --resume ...`) is allowed only for blocked jobs with zero API reservations; other failures need review.

## Weekly pipeline extension (user approved)
- Source-only capture: `node cloudflare/scripts/weekly.mjs --week 2026-W37`.
- Generate independent jobs: add `--generate`; inspect with `--status`.
- Read `docs/CLOUDFLARE_WEEKLY_PIPELINE.md` for the current schema and migration.
- Preserve the first weekly ranking snapshot, including when a paper fails.
- Discord delivery and scheduling may now be implemented as later stages of the approved plan; activate only after configured destination and runtime verification.

- Preview: `node cloudflare/scripts/weekly.mjs --week 2026-W37 --preview`. Publish only to the confirmed test destination with `--publish`.
- User confirmed current `.env` Discord Webhook test destination and Monday 09:00 KST schedule. Keep schedule disabled until CPU feasibility is verified.
- `node cloudflare/scripts/secrets.mjs --discord` uploads only the confirmed Webhook secret.
- `node cloudflare/scripts/observe.mjs 2608.12564` samples source-only CPU without API billing; tail headers and logs are discarded in memory.

## Markdown concept notifications (user approved)

- Current scope: 36-entry curriculum, all 36 draft lessons, local validation/preview,
  static Worker payloads and semester/delivery D1 scaffolding. Read docs/CONCEPT_NOTIFICATIONS.md.
- User confirmed Monday/Wednesday/Friday 09:00 Asia/Seoul. Concepts use the dedicated
  CONCEPT_WEBHOOK_URL, never the news DISCORD_WEBHOOK_URL.
  Semester start/exam dates are not confirmed. Do not activate cron based on example.yaml.
- New GitHub destination is ZEO1122/A.ing-Discord-Bot (public, initially empty).
  Do not push historical commits from the old repo: historical secret patterns were detected.
- Use Node 24. YAML is a dev/build dependency; never parse Markdown or call OpenAI on concept delivery.
- Commands: npm run content:validate; npm run content:test; npm run content:examples;
  npm run content:preview; npm run content:build; npm run content:schedule -- config/semesters/example.yaml.
- Full release check: npm run content:build -- --production. Requires all 36 reviewed lessons.
- content:examples executes the internal sample checks and 31 worked-example arithmetic groups using Python 3 + NumPy. These checks are separate from public Markdown; compare their constants when reviewing content.
- Rebuild before deploy: npm run cf:deploy. Keep CONCEPT_TEST_ENABLED and CONCEPT_SCHEDULE_ENABLED
  false after explicit test runs. Tests may post drafts only to the confirmed test destination.
- Preserve question-only discussion content separately from any future graded quiz data.
- No silent truncation of concept sections; fail validation if Discord length limits are exceeded.
