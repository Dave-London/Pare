---
"@paretools/shared": minor
"@paretools/git": minor
"@paretools/github": minor
"@paretools/npm": minor
"@paretools/docker": minor
"@paretools/build": minor
"@paretools/lint": minor
"@paretools/search": minor
"@paretools/test": minor
"@paretools/cargo": minor
"@paretools/go": minor
"@paretools/python": minor
"@paretools/k8s": minor
"@paretools/http": minor
"@paretools/security": minor
"@paretools/make": minor
"@paretools/process": minor
"@paretools/bun": minor
"@paretools/deno": minor
"@paretools/dotnet": minor
"@paretools/infra": minor
"@paretools/jvm": minor
"@paretools/nix": minor
"@paretools/remote": minor
"@paretools/ruby": minor
"@paretools/swift": minor
"@paretools/db": minor
"@paretools/bazel": minor
"@paretools/cmake": minor
---

Implement lazy tool registration: when `PARE_LAZY=true`, only core tools are registered at startup while extended tools are deferred and discoverable via the new `discover-tools` meta-tool. Reduces token cost of tool schemas in LLM prompts by loading rarely-used tools on demand.
