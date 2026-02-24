# jvm > maven-dependencies

Shows the Maven dependency tree with structured output per artifact.

**Command**: `mvn dependency:tree`

## Input Parameters

| Parameter | Type    | Default | Description                                                |
| --------- | ------- | ------- | ---------------------------------------------------------- |
| `path`    | string  | cwd     | Project root path                                          |
| `compact` | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Dependency Tree

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
[INFO] --- dependency:3.6.1:tree (default-cli) @ myapp ---
[INFO] com.example:myapp:jar:1.0-SNAPSHOT
[INFO] +- org.springframework.boot:spring-boot-starter-web:jar:3.2.1:compile
[INFO] |  +- org.springframework.boot:spring-boot-starter:jar:3.2.1:compile
[INFO] |  +- org.springframework.boot:spring-boot-starter-json:jar:3.2.1:compile
[INFO] |  \- org.springframework:spring-web:jar:6.1.2:compile
[INFO] +- com.google.guava:guava:jar:32.1.3-jre:compile
[INFO] +- org.junit.jupiter:junit-jupiter-api:jar:5.10.1:test
[INFO] \- org.mockito:mockito-core:jar:5.8.0:test
[INFO] BUILD SUCCESS
```

</td>
<td>

~100 tokens

```json
{
  "dependencies": [
    { "groupId": "org.springframework.boot", "artifactId": "spring-boot-starter-web", "version": "3.2.1", "scope": "compile" },
    { "groupId": "com.google.guava", "artifactId": "guava", "version": "32.1.3-jre", "scope": "compile" },
    { "groupId": "org.junit.jupiter", "artifactId": "junit-jupiter-api", "version": "5.10.1", "scope": "test" },
    { "groupId": "org.mockito", "artifactId": "mockito-core", "version": "5.8.0", "scope": "test" }
  ],
  "total": 4
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~5 tokens

```json
{
  "total": 4
}
```

</td>
</tr>
</table>

## Success — No Dependencies

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~100 tokens

```
[INFO] --- dependency:3.6.1:tree (default-cli) @ myapp ---
[INFO] com.example:myapp:jar:1.0-SNAPSHOT
[INFO] BUILD SUCCESS
```

</td>
<td>

~10 tokens

```json
{
  "dependencies": [],
  "total": 0
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario           | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------ | ---------- | --------- | ------------ | ------- |
| 4 dependencies     | ~400       | ~100      | ~5           | 75-99%  |
| No dependencies    | ~100       | ~10       | ~5           | 90-95%  |

## Notes

- Runs `mvn dependency:tree` to generate the dependency hierarchy
- Dependencies are structured with `groupId`, `artifactId`, optional `version`, and optional `scope`
- Only direct (top-level) dependencies are included -- transitive dependencies are omitted
- Scope values follow Maven conventions: `compile`, `test`, `runtime`, `provided`, `system`
- Compact mode drops the `dependencies` array, keeping only the `total` count
- No additional parameters needed -- the tool always scans the entire project
