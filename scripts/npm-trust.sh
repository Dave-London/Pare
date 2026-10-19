#!/usr/bin/env bash
# Configure npm trusted publishing (OIDC) for every public @paretools package,
# so .github/workflows/release.yml can publish without an NPM_TOKEN.
#
# Run once, locally, logged in to npm as a package owner with 2FA:
#   npm install -g npm@latest   # npm trust needs npm >= 11.15.0
#   npm login
#   bash scripts/npm-trust.sh
#
# The first call asks for 2FA. Choose "skip 2FA for the next 5 minutes" on the
# npm website so the remaining calls go through without another prompt.
# Packages that already trust release.yml are skipped, so re-running is safe.
# A brand-new package must be published once (with a short-lived token) before
# it can be trusted.
set -euo pipefail

REPO="Dave-London/Pare"
WORKFLOW="release.yml"

cd "$(dirname "$0")/.."

for manifest in packages/*/package.json; do
  name=$(node -p "require('./$manifest').name")
  private=$(node -p "require('./$manifest').private === true")
  if [ "$private" = "true" ]; then
    continue
  fi

  if npm trust list "$name" --json 2>/dev/null | grep -q "\"$WORKFLOW\""; then
    echo "skip  $name (already trusts $WORKFLOW)"
    continue
  fi

  echo "trust $name"
  npm trust github "$name" --repo "$REPO" --file "$WORKFLOW" --allow-publish --yes
  # npm recommends a short pause between calls to avoid rate limiting.
  sleep 2
done
