#!/usr/bin/env bash
# record-git-fixtures.sh — Captures real git CLI output for Phase 3 smoke tests
#
# Creates a temp repo, sets up representative states, captures raw output
# to tests/smoke/fixtures/git/<tool>/*.txt, then cleans up.
#
# Usage: bash tests/smoke/scripts/record-git-fixtures.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE_DIR="$(cd "$SCRIPT_DIR/../fixtures/git" && pwd)"
TEMP_REPO="/tmp/pare-smoke-git-$$"
REMOTE_REPO="/tmp/pare-smoke-git-remote-$$"

# Ensure fixture directories exist
tools=(log diff show blame branch commit tag stash stash-list remote reflog log-graph
       worktree merge rebase cherry-pick push pull reset restore add checkout bisect)
for t in "${tools[@]}"; do
  mkdir -p "$FIXTURE_DIR/$t"
done

cleanup() {
  rm -rf "$TEMP_REPO" "$REMOTE_REPO" 2>/dev/null || true
}
trap cleanup EXIT

echo "=== Setting up temp repos ==="

# Create bare remote
git init --bare "$REMOTE_REPO" 2>/dev/null

# Create working repo
git init "$TEMP_REPO" 2>/dev/null
cd "$TEMP_REPO"
git config user.name "Test User"
git config user.email "test@example.com"
git remote add origin "$REMOTE_REPO"

# ─── Initial commits ───
echo "module.exports = {}" > src-index.ts
mkdir -p src
echo "export function main() { return 42; }" > src/index.ts
echo "export function helper() { return true; }" > src/helper.ts
echo "# Test Project" > README.md
git add .
git commit -m "feat: initial project setup" --quiet

echo "export function add(a, b) { return a + b; }" > src/math.ts
git add .
git commit -m "feat: add math utilities" --quiet

echo "export function sub(a, b) { return a - b; }" >> src/math.ts
git add .
git commit -m "fix: add subtraction function" --quiet

# Create a tag
git tag -a v1.0.0 -m "Release 1.0.0"
git tag v1.0.1  # lightweight tag

# Push to remote
git push origin main --tags --quiet 2>/dev/null

# More commits for log variety
for i in $(seq 1 7); do
  echo "// change $i" >> src/index.ts
  git add .
  git commit -m "chore: iteration $i of refactoring" --quiet
done

git push origin main --quiet 2>/dev/null

# ─── Create feature branch ───
git checkout -b feature-branch --quiet 2>/dev/null
echo "export function feature() { return 'new'; }" > src/feature.ts
git add .
git commit -m "feat: add feature module" --quiet

echo "// extended" >> src/feature.ts
git add .
git commit -m "feat: extend feature module" --quiet
git push origin feature-branch --quiet 2>/dev/null

git checkout main --quiet 2>/dev/null

echo "=== Recording fixtures ==="

# ═══════════════════════════════════════════════════════════════
# LOG
# ═══════════════════════════════════════════════════════════════
echo "  log..."

# S1: Default log (uses the custom format with NUL/SOH delimiters)
git log --format="%H%x00%h%x00%an <%ae>%x00%ar%x00%D%x00%s%x00%b%x01" --max-count=10 \
  > "$FIXTURE_DIR/log/s01-default.txt"

# S2: Custom maxCount=3
git log --format="%H%x00%h%x00%an <%ae>%x00%ar%x00%D%x00%s%x00%b%x01" --max-count=3 \
  > "$FIXTURE_DIR/log/s02-maxcount3.txt"

# S3: Empty repo log (simulate with unreachable ref)
printf "" > "$FIXTURE_DIR/log/s03-empty.txt"

# S7: Filter by author
git log --format="%H%x00%h%x00%an <%ae>%x00%ar%x00%D%x00%s%x00%b%x01" --max-count=10 --author="Test User" \
  > "$FIXTURE_DIR/log/s07-author-filter.txt"

# S8: Filter by ref
git log --format="%H%x00%h%x00%an <%ae>%x00%ar%x00%D%x00%s%x00%b%x01" --max-count=10 main \
  > "$FIXTURE_DIR/log/s08-ref-main.txt"

# ═══════════════════════════════════════════════════════════════
# DIFF
# ═══════════════════════════════════════════════════════════════
echo "  diff..."

# Make some changes for diff
echo "// unstaged change" >> src/index.ts

# S1: Unstaged changes (numstat format)
git diff --numstat > "$FIXTURE_DIR/diff/s01-unstaged.txt"

# Stage some changes, make more unstaged
git add src/index.ts
echo "// another change" >> src/helper.ts

# S2: Staged changes
git diff --cached --numstat > "$FIXTURE_DIR/diff/s02-staged.txt"

