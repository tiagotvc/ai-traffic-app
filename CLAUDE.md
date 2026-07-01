<!-- rtk-instructions v3 -->

# RTK (Rust Token Killer) + Claude Code Optimization

## CRITICAL RULES

Token efficiency is a primary objective.

Always prefer RTK commands when available.

Never use raw commands if an RTK equivalent exists.

Always minimize terminal output sent to the model.

When uncertain between multiple approaches, choose the one that produces less output.

---

# Golden Rule

Always prefix commands with rtk.

Examples:

bash
# ❌ Wrong
git diff
git status
grep -R "Campaign"

# ✅ Correct
rtk git diff
rtk git status
rtk grep "Campaign"


Command chains must also use RTK:

bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push


---

# Investigation Strategy

When investigating code:

1. Search before reading
2. Read before editing
3. Edit before building
4. Build only affected modules
5. Avoid full-project scans

Prefer:

bash
rtk grep "CampaignService"
rtk read src/services/campaign-service.ts


Avoid:

bash
grep -R "CampaignService" .
cat entire-project-file.ts


---

# Large File Policy

Before reading files larger than 300 lines:

1. Use rtk grep
2. Use rtk read
3. Read only relevant sections

Never read:

text
node_modules
.next
dist
coverage
build
pnpm-lock.yaml
package-lock.json
yarn.lock
generated files
large logs


unless explicitly requested.

---

# Build & Compile (80-90% savings)

bash
rtk cargo build
rtk cargo check
rtk cargo clippy
rtk tsc
rtk lint
rtk prettier --check
rtk next build


Rules:

- Run TypeScript checks before full builds.
- Prefer rtk tsc over rtk next build when possible.
- Avoid rebuilding entire applications after small changes.

---

# Test (60-99% savings)

bash
rtk cargo test
rtk go test
rtk jest
rtk vitest
rtk playwright test
rtk pytest
rtk rake test
rtk rspec
rtk test <cmd>


Rules:

- Run targeted tests first.
- Avoid running full test suites unless necessary.

Prefer:

bash
rtk vitest campaign.test.ts


over:

bash
rtk vitest


---

# Git (59-80% savings)

bash
rtk git status
rtk git log
rtk git diff
rtk git show
rtk git add
rtk git commit
rtk git push
rtk git pull
rtk git branch
rtk git fetch
rtk git stash
rtk git worktree


Rules:

- Never use raw git diff.
- Always use RTK git filters.

---

# GitHub (26-87% savings)

bash
rtk gh pr view <num>
rtk gh pr checks
rtk gh run list
rtk gh issue list
rtk gh api


---

# JavaScript / TypeScript (70-90% savings)

bash
rtk pnpm list
rtk pnpm outdated
rtk pnpm install
rtk npm run <script>
rtk npx <cmd>
rtk prisma


Rules:

- Avoid raw npm output.
- Prefer RTK wrappers.

---

# Files & Search (60-75% savings)

bash
rtk ls <path>
rtk read <file>
rtk grep <pattern>
rtk find <pattern>


Rules:

- Use search before file reading.
- Read smallest possible scope.

Prefer:

bash
rtk grep "createCampaign"


before:

bash
rtk read src/services/campaign-service.ts


---

# Analysis & Debug (70-90% savings)

bash
rtk err <cmd>
rtk log <file>
rtk json <file>
rtk deps
rtk env
rtk summary <cmd>
rtk diff


Rules:

- Use rtk err for failing commands.
- Use rtk log for logs.
- Use rtk summary for large outputs.

---

# Infrastructure (85% savings)

bash
rtk docker ps
rtk docker images
rtk docker logs <container>
rtk kubectl get
rtk kubectl logs


---

# Network (65-70% savings)

bash
rtk curl <url>
rtk wget <url>


---

# Orion Project Rules

Technology stack:

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- Inngest
- React
- Tailwind

Preferred workflow:

bash
rtk grep
rtk read
rtk git diff
rtk tsc
rtk lint


Only run:

bash
rtk next build


when TypeScript and lint are already passing.

Avoid:

bash
grep -R
git diff
cat large-file
next build
npm install


when RTK alternatives exist.

---

# Context Preservation Rules

When solving problems:

- Search before reading
- Read before editing
- Edit before rebuilding
- Rebuild before testing
- Test before deploying

Never load:

- Entire repositories
- Large generated files
- Large logs
- Build artifacts

without explicit need.

Always prefer the smallest amount of information necessary to complete the task.

---

# Meta Commands

bash
rtk gain
rtk gain --history
rtk discover
rtk proxy <cmd>
rtk init
rtk init --global


---

# Success Criteria

Preferred order:

1. rtk grep
2. rtk read
3. edit
4. rtk tsc
5. targeted test
6. rtk git diff
7. commit

Minimize:

- terminal output
- file reads
- log volume
- build volume
- test volume

Maximize:

- targeted searches
- focused reads
- incremental validation

<!-- /rtk-instructions -->