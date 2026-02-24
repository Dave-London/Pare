# cmake > cmake

CMake build system operations: configure, build, test, list-presets, install, clean.

**Command**: `cmake <flags>` / `ctest <flags>`

## Input Parameters

| Parameter             | Type                                                                                   | Default   | Description                                                |
| --------------------- | -------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| `action`              | `"configure"` \| `"build"` \| `"test"` \| `"list-presets"` \| `"install"` \| `"clean"` | —         | CMake action (required)                                    |
| `sourceDir`           | string                                                                                 | cwd       | Source directory containing CMakeLists.txt                 |
| `buildDir`            | string                                                                                 | `"build"` | Build directory                                            |
| `cacheVars`           | Record\<string, string\>                                                               | —         | CMake cache variables (`-D KEY=VALUE`)                     |
| `target`              | string[]                                                                               | —         | Build targets                                              |
| `config`              | `"Debug"` \| `"Release"` \| `"RelWithDebInfo"` \| `"MinSizeRel"`                       | —         | Build configuration                                        |
| `testOutputOnFailure` | boolean                                                                                | `true`    | Show output for failed tests                               |
| `compact`             | boolean                                                                                | `true`    | Auto-compact when structured output exceeds raw CLI tokens |

## Success — Configure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~250 tokens

```
$ cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
-- The C compiler identification is GNU 13.2.0
-- The CXX compiler identification is GNU 13.2.0
-- Detecting C compiler ABI info
-- Detecting C compiler ABI info - done
-- Check for working C compiler: /usr/bin/cc - skipped
-- Detecting CXX compiler ABI info
-- Detecting CXX compiler ABI info - done
-- Check for working CXX compiler: /usr/bin/c++ - skipped
-- Detecting CXX compile features
-- Detecting CXX compile features - done
-- Configuring done (1.2s)
-- Generating done (0.1s)
-- Build files have been written to: /home/user/project/build
```

</td>
<td>

~50 tokens

```json
{
  "action": "configure",
  "success": true,
  "generator": "GNU 13.2.0",
  "buildDir": "build",
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "success": true,
  "buildDir": "build",
  "warningCount": 0,
  "errorCount": 0
}
```

</td>
</tr>
</table>

## Success — Build with Warnings

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~320 tokens

```
$ cmake --build build
[ 25%] Building CXX object CMakeFiles/app.dir/src/main.cpp.o
/home/user/project/src/main.cpp:12:7: warning: unused variable 'temp' [-Wunused-variable]
   12 |   int temp = 0;
      |       ^~~~
/home/user/project/src/main.cpp:28:15: warning: comparison of integer expressions of different signedness [-Wsign-compare]
   28 |   if (count < vec.size()) {
      |       ~~~~~~^~~~~~~~~~~~
[ 50%] Building CXX object CMakeFiles/app.dir/src/utils.cpp.o
[ 75%] Linking CXX executable app
[100%] Built target app
```

</td>
<td>

~100 tokens

```json
{
  "action": "build",
  "success": true,
  "warnings": [
    {
      "message": "unused variable 'temp' [-Wunused-variable]",
      "file": "/home/user/project/src/main.cpp",
      "line": 12,
      "column": 7
    },
    {
      "message": "comparison of integer expressions of different signedness [-Wsign-compare]",
      "file": "/home/user/project/src/main.cpp",
      "line": 28,
      "column": 15
    }
  ],
  "summary": {
    "warningCount": 2,
    "errorCount": 0
  },
  "exitCode": 0
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "success": true,
  "warningCount": 2,
  "errorCount": 0
}
```

</td>
</tr>
</table>

## Success — Test (ctest)

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~280 tokens