# S3: No changes (use a clean file)
printf "" > "$FIXTURE_DIR/diff/s03-clean.txt"

# S10: Full patch mode (for staged changes)
git diff --cached > "$FIXTURE_DIR/diff/s10-full-patch.txt"

# S7: Diff against ref
git diff HEAD --numstat > "$FIXTURE_DIR/diff/s07-against-ref.txt"

# S8: Single file diff
git diff --numstat -- src/helper.ts > "$FIXTURE_DIR/diff/s08-single-file.txt"

# Reset changes for next tests
git checkout -- . 2>/dev/null
git reset HEAD --quiet 2>/dev/null

# ═══════════════════════════════════════════════════════════════
# SHOW
# ═══════════════════════════════════════════════════════════════
echo "  show..."

# S1: Show HEAD commit (info portion)
git show --no-patch --format="%H%x00%an <%ae>%x00%ar%x00%B" HEAD \
  > "$FIXTURE_DIR/show/s01-head-info.txt"

# S1: Show HEAD commit (numstat portion)
git show --numstat --format= HEAD \
  > "$FIXTURE_DIR/show/s01-head-numstat.txt"

# S2: Show specific commit (the first one)
FIRST_COMMIT=$(git rev-list --max-parents=0 HEAD)
git show --no-patch --format="%H%x00%an <%ae>%x00%ar%x00%B" "$FIRST_COMMIT" \
  > "$FIXTURE_DIR/show/s02-specific-info.txt"
git show --numstat --format= "$FIRST_COMMIT" \
  > "$FIXTURE_DIR/show/s02-specific-numstat.txt"

# S5: Show tag object
git show --no-patch --format="%H%x00%an <%ae>%x00%ar%x00%B" v1.0.0 \
  > "$FIXTURE_DIR/show/s05-tag-info.txt"

# ═══════════════════════════════════════════════════════════════
# BLAME
# ═══════════════════════════════════════════════════════════════
echo "  blame..."

# S1: Blame entire file
git blame --porcelain src/index.ts > "$FIXTURE_DIR/blame/s01-full-file.txt"

# S4: Line range blame
git blame --porcelain -L 1,3 src/index.ts > "$FIXTURE_DIR/blame/s04-line-range.txt"

# S5: Blame at specific rev
git blame --porcelain src/math.ts > "$FIXTURE_DIR/blame/s05-math-file.txt"

# ═══════════════════════════════════════════════════════════════
# BRANCH
# ═══════════════════════════════════════════════════════════════
echo "  branch..."

# S1: List branches
git branch -vv > "$FIXTURE_DIR/branch/s01-list.txt"

# S9: All branches including remotes
git branch -vv -a > "$FIXTURE_DIR/branch/s09-all.txt"

# S2: After creating a branch (capture list again)
git branch test-branch
git branch -vv > "$FIXTURE_DIR/branch/s02-after-create.txt"
git branch -d test-branch --quiet

# ═══════════════════════════════════════════════════════════════
# COMMIT
# ═══════════════════════════════════════════════════════════════
echo "  commit..."

# S1: Basic commit
echo "// commit test" >> src/index.ts
git add .
git commit -m "feat: add commit test" 2>&1 > "$FIXTURE_DIR/commit/s01-basic.txt" || true

# S4: Allow empty commit
git commit --allow-empty -m "chore: empty commit" 2>&1 > "$FIXTURE_DIR/commit/s04-allow-empty.txt" || true

# ═══════════════════════════════════════════════════════════════
# TAG
# ═══════════════════════════════════════════════════════════════
echo "  tag..."

# Create more tags for variety
git tag -a v2.0.0 -m "Release 2.0.0"
git tag v2.0.1

# S1: List tags
git tag -l --sort=-creatordate --format="%(refname:short)%09%(creatordate:iso-strict)%09%(subject)%09%(*objecttype)" \
  > "$FIXTURE_DIR/tag/s01-list.txt"

# S7: No tags (simulate with empty)
printf "" > "$FIXTURE_DIR/tag/s07-empty.txt"

# ═══════════════════════════════════════════════════════════════
# STASH
# ═══════════════════════════════════════════════════════════════
echo "  stash..."

# Create some changes to stash
echo "// stash me" >> src/index.ts
echo "// stash me too" >> src/helper.ts

# S1: Push (stash changes)
git stash push -m "WIP: stash test 1" 2>&1 > "$FIXTURE_DIR/stash/s01-push.txt"

# Create more changes for second stash
echo "// stash me again" >> src/index.ts
git stash push -m "WIP: stash test 2" 2>&1 > "$FIXTURE_DIR/stash/s01b-push2.txt"

