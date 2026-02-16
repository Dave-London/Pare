---
"@paretools/k8s": minor
---

feat(k8s): expand resource metadata, add helm history and template actions (P1)

- Add annotations, ownerReferences, finalizers, resourceVersion, uid to K8sResourceSchema
- Add helm `history` action for release revision history
- Add helm `template` action for local chart template rendering
