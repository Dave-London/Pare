# Pare Benchmark Summary

**Date**: 2026-02-13
**Platform**: win32 (x64)
**Node**: v22.19.0
**Runs per scenario**: 1

## Overall

| Metric                |   Value |
| --------------------- | ------: |
| Total scenarios       |     141 |
| Total raw tokens      | 268,921 |
| Total Pare tokens     | 131,262 |
| Tokens saved          | 137,659 |
| **Overall reduction** | **51%** |

## Breakdown

| Suite               | Scenarios | Raw Tokens | Pare Tokens | Reduction |
| ------------------- | --------: | ---------: | ----------: | --------: |
| Reproducible        |       117 |    267,589 |     129,987 |       51% |
| Mutating (one-shot) |        24 |      1,332 |       1,275 |        4% |

## Top Token Savers

| Scenario        |    Raw |  Pare |  Saved |
| --------------- | -----: | ----: | -----: |
| npm-list-d2     | 177467 | 70531 | 106936 |
| diff-full-patch |  22873 |   725 |  22148 |
| count-common    |   3647 |    63 |   3584 |
| find-all-ts     |   3548 |    63 |   3485 |
| make-list       |   3340 |    34 |   3306 |

## Worst Overhead

| Scenario       |   Raw |  Pare | Overhead |
| -------------- | ----: | ----: | -------: |
| blame-large    | 10255 | 13409 |    +3154 |
| issue-list-all |   711 |  2031 |    +1320 |
| run-list-20    |   647 |  1526 |     +879 |
| pr-list-closed |   497 |  1300 |     +803 |
| diff-large     |   327 |  1130 |     +803 |

## Latency

Median added latency (Pare vs raw CLI): **-3 ms**

---

See `Benchmark-Detailed.csv` for full per-scenario data.