# S8: Show stash
git stash show --stat stash@{0} > "$FIXTURE_DIR/stash/s08-show.txt"

# S2: Pop stash
git stash pop 2>&1 > "$FIXTURE_DIR/stash/s02-pop.txt" || true

# S5: Apply stash (apply remaining)
git checkout -- . 2>/dev/null
git stash apply 2>&1 > "$FIXTURE_DIR/stash/s05-apply.txt" || true
git checkout -- . 2>/dev/null

# S3: Push with no changes (clean state)
git stash push -m "nothing" 2>&1 > "$FIXTURE_DIR/stash/s03-no-changes.txt" || true

# ═══════════════════════════════════════════════════════════════
# STASH-LIST
# ═══════════════════════════════════════════════════════════════
echo "  stash-list..."

# S1: List stashes
git stash list --format="%gd%x09%gs%x09%cd" --date=iso \
  > "$FIXTURE_DIR/stash-list/s01-list.txt"

# S2: Empty stash list (simulate)
printf "" > "$FIXTURE_DIR/stash-list/s02-empty.txt"

# Clear stashes for clean state
git stash drop 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# REMOTE
# ═══════════════════════════════════════════════════════════════
echo "  remote..."

# S1: List remotes
git remote -v > "$FIXTURE_DIR/remote/s01-list.txt"

# S6: Show remote details
git remote show origin > "$FIXTURE_DIR/remote/s06-show.txt" 2>&1 || true

# ═══════════════════════════════════════════════════════════════
# REFLOG
# ═══════════════════════════════════════════════════════════════
echo "  reflog..."

# S1: Default reflog
git reflog show --format="%H%x09%h%x09%gd%x09%gs%x09%ci" --max-count=20 \
  > "$FIXTURE_DIR/reflog/s01-default.txt"

# S6: Custom maxCount=5
git reflog show --format="%H%x09%h%x09%gd%x09%gs%x09%ci" --max-count=5 \
  > "$FIXTURE_DIR/reflog/s06-maxcount5.txt"

# ═══════════════════════════════════════════════════════════════
# LOG-GRAPH
# ═══════════════════════════════════════════════════════════════
echo "  log-graph..."

# S1: Default graph
git log --graph --pretty="format:%h %p %d %s" --max-count=20 \
  > "$FIXTURE_DIR/log-graph/s01-default.txt"

# S5: All branches
git log --graph --pretty="format:%h %p %d %s" --max-count=20 --all \
  > "$FIXTURE_DIR/log-graph/s05-all-branches.txt"

# ═══════════════════════════════════════════════════════════════
# WORKTREE
# ═══════════════════════════════════════════════════════════════
echo "  worktree..."

# S1: List worktrees
git worktree list --porcelain > "$FIXTURE_DIR/worktree/s01-list.txt"

# S2: Add worktree
WT_PATH="$TEMP_REPO-wt"
git worktree add "$WT_PATH" -b wt-test main 2>&1 > "$FIXTURE_DIR/worktree/s02-add.txt" || true

# List after add
git worktree list --porcelain > "$FIXTURE_DIR/worktree/s02-list-after-add.txt"

# S3: Remove worktree
git worktree remove "$WT_PATH" --force 2>&1 > "$FIXTURE_DIR/worktree/s03-remove.txt" || true

# ═══════════════════════════════════════════════════════════════
# MERGE
# ═══════════════════════════════════════════════════════════════
echo "  merge..."

# S3: Already up to date
git merge main 2>&1 > "$FIXTURE_DIR/merge/s03-already-up-to-date.txt" || true

# Create a branch with changes, then merge
git checkout -b merge-test --quiet 2>/dev/null
echo "// merge content" > src/merge-file.ts
git add .
git commit -m "feat: merge test content" --quiet
git checkout main --quiet 2>/dev/null

# S1: Fast-forward merge
git merge merge-test 2>&1 > "$FIXTURE_DIR/merge/s01-fast-forward.txt" || true

# S2: Merge with conflict
git checkout -b conflict-branch HEAD~1 --quiet 2>/dev/null
echo "// conflicting content" > src/merge-file.ts
git add .
git commit -m "feat: conflicting change" --quiet
git checkout main --quiet 2>/dev/null
git merge conflict-branch 2>&1 > "$FIXTURE_DIR/merge/s02-conflict.txt" || true
# Capture conflict file list
git diff --name-only --diff-filter=U > "$FIXTURE_DIR/merge/s02-conflict-files.txt" 2>/dev/null || true
git merge --abort 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# REBASE
# ═══════════════════════════════════════════════════════════════
echo "  rebase..."

