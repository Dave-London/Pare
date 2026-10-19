---
"@paretools/github": patch
---

fix(github): `issue-list` and `pr-list` no longer return other repositories' results for a `search` that uses `OR`. gh adds `repo:OWNER/REPO` to the search, and a bare `OR` split the query so that qualifier only covered the first alternative. The search is now grouped in parentheses, and any result from another repository is dropped and counted in `excludedOtherRepos` (#1173)
