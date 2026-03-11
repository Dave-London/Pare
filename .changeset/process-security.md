---
"@paretools/process": patch
---

fix(process): add security hardening to reload and run tools

- Add assertAllowedByPolicy check to reload tool buildCommand parameter
- Add assertAllowedRoot check to reload tool path parameter
- Replace sh -c shell execution with direct executable + args in reload tool
- Add destructiveHint annotation to both reload and run tools
- Add security warnings about arbitrary command execution in tool descriptions
- Document PARE_PROCESS_ALLOWED_COMMANDS and PARE_PROCESS_ALLOWED_ROOTS configuration
