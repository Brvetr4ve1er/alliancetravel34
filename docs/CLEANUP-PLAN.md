# Repo & site cleanup — findings and staged plan

**Audited:** 2026-07-23 · **Branch:** `integrate/unified-admin` · **Method:** direct inspection of the
working tree, the full git object graph, and the GitHub API. Every number below came from a command
that was actually run; nothing here is inferred from filenames alone.

---

## Verdict up front

The repo is **not messy — it is exposed**. Housekeeping is minor and can wait. One finding cannot.

> **37 of the agency's brochure PDFs (76 MB) are tracked in a PUBLIC GitHub repository.**
> They are the source documents behind every trip's pricing — hotel rates, dates, inclusions,
> charter arrangements. `https://api.github.com/repos/Brvetr4ve1er/alliancetravel34` returns
> `"private": false`, so anyone who finds the repo can download all of them, today, without
> credentials.

They are also 39% of the 168 MB `.git` directory, so the size problem and the confidentiality
problem have the same single cause.

**No credentials are leaked.** Scans for `github_pat_`, `sk-`, service-role keys, `.env` files and
private keys found nothing in the working tree or in history. The two matches in `docs/` are the
*words* in setup instructions, not values. The Supabase key in `lead-config.js` is the anon key,
which is public by design.

---

## Stage 1 — Confidentiality (do this first, decide today)

**The problem:** `git rm` does not help on its own. Removing the files from the working tree leaves
every byte in history, still downloadable from the public repo. There are only two real options.

| Option | What it costs | What it achieves |
|---|---|---|
| **A. Make the repository private** | 1 click. Vercel keeps deploying (it is an authorised GitHub app). | Removes public access to everything, immediately, including history. |
| **B. Rewrite history to purge `source of truth/`** | Force-push; every existing clone breaks; ~76 MB reclaimed; must still be combined with A if the repo stays public, because forks and caches may retain blobs. | Removes the files from the repo permanently. |

**Recommendation: A now, B later if ever.** Making the repo private takes a click and closes the
exposure completely. History rewriting is the slower, riskier operation and buys nothing extra while
the repo is public — and once it is private, the 76 MB is merely a clone-size annoyance, not a risk.

Then, regardless of which you choose, stop tracking them going forward:

```bash
# Verify first — this should list 37 PDFs and nothing else:
git ls-files 'source of truth'

# Then stop tracking them while KEEPING your local copies (--cached is the important flag):
git rm -r --cached 'source of truth'
printf '\n# Agency source brochures — confidential, never publish\nsource of truth/\n' >> .gitignore
git add .gitignore && git commit -m "chore: stop tracking confidential source brochures"
```

`--cached` means the files stay on your disk. Only git forgets them.

---

## Stage 2 — Zero risk (untracked junk)

None of this is in git; it is loose files in the folder. Deleting costs nothing.

```bash
rm -rf .playwright-mcp                 # 1.4 MB of browser-automation screenshots
rm -f ar-contact-numbers-fixed.jpeg migration-egypte-verified.jpeg phase0-drawer-open-mobile-scrolled.jpeg
```

Then stop them coming back:

```bash
printf '\n.playwright-mcp/\n*.jpeg\n.superpowers/\n' >> .gitignore
```

`.security-hardening/` (184 KB) and `docs/production-audit/` (140 KB) are audit records, not junk —
keep or move them out of the repo, your call.

---

## Stage 3 — The deployment simplification (this is the good news)

Earlier I told you to flip Vercel's Production Branch by hand. **There is a better fix, and it
dissolves the problem instead of working around it.**

Measured facts:

```
feat/hero-redesign      ahead: 0   behind: 79
main                    ahead: 0   behind: 152
refactor/trim-v26       ahead: 0   behind: 98
integrate/unified-admin ahead: 0   behind: 0     ← canonical
```

**Every other branch is `0 ahead`** — none of them contains a single commit that is not already in
`integrate/unified-admin`. Nothing would be lost by discarding all three. In particular `main` holds
no unique work; it is simply 152 commits stale.

Meanwhile Vercel's Production Branch is `main`, and the admin dashboard commits to
`integrate/unified-admin`. That mismatch is the entire reason publishing never reaches the live site.

**So: fast-forward `main` to the canonical branch and make `main` the one true branch again.**

```bash
git checkout main
git merge --ff-only integrate/unified-admin   # fast-forward: refuses if it would lose anything
git push origin main
git checkout integrate/unified-admin
```

Then point the dashboard's publish target at it:

```bash
vercel env rm GITHUB_BRANCH production --yes
printf 'main' | vercel env add GITHUB_BRANCH production
vercel deploy --prod --yes
```

Why this is better than flipping the Vercel setting:

- It needs **no dashboard access** — every step is a command I can run.
- Vercel's Production Branch is *already* `main`, so publishing becomes automatic with no settings change.
- It restores the conventional model: `main` is the site. No more explaining which branch is real, no
  more stale-branch confusion, no more `main` sitting 152 commits behind looking authoritative.
- `--ff-only` is a safety rail: if `main` ever did contain unique work, the command refuses rather
  than silently discarding it.

Afterwards, delete the dead branches:

```bash
git branch -d feat/hero-redesign refactor/trim-v26      # -d refuses if unmerged
git push origin --delete feat/hero-redesign refactor/trim-v26
```

Remote branches from earlier automation (`claude/*`, `copilot/*`) can go the same way once you have
confirmed you do not want them.

---

## Stage 4 — Minor, optional

**Duplicated footer.** `footer.html` is byte-identical across all 7 trip JSONs — 46 KB of the 647 KB
total (7%). It is the one large blob repeated per trip. Hoisting it into shared config would remove
the duplication *and* fix a real maintenance trap: changing a phone number in the footer currently
means editing seven JSON files. This is already on the M2 roadmap; not urgent on its own.

**Should generated HTML stay committed?** The 7 trip pages under `site/` are regenerated by
`tools/build.mjs` on every Vercel deploy, so committing them is technically redundant. **Keep
committing them anyway.** They make content changes reviewable in a diff, they let the site be served
from a plain checkout without a build, and they are the safety net if the generator ever breaks. The
redundancy is cheap; the reviewability is not.

---

## Do NOT remove

- `site/assets/images/heroes-v2/*--bg.jpg` and friends — the hero images look unreferenced to a naive
  grep because the code **builds their URLs by string substitution** (`--bg.jpg` → `--bg.avif`,
  `--bg--mobile.webp`, and four more). Searching for the literal filename finds nothing; the files are
  very much in use.
- `tools/build.mjs`, `tools/validate-trip.mjs`, `tools/check-admin-fields.mjs`, `tools/templates/**` —
  the live build and its gates.
- `data/trips/*.json` — the content source of truth for every trip page.
- `docs/PROJECT-BIBLE.md` — but note it states the deployment target is Cloudflare Pages and that
  `main` is production. Both are wrong today. Stale docs about *deployment* are worse than absent
  ones, because the next developer or AI will believe them. Correct it when Stage 3 lands.
