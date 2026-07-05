---
"@paretools/build": patch
---

fix(build): tsc never returns a contextless `success:false` — surface failure detail

When `tsc` exits non-zero without emitting parseable diagnostics (a tsconfig
error like `TS18003 No inputs were found`, a crash, or an npx/binary resolution
failure), the result was `{success:false, diagnostics:[]}` — and the compact
formatter even rendered it as "TypeScript: no errors found." `parseTscOutput`
now attaches the raw stderr (or stdout, or a generic exit-code message) as a
new optional `error` field whenever a failed run has no diagnostics, and the
full/compact formatters surface it instead of implying success. Enforces the
same "success:false ⟹ actionable output" invariant the vite-build tool got.
The pure missing-binary case is already handled by the `assertBinaryAvailable`
preflight. Closes #965.
