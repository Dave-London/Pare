---
"@paretools/http": minor
---

feat(http): add SSRF protection, file exfiltration guards, and security warnings

- Block private/reserved IP ranges in URL validation (opt-out via PARE_HTTP_ALLOW_PRIVATE)
- Validate resolve parameter IPs against private ranges
- Block @filepath in form values (opt-in via PARE_HTTP_ALLOW_FILE_UPLOAD)
- Validate cookie values contain = (reject file paths)
- Add security warnings for proxy parameter
