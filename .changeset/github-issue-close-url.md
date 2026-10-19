---
"@paretools/github": patch
---

fix(github): `issue-close` now returns the issue `url` and, when a comment was posted, its `commentUrl`. `gh issue close` prints neither, so they used to come back as `""` and unset; they are now looked up after closing, and `url` is omitted rather than `""` if the lookup fails (#1170). A new `commentPosted` field is `false` when the issue was already closed, because gh then skips the comment without an error
