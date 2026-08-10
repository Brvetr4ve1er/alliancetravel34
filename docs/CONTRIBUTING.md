# Contributing

Keep the repo tidy: short-lived branches, one PR each, delete on merge. The repo was recently
cleared of ~6 stale branches — the conventions below stop that from happening again.

## Branches

- **Default / integration branch:** **`integrate/unified-admin`**. Everything merges here, and the
  CMS publishes owner edits here (Vercel builds and deploys from it).
- **Work on short-lived feature branches** cut from `integrate/unified-admin`:

  ```bash
  git switch integrate/unified-admin
  git pull
  git switch -c feat/short-description      # or fix/… , docs/… , chore/…
  ```

- **One branch = one focused change.** Keep it short-lived — days, not weeks. Rebase or merge
  `integrate/unified-admin` back in if it moves under you.
- **Do not** open long-lived, divergent branches that quietly drift from the integration branch.
  They rot, conflict, and are exactly what was just cleaned up.

## Pull requests

1. Push your branch and open a **PR into `integrate/unified-admin`**.
2. Fill in the PR template (summary, what changed, test plan, screenshots if the UI changed).
3. Wait for **CI to pass** (see below), get it reviewed, then **Squash and merge**.
4. **Delete the branch after merge.** This happens automatically
   (`.github/workflows/auto-delete-merged.yml`); you can also delete it manually. Please also enable
   *"Automatically delete head branches"* in the repo's GitHub settings as a backstop.

## The CI gate

`.github/workflows/ci.yml` runs on every PR (and on pushes to `integrate/unified-admin`). Both steps
must pass before merge — run them locally first:

```bash
node tools/build.mjs --check    # validate every trip + render-check, never writes  (npm run build:check)
node --test                     # the test suite                                     (npm test)
```

- **`build:check`** validates all `data/trips/*.json` and dry-renders the enabled ones. A schema
  error or a broken template fails the build (exit 1) — this is the guard that keeps a bad edit off
  the live site, so never merge around a red build.
- **`node --test`** runs the unit tests under `tools/`, `api/`, and `site/admin/`.

## House rules

- **Zero npm dependencies.** The project runs on Node's standard library only — do not add packages
  or a `node_modules`. Target Node **22.x** (`package.json` → `engines`).
- **Commit messages:** `type(scope): summary` (e.g. `feat(i18n): …`, `fix(vercel): …`,
  `docs(runbook): …`), matching the existing history.
- If you add or rename a **dashboard editor field**, make sure its JSON path is actually rendered by
  a template — `tools/check-admin-fields.mjs` runs inside the build and will fail otherwise.
- One page of process is enough. If you find yourself fighting the workflow, keep the change smaller.
