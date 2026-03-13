---
"@paretools/go": patch
"@paretools/docker": patch
"@paretools/build": patch
"@paretools/make": patch
---

fix(security): harden input validation across go, docker, build, and make servers

- Block dangerous Go flags (-exec, -toolexec) in buildArgs to prevent arbitrary command execution
- Add assertNoFlagInjection for ldflags and gcflags in go build
- Expand Docker volume mount blocklist with /home, /var/lib/docker, /tmp, /boot, /usr and sensitive credential path segments (.ssh, .aws, .gnupg, .kube, etc.)
- Block dangerous env var keys (PATH, LD_PRELOAD, NODE_OPTIONS, etc.) in build and webpack tools
- Validate make/just env key names match strict identifier pattern
- Add assertAllowedRoot check on Docker exec/run envFile parameter