```
$ ctest --test-dir build --output-on-failure
Test project /home/user/project/build
    Start 1: test_basic
1/3 Test #1: test_basic ...................   Passed    0.01 sec
    Start 2: test_advanced
2/3 Test #2: test_advanced ................***Failed    0.05 sec
Output:
  FAILED: Expected 42 but got 41
  at test_advanced.cpp:18
    Start 3: test_integration
3/3 Test #3: test_integration .............   Passed    1.23 sec

67% tests passed, 1 tests failed out of 3

Total Test time (real) =   1.30 sec

The following tests FAILED:
          2 - test_advanced (Failed)
Errors while running CTest
```

</td>
<td>

~110 tokens

```json
{
  "action": "test",
  "success": false,
  "tests": [
    { "name": "test_basic", "number": 1, "status": "passed", "durationSec": 0.01 },
    { "name": "test_advanced", "number": 2, "status": "failed", "durationSec": 0.05 },
    { "name": "test_integration", "number": 3, "status": "passed", "durationSec": 1.23 }
  ],
  "summary": {
    "totalTests": 3,
    "passed": 2,
    "failed": 1,
    "skipped": 0,
    "timeout": 0,
    "totalDurationSec": 1.3
  },
  "exitCode": 8
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~25 tokens

```json
{
  "success": false,
  "totalTests": 3,
  "passed": 2,
  "failed": 1
}
```

</td>
</tr>
</table>

## Error — Configure Failure

<table>
<tr><th></th><th>Standard CLI Output</th><th>Pare Response</th></tr>
<tr>
<td><strong>Full</strong></td>
<td>

~200 tokens

```
$ cmake -S . -B build
-- The C compiler identification is GNU 13.2.0
-- The CXX compiler identification is GNU 13.2.0
CMake Error at CMakeLists.txt:15 (find_package):
  By not providing "FindBoost.cmake" in CMAKE_MODULE_PATH this project has
  asked CMake to find a package configuration file provided by "Boost", but
  CMake did not find one.

-- Configuring incomplete, errors occurred!
```

</td>
<td>

~75 tokens

```json
{
  "action": "configure",
  "success": false,
  "generator": "GNU 13.2.0",
  "buildDir": "build",
  "errors": [
    {
      "message": "By not providing \"FindBoost.cmake\" in CMAKE_MODULE_PATH this project has asked CMake to find a package configuration file provided by \"Boost\", but CMake did not find one.",
      "file": "CMakeLists.txt",
      "line": 15
    }
  ],
  "exitCode": 1
}
```

</td>
</tr>
<tr>
<td><strong>Compact</strong></td>
<td><em>n/a</em></td>
<td>

~20 tokens

```json
{
  "success": false,
  "buildDir": "build",
  "warningCount": 0,
  "errorCount": 1
}
```

</td>
</tr>
</table>

## Token Savings

| Scenario              | CLI Tokens | Pare Full | Pare Compact | Savings |
| --------------------- | ---------- | --------- | ------------ | ------- |
| Configure             | ~250       | ~50       | ~25          | 80-90%  |
| Build with warnings   | ~320       | ~100      | ~20          | 69-94%  |
| Test (ctest) failures | ~280       | ~110      | ~25          | 61-91%  |
| Configure failure     | ~200       | ~75       | ~20          | 63-90%  |

## Notes

- The `configure` action runs `cmake -S <sourceDir> -B <buildDir>` with optional `-D` cache variables
- The `build` action runs `cmake --build <buildDir>` and parses GCC/Clang/MSVC diagnostics from compiler output
- The `test` action delegates to `ctest` (not `cmake`) with `--output-on-failure` enabled by default
- The `list-presets` action returns grouped preset names (configure, build, test) parsed from `cmake --list-presets=all`
- The `install` action is gated by policy since it modifies the filesystem outside the build directory
- The `clean` action runs `cmake --build <buildDir> --target clean`
- Cache variable keys are validated against a strict `[A-Za-z_][A-Za-z0-9_]*` pattern to prevent injection
- Compact mode for build/configure flattens to just counts; for test, drops per-test details and keeps summary totals