# Create diverged branches for rebase
git checkout -b rebase-test HEAD~3 --quiet 2>/dev/null
echo "// rebase content" > src/rebase-file.ts
git add .
git commit -m "feat: rebase test content" --quiet

# S1: Simple rebase
git rebase main 2>&1 > "$FIXTURE_DIR/rebase/s01-simple.txt" || true
git checkout main --quiet 2>/dev/null

# ═══════════════════════════════════════════════════════════════
# CHERRY-PICK
# ═══════════════════════════════════════════════════════════════
echo "  cherry-pick..."

# Create a commit to cherry-pick
git checkout -b cp-source --quiet 2>/dev/null
echo "// cherry-picked content" > src/cherry.ts
git add .
git commit -m "feat: cherry-pick source" --quiet
CP_HASH=$(git rev-parse HEAD)
git checkout main --quiet 2>/dev/null

# S1: Cherry-pick single commit
git cherry-pick "$CP_HASH" 2>&1 > "$FIXTURE_DIR/cherry-pick/s01-single.txt" || true

# ═══════════════════════════════════════════════════════════════
# PUSH
# ═══════════════════════════════════════════════════════════════
echo "  push..."

# S1: Push to remote (stderr contains the real output)
git push origin main 2> "$FIXTURE_DIR/push/s01-push.txt" || true

# S2: Push rejected (simulate by rewinding remote)
# Create a diverged state
cd "$REMOTE_REPO"
cd "$TEMP_REPO"

# ═══════════════════════════════════════════════════════════════
# PULL
# ═══════════════════════════════════════════════════════════════
echo "  pull..."

# S2: Already up to date
git pull origin main 2>&1 > "$FIXTURE_DIR/pull/s02-up-to-date.txt" || true

# ═══════════════════════════════════════════════════════════════
# RESET
# ═══════════════════════════════════════════════════════════════
echo "  reset..."

# S1: Reset with file unstaging
echo "// reset test" >> src/index.ts
git add .
git reset HEAD -- src/index.ts 2>&1 > "$FIXTURE_DIR/reset/s01-unstage.txt" || true
git checkout -- . 2>/dev/null

# ═══════════════════════════════════════════════════════════════
# RESTORE
# ═══════════════════════════════════════════════════════════════
echo "  restore..."

# S1: Restore working tree file
echo "// modified for restore" >> src/index.ts
git restore src/index.ts 2>&1 > "$FIXTURE_DIR/restore/s01-working-tree.txt" || true

# S2: Restore staged file
echo "// stage then restore" >> src/index.ts
git add src/index.ts
git restore --staged src/index.ts 2>&1 > "$FIXTURE_DIR/restore/s02-staged.txt" || true
git checkout -- . 2>/dev/null

# ═══════════════════════════════════════════════════════════════
# ADD
# ═══════════════════════════════════════════════════════════════
echo "  add..."

# After adding, capture status for verification
echo "// new add content" > src/new-file.ts
echo "// modified" >> src/index.ts
git add .
# Status in porcelain v1 format (what the add tool reads)
git status --porcelain=v1 > "$FIXTURE_DIR/add/s01-after-add.txt"
git reset HEAD --quiet 2>/dev/null
rm -f src/new-file.ts
git checkout -- . 2>/dev/null

# ═══════════════════════════════════════════════════════════════
# CHECKOUT
# ═══════════════════════════════════════════════════════════════
echo "  checkout..."

# S1: Switch to existing branch
git switch feature-branch 2>&1 > "$FIXTURE_DIR/checkout/s01-switch.txt" || true
git switch main --quiet 2>/dev/null

# S2: Create and switch
git switch -c checkout-test 2>&1 > "$FIXTURE_DIR/checkout/s02-create-switch.txt" || true
git switch main --quiet 2>/dev/null
git branch -d checkout-test --quiet 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════
# BISECT
# ═══════════════════════════════════════════════════════════════
echo "  bisect..."

# S1: Start bisect
GOOD_COMMIT=$(git rev-list --max-parents=0 HEAD)
git bisect start 2>&1 > "$FIXTURE_DIR/bisect/s01-start.txt" || true
git bisect bad HEAD 2>&1 >> "$FIXTURE_DIR/bisect/s01-start.txt" || true
git bisect good "$GOOD_COMMIT" 2>&1 >> "$FIXTURE_DIR/bisect/s01-start.txt" || true

# S4: Reset bisect
git bisect reset 2>&1 > "$FIXTURE_DIR/bisect/s04-reset.txt" || true

echo ""
echo "=== Fixtures recorded to $FIXTURE_DIR ==="
echo "=== Done ==="
