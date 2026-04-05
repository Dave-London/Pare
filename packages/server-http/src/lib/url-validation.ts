import { lookup } from "node:dns/promises";

/**
 * Private/reserved IPv4 CIDR ranges that should be blocked for SSRF protection.
 * Each entry is [networkAddress, prefixLength].
 */
const PRIVATE_IPV4_RANGES: Array<[number, number]> = [
  [ipv4ToNum("0.0.0.0"), 8], // "this" network
  [ipv4ToNum("10.0.0.0"), 8], // RFC 1918
  [ipv4ToNum("100.64.0.0"), 10], // Carrier-grade NAT (RFC 6598)
  [ipv4ToNum("127.0.0.0"), 8], // loopback
  [ipv4ToNum("169.254.0.0"), 16], // link-local
  [ipv4ToNum("172.16.0.0"), 12], // RFC 1918
  [ipv4ToNum("192.0.0.0"), 24], // IETF protocol assignments
  [ipv4ToNum("192.0.2.0"), 24], // TEST-NET-1
  [ipv4ToNum("192.88.99.0"), 24], // 6to4 relay anycast
  [ipv4ToNum("192.168.0.0"), 16], // RFC 1918
  [ipv4ToNum("198.18.0.0"), 15], // benchmark testing
  [ipv4ToNum("198.51.100.0"), 24], // TEST-NET-2
  [ipv4ToNum("203.0.113.0"), 24], // TEST-NET-3
  [ipv4ToNum("224.0.0.0"), 4], // multicast + reserved
];

/**
 * Blocked metadata hostnames commonly used by cloud providers.
 */
const BLOCKED_HOSTNAMES = new Set(["metadata.google.internal", "metadata.internal", "metadata"]);

/** Convert dotted-quad IPv4 to 32-bit unsigned number. */
function ipv4ToNum(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

/** Check if an IPv4 address (as number) falls within any private/reserved range. */
function isPrivateIPv4(ipNum: number): boolean {
  for (const [network, prefix] of PRIVATE_IPV4_RANGES) {
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    if ((ipNum & mask) === (network & mask)) return true;
  }
  return false;
}

/** Private/reserved IPv6 prefixes (normalized lowercase hex). */
const PRIVATE_IPV6_CHECKS: Array<(addr: string) => boolean> = [
  // ::1 loopback
  (addr) => addr === "::1" || addr === "0000:0000:0000:0000:0000:0000:0000:0001",
  // fe80::/10 link-local
  (addr) => {
    const first = parseInt(addr.split(":")[0] || "0", 16);
    return (first & 0xffc0) === 0xfe80;
  },
  // fc00::/7 unique local
  (addr) => {
    const first = parseInt(addr.split(":")[0] || "0", 16);
    return (first & 0xfe00) === 0xfc00;
  },
  // :: unspecified
  (addr) => addr === "::" || addr === "0000:0000:0000:0000:0000:0000:0000:0000",
  // ::ffff:0:0/96 IPv4-mapped — check the embedded IPv4
  (addr) => {
    const match = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
    if (match) {
      return isPrivateIPv4(ipv4ToNum(match[1]!));
    }
    return false;
  },
];

/** Check if an IPv6 address string is private/reserved. */
function isPrivateIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  return PRIVATE_IPV6_CHECKS.some((check) => check(lower));
}

/**
 * Attempt to parse a string as an IPv4 address, handling obfuscation:
 * - Decimal notation: `2130706433` -> `127.0.0.1`
 * - Hex notation: `0x7f000001` -> `127.0.0.1`
 * - Octal notation: `0177.0.0.1` -> `127.0.0.1`
 * - Mixed octal/hex per-octet: `0x7f.0.1`
 *
 * Returns the 32-bit numeric value, or null if not a valid IPv4 address.
 */
function parseObfuscatedIPv4(host: string): number | null {
  // Single-number decimal or hex (e.g., 2130706433 or 0x7f000001)
  if (/^(0x[\da-fA-F]+|\d+)$/.test(host)) {
    const val = host.toLowerCase().startsWith("0x") ? parseInt(host, 16) : parseInt(host, 10);
    if (val >= 0 && val <= 0xffffffff) return val >>> 0;
    return null;
  }

  // Dotted notation with possible octal/hex octets
  const parts = host.split(".");
  if (parts.length < 2 || parts.length > 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!part) return null;
    let val: number;
    if (part.toLowerCase().startsWith("0x")) {
      val = parseInt(part, 16);
    } else if (part.startsWith("0") && part.length > 1 && /^[0-7]+$/.test(part)) {
      val = parseInt(part, 8);
    } else if (/^\d+$/.test(part)) {
      val = parseInt(part, 10);
    } else {
      return null;
    }
    if (isNaN(val) || val < 0) return null;
    octets.push(val);
  }

  // Standard 4-octet form
  if (octets.length === 4) {
    if (octets.some((o) => o > 255)) return null;
    return ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0;
  }

  // 3-part: a.b.c where c is 16-bit
  if (octets.length === 3) {
    if (octets[0]! > 255 || octets[1]! > 255 || octets[2]! > 0xffff) return null;
    return ((octets[0]! << 24) | (octets[1]! << 16) | octets[2]!) >>> 0;
  }

  // 2-part: a.b where b is 24-bit
  if (octets.length === 2) {
    if (octets[0]! > 255 || octets[1]! > 0xffffff) return null;
    return ((octets[0]! << 24) | octets[1]!) >>> 0;
  }

  return null;
}

/**
 * Check if an IP address string (v4 or v6) is private/reserved.
 * Exported for use by resolve parameter validation.
 */
