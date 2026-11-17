---
"@paretools/npm": minor
---

Add an optional pnpmReporter: "silent" install input without relaxing package-operand validation or changing lifecycle-script defaults. Silent installs omit output-derived statistics, including added/removed/changed counts, and report unavailable counts in the readable summary. Install count fields are now optional in the output schema; ordinary install calls retain their existing statistics.

Report nonzero install exit codes as tool failures for every supported package manager, including when node_modules already exists or output is empty. Bound failure diagnostics using the shared compact-output limits, compact each stream separately, preserve both ends when the character budget binds, and prioritize stderr so verbose stdout cannot hide the failure reason. Apply the same redaction and diagnostic limits to successful-exit verification failures, including project paths in the error context.
