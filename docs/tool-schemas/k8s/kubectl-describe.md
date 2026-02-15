# k8s > kubectl-describe

Describes a Kubernetes resource with detailed information. Use instead of running `kubectl describe` in the terminal.

**Command**: `kubectl describe <resource> <name> [-n namespace]`

## Input Parameters

| Parameter   | Type    | Default | Description                                                |
| ----------- | ------- | ------- | ---------------------------------------------------------- |
| `resource`  | string  | —       | Resource type (e.g., pod, service, deployment)             |
| `name`      | string  | —       | Resource name                                              |
| `namespace` | string  | —       | Kubernetes namespace (omit for default)                    |
| `compact`   | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Describe Pod

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~600 tokens

```
Name:             nginx-7c5b8d6f9-x2k4m
Namespace:        default
Priority:         0
Service Account:  default
Node:             worker-1/10.0.1.5
Labels:           app=nginx
                  pod-template-hash=7c5b8d6f9
Annotations:      <none>
Status:           Running
IP:               172.17.0.4
Containers:
  nginx:
    Image:          nginx:1.25
    Port:           80/TCP
    State:          Running
      Started:      Fri, 14 Feb 2026 09:00:00 +0000
    Ready:          True
    Restart Count:  0
Conditions:
  Type              Status
  Initialized       True
  Ready             True
  ContainersReady   True
  PodScheduled      True
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  3h    default-scheduler  Successfully assigned default/nginx-7c5b8d6f9-x2k4m to worker-1
  Normal  Pulled     3h    kubelet            Container image "nginx:1.25" already present on machine
  Normal  Created    3h    kubelet            Created container nginx
  Normal  Started    3h    kubelet            Started container nginx
```

</td>
<td>

~180 tokens

```json
{
  "action": "describe",
  "success": true,
  "resource": "pod",
  "name": "nginx-7c5b8d6f9-x2k4m",
  "namespace": "default",
  "output": "Name:             nginx-7c5b8d6f9-x2k4m\nNamespace:        default\nPriority:         0\nService Account:  default\nNode:             worker-1/10.0.1.5\nLabels:           app=nginx\n                  pod-template-hash=7c5b8d6f9\nStatus:           Running\nIP:               172.17.0.4\nContainers:\n  nginx:\n    Image:          nginx:1.25\n    Port:           80/TCP\n    State:          Running\n    Ready:          True\n    Restart Count:  0\nEvents:\n  Normal  Scheduled  3h  default-scheduler  Successfully assigned...\n  Normal  Started    3h  kubelet            Started container nginx",
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~120 tokens

```json
{
  "action": "describe",
  "success": true,
  "resource": "pod",
  "name": "nginx-7c5b8d6f9-x2k4m",
  "output": "Name: nginx-7c5b8d6f9-x2k4m\nStatus: Running\nNode: worker-1\nContainers: nginx (nginx:1.25) Running\nEvents: 4 events, last: Started container nginx",
  "exitCode": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario             | CLI Tokens | Pare Full | Pare Compact | Savings |
| -------------------- | ---------- | --------- | ------------ | ------- |
| Pod with 4 events    | ~600       | ~180      | ~120         | 70-80%  |
| Deployment (complex) | ~900       | ~300      | ~180         | 67-80%  |
| Resource not found   | ~25        | ~30       | ~30          | 0%      |

## Notes

- Unlike `kubectl-get`, this tool does not use `-o json`; it captures the human-readable describe output and returns it in the `output` field as a string
- The `resource` and `name` parameters are both required -- you must specify exactly which resource to describe
- Resource type, name, and namespace are validated against flag injection
- Compact mode truncates the `output` field to a condensed summary, dropping verbose event history and condition details, and omitting the `namespace` field
