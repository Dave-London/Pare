import { posix, win32 } from "node:path";

/**
 * Validates that a string matches a Docker port mapping format.
 * Accepted formats:
 *   - "8080"                  (container port only)
 *   - "8080:80"               (host:container)
 *   - "8080:80/tcp"           (host:container/protocol)
 *   - "127.0.0.1:8080:80"    (ip:host:container)
 *   - "127.0.0.1:8080:80/udp"
 *   - "8080-8090:80-90"      (port ranges)
 */
const PORT_MAPPING_RE =
  /^(?:(?:\d{1,3}\.){3}\d{1,3}:)?(?:\d{1,5}(?:-\d{1,5})?:)?\d{1,5}(?:-\d{1,5})?(?:\/(?:tcp|udp|sctp))?$/;

export function assertValidPortMapping(value: string): void {
  if (!PORT_MAPPING_RE.test(value)) {
    throw new Error(
      `Invalid port mapping: "${value}". Expected format like "8080", "8080:80", "127.0.0.1:8080:80/tcp", or a port range.`,
    );
  }
}

/**
 * Dangerous host paths that must never be bind-mounted into a container.
 * Each entry is checked as an exact match or as a prefix (with trailing `/`).
 */
const DANGEROUS_PATHS = ["/", "/etc", "/var/run/docker.sock", "/proc", "/sys", "/dev", "/root"];

/**
 * Windows root paths that must be blocked (case-insensitive).
 */
const WINDOWS_ROOT_RE = /^[A-Za-z]:[/\\]?$/;

/**
 * Validates that a volume mount string does not expose dangerous host paths.
 *
 * Accepted formats:
 *   - "host:container"
 *   - "host:container:options"
 *   - "container" (container-only, no host path — always allowed)
 *   - "name:container" (named volume — always allowed)
 *
 * A host path is identified as a string starting with `/`, `./`, `../`, or `~`.
 * Named volumes (plain identifiers without path separators) are always allowed.
 */
export function assertSafeVolumeMount(value: string): void {
  // Trim whitespace to prevent bypass via leading/trailing spaces
  const trimmed = value.trim();

  // Detect Windows-style paths (e.g., "C:\path" or "C:/path") where the
  // drive letter colon is part of the host path, not a host:container separator.
  const hasWindowsDrive = /^[A-Za-z]:/.test(trimmed);

  // Split on the appropriate colon to extract the host part.
  // For Windows paths like "C:\foo:/bar", skip the drive-letter colon.
  let colonIdx: number;
  if (hasWindowsDrive) {
    colonIdx = trimmed.indexOf(":", 2); // skip past "C:"
  } else {
    colonIdx = trimmed.indexOf(":");
  }

  if (colonIdx === -1) {
    // No separator colon — container-only mount or named volume, always safe
    return;
  }

  const hostPart = trimmed.substring(0, colonIdx).trim();

  // Determine if the host part is a path (starts with /, ./, ../, or ~)
  // Named volumes are plain identifiers (e.g., "myvolume") and are always safe.
  const isPath =
    hostPart.startsWith("/") ||
    hostPart.startsWith("./") ||
    hostPart.startsWith("../") ||
    hostPart.startsWith("~") ||
    hostPart === "." ||
    hostPart === "..";

  // Also check for Windows-style absolute paths (e.g., C:\)
  const isWindowsPath = /^[A-Za-z]:/.test(hostPart);

  if (!isPath && !isWindowsPath) {
    // Named volume — always allowed
    return;
  }

  // Block Windows root mounts (e.g., "C:\", "C:/", "C:")
  if (isWindowsPath && WINDOWS_ROOT_RE.test(hostPart)) {
    throw new Error(
      `Dangerous volume mount blocked: "${value}". Mounting a Windows root drive is not allowed.`,
    );
  }

  // Normalize the host path: resolve ".." segments, remove trailing slashes
  const normalized = posix.normalize(hostPart).replace(/\/+$/, "") || "/";

  for (const dangerous of DANGEROUS_PATHS) {
    if (dangerous === "/") {
      // Exact root mount
      if (normalized === "/") {
        throw new Error(
          `Dangerous volume mount blocked: "${value}". Mounting the root filesystem is not allowed.`,
        );
      }
    } else {
      // Exact match or prefix match (e.g., /etc or /etc/shadow)
      if (normalized === dangerous || normalized.startsWith(dangerous + "/")) {
        throw new Error(
          `Dangerous volume mount blocked: "${value}". Mounting "${dangerous}" or its children is not allowed.`,
        );
      }
    }
  }
}
