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
