# Smoke Test Scenarios: Small Servers

Consolidated scenario mapping for k8s (5 tools), search (4 tools), http (4 tools), security (3 tools), make (2 tools), and process (1 tool).

---

## Table of Contents

- [k8s.get](#k8sget)
- [k8s.describe](#k8sdescribe)
- [k8s.logs](#k8slogs)
- [k8s.apply](#k8sapply)
- [k8s.helm](#k8shelm)
- [search.search](#searchsearch)
- [search.count](#searchcount)
- [search.find](#searchfind)
- [search.jq](#searchjq)
- [http.request](#httprequest)
- [http.get](#httpget)
- [http.post](#httppost)
- [http.head](#httphead)
- [security.trivy](#securitytrivy)
- [security.semgrep](#securitysemgrep)
- [security.gitleaks](#securitygitleaks)
- [make.list](#makelist)
- [make.run](#makerun)
- [process.run](#processrun)
- [Grand Summary](#grand-summary)

---

## k8s.get

### Tool: `@paretools/k8s` -> `get`

### Implementation: `packages/server-k8s/src/tools/get.ts`

### Schema: `KubectlGetResultSchema`

### Input params

| Param            | Type     | Required | Notes                                |
| ---------------- | -------- | -------- | ------------------------------------ |
| `resource`       | string   | yes      | Resource type (e.g., pods, services) |
| `name`           | string   | no       | Specific resource name               |
| `namespace`      | string   | no       | Kubernetes namespace                 |
| `allNamespaces`  | boolean  | no       | Get from all namespaces (-A)         |
| `selector`       | string   | no       | Label selector                       |
| `fieldSelector`  | string   | no       | Field selector (--field-selector)    |
| `context`        | string   | no       | K8s context (--context)              |
| `kubeconfig`     | string   | no       | Path to kubeconfig (--kubeconfig)    |
| `sortBy`         | string   | no       | JSONPath sort expression (--sort-by) |
| `ignoreNotFound` | boolean  | no       | Suppress not-found errors            |
| `chunkSize`      | number   | no       | Pagination chunk size                |
| `filename`       | string[] | no       | Manifest file paths (-f)             |
| `subresource`    | string   | no       | Subresource (--subresource)          |
| `compact`        | boolean  | no       | Default: true                        |

### Scenarios

| #   | Scenario                         | Params                                                            | Expected Output                                                              | Priority | Status |
| --- | -------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- | ------ |
| 1   | List pods in default namespace   | `{ resource: "pods" }`                                            | `{ action: "get", success: true, resource: "pods", items: [...], total: N }` | P0       | mocked |
| 2   | Get specific pod by name         | `{ resource: "pods", name: "nginx-abc" }`                         | `{ success: true, items: [{ metadata: { name: "nginx-abc" } }], total: 1 }`  | P0       | mocked |
| 3   | Resource not found               | `{ resource: "pods", name: "nonexistent-pod" }`                   | `{ success: false, error: "..." }`                                           | P0       | mocked |
| 4   | No resources exist (empty list)  | `{ resource: "pods", namespace: "empty-ns" }`                     | `{ success: true, items: [], total: 0 }`                                     | P0       | mocked |
| 5   | Flag injection on resource       | `{ resource: "--exec=evil" }`                                     | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 6   | Flag injection on name           | `{ resource: "pods", name: "--exec=evil" }`                       | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 7   | Flag injection on namespace      | `{ resource: "pods", namespace: "--exec=evil" }`                  | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 8   | Flag injection on selector       | `{ resource: "pods", selector: "--exec=evil" }`                   | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 9   | Flag injection on fieldSelector  | `{ resource: "pods", fieldSelector: "--exec=evil" }`              | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 10  | Flag injection on context        | `{ resource: "pods", context: "--exec=evil" }`                    | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 11  | Flag injection on kubeconfig     | `{ resource: "pods", kubeconfig: "--exec=evil" }`                 | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 12  | Flag injection on sortBy         | `{ resource: "pods", sortBy: "--exec=evil" }`                     | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 13  | Flag injection on subresource    | `{ resource: "pods", subresource: "--exec=evil" }`                | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 14  | Flag injection on filename array | `{ resource: "pods", filename: ["--exec=evil"] }`                 | `assertNoFlagInjection` throws                                               | P0       | mocked |
| 15  | All namespaces                   | `{ resource: "pods", allNamespaces: true }`                       | Items from multiple namespaces in output                                     | P1       | mocked |
| 16  | Label selector filtering         | `{ resource: "pods", selector: "app=nginx" }`                     | Only matching pods returned                                                  | P1       | mocked |
| 17  | Field selector filtering         | `{ resource: "pods", fieldSelector: "status.phase=Running" }`     | Only running pods returned                                                   | P1       | mocked |
| 18  | ignoreNotFound suppresses error  | `{ resource: "pods", name: "nonexistent", ignoreNotFound: true }` | `{ success: true, items: [], total: 0 }`                                     | P1       | mocked |
| 19  | sortBy ordering                  | `{ resource: "pods", sortBy: ".metadata.creationTimestamp" }`     | Items ordered by creation time                                               | P2       | mocked |
| 20  | chunkSize pagination             | `{ resource: "pods", chunkSize: 5 }`                              | Results returned (pagination handled by kubectl)                             | P2       | mocked |
| 21  | Schema validation on all outputs | all                                                               | Zod parse against `KubectlGetResultSchema` succeeds                          | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 13     |
| P1        | 4      |
| P2        | 2      |
| **Total** | **19** |

---

## k8s.describe

### Tool: `@paretools/k8s` -> `describe`

### Implementation: `packages/server-k8s/src/tools/describe.ts`

### Schema: `KubectlDescribeResultSchema`

### Input params

| Param           | Type    | Required | Notes                               |
| --------------- | ------- | -------- | ----------------------------------- |
| `resource`      | string  | yes      | Resource type (e.g., pod, service)  |
| `name`          | string  | no       | Resource name                       |
| `namespace`     | string  | no       | K8s namespace                       |
| `selector`      | string  | no       | Label selector (-l)                 |
| `allNamespaces` | boolean | no       | Describe across all namespaces (-A) |
| `showEvents`    | boolean | no       | Show events (default: true)         |
| `context`       | string  | no       | K8s context (--context)             |
| `kubeconfig`    | string  | no       | Path to kubeconfig (--kubeconfig)   |
| `compact`       | boolean | no       | Default: true                       |

### Scenarios

| #   | Scenario                          | Params                                                     | Expected Output                                                                            | Priority | Status |
| --- | --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- | ------ |
| 1   | Describe a specific pod           | `{ resource: "pod", name: "nginx-abc" }`                   | `{ action: "describe", success: true, resource: "pod", name: "nginx-abc", output: "..." }` | P0       | mocked |
| 2   | Resource not found                | `{ resource: "pod", name: "nonexistent" }`                 | `{ success: false, error: "..." }`                                                         | P0       | mocked |
| 3   | Describe all pods (no name)       | `{ resource: "pod" }`                                      | `{ success: true, output: "..." }` with multiple resource descriptions                     | P0       | mocked |
| 4   | Flag injection on resource        | `{ resource: "--exec=evil" }`                              | `assertNoFlagInjection` throws                                                             | P0       | mocked |
| 5   | Flag injection on name            | `{ resource: "pod", name: "--exec=evil" }`                 | `assertNoFlagInjection` throws                                                             | P0       | mocked |
| 6   | Flag injection on namespace       | `{ resource: "pod", namespace: "--exec=evil" }`            | `assertNoFlagInjection` throws                                                             | P0       | mocked |
| 7   | Flag injection on selector        | `{ resource: "pod", selector: "--exec=evil" }`             | `assertNoFlagInjection` throws                                                             | P0       | mocked |
| 8   | Flag injection on context         | `{ resource: "pod", context: "--exec=evil" }`              | `assertNoFlagInjection` throws                                                             | P0       | mocked |
| 9   | Flag injection on kubeconfig      | `{ resource: "pod", kubeconfig: "--exec=evil" }`           | `assertNoFlagInjection` throws                                                             | P0       | mocked |
| 10  | Pod with conditions and events    | `{ resource: "pod", name: "test-pod" }`                    | `conditions: [...]`, `events: [...]` populated                                             | P1       | mocked |
| 11  | Describe deployment with replicas | `{ resource: "deployment", name: "my-deploy" }`            | `resourceDetails.deployment.replicas` populated                                            | P1       | mocked |
| 12  | Describe service with ports       | `{ resource: "service", name: "my-svc" }`                  | `resourceDetails.service.ports` populated                                                  | P1       | mocked |
| 13  | showEvents: false hides events    | `{ resource: "pod", name: "test-pod", showEvents: false }` | `events` absent or empty                                                                   | P1       | mocked |
| 14  | allNamespaces                     | `{ resource: "pod", allNamespaces: true }`                 | Results across namespaces                                                                  | P2       | mocked |
| 15  | Schema validation                 | all                                                        | Zod parse against `KubectlDescribeResultSchema` succeeds                                   | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 8      |
| P1        | 4      |
| P2        | 1      |
| **Total** | **13** |

---

## k8s.logs

### Tool: `@paretools/k8s` -> `logs`

### Implementation: `packages/server-k8s/src/tools/logs.ts`

### Schema: `KubectlLogsResultSchema`

### Input params

| Param               | Type    | Required | Notes                                 |
| ------------------- | ------- | -------- | ------------------------------------- |
| `pod`               | string  | yes      | Pod name                              |
| `namespace`         | string  | no       | K8s namespace                         |
| `container`         | string  | no       | Container name (multi-container pods) |
| `tail`              | number  | no       | Number of recent lines                |
| `since`             | string  | no       | Duration filter (e.g., 1h, 5m)        |
| `sinceTime`         | string  | no       | RFC3339 timestamp filter              |
| `previous`          | boolean | no       | Logs from previous container          |
| `timestamps`        | boolean | no       | Include timestamps                    |
| `allContainers`     | boolean | no       | All containers in pod                 |
| `limitBytes`        | number  | no       | Max bytes of logs                     |
| `prefix`            | boolean | no       | Prefix with pod/container name        |
| `selector`          | string  | no       | Label selector for multi-pod          |
| `context`           | string  | no       | K8s context                           |
| `podRunningTimeout` | string  | no       | Timeout for pod readiness             |
| `ignoreErrors`      | boolean | no       | Continue on errors                    |
| `parseJsonLogs`     | boolean | no       | Parse log lines as JSON               |
| `compact`           | boolean | no       | Default: true                         |

### Scenarios

| #   | Scenario                            | Params                                           | Expected Output                                                                  | Priority | Status |
| --- | ----------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- | -------- | ------ |
| 1   | Get logs from a running pod         | `{ pod: "nginx-abc" }`                           | `{ action: "logs", success: true, pod: "nginx-abc", logs: "...", lineCount: N }` | P0       | mocked |
| 2   | Pod not found                       | `{ pod: "nonexistent-pod" }`                     | `{ success: false, error: "..." }`                                               | P0       | mocked |
| 3   | Empty logs (pod with no output)     | `{ pod: "quiet-pod" }`                           | `{ success: true, logs: "", lineCount: 0 }`                                      | P0       | mocked |
| 4   | Flag injection on pod               | `{ pod: "--exec=evil" }`                         | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 5   | Flag injection on namespace         | `{ pod: "p", namespace: "--exec=evil" }`         | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 6   | Flag injection on container         | `{ pod: "p", container: "--exec=evil" }`         | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 7   | Flag injection on since             | `{ pod: "p", since: "--exec=evil" }`             | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 8   | Flag injection on sinceTime         | `{ pod: "p", sinceTime: "--exec=evil" }`         | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 9   | Flag injection on selector          | `{ pod: "p", selector: "--exec=evil" }`          | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 10  | Flag injection on context           | `{ pod: "p", context: "--exec=evil" }`           | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 11  | Flag injection on podRunningTimeout | `{ pod: "p", podRunningTimeout: "--exec=evil" }` | `assertNoFlagInjection` throws                                                   | P0       | mocked |
| 12  | Tail last N lines                   | `{ pod: "nginx-abc", tail: 10 }`                 | `lineCount <= 10`                                                                | P1       | mocked |
| 13  | Container-specific logs             | `{ pod: "multi-pod", container: "sidecar" }`     | Logs from specified container                                                    | P1       | mocked |
| 14  | since duration filter               | `{ pod: "nginx-abc", since: "1h" }`              | Only recent logs returned                                                        | P1       | mocked |
| 15  | parseJsonLogs: true                 | `{ pod: "json-logger", parseJsonLogs: true }`    | `logEntries` array with parsed JSON objects                                      | P1       | mocked |
| 16  | previous container logs             | `{ pod: "crashed-pod", previous: true }`         | Logs from previous container instance                                            | P1       | mocked |
| 17  | allContainers                       | `{ pod: "multi-pod", allContainers: true }`      | Logs from all containers                                                         | P2       | mocked |
| 18  | timestamps: true                    | `{ pod: "nginx-abc", timestamps: true }`         | Log lines include timestamps                                                     | P2       | mocked |
| 19  | Schema validation                   | all                                              | Zod parse against `KubectlLogsResultSchema` succeeds                             | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 10     |
| P1        | 5      |
| P2        | 2      |
| **Total** | **17** |

---

## k8s.apply

### Tool: `@paretools/k8s` -> `apply`

### Implementation: `packages/server-k8s/src/tools/apply.ts`

### Schema: `KubectlApplyResultSchema`

### Input params

| Param            | Type                                     | Required | Notes                           |
| ---------------- | ---------------------------------------- | -------- | ------------------------------- |
| `file`           | string \| string[]                       | yes      | Manifest file path(s)           |
| `namespace`      | string                                   | no       | K8s namespace                   |
| `dryRun`         | "none" \| "client" \| "server"           | no       | Default: "none"                 |
| `validate`       | "true" \| "false" \| "strict"            | no       | Validation mode                 |
| `serverSide`     | boolean                                  | no       | Server-side apply               |
| `wait`           | boolean                                  | no       | Wait for readiness              |
| `waitTimeout`    | string                                   | no       | Timeout for --wait              |
| `recursive`      | boolean                                  | no       | Process dirs recursively        |
| `kustomize`      | boolean                                  | no       | Apply kustomization dir         |
| `prune`          | boolean                                  | no       | Prune resources not in manifest |
| `force`          | boolean                                  | no       | Force recreation                |
| `forceConflicts` | boolean                                  | no       | Force on field conflicts        |
| `fieldManager`   | string                                   | no       | Field manager name              |
| `context`        | string                                   | no       | K8s context                     |
| `selector`       | string                                   | no       | Label selector                  |
| `cascade`        | "background" \| "orphan" \| "foreground" | no       | Cascade mode                    |
| `compact`        | boolean                                  | no       | Default: true                   |

### Scenarios

| #   | Scenario                                  | Params                                            | Expected Output                                                                         | Priority | Status |
| --- | ----------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | Apply a single manifest                   | `{ file: "deploy.yaml" }`                         | `{ action: "apply", success: true, resources: [{ kind, name, operation: "created" }] }` | P0       | mocked |
| 2   | Apply multiple manifests                  | `{ file: ["svc.yaml", "deploy.yaml"] }`           | Multiple resources in `resources` array                                                 | P0       | mocked |
| 3   | Invalid manifest file                     | `{ file: "nonexistent.yaml" }`                    | `{ success: false, error: "..." }`                                                      | P0       | mocked |
| 4   | Flag injection on file                    | `{ file: "--exec=evil" }`                         | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 5   | Flag injection on file array              | `{ file: ["--exec=evil"] }`                       | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 6   | Flag injection on namespace               | `{ file: "f.yaml", namespace: "--exec=evil" }`    | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 7   | Flag injection on fieldManager            | `{ file: "f.yaml", fieldManager: "--exec=evil" }` | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 8   | Flag injection on context                 | `{ file: "f.yaml", context: "--exec=evil" }`      | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 9   | Flag injection on selector                | `{ file: "f.yaml", selector: "--exec=evil" }`     | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 10  | Flag injection on waitTimeout             | `{ file: "f.yaml", waitTimeout: "--exec=evil" }`  | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 11  | Dry run (client)                          | `{ file: "deploy.yaml", dryRun: "client" }`       | Success with no actual changes applied                                                  | P1       | mocked |
| 12  | Dry run (server)                          | `{ file: "deploy.yaml", dryRun: "server" }`       | Server-side validation without mutation                                                 | P1       | mocked |
| 13  | Server-side apply                         | `{ file: "deploy.yaml", serverSide: true }`       | Apply with conflict detection                                                           | P1       | mocked |
| 14  | Kustomize directory                       | `{ file: "overlays/prod", kustomize: true }`      | Resources from kustomize output                                                         | P1       | mocked |
| 15  | Resource unchanged on re-apply            | `{ file: "deploy.yaml" }`                         | `operation: "unchanged"`                                                                | P1       | mocked |
| 16  | validate: "strict" rejects unknown fields | `{ file: "bad-fields.yaml", validate: "strict" }` | Error on unknown fields                                                                 | P2       | mocked |
| 17  | Schema validation                         | all                                               | Zod parse against `KubectlApplyResultSchema` succeeds                                   | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 9      |
| P1        | 5      |
| P2        | 1      |
| **Total** | **15** |

---

## k8s.helm

### Tool: `@paretools/k8s` -> `helm`

### Implementation: `packages/server-k8s/src/tools/helm.ts`

### Schemas: `HelmListResultSchema`, `HelmStatusResultSchema`, `HelmInstallResultSchema`, `HelmUpgradeResultSchema`, `HelmUninstallResultSchema`, `HelmRollbackResultSchema`, `HelmHistoryResultSchema`, `HelmTemplateResultSchema`

### Input params

| Param              | Type                                                                          | Required    | Notes                                                                         |
| ------------------ | ----------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `action`           | enum (list, status, install, upgrade, uninstall, rollback, history, template) | yes         | Helm action                                                                   |
| `release`          | string                                                                        | conditional | Required for status, install, upgrade, uninstall, rollback, history, template |
| `chart`            | string                                                                        | conditional | Required for install, upgrade, template                                       |
| `namespace`        | string                                                                        | no          | K8s namespace                                                                 |
| `setValues`        | string[]                                                                      | no          | --set values                                                                  |
| `values`           | string \| string[]                                                            | no          | Values YAML file(s)                                                           |
| `version`          | string                                                                        | no          | Chart version                                                                 |
| `dryRun`           | boolean                                                                       | no          | Simulate install/upgrade                                                      |
| `keepHistory`      | boolean                                                                       | no          | Keep history on uninstall                                                     |
| `revision`         | number                                                                        | no          | Rollback revision                                                             |
| `wait`             | boolean                                                                       | no          | Wait for readiness                                                            |
| `waitTimeout`      | string                                                                        | no          | Timeout for --wait                                                            |
| `atomic`           | boolean                                                                       | no          | Roll back on failure                                                          |
| `createNamespace`  | boolean                                                                       | no          | Create namespace if missing                                                   |
| `installOnUpgrade` | boolean                                                                       | no          | Install if not exists on upgrade                                              |
| `reuseValues`      | boolean                                                                       | no          | Reuse values on upgrade                                                       |
| `allNamespaces`    | boolean                                                                       | no          | List across namespaces                                                        |
| `filter`           | string                                                                        | no          | Regex filter for list                                                         |
| `showResources`    | boolean                                                                       | no          | Show resources in status                                                      |
| `statusRevision`   | number                                                                        | no          | Status for specific revision                                                  |
| `repo`             | string                                                                        | no          | Chart repo URL                                                                |
| `description`      | string                                                                        | no          | Release description                                                           |
| `noHooks`          | boolean                                                                       | no          | Skip hooks                                                                    |
| `skipCrds`         | boolean                                                                       | no          | Skip CRD install                                                              |
| `compact`          | boolean                                                                       | no          | Default: true                                                                 |

### Scenarios

| #   | Scenario                            | Params                                                                        | Expected Output                                                             | Priority | Status |
| --- | ----------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------- | ------ |
| 1   | List releases                       | `{ action: "list" }`                                                          | `{ action: "list", success: true, releases: [...], total: N }`              | P0       | mocked |
| 2   | List with no releases               | `{ action: "list", namespace: "empty-ns" }`                                   | `{ success: true, releases: [], total: 0 }`                                 | P0       | mocked |
| 3   | Status of a release                 | `{ action: "status", release: "my-app" }`                                     | `{ action: "status", success: true, name: "my-app", status: "deployed" }`   | P0       | mocked |
| 4   | Status of nonexistent release       | `{ action: "status", release: "nonexistent" }`                                | `{ success: false, error: "..." }`                                          | P0       | mocked |
| 5   | Install a chart                     | `{ action: "install", release: "my-app", chart: "bitnami/nginx" }`            | `{ action: "install", success: true, name: "my-app" }`                      | P0       | mocked |
| 6   | Missing required release for status | `{ action: "status" }`                                                        | Error: "release is required for status action"                              | P0       | mocked |
| 7   | Missing required chart for install  | `{ action: "install", release: "my-app" }`                                    | Error: "chart is required for install action"                               | P0       | mocked |
| 8   | Flag injection on release           | `{ action: "status", release: "--exec=evil" }`                                | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 9   | Flag injection on chart             | `{ action: "install", release: "r", chart: "--exec=evil" }`                   | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 10  | Flag injection on namespace         | `{ action: "list", namespace: "--exec=evil" }`                                | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 11  | Flag injection on version           | `{ action: "install", release: "r", chart: "c", version: "--exec=evil" }`     | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 12  | Flag injection on filter            | `{ action: "list", filter: "--exec=evil" }`                                   | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 13  | Flag injection on repo              | `{ action: "install", release: "r", chart: "c", repo: "--exec=evil" }`        | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 14  | Flag injection on description       | `{ action: "install", release: "r", chart: "c", description: "--exec=evil" }` | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 15  | Flag injection on waitTimeout       | `{ action: "install", release: "r", chart: "c", waitTimeout: "--exec=evil" }` | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 16  | Flag injection on values path       | `{ action: "install", release: "r", chart: "c", values: "--exec=evil" }`      | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 17  | Flag injection on setValues         | `{ action: "install", release: "r", chart: "c", setValues: ["--exec=evil"] }` | `assertNoFlagInjection` throws                                              | P0       | mocked |
| 18  | Upgrade a release                   | `{ action: "upgrade", release: "my-app", chart: "bitnami/nginx" }`            | `{ action: "upgrade", success: true }`                                      | P1       | mocked |
| 19  | Uninstall a release                 | `{ action: "uninstall", release: "my-app" }`                                  | `{ action: "uninstall", success: true }`                                    | P1       | mocked |
| 20  | History of a release                | `{ action: "history", release: "my-app" }`                                    | `{ action: "history", success: true, revisions: [...] }`                    | P1       | mocked |
| 21  | Template rendering                  | `{ action: "template", release: "my-app", chart: "bitnami/nginx" }`           | `{ action: "template", success: true, manifests: "...", manifestCount: N }` | P1       | mocked |
| 22  | Rollback to revision                | `{ action: "rollback", release: "my-app", revision: 1 }`                      | `{ action: "rollback", success: true }`                                     | P1       | mocked |
| 23  | Install with dry-run                | `{ action: "install", release: "r", chart: "c", dryRun: true }`               | Success without actual install                                              | P1       | mocked |
| 24  | List with allNamespaces             | `{ action: "list", allNamespaces: true }`                                     | Releases from multiple namespaces                                           | P2       | mocked |
| 25  | List with filter regex              | `{ action: "list", filter: "^nginx" }`                                        | Only matching releases                                                      | P2       | mocked |
| 26  | Schema validation                   | all                                                                           | Zod parse against respective Helm schemas succeeds                          | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 18     |
| P1        | 6      |
| P2        | 2      |
| **Total** | **26** |

---

## search.search

### Tool: `@paretools/search` -> `search`

### Implementation: `packages/server-search/src/tools/search.ts`

### Schema: `SearchResultSchema`

### Input params

| Param            | Type                                     | Required | Notes                           |
| ---------------- | ---------------------------------------- | -------- | ------------------------------- |
| `pattern`        | string                                   | yes      | Regex pattern to search for     |
| `path`           | string                                   | no       | Directory or file to search     |
| `glob`           | string                                   | no       | File glob filter                |
| `caseSensitive`  | boolean                                  | no       | Default: true                   |
| `maxResults`     | number                                   | no       | Default: 1000                   |
| `maxCount`       | number                                   | no       | Max matches per file            |
| `fixedStrings`   | boolean                                  | no       | Literal string match            |
| `wordRegexp`     | boolean                                  | no       | Whole word match                |
| `invertMatch`    | boolean                                  | no       | Show non-matching lines         |
| `multiline`      | boolean                                  | no       | Cross-line patterns             |
| `hidden`         | boolean                                  | no       | Include hidden files            |
| `type`           | string                                   | no       | File type filter (e.g., ts, py) |
| `sort`           | enum (path, modified, accessed, created) | no       | Sort criterion                  |
| `maxDepth`       | number                                   | no       | Max directory depth             |
| `followSymlinks` | boolean                                  | no       | Follow symlinks                 |
| `noIgnore`       | boolean                                  | no       | Ignore .gitignore               |
| `compact`        | boolean                                  | no       | Default: true                   |

### Scenarios

| #   | Scenario                        | Params                                         | Expected Output                                         | Priority | Status |
| --- | ------------------------------- | ---------------------------------------------- | ------------------------------------------------------- | -------- | ------ |
| 1   | Search for a common pattern     | `{ pattern: "import", path: "src/" }`          | `{ matches: [...], totalMatches: N, filesSearched: M }` | P0       | mocked |
| 2   | No matches found                | `{ pattern: "xyzzy_nonexistent_pattern_abc" }` | `{ matches: [], totalMatches: 0 }`                      | P0       | mocked |
| 3   | Invalid regex pattern           | `{ pattern: "[invalid" }`                      | Error from rg about invalid regex                       | P0       | mocked |
| 4   | Flag injection on pattern       | `{ pattern: "--exec=evil" }`                   | `assertNoFlagInjection` throws                          | P0       | mocked |
| 5   | Flag injection on path          | `{ pattern: "test", path: "--exec=evil" }`     | `assertNoFlagInjection` throws                          | P0       | mocked |
| 6   | Flag injection on glob          | `{ pattern: "test", glob: "--exec=evil" }`     | `assertNoFlagInjection` throws                          | P0       | mocked |
| 7   | Flag injection on type          | `{ pattern: "test", type: "--exec=evil" }`     | `assertNoFlagInjection` throws                          | P0       | mocked |
| 8   | Case-insensitive search         | `{ pattern: "TODO", caseSensitive: false }`    | Matches both "TODO" and "todo"                          | P1       | mocked |
| 9   | Glob filter                     | `{ pattern: "import", glob: "*.ts" }`          | Only matches in .ts files                               | P1       | mocked |
| 10  | Fixed string match              | `{ pattern: "a.b", fixedStrings: true }`       | Matches literal "a.b" not regex "a[any]b"               | P1       | mocked |
| 11  | Word-only match                 | `{ pattern: "test", wordRegexp: true }`        | Does not match "testing" or "attest"                    | P1       | mocked |
| 12  | maxResults truncation           | `{ pattern: ".", maxResults: 5 }`              | At most 5 matches returned                              | P1       | mocked |
| 13  | Type filter                     | `{ pattern: "function", type: "ts" }`          | Only TypeScript file matches                            | P1       | mocked |
| 14  | maxDepth limits search          | `{ pattern: "test", maxDepth: 1 }`             | Only top-level directory matches                        | P2       | mocked |
| 15  | hidden: true includes dot-files | `{ pattern: "test", hidden: true }`            | Matches in .hidden files                                | P2       | mocked |
| 16  | Schema validation               | all                                            | Zod parse against `SearchResultSchema` succeeds         | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 6      |
| P2        | 2      |
| **Total** | **14** |

---

## search.count

### Tool: `@paretools/search` -> `count`

### Implementation: `packages/server-search/src/tools/count.ts`

### Schema: `CountResultSchema`

### Input params

| Param           | Type               | Required | Notes                      |
| --------------- | ------------------ | -------- | -------------------------- |
| `pattern`       | string             | yes      | Regex pattern              |
| `path`          | string             | no       | Search directory           |
| `glob`          | string             | no       | File glob filter           |
| `caseSensitive` | boolean            | no       | Default: true              |
| `maxResults`    | number             | no       | Max files in result        |
| `countMatches`  | boolean            | no       | Per-occurrence vs per-line |
| `fixedStrings`  | boolean            | no       | Literal match              |
| `wordRegexp`    | boolean            | no       | Whole word match           |
| `invertMatch`   | boolean            | no       | Count non-matching lines   |
| `hidden`        | boolean            | no       | Include hidden files       |
| `includeZero`   | boolean            | no       | Show files with 0 matches  |
| `type`          | string             | no       | File type filter           |
| `sort`          | enum (path, count) | no       | Sort order                 |
| `maxDepth`      | number             | no       | Max directory depth        |
| `noIgnore`      | boolean            | no       | Ignore .gitignore          |
| `compact`       | boolean            | no       | Default: true              |

### Scenarios

| #   | Scenario                    | Params                                     | Expected Output                                             | Priority | Status |
| --- | --------------------------- | ------------------------------------------ | ----------------------------------------------------------- | -------- | ------ |
| 1   | Count matches for pattern   | `{ pattern: "import", path: "src/" }`      | `{ files: [...], totalMatches: N, totalFiles: M }`          | P0       | mocked |
| 2   | No matches found            | `{ pattern: "xyzzy_nonexistent" }`         | `{ files: [], totalMatches: 0, totalFiles: 0 }`             | P0       | mocked |
| 3   | Flag injection on pattern   | `{ pattern: "--exec=evil" }`               | `assertNoFlagInjection` throws                              | P0       | mocked |
| 4   | Flag injection on path      | `{ pattern: "test", path: "--exec=evil" }` | `assertNoFlagInjection` throws                              | P0       | mocked |
| 5   | Flag injection on glob      | `{ pattern: "test", glob: "--exec=evil" }` | `assertNoFlagInjection` throws                              | P0       | mocked |
| 6   | Flag injection on type      | `{ pattern: "test", type: "--exec=evil" }` | `assertNoFlagInjection` throws                              | P0       | mocked |
| 7   | countMatches vs per-line    | `{ pattern: "the", countMatches: true }`   | Higher counts than per-line for lines with multiple matches | P1       | mocked |
| 8   | Sort by count (descending)  | `{ pattern: "import", sort: "count" }`     | Files ordered by match count descending                     | P1       | mocked |
| 9   | Sort by path                | `{ pattern: "import", sort: "path" }`      | Files ordered alphabetically                                | P1       | mocked |
| 10  | maxResults truncation       | `{ pattern: ".", maxResults: 3 }`          | At most 3 files in result                                   | P1       | mocked |
| 11  | includeZero shows all files | `{ pattern: "xyzzy", includeZero: true }`  | Files with `count: 0` included                              | P2       | mocked |
| 12  | Schema validation           | all                                        | Zod parse against `CountResultSchema` succeeds              | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 4      |
| P2        | 1      |
| **Total** | **11** |

---

## search.find

### Tool: `@paretools/search` -> `find`

### Implementation: `packages/server-search/src/tools/find.ts`

### Schema: `FindResultSchema`

### Input params

| Param           | Type                                               | Required | Notes                          |
| --------------- | -------------------------------------------------- | -------- | ------------------------------ |
| `pattern`       | string                                             | no       | Regex pattern for filenames    |
| `path`          | string                                             | no       | Search directory               |
| `type`          | enum (file, directory, symlink, executable, empty) | no       | Entry type filter              |
| `extension`     | string                                             | no       | File extension filter          |
| `exclude`       | string                                             | no       | Exclude glob pattern           |
| `size`          | string                                             | no       | Size filter (e.g., +1m, -100k) |
| `changedWithin` | string                                             | no       | Modification time filter       |
| `maxResults`    | number                                             | no       | Default: 1000                  |
| `maxDepth`      | number                                             | no       | Max directory depth            |
| `hidden`        | boolean                                            | no       | Include hidden files           |
| `absolutePath`  | boolean                                            | no       | Return absolute paths          |
| `fullPath`      | boolean                                            | no       | Match against full path        |
| `glob`          | boolean                                            | no       | Use glob instead of regex      |
| `noIgnore`      | boolean                                            | no       | Ignore .gitignore              |
| `follow`        | boolean                                            | no       | Follow symlinks                |
| `compact`       | boolean                                            | no       | Default: true                  |

### Scenarios

| #   | Scenario                        | Params                                     | Expected Output                                | Priority | Status |
| --- | ------------------------------- | ------------------------------------------ | ---------------------------------------------- | -------- | ------ |
| 1   | Find all files in a directory   | `{ path: "src/" }`                         | `{ files: [...], total: N }` with file entries | P0       | mocked |
| 2   | Find by pattern                 | `{ pattern: "test", path: "src/" }`        | Only files matching "test" in name             | P0       | mocked |
| 3   | No matches                      | `{ pattern: "xyzzy_nonexistent" }`         | `{ files: [], total: 0 }`                      | P0       | mocked |
| 4   | Flag injection on pattern       | `{ pattern: "--exec=evil" }`               | `assertNoFlagInjection` throws                 | P0       | mocked |
| 5   | Flag injection on path          | `{ pattern: "test", path: "--exec=evil" }` | `assertNoFlagInjection` throws                 | P0       | mocked |
| 6   | Flag injection on extension     | `{ extension: "--exec=evil" }`             | `assertNoFlagInjection` throws                 | P0       | mocked |
| 7   | Flag injection on exclude       | `{ exclude: "--exec=evil" }`               | `assertNoFlagInjection` throws                 | P0       | mocked |
| 8   | Flag injection on size          | `{ size: "--exec=evil" }`                  | `assertNoFlagInjection` throws                 | P0       | mocked |
| 9   | Flag injection on changedWithin | `{ changedWithin: "--exec=evil" }`         | `assertNoFlagInjection` throws                 | P0       | mocked |
| 10  | Filter by extension             | `{ extension: "ts", path: "src/" }`        | Only .ts files returned                        | P1       | mocked |
| 11  | Filter by type: directory       | `{ type: "directory", path: "." }`         | Only directories returned                      | P1       | mocked |
| 12  | Exclude pattern                 | `{ exclude: "node_modules", path: "." }`   | No node_modules entries                        | P1       | mocked |
| 13  | maxResults truncation           | `{ maxResults: 5, path: "." }`             | At most 5 files                                | P1       | mocked |
| 14  | absolutePath: true              | `{ absolutePath: true, path: "src/" }`     | All paths are absolute                         | P1       | mocked |
| 15  | size filter                     | `{ size: "+1m" }`                          | Only files larger than 1MB                     | P2       | mocked |
| 16  | changedWithin filter            | `{ changedWithin: "1d" }`                  | Only recently modified files                   | P2       | mocked |
| 17  | Schema validation               | all                                        | Zod parse against `FindResultSchema` succeeds  | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 8      |
| P1        | 5      |
| P2        | 2      |
| **Total** | **15** |

---

## search.jq

### Tool: `@paretools/search` -> `jq`

### Implementation: `packages/server-search/src/tools/jq.ts`

### Schema: `JqResultSchema`

### Input params

| Param           | Type                   | Required | Notes                       |
| --------------- | ---------------------- | -------- | --------------------------- |
| `expression`    | string                 | yes      | jq filter expression        |
| `file`          | string                 | no       | Path to JSON file           |
| `input`         | string                 | no       | Inline JSON string          |
| `rawOutput`     | boolean                | no       | Default: false, -r flag     |
| `sortKeys`      | boolean                | no       | Default: false, -S flag     |
| `nullInput`     | boolean                | no       | No input, generate JSON     |
| `slurp`         | boolean                | no       | Read entire input as array  |
| `compactOutput` | boolean                | no       | Compact output              |
| `rawInput`      | boolean                | no       | Read lines as strings       |
| `exitStatus`    | boolean                | no       | Boolean exit status         |
| `arg`           | Record<string, string> | no       | Named string variables      |
| `argjson`       | Record<string, string> | no       | Named JSON variables        |
| `indent`        | number                 | no       | Indentation spaces          |
| `joinOutput`    | boolean                | no       | No newlines between outputs |
| `compact`       | boolean                | no       | Default: true               |

### Scenarios

| #   | Scenario                     | Params                                                               | Expected Output                                                   | Priority | Status |
| --- | ---------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- | -------- | ------ |
| 1   | Simple key extraction        | `{ expression: ".name", input: '{"name":"test"}' }`                  | `{ output: '"test"', exitCode: 0 }`                               | P0       | mocked |
| 2   | Identity filter on file      | `{ expression: ".", file: "data.json" }`                             | `{ output: "<file contents>", exitCode: 0 }`                      | P0       | mocked |
| 3   | No input provided            | `{ expression: "." }`                                                | Error: "Either 'file', 'input', or 'nullInput' must be provided." | P0       | mocked |
| 4   | Invalid jq expression        | `{ expression: ".[invalid", input: "{}" }`                           | `{ exitCode: != 0 }` with error                                   | P0       | mocked |
| 5   | Invalid JSON input           | `{ expression: ".", input: "not json" }`                             | `{ exitCode: != 0 }`                                              | P0       | mocked |
| 6   | Flag injection on expression | `{ expression: "--exec=evil", input: "{}" }`                         | `assertNoFlagInjection` throws                                    | P0       | mocked |
| 7   | Flag injection on file       | `{ expression: ".", file: "--exec=evil" }`                           | `assertNoFlagInjection` throws                                    | P0       | mocked |
| 8   | nullInput with generation    | `{ expression: '{"key":"val"}', nullInput: true }`                   | `{ output: '{"key":"val"}', exitCode: 0 }`                        | P1       | mocked |
| 9   | rawOutput strips quotes      | `{ expression: ".name", input: '{"name":"test"}', rawOutput: true }` | `{ output: "test" }` (no quotes)                                  | P1       | mocked |
| 10  | slurp arrays                 | `{ expression: ".", input: '1\n2\n3', slurp: true }`                 | `{ output: "[1,2,3]" }`                                           | P1       | mocked |
| 11  | arg named variables          | `{ expression: '$name', input: '{}', arg: { name: "hello" } }`       | `{ output: '"hello"' }`                                           | P1       | mocked |
| 12  | argjson named variables      | `{ expression: '$val', input: '{}', argjson: { val: '42' } }`        | `{ output: '42' }`                                                | P1       | mocked |
| 13  | sortKeys: true               | `{ expression: ".", input: '{"b":1,"a":2}', sortKeys: true }`        | Keys sorted alphabetically                                        | P2       | mocked |
| 14  | compactOutput                | `{ expression: ".", input: '{"a":1}', compactOutput: true }`         | Single-line output                                                | P2       | mocked |
| 15  | Schema validation            | all                                                                  | Zod parse against `JqResultSchema` succeeds                       | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 7      |
| P1        | 5      |
| P2        | 2      |
| **Total** | **14** |

---

## http.request

### Tool: `@paretools/http` -> `request`

### Implementation: `packages/server-http/src/tools/request.ts`

### Schema: `HttpResponseSchema`

### Input params

| Param             | Type                                                | Required | Notes                          |
| ----------------- | --------------------------------------------------- | -------- | ------------------------------ |
| `url`             | string                                              | yes      | URL (http:// or https:// only) |
| `method`          | enum (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) | no       | Default: GET                   |
| `headers`         | Record<string, string>                              | no       | Request headers                |
| `body`            | string                                              | no       | Request body                   |
| `form`            | Record<string, string>                              | no       | Multipart form data            |
| `timeout`         | number                                              | no       | Default: 30 (1-300s)           |
| `connectTimeout`  | number                                              | no       | Connection phase timeout       |
| `followRedirects` | boolean                                             | no       | Default: true                  |
| `insecure`        | boolean                                             | no       | Allow self-signed certs        |
| `retry`           | number                                              | no       | Retries on failure (0-10)      |
| `compressed`      | boolean                                             | no       | Request compressed response    |
| `basicAuth`       | string                                              | no       | user:password                  |
| `proxy`           | string                                              | no       | Proxy URL                      |
| `httpVersion`     | enum (1.0, 1.1, 2)                                  | no       | HTTP version                   |
| `cookie`          | string                                              | no       | Cookie string or jar           |
| `resolve`         | string                                              | no       | Custom DNS resolution          |
| `compact`         | boolean                                             | no       | Default: true                  |
| `path`            | string                                              | no       | Working directory              |

### Scenarios

| #   | Scenario                            | Params                                                                           | Expected Output                                                                 | Priority | Status |
| --- | ----------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------- | ------ |
| 1   | Simple GET request                  | `{ url: "https://httpbin.org/get" }`                                             | `{ status: 200, statusText: "OK", body: "...", timing: { total: N }, size: N }` | P0       | mocked |
| 2   | POST with JSON body                 | `{ url: "https://httpbin.org/post", method: "POST", body: '{"key":"val"}' }`     | `{ status: 200, body: "..." }`                                                  | P0       | mocked |
| 3   | Non-existent host                   | `{ url: "https://nonexistent.invalid/" }`                                        | Error (connection failure)                                                      | P0       | mocked |
| 4   | Unsafe URL scheme (file://)         | `{ url: "file:///etc/passwd" }`                                                  | `assertSafeUrl` throws                                                          | P0       | mocked |
| 5   | Unsafe URL scheme (ftp://)          | `{ url: "ftp://evil.com/file" }`                                                 | `assertSafeUrl` throws                                                          | P0       | mocked |
| 6   | Empty URL                           | `{ url: "" }`                                                                    | `assertSafeUrl` throws                                                          | P0       | mocked |
| 7   | Flag injection on basicAuth         | `{ url: "https://example.com", basicAuth: "--exec=evil" }`                       | `assertNoFlagInjection` throws                                                  | P0       | mocked |
| 8   | Flag injection on proxy             | `{ url: "https://example.com", proxy: "--exec=evil" }`                           | `assertNoFlagInjection` throws                                                  | P0       | mocked |
| 9   | Flag injection on cookie            | `{ url: "https://example.com", cookie: "--exec=evil" }`                          | `assertNoFlagInjection` throws                                                  | P0       | mocked |
| 10  | Flag injection on resolve           | `{ url: "https://example.com", resolve: "--exec=evil" }`                         | `assertNoFlagInjection` throws                                                  | P0       | mocked |
| 11  | Flag injection on form values       | `{ url: "https://example.com", method: "POST", form: { key: "--exec=evil" } }`   | `assertNoFlagInjection` throws                                                  | P0       | mocked |
| 12  | Header injection (newline in value) | `{ url: "https://example.com", headers: { "X-Test": "val\r\nEvil: injected" } }` | `assertSafeHeader` throws                                                       | P0       | mocked |
| 13  | PUT method                          | `{ url: "https://httpbin.org/put", method: "PUT", body: '{"id":1}' }`            | `{ status: 200 }`                                                               | P1       | mocked |
| 14  | DELETE method                       | `{ url: "https://httpbin.org/delete", method: "DELETE" }`                        | `{ status: 200 }`                                                               | P1       | mocked |
| 15  | Follow redirects (default)          | `{ url: "https://httpbin.org/redirect/2" }`                                      | Final `status: 200`, `redirectChain` populated                                  | P1       | mocked |
| 16  | Disable redirect following          | `{ url: "https://httpbin.org/redirect/1", followRedirects: false }`              | `status: 302`                                                                   | P1       | mocked |
| 17  | Custom headers                      | `{ url: "https://httpbin.org/headers", headers: { "X-Custom": "test" } }`        | Request header reflected in response body                                       | P1       | mocked |
| 18  | Timeout handling                    | `{ url: "https://httpbin.org/delay/10", timeout: 2 }`                            | Error/timeout after ~2s                                                         | P1       | mocked |
| 19  | Multipart form data                 | `{ url: "https://httpbin.org/post", method: "POST", form: { field: "value" } }`  | Form data reflected in response                                                 | P1       | mocked |
| 20  | HTTP/2 version                      | `{ url: "https://example.com", httpVersion: "2" }`                               | `httpVersion: "2"` in response                                                  | P2       | mocked |
| 21  | Compressed response                 | `{ url: "https://example.com", compressed: true }`                               | Decompressed body returned                                                      | P2       | mocked |
| 22  | Schema validation                   | all                                                                              | Zod parse against `HttpResponseSchema` succeeds                                 | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 13     |
| P1        | 7      |
| P2        | 2      |
| **Total** | **22** |

---

## http.get

### Tool: `@paretools/http` -> `get`

### Implementation: `packages/server-http/src/tools/get.ts`

### Schema: `HttpResponseSchema`

### Input params

| Param             | Type                   | Required | Notes                           |
| ----------------- | ---------------------- | -------- | ------------------------------- |
| `url`             | string                 | yes      | URL (http:// or https:// only)  |
| `headers`         | Record<string, string> | no       | Request headers                 |
| `timeout`         | number                 | no       | Default: 30 (1-300s)            |
| `connectTimeout`  | number                 | no       | Connection timeout              |
| `followRedirects` | boolean                | no       | Default: true                   |
| `insecure`        | boolean                | no       | Allow self-signed certs         |
| `retry`           | number                 | no       | Retries (0-10)                  |
| `compressed`      | boolean                | no       | Request compression             |
| `basicAuth`       | string                 | no       | user:password                   |
| `proxy`           | string                 | no       | Proxy URL                       |
| `queryParams`     | Record<string, string> | no       | Query params (auto URL-encoded) |
| `httpVersion`     | enum (1.0, 1.1, 2)     | no       | HTTP version                    |
| `resolve`         | string                 | no       | Custom DNS resolution           |
| `compact`         | boolean                | no       | Default: true                   |
| `path`            | string                 | no       | Working directory               |

### Scenarios

| #   | Scenario                                | Params                                                                        | Expected Output                                 | Priority | Status |
| --- | --------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- | -------- | ------ |
| 1   | Simple GET                              | `{ url: "https://httpbin.org/get" }`                                          | `{ status: 200, body: "..." }`                  | P0       | mocked |
| 2   | Non-existent host                       | `{ url: "https://nonexistent.invalid/" }`                                     | Error (connection failure)                      | P0       | mocked |
| 3   | Unsafe URL scheme                       | `{ url: "file:///etc/passwd" }`                                               | `assertSafeUrl` throws                          | P0       | mocked |
| 4   | Flag injection on basicAuth             | `{ url: "https://example.com", basicAuth: "--exec=evil" }`                    | `assertNoFlagInjection` throws                  | P0       | mocked |
| 5   | Flag injection on proxy                 | `{ url: "https://example.com", proxy: "--exec=evil" }`                        | `assertNoFlagInjection` throws                  | P0       | mocked |
| 6   | Flag injection on resolve               | `{ url: "https://example.com", resolve: "--exec=evil" }`                      | `assertNoFlagInjection` throws                  | P0       | mocked |
| 7   | Query params appended to URL            | `{ url: "https://httpbin.org/get", queryParams: { foo: "bar", baz: "qux" } }` | Query params reflected in response args         | P1       | mocked |
| 8   | Query params with existing query string | `{ url: "https://httpbin.org/get?a=1", queryParams: { b: "2" } }`             | Both a=1 and b=2 in URL                         | P1       | mocked |
| 9   | Custom headers                          | `{ url: "https://httpbin.org/headers", headers: { "Accept": "text/plain" } }` | Header reflected in response                    | P1       | mocked |
| 10  | Retry on failure                        | `{ url: "https://example.com", retry: 3 }`                                    | Retries attempted on transient failure          | P2       | mocked |
| 11  | Schema validation                       | all                                                                           | Zod parse against `HttpResponseSchema` succeeds | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 3      |
| P2        | 1      |
| **Total** | **10** |

---

## http.post

### Tool: `@paretools/http` -> `post`

### Implementation: `packages/server-http/src/tools/post.ts`

### Schema: `HttpResponseSchema`

### Input params

| Param                      | Type                   | Required | Notes                                     |
| -------------------------- | ---------------------- | -------- | ----------------------------------------- |
| `url`                      | string                 | yes      | URL (http:// or https:// only)            |
| `body`                     | string                 | no       | Request body (ignored when form provided) |
| `headers`                  | Record<string, string> | no       | Request headers                           |
| `contentType`              | string                 | no       | Default: application/json                 |
| `timeout`                  | number                 | no       | Default: 30                               |
| `connectTimeout`           | number                 | no       | Connection timeout                        |
| `followRedirects`          | boolean                | no       | Default: true                             |
| `preserveMethodOnRedirect` | boolean                | no       | Keep POST on 301/302/303                  |
| `insecure`                 | boolean                | no       | Allow self-signed certs                   |
| `accept`                   | string                 | no       | Accept header                             |
| `compressed`               | boolean                | no       | Request compression                       |
| `basicAuth`                | string                 | no       | user:password                             |
| `proxy`                    | string                 | no       | Proxy URL                                 |
| `dataUrlencode`            | string[]               | no       | URL-encoded form items                    |
| `form`                     | Record<string, string> | no       | Multipart form data                       |
| `httpVersion`              | enum (1.0, 1.1, 2)     | no       | HTTP version                              |
| `compact`                  | boolean                | no       | Default: true                             |
| `path`                     | string                 | no       | Working directory                         |

### Scenarios

| #   | Scenario                            | Params                                                                                              | Expected Output                                 | Priority | Status |
| --- | ----------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------- | ------ |
| 1   | POST with JSON body                 | `{ url: "https://httpbin.org/post", body: '{"key":"val"}' }`                                        | `{ status: 200, body: "..." }` with JSON echoed | P0       | mocked |
| 2   | POST with no body                   | `{ url: "https://httpbin.org/post" }`                                                               | `{ status: 200 }`                               | P0       | mocked |
| 3   | Non-existent host                   | `{ url: "https://nonexistent.invalid/" }`                                                           | Error (connection failure)                      | P0       | mocked |
| 4   | Unsafe URL scheme                   | `{ url: "file:///etc/passwd" }`                                                                     | `assertSafeUrl` throws                          | P0       | mocked |
| 5   | Flag injection on basicAuth         | `{ url: "https://example.com", basicAuth: "--exec=evil" }`                                          | `assertNoFlagInjection` throws                  | P0       | mocked |
| 6   | Flag injection on proxy             | `{ url: "https://example.com", proxy: "--exec=evil" }`                                              | `assertNoFlagInjection` throws                  | P0       | mocked |
| 7   | Flag injection on accept            | `{ url: "https://example.com", accept: "--exec=evil" }`                                             | `assertNoFlagInjection` throws                  | P0       | mocked |
| 8   | Flag injection on dataUrlencode     | `{ url: "https://example.com", dataUrlencode: ["--exec=evil"] }`                                    | `assertNoFlagInjection` throws                  | P0       | mocked |
| 9   | Flag injection on form values       | `{ url: "https://example.com", form: { key: "--exec=evil" } }`                                      | `assertNoFlagInjection` throws                  | P0       | mocked |
| 10  | Custom contentType                  | `{ url: "https://httpbin.org/post", body: "<xml/>", contentType: "text/xml" }`                      | Content-Type header set to text/xml             | P1       | mocked |
| 11  | Multipart form data                 | `{ url: "https://httpbin.org/post", form: { field: "value" } }`                                     | Form data echoed in response                    | P1       | mocked |
| 12  | preserveMethodOnRedirect            | `{ url: "https://httpbin.org/redirect-to?url=/post", preserveMethodOnRedirect: true }`              | POST method preserved through redirect          | P1       | mocked |
| 13  | URL-encoded form data               | `{ url: "https://httpbin.org/post", dataUrlencode: ["key=value with spaces"] }`                     | URL-encoded data in request                     | P1       | mocked |
| 14  | Form overrides body and contentType | `{ url: "https://httpbin.org/post", body: "ignored", contentType: "text/plain", form: { a: "1" } }` | Form data sent, body and contentType ignored    | P2       | mocked |
| 15  | Schema validation                   | all                                                                                                 | Zod parse against `HttpResponseSchema` succeeds | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 10     |
| P1        | 4      |
| P2        | 1      |
| **Total** | **15** |

---

## http.head

### Tool: `@paretools/http` -> `head`

### Implementation: `packages/server-http/src/tools/head.ts`

### Schema: `HttpHeadResponseSchema`

### Input params

| Param             | Type                   | Required | Notes                          |
| ----------------- | ---------------------- | -------- | ------------------------------ |
| `url`             | string                 | yes      | URL (http:// or https:// only) |
| `headers`         | Record<string, string> | no       | Request headers                |
| `timeout`         | number                 | no       | Default: 30                    |
| `connectTimeout`  | number                 | no       | Connection timeout             |
| `followRedirects` | boolean                | no       | Default: true                  |
| `insecure`        | boolean                | no       | Allow self-signed certs        |
| `retry`           | number                 | no       | Retries (0-10)                 |
| `basicAuth`       | string                 | no       | user:password                  |
| `proxy`           | string                 | no       | Proxy URL                      |
| `httpVersion`     | enum (1.0, 1.1, 2)     | no       | HTTP version                   |
| `resolve`         | string                 | no       | Custom DNS resolution          |
| `compact`         | boolean                | no       | Default: true                  |
| `path`            | string                 | no       | Working directory              |

### Scenarios

| #   | Scenario                     | Params                                                     | Expected Output                                               | Priority | Status |
| --- | ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- | -------- | ------ |
| 1   | HEAD request returns headers | `{ url: "https://httpbin.org/get" }`                       | `{ status: 200, headers: {...}, contentType: "..." }` no body | P0       | mocked |
| 2   | Non-existent host            | `{ url: "https://nonexistent.invalid/" }`                  | Error (connection failure)                                    | P0       | mocked |
| 3   | Unsafe URL scheme            | `{ url: "file:///etc/passwd" }`                            | `assertSafeUrl` throws                                        | P0       | mocked |
| 4   | Flag injection on basicAuth  | `{ url: "https://example.com", basicAuth: "--exec=evil" }` | `assertNoFlagInjection` throws                                | P0       | mocked |
| 5   | Flag injection on proxy      | `{ url: "https://example.com", proxy: "--exec=evil" }`     | `assertNoFlagInjection` throws                                | P0       | mocked |
| 6   | Flag injection on resolve    | `{ url: "https://example.com", resolve: "--exec=evil" }`   | `assertNoFlagInjection` throws                                | P0       | mocked |
| 7   | Content-Length in response   | `{ url: "https://example.com" }`                           | `contentLength` populated                                     | P1       | mocked |
| 8   | Follow redirects             | `{ url: "https://httpbin.org/redirect/1" }`                | Final `status: 200`, redirectChain populated                  | P1       | mocked |
| 9   | No body in response          | `{ url: "https://example.com" }`                           | No `body` field in output (HEAD-specific schema)              | P1       | mocked |
| 10  | Schema validation            | all                                                        | Zod parse against `HttpHeadResponseSchema` succeeds           | P0       | mocked |

### Summary

| Priority  | Count |
| --------- | ----- |
| P0        | 6     |
| P1        | 3     |
| P2        | 0     |
| **Total** | **9** |

---

## security.trivy

### Tool: `@paretools/security` -> `trivy`

### Implementation: `packages/server-security/src/tools/trivy.ts`

### Schema: `TrivyScanResultSchema`

### Input params

| Param           | Type                     | Required | Notes                                              |
| --------------- | ------------------------ | -------- | -------------------------------------------------- |
| `target`        | string                   | yes      | Image name or filesystem path                      |
| `scanType`      | enum (image, fs, config) | no       | Default: image                                     |
| `severity`      | string \| string[]       | no       | Severity filter (UNKNOWN/LOW/MEDIUM/HIGH/CRITICAL) |
| `scanners`      | string[]                 | no       | Scanner types (vuln, misconfig, secret, license)   |
| `vulnType`      | string[]                 | no       | Vulnerability types (os, library)                  |
| `skipDirs`      | string[]                 | no       | Directories to skip                                |
| `skipFiles`     | string[]                 | no       | Files to skip                                      |
| `platform`      | string                   | no       | Multi-arch platform                                |
| `ignorefile`    | string                   | no       | Custom .trivyignore path                           |
| `ignoreUnfixed` | boolean                  | no       | Default: false                                     |
| `exitCode`      | number                   | no       | Exit code on findings                              |
| `skipDbUpdate`  | boolean                  | no       | Skip DB update                                     |
| `path`          | string                   | no       | Working directory                                  |
| `compact`       | boolean                  | no       | Default: true                                      |

### Scenarios

| #   | Scenario                          | Params                                                         | Expected Output                                                                         | Priority | Status |
| --- | --------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | Scan an image                     | `{ target: "alpine:3.18" }`                                    | `{ target: "alpine:3.18", scanType: "image", summary: {...}, totalVulnerabilities: N }` | P0       | mocked |
| 2   | Scan filesystem                   | `{ target: ".", scanType: "fs" }`                              | `{ scanType: "fs", summary: {...} }`                                                    | P0       | mocked |
| 3   | Clean target (no vulns)           | `{ target: "scratch" }`                                        | `{ totalVulnerabilities: 0, summary: { critical: 0, ... } }`                            | P0       | mocked |
| 4   | Flag injection on target          | `{ target: "--exec=evil" }`                                    | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 5   | Flag injection on platform        | `{ target: "alpine", platform: "--exec=evil" }`                | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 6   | Flag injection on ignorefile      | `{ target: "alpine", ignorefile: "--exec=evil" }`              | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 7   | Flag injection on skipDirs        | `{ target: "alpine", skipDirs: ["--exec=evil"] }`              | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 8   | Flag injection on skipFiles       | `{ target: "alpine", skipFiles: ["--exec=evil"] }`             | `assertNoFlagInjection` throws                                                          | P0       | mocked |
| 9   | Severity filter                   | `{ target: "alpine:3.18", severity: "CRITICAL" }`              | Only CRITICAL vulns in results                                                          | P1       | mocked |
| 10  | Multiple severity filter          | `{ target: "alpine:3.18", severity: ["HIGH", "CRITICAL"] }`    | Only HIGH and CRITICAL vulns                                                            | P1       | mocked |
| 11  | ignoreUnfixed hides unfixed vulns | `{ target: "alpine:3.18", ignoreUnfixed: true }`               | Only vulns with fixedVersion populated                                                  | P1       | mocked |
| 12  | Scanner type selection            | `{ target: ".", scanType: "config", scanners: ["misconfig"] }` | Only misconfiguration findings                                                          | P1       | mocked |
| 13  | Config scan                       | `{ target: ".", scanType: "config" }`                          | IaC misconfig results                                                                   | P2       | mocked |
| 14  | Schema validation                 | all                                                            | Zod parse against `TrivyScanResultSchema` succeeds                                      | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 9      |
| P1        | 4      |
| P2        | 1      |
| **Total** | **14** |

---

## security.semgrep

### Tool: `@paretools/security` -> `semgrep`

### Implementation: `packages/server-security/src/tools/semgrep.ts`

### Schema: `SemgrepScanResultSchema`

### Input params

| Param            | Type                        | Required | Notes                          |
| ---------------- | --------------------------- | -------- | ------------------------------ |
| `patterns`       | string[]                    | no       | Default: ["."]                 |
| `config`         | string \| string[]          | no       | Default: "auto"                |
| `severity`       | enum (INFO, WARNING, ERROR) | no       | Severity filter                |
| `exclude`        | string[]                    | no       | Exclude globs                  |
| `include`        | string[]                    | no       | Include globs                  |
| `excludeRule`    | string[]                    | no       | Rule IDs to suppress           |
| `baselineCommit` | string                      | no       | Baseline for differential scan |
| `dataflowTraces` | boolean                     | no       | Include dataflow traces        |
| `autofix`        | boolean                     | no       | Apply fixes                    |
| `dryrun`         | boolean                     | no       | Preview autofix                |
| `maxTargetBytes` | number                      | no       | Max file size                  |
| `jobs`           | number                      | no       | Parallel jobs                  |
| `path`           | string                      | no       | Working directory              |
| `compact`        | boolean                     | no       | Default: true                  |

### Scenarios

| #   | Scenario                         | Params                                                     | Expected Output                                                                                     | Priority | Status |
| --- | -------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | Scan with auto config            | `{ patterns: ["."], config: "auto" }`                      | `{ totalFindings: N, findings: [...], summary: { error: N, warning: N, info: N }, config: "auto" }` | P0       | mocked |
| 2   | No findings (clean code)         | `{ patterns: ["."], config: "auto" }`                      | `{ totalFindings: 0, findings: [] }`                                                                | P0       | mocked |
| 3   | Flag injection on config         | `{ config: "--exec=evil" }`                                | `assertNoFlagInjection` throws                                                                      | P0       | mocked |
| 4   | Flag injection on patterns       | `{ patterns: ["--exec=evil"] }`                            | `assertNoFlagInjection` throws                                                                      | P0       | mocked |
| 5   | Flag injection on exclude        | `{ exclude: ["--exec=evil"] }`                             | `assertNoFlagInjection` throws                                                                      | P0       | mocked |
| 6   | Flag injection on include        | `{ include: ["--exec=evil"] }`                             | `assertNoFlagInjection` throws                                                                      | P0       | mocked |
| 7   | Flag injection on excludeRule    | `{ excludeRule: ["--exec=evil"] }`                         | `assertNoFlagInjection` throws                                                                      | P0       | mocked |
| 8   | Flag injection on baselineCommit | `{ baselineCommit: "--exec=evil" }`                        | `assertNoFlagInjection` throws                                                                      | P0       | mocked |
| 9   | Specific config ruleset          | `{ config: "p/security-audit" }`                           | Security-focused findings                                                                           | P1       | mocked |
| 10  | Multiple configs                 | `{ config: ["p/owasp-top-ten", "p/cwe-top-25"] }`          | Combined findings from both rulesets                                                                | P1       | mocked |
| 11  | Severity filter                  | `{ config: "auto", severity: "ERROR" }`                    | Only ERROR-level findings                                                                           | P1       | mocked |
| 12  | Exclude paths                    | `{ config: "auto", exclude: ["tests/", "node_modules/"] }` | No findings from excluded paths                                                                     | P1       | mocked |
| 13  | Schema validation                | all                                                        | Zod parse against `SemgrepScanResultSchema` succeeds                                                | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 9      |
| P1        | 4      |
| P2        | 0      |
| **Total** | **13** |

---

## security.gitleaks

### Tool: `@paretools/security` -> `gitleaks`

### Implementation: `packages/server-security/src/tools/gitleaks.ts`

### Schema: `GitleaksScanResultSchema`

### Input params

| Param                | Type     | Required | Notes                                    |
| -------------------- | -------- | -------- | ---------------------------------------- |
| `path`               | string   | no       | Repository path                          |
| `redact`             | boolean  | no       | Default: true                            |
| `config`             | string   | no       | Custom rule file                         |
| `baselinePath`       | string   | no       | Baseline report for diff scanning        |
| `logOpts`            | string   | no       | Git log options                          |
| `enableRule`         | string[] | no       | Enable specific rules                    |
| `noGit`              | boolean  | no       | Default: false, scan without git history |
| `verbose`            | boolean  | no       | Default: false                           |
| `followSymlinks`     | boolean  | no       | Follow symlinks                          |
| `maxTargetMegabytes` | number   | no       | Skip large files                         |
| `logLevel`           | string   | no       | Log level                                |
| `exitCode`           | number   | no       | Exit code on findings                    |
| `compact`            | boolean  | no       | Default: true                            |

### Scenarios

| #   | Scenario                       | Params                                         | Expected Output                                           | Priority | Status |
| --- | ------------------------------ | ---------------------------------------------- | --------------------------------------------------------- | -------- | ------ |
| 1   | Scan a clean repo (no secrets) | `{ path: "." }`                                | `{ totalFindings: 0, findings: [] }`                      | P0       | mocked |
| 2   | Scan repo with secrets         | `{ path: "." }` (repo with known secrets)      | `{ totalFindings: N, findings: [{ ruleID, file, ... }] }` | P0       | mocked |
| 3   | Redact enabled (default)       | `{ path: "." }`                                | `findings[*].secret` contains redacted values             | P0       | mocked |
| 4   | Flag injection on config       | `{ config: "--exec=evil" }`                    | `assertNoFlagInjection` throws                            | P0       | mocked |
| 5   | Flag injection on baselinePath | `{ baselinePath: "--exec=evil" }`              | `assertNoFlagInjection` throws                            | P0       | mocked |
| 6   | Flag injection on logOpts      | `{ logOpts: "--exec=evil" }`                   | `assertNoFlagInjection` throws                            | P0       | mocked |
| 7   | Flag injection on logLevel     | `{ logLevel: "--exec=evil" }`                  | `assertNoFlagInjection` throws                            | P0       | mocked |
| 8   | Flag injection on enableRule   | `{ enableRule: ["--exec=evil"] }`              | `assertNoFlagInjection` throws                            | P0       | mocked |
| 9   | redact: false exposes secrets  | `{ path: ".", redact: false }`                 | `findings[*].secret` contains raw secrets                 | P1       | mocked |
| 10  | noGit scans without history    | `{ path: ".", noGit: true }`                   | Scans files only (no commit history)                      | P1       | mocked |
| 11  | Baseline differential scanning | `{ path: ".", baselinePath: "baseline.json" }` | Only new findings reported                                | P1       | mocked |
| 12  | logOpts for commit range       | `{ path: ".", logOpts: "--since=2024-01-01" }` | Only recent commit secrets                                | P2       | mocked |
| 13  | Schema validation              | all                                            | Zod parse against `GitleaksScanResultSchema` succeeds     | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 9      |
| P1        | 3      |
| P2        | 1      |
| **Total** | **13** |

---

## make.list

### Tool: `@paretools/make` -> `list`

### Implementation: `packages/server-make/src/tools/list.ts`

### Schema: `MakeListResultSchema`

### Input params

| Param               | Type                    | Required | Notes                         |
| ------------------- | ----------------------- | -------- | ----------------------------- |
| `path`              | string                  | no       | Project root path             |
| `tool`              | enum (auto, make, just) | no       | Default: auto                 |
| `file`              | string                  | no       | Custom makefile/justfile path |
| `filter`            | string                  | no       | Regex filter on target names  |
| `includeSubmodules` | boolean                 | no       | Just submodule recipes        |
| `unsorted`          | boolean                 | no       | Definition order (just only)  |
| `showRecipe`        | boolean                 | no       | Include recipe bodies         |
| `compact`           | boolean                 | no       | Default: true                 |

### Scenarios

| #   | Scenario                          | Params                                      | Expected Output                                        | Priority | Status |
| --- | --------------------------------- | ------------------------------------------- | ------------------------------------------------------ | -------- | ------ |
| 1   | List targets from Makefile        | `{ path: "." }`                             | `{ targets: [{ name, ... }], total: N, tool: "make" }` | P0       | mocked |
| 2   | No targets found                  | `{ path: "/empty-project" }`                | `{ targets: [], total: 0 }` or error                   | P0       | mocked |
| 3   | Flag injection on file            | `{ file: "--exec=evil" }`                   | `assertNoFlagInjection` throws                         | P0       | mocked |
| 4   | Flag injection on filter          | `{ filter: "--exec=evil" }`                 | `assertNoFlagInjection` throws                         | P0       | mocked |
| 5   | Auto-detect just vs make          | `{ path: "." }` (justfile present)          | `{ tool: "just", targets: [...] }`                     | P1       | mocked |
| 6   | Filter targets by regex           | `{ path: ".", filter: "^test" }`            | Only targets starting with "test"                      | P1       | mocked |
| 7   | Targets include descriptions      | `{ path: "." }` (Makefile with ## comments) | `targets[*].description` populated                     | P1       | mocked |
| 8   | showRecipe includes recipe bodies | `{ path: ".", showRecipe: true }`           | `targets[*].recipe` populated with commands            | P1       | mocked |
| 9   | PHONY targets flagged             | `{ path: "." }` (Makefile with .PHONY)      | `targets[*].isPhony` is true for phony targets         | P1       | mocked |
| 10  | Pattern rules extracted           | `{ path: "." }` (Makefile with %.o: %.c)    | `patternRules` populated                               | P2       | mocked |
| 11  | Custom file path                  | `{ file: "Makefile.custom" }`               | Targets from specified file                            | P2       | mocked |
| 12  | Schema validation                 | all                                         | Zod parse against `MakeListResultSchema` succeeds      | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 4      |
| P1        | 5      |
| P2        | 2      |
| **Total** | **11** |

---

## make.run

### Tool: `@paretools/make` -> `run`

### Implementation: `packages/server-make/src/tools/run.ts`

### Schema: `MakeRunResultSchema`

### Input params

| Param        | Type                    | Required | Notes                          |
| ------------ | ----------------------- | -------- | ------------------------------ |
| `target`     | string                  | yes      | Target to run                  |
| `args`       | string[]                | no       | Additional arguments           |
| `path`       | string                  | no       | Project root path              |
| `tool`       | enum (auto, make, just) | no       | Default: auto                  |
| `file`       | string                  | no       | Custom makefile/justfile path  |
| `env`        | Record<string, string>  | no       | Environment variables          |
| `dryRun`     | boolean                 | no       | Preview without executing      |
| `jobs`       | number                  | no       | Parallel jobs (make only)      |
| `silent`     | boolean                 | no       | Suppress echoing               |
| `keepGoing`  | boolean                 | no       | Continue on errors (make only) |
| `alwaysMake` | boolean                 | no       | Force rebuild (make only)      |
| `verbose`    | boolean                 | no       | Verbose output (just only)     |
| `trace`      | boolean                 | no       | Trace execution (make only)    |
| `question`   | boolean                 | no       | Check up-to-date (make only)   |
| `compact`    | boolean                 | no       | Default: true                  |

### Scenarios

| #   | Scenario                 | Params                                              | Expected Output                                                                                              | Priority | Status |
| --- | ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------ |
| 1   | Run a successful target  | `{ target: "build" }`                               | `{ target: "build", success: true, exitCode: 0, stdout: "...", duration: N, tool: "make", timedOut: false }` | P0       | mocked |
| 2   | Run a failing target     | `{ target: "fail-target" }`                         | `{ success: false, exitCode: != 0, stderr: "..." }`                                                          | P0       | mocked |
| 3   | Missing target           | `{ target: "nonexistent" }`                         | `{ success: false, errorType: "missing-target" }`                                                            | P0       | mocked |
| 4   | Flag injection on target | `{ target: "--exec=evil" }`                         | `assertNoFlagInjection` throws                                                                               | P0       | mocked |
| 5   | Flag injection on file   | `{ target: "build", file: "--exec=evil" }`          | `assertNoFlagInjection` throws                                                                               | P0       | mocked |
| 6   | Flag injection on args   | `{ target: "build", args: ["--exec=evil"] }`        | `assertNoFlagInjection` throws                                                                               | P0       | mocked |
| 7   | Timeout detection        | `{ target: "hang-forever" }` (tool times out)       | `{ timedOut: true, exitCode: 124 }`                                                                          | P0       | mocked |
| 8   | dryRun preview           | `{ target: "build", dryRun: true }`                 | Commands displayed but not executed                                                                          | P1       | mocked |
| 9   | Environment variables    | `{ target: "build", env: { DEBUG: "true" } }`       | Env var passed to target execution                                                                           | P1       | mocked |
| 10  | Parallel jobs (make)     | `{ target: "all", jobs: 4, tool: "make" }`          | Parallel execution attempted                                                                                 | P1       | mocked |
| 11  | Silent mode              | `{ target: "build", silent: true }`                 | Command echoing suppressed                                                                                   | P2       | mocked |
| 12  | question mode (make)     | `{ target: "build", question: true, tool: "make" }` | Exit code 0 if up-to-date, 1 otherwise                                                                       | P2       | mocked |
| 13  | Schema validation        | all                                                 | Zod parse against `MakeRunResultSchema` succeeds                                                             | P0       | mocked |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 7      |
| P1        | 3      |
| P2        | 2      |
| **Total** | **12** |

---

## process.run

### Tool: `@paretools/process` -> `run`

### Implementation: `packages/server-process/src/tools/run.ts`

### Schema: `ProcessRunResultSchema`

### Input params

| Param            | Type                                 | Required | Notes                           |
| ---------------- | ------------------------------------ | -------- | ------------------------------- |
| `command`        | string                               | yes      | Command to run                  |
| `args`           | string[]                             | no       | Command arguments               |
| `cwd`            | string                               | no       | Working directory               |
| `timeout`        | number                               | no       | Default: 60000ms (max 600000ms) |
| `env`            | Record<string, string>               | no       | Environment variables           |
| `stdin`          | string                               | no       | Stdin input data                |
| `maxBuffer`      | number                               | no       | Max buffer size (1KB-100MB)     |
| `killSignal`     | enum (SIGTERM, SIGKILL, SIGINT, ...) | no       | Signal on timeout               |
| `maxOutputLines` | number                               | no       | Truncate output lines           |
| `encoding`       | enum (utf-8, ascii, latin1, ...)     | no       | Output encoding                 |
| `compact`        | boolean                              | no       | Default: true                   |
| `shell`          | boolean                              | no       | Default: false, shell mode      |
| `stripEnv`       | boolean                              | no       | Default: false, minimal env     |

### Scenarios

| #   | Scenario                             | Params                                                                                                  | Expected Output                                                                                    | Priority                | Status                   |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------ | ------ | ------ |
| 1   | Run a simple command                 | `{ command: "echo", args: ["hello"] }`                                                                  | `{ command: "echo", exitCode: 0, success: true, stdout: "hello\n", duration: N, timedOut: false }` | P0                      | pending                  |
| 2   | Command not found                    | `{ command: "nonexistent_command_xyz" }`                                                                | Error thrown (command not found)                                                                   | P0                      | pending                  |
| 3   | Command exits with error             | `{ command: "node", args: ["-e", "process.exit(42)"] }`                                                 | `{ exitCode: 42, success: false }`                                                                 | P0                      | pending                  |
| 4   | Empty stdout and stderr              | `{ command: "true" }`                                                                                   | `{ exitCode: 0, stdout: "", stderr: "" }`                                                          | P0                      | pending                  |
| 5   | Policy-blocked command               | `{ command: "rm" }` (if PARE_ALLOWED_COMMANDS set)                                                      | `assertAllowedByPolicy` throws                                                                     | P0                      | pending                  |
| 6   | Timeout handling                     | `{ command: "sleep", args: ["999"], timeout: 1000 }`                                                    | `{ timedOut: true, exitCode: 124, signal: "SIGTERM" }`                                             | P0                      | pending                  |
| 7   | Stdin input                          | `{ command: "cat", stdin: "hello world" }`                                                              | `{ stdout: "hello world" }`                                                                        | P1                      | pending                  |
| 8   | Custom environment variables         | `{ command: "node", args: ["-e", "console.log(process.env.MY_VAR)"], env: { MY_VAR: "test" } }`         | `{ stdout: "test\n" }`                                                                             | P1                      | pending                  |
| 9   | stripEnv isolates environment        | `{ command: "env", stripEnv: true }`                                                                    | Minimal env (only PATH + explicit vars)                                                            | P1                      | pending                  |
| 10  | Custom working directory             | `{ command: "pwd", cwd: "/tmp" }`                                                                       | `{ stdout: "/tmp\n" }`                                                                             | P1                      | pending                  |
| 11  | maxOutputLines truncation            | `{ command: "node", args: ["-e", "for(let i=0;i<100;i++) console.log(i)"], maxOutputLines: 5 }`         | `stdout` truncated to 5 lines, `truncated: true`                                                   | P1                      | pending                  |
| 12  | shell: true enables piping           | `{ command: "echo hello                                                                                 | cat", shell: true }`                                                                               | `{ stdout: "hello\n" }` | P1                       | mocked |
| 13  | shell: false prevents shell features | `{ command: "echo", args: ["hello                                                                       | cat"] }`                                                                                           | `{ stdout: "hello       | cat\n" }` (literal pipe) | P1     | mocked |
| 14  | maxBuffer exceeded                   | `{ command: "node", args: ["-e", "process.stdout.write('x'.repeat(200*1024*1024))"], maxBuffer: 1024 }` | `{ truncated: true }` or buffer error                                                              | P2                      | pending                  |
| 15  | Custom killSignal                    | `{ command: "sleep", args: ["999"], timeout: 1000, killSignal: "SIGKILL" }`                             | `{ signal: "SIGKILL" }`                                                                            | P2                      | pending                  |
| 16  | Schema validation                    | all                                                                                                     | Zod parse against `ProcessRunResultSchema` succeeds                                                | P0                      | pending                  |

### Summary

| Priority  | Count  |
| --------- | ------ |
| P0        | 6      |
| P1        | 7      |
| P2        | 2      |
| **Total** | **15** |

---

## Grand Summary

| Server     | Tool         | P0      | P1     | P2     | Total   |
| ---------- | ------------ | ------- | ------ | ------ | ------- |
| k8s        | get          | 13      | 4      | 2      | 19      |
| k8s        | describe     | 8       | 4      | 1      | 13      |
| k8s        | logs         | 10      | 5      | 2      | 17      |
| k8s        | apply        | 9       | 5      | 1      | 15      |
| k8s        | helm         | 18      | 6      | 2      | 26      |
| search     | search       | 6       | 6      | 2      | 14      |
| search     | count        | 6       | 4      | 1      | 11      |
| search     | find         | 8       | 5      | 2      | 15      |
| search     | jq           | 7       | 5      | 2      | 14      |
| http       | request      | 13      | 7      | 2      | 22      |
| http       | get          | 6       | 3      | 1      | 10      |
| http       | post         | 10      | 4      | 1      | 15      |
| http       | head         | 6       | 3      | 0      | 9       |
| security   | trivy        | 9       | 4      | 1      | 14      |
| security   | semgrep      | 9       | 4      | 0      | 13      |
| security   | gitleaks     | 9       | 3      | 1      | 13      |
| make       | list         | 4       | 5      | 2      | 11      |
| make       | run          | 7       | 3      | 2      | 12      |
| process    | run          | 6       | 7      | 2      | 15      |
| **Totals** | **19 tools** | **164** | **91** | **27** | **282** |
