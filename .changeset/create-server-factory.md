---
"@paretools/shared": minor
"@paretools/git": patch
"@paretools/github": patch
"@paretools/docker": patch
"@paretools/npm": patch
"@paretools/lint": patch
"@paretools/build": patch
"@paretools/test": patch
"@paretools/search": patch
"@paretools/http": patch
"@paretools/make": patch
"@paretools/process": patch
"@paretools/security": patch
"@paretools/k8s": patch
"@paretools/cargo": patch
"@paretools/go": patch
"@paretools/python": patch
"@paretools/bazel": patch
"@paretools/bun": patch
"@paretools/cmake": patch
"@paretools/db": patch
"@paretools/deno": patch
"@paretools/dotnet": patch
"@paretools/infra": patch
"@paretools/jvm": patch
"@paretools/remote": patch
"@paretools/ruby": patch
---

Extract common MCP server boilerplate into a `createServer()` factory in `@paretools/shared`. All server packages now use this factory instead of duplicating McpServer setup, StdioServerTransport connection, and tool registration code.
