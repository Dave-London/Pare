---
"@paretools/shared": patch
---

Error output now redacts JSON-escaped Windows home paths such as `C:\\Users\\name\\project`, keeping the escape depth of the original text. A quote or other character that cannot occur in a Windows file name ends the profile-name match, so redaction no longer runs on into the next JSON string.
