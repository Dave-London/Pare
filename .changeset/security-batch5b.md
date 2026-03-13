---
"@paretools/npm": patch
"@paretools/git": patch
"@paretools/search": patch
"@paretools/remote": patch
---

fix: harden input validation across npm, git, search, and remote servers

- npm install: validate args array elements and restrict registry URLs to https://
- nvm exec: gate command behind ALLOWED_COMMANDS policy
- npm run: restrict scriptShell to known safe shells
- git submodule add: restrict URLs to http/https schemes by default
- rsync: validate exclude/include array elements
- jq: validate arg/argjson record keys
