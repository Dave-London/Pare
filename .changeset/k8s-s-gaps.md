---
"@paretools/k8s": minor
---

Add S-complexity gap parameters to K8s tools:

- **get**: `fieldSelector`, `context`, `kubeconfig`, `sortBy`, `filename`, `subresource`
- **describe**: Make `name` optional, add `selector`, `context`, `kubeconfig`
- **apply**: Multi-file support (`string | string[]`), `validate` enum, `waitTimeout`, `fieldManager`, `context`, `selector`, `cascade` enum
- **helm**: `version`, `waitTimeout`, multi-values (`string | string[]`), `filter`, `statusRevision`, `repo`, `description`
- **logs**: `sinceTime`, `selector`, `context`, `podRunningTimeout`
