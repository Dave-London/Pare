# jvm > gradle-dependencies

Shows the Gradle dependency tree with structured output per configuration.

**Command**: `gradle dependencies`

## Input Parameters

| Parameter       | Type    | Default | Description                                                      |
| --------------- | ------- | ------- | ---------------------------------------------------------------- |
| `path`          | string  | cwd     | Project root path                                                |
| `configuration` | string  | --      | Filter to a specific configuration (e.g. compileClasspath)       |
| `compact`       | boolean | `true`  | Auto-compact when structured output exceeds raw CLI tokens       |

## Success — Dependencies by Configuration

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~400 tokens

```
> Task :dependencies

------------------------------------------------------------
Root project 'myapp'
------------------------------------------------------------

compileClasspath - Compile classpath for source set 'main'.
+--- org.springframework.boot:spring-boot-starter-web:3.2.1
|    +--- org.springframework.boot:spring-boot-starter:3.2.1
|    +--- org.springframework.boot:spring-boot-starter-json:3.2.1
|    \--- org.springframework:spring-web:6.1.2
+--- com.google.guava:guava:32.1.3-jre

testCompileClasspath - Compile classpath for source set 'test'.
+--- org.junit.jupiter:junit-jupiter-api:5.10.1
\--- org.mockito:mockito-core:5.8.0

BUILD SUCCESSFUL in 1s
1 actionable task: 1 executed
```

</td>
<td>

~100 tokens

```json
{
  "configurations": [
    {
      "configuration": "compileClasspath",
      "dependencies": [
        { "group": "org.springframework.boot", "artifact": "spring-boot-starter-web", "version": "3.2.1" },
        { "group": "com.google.guava", "artifact": "guava", "version": "32.1.3-jre" }
      ]
    },
    {
      "configuration": "testCompileClasspath",
      "dependencies": [
        { "group": "org.junit.jupiter", "artifact": "junit-jupiter-api", "version": "5.10.1" },
        { "group": "org.mockito", "artifact": "mockito-core", "version": "5.8.0" }
      ]
    }
  ],
  "totalDependencies": 4
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
  "totalDependencies": 4
}
```

</td>
</tr>
</table>

## Success — Single Configuration

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
> Task :dependencies

compileClasspath - Compile classpath for source set 'main'.
+--- org.springframework.boot:spring-boot-starter-web:3.2.1
\--- com.google.guava:guava:32.1.3-jre

BUILD SUCCESSFUL in 1s
```

</td>
<td>

~50 tokens

```json
{
  "configurations": [
    {
      "configuration": "compileClasspath",
      "dependencies": [
        { "group": "org.springframework.boot", "artifact": "spring-boot-starter-web", "version": "3.2.1" },
        { "group": "com.google.guava", "artifact": "guava", "version": "32.1.3-jre" }
      ]
    }
  ],
  "totalDependencies": 2
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario                 | CLI Tokens | Pare Full | Pare Compact | Savings |
| ------------------------ | ---------- | --------- | ------------ | ------- |
| 2 configs, 4 deps        | ~400       | ~100      | ~5           | 75-99%  |
| Single config, 2 deps    | ~200       | ~50       | ~5           | 75-98%  |

## Notes

- The `configuration` parameter uses `--configuration` to filter to a specific Gradle configuration
- Dependencies are structured with `group`, `artifact`, and optional `version`
- Only top-level (direct) dependencies are listed -- transitive dependencies are omitted from the structured output
- Configuration names are validated against flag injection
- Compact mode drops the `configurations` array, keeping only `totalDependencies`
