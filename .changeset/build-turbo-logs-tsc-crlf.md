---
"@paretools/build": patch
---

fix(build): `turbo` now returns each task's captured log as `output` (tail, capped): for every task when `outputLogs` is set to a mode that prints logs, and for failed tasks by default. `outputLogs` used to have no visible effect, and compact output now lists the failed tasks (#1168). `tsc` now reads diagnostics from Windows CRLF output; a failing typecheck used to report `errors: 0` there (#1202)
