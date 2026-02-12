/**
 * Validates that a URL uses only http:// or https:// schemes.
 * Blocks dangerous schemes like file://, ftp://, gopher://, dict://, data:, javascript:, etc.
 */
export function assertSafeUrl(url: string): void {
  const trimmed = url.trim();

  if (!trimmed) {
    throw new Error("URL must not be empty.");
  }

  const lower = trimmed.toLowerCase();

  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    throw new Error(`Unsafe URL scheme. Only http:// and https:// are allowed. Got: "${url}"`);
  }
}

/**
 * Validates that a header key or value does not contain newlines or control characters
 * that could be used for header injection attacks.
 */
export function assertSafeHeader(key: string, value: string): void {
  const UNSAFE_RE = /[\r\n\x00]/;

  if (UNSAFE_RE.test(key)) {
    throw new Error(
      `Invalid header key: "${key}". Header keys must not contain newlines or null bytes.`,
    );
  }

  if (UNSAFE_RE.test(value)) {
    throw new Error(
      `Invalid header value for "${key}". Header values must not contain newlines or null bytes.`,
    );
  }
}