export function isPrivateIP(ip: string): boolean {
  // Try IPv4 (including obfuscated forms)
  const ipv4Num = parseObfuscatedIPv4(ip);
  if (ipv4Num !== null) return isPrivateIPv4(ipv4Num);

  // Try standard dotted-quad IPv4
  const dotParts = ip.split(".");
  if (dotParts.length === 4 && dotParts.every((p) => /^\d{1,3}$/.test(p))) {
    const num = ipv4ToNum(ip);
    return isPrivateIPv4(num);
  }

  // IPv6
  if (ip.includes(":")) return isPrivateIPv6(ip);

  return false;
}

/**
 * Validates that a URL uses only http:// or https:// schemes and does not
 * target private/reserved IP ranges (SSRF protection).
 *
 * Set environment variable PARE_HTTP_ALLOW_PRIVATE=true to disable
 * private IP blocking (e.g., for local development).
 */
export async function assertSafeUrl(url: string): Promise<void> {
  const trimmed = url.trim();

  if (!trimmed) {
    throw new Error("URL must not be empty.");
  }

  const lower = trimmed.toLowerCase();

  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    throw new Error(`Unsafe URL scheme. Only http:// and https:// are allowed. Got: "${url}"`);
  }

  // Skip private IP checks if opted out
  if (process.env.PARE_HTTP_ALLOW_PRIVATE === "true") return;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }

  const hostname = parsed.hostname;

  // Block known metadata hostnames
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new Error(
      `Blocked request to metadata hostname "${hostname}". This is restricted for SSRF protection. ` +
        `Set PARE_HTTP_ALLOW_PRIVATE=true to override.`,
    );
  }

  // Check if hostname is directly an IP address (including obfuscated forms)
  // Remove brackets from IPv6
  const cleanHost = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;

  // Check obfuscated IPv4 forms directly
  const obfuscatedIP = parseObfuscatedIPv4(cleanHost);
  if (obfuscatedIP !== null && isPrivateIPv4(obfuscatedIP)) {
    throw new Error(
      `Blocked request to private/reserved IP address "${hostname}". ` +
        `This is restricted for SSRF protection. Set PARE_HTTP_ALLOW_PRIVATE=true to override.`,
    );
  }

  // Check direct IPv6
  if (cleanHost.includes(":") && isPrivateIPv6(cleanHost)) {
    throw new Error(
      `Blocked request to private/reserved IP address "${hostname}". ` +
        `This is restricted for SSRF protection. Set PARE_HTTP_ALLOW_PRIVATE=true to override.`,
    );
  }

  // DNS resolution check — resolve hostname and check resulting IP
  try {
    const result = await lookup(hostname);
    if (isPrivateIP(result.address)) {
      throw new Error(
        `Blocked request to "${hostname}" — resolves to private/reserved IP ${result.address}. ` +
          `This is restricted for SSRF protection. Set PARE_HTTP_ALLOW_PRIVATE=true to override.`,
      );
    }
  } catch (err) {
    // Re-throw our own SSRF errors
    if (err instanceof Error && err.message.includes("SSRF protection")) throw err;
    // DNS resolution failure is not necessarily an error (e.g., offline, custom resolver)
    // Let curl handle it downstream
  }
}

/**
 * Validates that the `resolve` parameter's target IP address is not private/reserved.
 * Format: "host:port:addr" or "host:port:addr,addr2"
 *
 * Blocks DNS rebinding attacks where --resolve is used to redirect
 * requests to private IPs despite the URL appearing safe.
 */
export function assertSafeResolve(resolve: string): void {
  if (process.env.PARE_HTTP_ALLOW_PRIVATE === "true") return;

  // Format: host:port:addr[,addr2,...]
  const parts = resolve.split(":");
  if (parts.length < 3) return; // Let curl handle format errors

  // The addr portion is everything after the second colon (may contain : for IPv6)
  const addrPart = parts.slice(2).join(":");

  // May be comma-separated multiple addresses
  const addrs = addrPart.split(",");
  for (const addr of addrs) {
    const trimmed = addr.trim();
    if (!trimmed) continue;

    if (isPrivateIP(trimmed)) {
      throw new Error(
        `Blocked resolve to private/reserved IP "${trimmed}". ` +
          `The resolve parameter cannot redirect requests to private networks. ` +
          `Set PARE_HTTP_ALLOW_PRIVATE=true to override.`,
      );
    }
  }
}

/**
 * Validates that a cookie value is a cookie string (contains '='), not a file path.
 * curl's -b flag reads cookies from a file if the value doesn't contain '='.
 * This prevents arbitrary file read via the cookie parameter.
 */
export function assertSafeCookie(cookie: string): void {
  if (!cookie.includes("=")) {
    throw new Error(
      `Invalid cookie value: must be in "name=value" format (e.g., "session=abc123"). ` +
        `File-based cookie jars are not supported for security reasons.`,
    );
  }
}

/**
 * Validates that form values do not use @filepath syntax for file uploads
 * unless explicitly allowed via PARE_HTTP_ALLOW_FILE_UPLOAD=true.
 * curl's -F flag reads file contents when the value starts with '@'.
 */
export function assertSafeFormValues(form: Record<string, string>): void {
  if (process.env.PARE_HTTP_ALLOW_FILE_UPLOAD === "true") return;

  for (const [key, value] of Object.entries(form)) {
    if (value.startsWith("@")) {
      throw new Error(
        `Blocked file upload in form field "${key}": value starts with "@" which reads a local file. ` +
          `Set PARE_HTTP_ALLOW_FILE_UPLOAD=true to allow file uploads via form data.`,
      );
    }
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
