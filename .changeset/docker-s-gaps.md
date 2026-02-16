---
"@paretools/docker": minor
---

Implement S-complexity gaps for Docker tools

- build: Add buildArgs, target, platform, label, cacheFrom, cacheTo, secret, ssh params
- compose-build: Add file, ssh, builder params
- compose-down: Add rmi enum param, services positional args
- compose-logs: Add until param, file param for compose file targeting
- compose-ps: Add file, services, status, filter params; state field changed to enum
- compose-up: Add pull enum param (always/missing/never)
- exec: Add user, envFile params; add duration to output schema
- images: Add digest field to output schema
- inspect: Add type enum, size param; add healthStatus, env, restartPolicy to output
- logs: Add until param for time-bounded queries
- network-ls: Add filter param (string or string[]); add createdAt to output; preserve id in compact
- ps: Add filter param; preserve full container ID (no truncation)
- pull: Preserve digest in compact output
- run: Add workdir, network, platform, entrypoint, user, restart, memory, hostname, shmSize, pull, envFile params
- stats: Add path param; preserve memoryUsage in compact output
- volume-ls: Add filter param (string or string[]); add createdAt to output; preserve mountpoint in compact
- compose-logs compact: Preserve timestamps in head/tail entries
