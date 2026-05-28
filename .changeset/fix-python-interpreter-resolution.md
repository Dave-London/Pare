---
"@paretools/shared": patch
"@paretools/python": patch
"@paretools/test": patch
---

Add shared Python interpreter resolution with project virtualenv detection, `python3` fallback, and `python -m <tool>` fallback for Python-backed tools when their executable is not on PATH.
