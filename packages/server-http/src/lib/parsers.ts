import type { HttpResponse, HttpHeadResponse, TimingDetails } from "../schemas/index.js";

/** Sentinel appended via curl -w to separate body from metadata. */
export const PARE_META_SEPARATOR = "---PARE_HTTP_META---";

/**
 * Represents the raw metadata extracted from curl's -w write-out format.
 */
interface CurlMeta {
  time_total: number;
  size_download: number;
  size_upload: number;
  time_namelookup: number;
  time_connect: number;
  time_appconnect: number;
  time_pretransfer: number;
  time_starttransfer: number;
  http_version: string;
  num_redirects: number;
  url_effective: string;
  scheme: string;
  ssl_verify_result: number;
}

/**
 * Parses the combined output from `curl -s -S -i -w '...' URL`.
 *
 * The output format is:
 *   HTTP/x.y STATUS STATUS_TEXT\r\n
 *   Header: value\r\n
 *   ...
 *   \r\n
 *   <body>
 *   \n---PARE_HTTP_META---\n
 *   <time_total> <size_download> <time_namelookup> <time_connect> <time_appconnect> <time_pretransfer> <time_starttransfer>
 *
 * When following redirects, multiple status+header blocks may appear.
 * We parse the LAST one (the final response).
 */
export function parseCurlOutput(stdout: string, _stderr: string, _exitCode: number): HttpResponse {
  // Split off the meta section appended by -w
  const metaSepIdx = stdout.lastIndexOf(PARE_META_SEPARATOR);
  let metaSection = "";
  let responsePart = stdout;

  if (metaSepIdx !== -1) {
    responsePart = stdout.substring(0, metaSepIdx);
    metaSection = stdout.substring(metaSepIdx + PARE_META_SEPARATOR.length).trim();
  }

  const meta = parseMetaSection(metaSection);

  // When following redirects, curl with -i outputs multiple response blocks.
  // Each block starts with HTTP/. We want the LAST one.
  const blocks = splitHttpBlocks(responsePart).map((block) => parseHttpBlock(block));
  const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : parseHttpBlock(responsePart);

  const { status, statusText, headers, body, httpVersion } = lastBlock;

  const contentType = headers["content-type"];
  const redirectChain = blocks
    .slice(0, -1)
    .map((block) => {
      const location = block.headers["location"];
      if (!location) return null;
      return {
        status: block.status,
        location,
      };
    })
    .filter((entry): entry is { status: number; location: string } => entry !== null);

  const timingDetails = buildTimingDetails(meta);

  return {
    status,
    statusText,
    httpVersion: httpVersion || meta.http_version || undefined,
    headers,
    body: body || undefined,
    timing: {
      total: meta.time_total,
      ...(timingDetails ? { details: timingDetails } : {}),
    },
    size: meta.size_download,
    uploadSize: meta.size_upload > 0 ? meta.size_upload : undefined,
    contentType,
    redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
    finalUrl: meta.url_effective || undefined,
    scheme: meta.scheme || undefined,
    tlsVerifyResult: Number.isFinite(meta.ssl_verify_result) ? meta.ssl_verify_result : undefined,
  };
}

/**
 * Parses curl output for HEAD requests (no body expected).
 * Extracts contentLength as a numeric field from the Content-Length header.
 */
export function parseCurlHeadOutput(
  stdout: string,
  stderr: string,
  exitCode: number,
): HttpHeadResponse {
  const full = parseCurlOutput(stdout, stderr, exitCode);

  // Extract Content-Length as a numeric field for easy size checking
  const headers = full.headers ?? {};
  const clHeader = headers["content-length"];
  let contentLength: number | undefined;
  if (clHeader !== undefined) {
    const parsed = parseInt(clHeader, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      contentLength = parsed;
    }
  }

  return {
    status: full.status,
    statusText: full.statusText,
    httpVersion: full.httpVersion,
    headers: full.headers,
    timing: full.timing,
    contentType: full.contentType,
    contentLength,
    redirectChain: full.redirectChain,
    finalUrl: full.finalUrl,
    scheme: full.scheme,
    tlsVerifyResult: full.tlsVerifyResult,
  };
}

/**
 * Splits raw curl `-i` output into separate HTTP response blocks.
 * Each block starts with `HTTP/` (status line).
 */
export function splitHttpBlocks(raw: string): string[] {
  const blocks: string[] = [];
  // Match HTTP/ at the start of a line
  const regex = /^HTTP\//gm;
  const indices: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    indices.push(match.index);
  }

  if (indices.length === 0) {
    return [raw];
  }

  for (let i = 0; i < indices.length; i++) {
    const start = indices[i];
    const end = i + 1 < indices.length ? indices[i + 1] : raw.length;
    blocks.push(raw.substring(start, end));
  }

  return blocks;
}

/**
 * Parses a single HTTP response block into status, headers, and body.
 */
export function parseHttpBlock(block: string): {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
} {
  // Normalize line endings: \r\n -> \n
  const normalized = block.replace(/\r\n/g, "\n");

  // Split on first double-newline to separate headers from body
  const headerBodySplit = normalized.indexOf("\n\n");
  let headerSection: string;
  let body: string;

  if (headerBodySplit !== -1) {
    headerSection = normalized.substring(0, headerBodySplit);
    body = normalized.substring(headerBodySplit + 2);
  } else {
    // No body (e.g. HEAD request or empty response)
    headerSection = normalized;
    body = "";
  }

  const lines = headerSection.split("\n");
  const statusLine = lines[0] || "";

  // Parse status line: HTTP/1.1 200 OK
  const statusMatch = statusLine.match(/^HTTP\/([\d.]+)\s+(\d+)\s*(.*)/);
  const status = statusMatch ? parseInt(statusMatch[2], 10) : 0;
  const statusText = statusMatch ? statusMatch[3].trim() : "";
  const httpVersion = statusMatch ? statusMatch[1] : "";

  // Parse headers
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const value = line.substring(colonIdx + 1).trim();
      headers[key] = value;
    }
  }

  // Trim trailing whitespace from body
  body = body.replace(/\n$/, "");

  return { status, statusText, httpVersion, headers, body };
}

/**
 * Builds a TimingDetails object from the parsed meta section.
 * Returns undefined if all timing values are zero (no real timing data available).
 */
function buildTimingDetails(meta: CurlMeta): TimingDetails | undefined {
  // If namelookup and connect are both 0, we likely have no timing data
  // (e.g. old format or no metadata)
  if (meta.time_namelookup === 0 && meta.time_connect === 0 && meta.time_starttransfer === 0) {
    return undefined;
  }

  const details: TimingDetails = {
    namelookup: meta.time_namelookup,
    connect: meta.time_connect,
  };

  // Only include appconnect when it has a meaningful value (> 0 means TLS was used)
  if (meta.time_appconnect > 0) {
    details.appconnect = meta.time_appconnect;
  }

  // Only include pretransfer when available
  if (meta.time_pretransfer > 0) {
    details.pretransfer = meta.time_pretransfer;
  }

  // Only include starttransfer when available
  if (meta.time_starttransfer > 0) {
    details.starttransfer = meta.time_starttransfer;
  }

  return details;
}

/**
 * Parses the metadata section appended by curl's -w format string.
 * Format: "<time_total> <size_download> <size_upload> <time_namelookup> <time_connect> <time_appconnect> <time_pretransfer> <time_starttransfer> <http_version> <num_redirects> <url_effective> <scheme> <ssl_verify_result>"
 *
 * For backward compatibility, also handles the old 2-field format:
 * "<time_total> <size_download>"
 */
function parseMetaSection(meta: string): CurlMeta {
  const parts = meta.trim().split(/\s+/);
  if (parts.length <= 7) {
    // Backward-compatible parser for previous write-out format:
    // <time_total> <size_download> <time_namelookup> <time_connect> <time_appconnect> <time_pretransfer> <time_starttransfer>
    return {
      time_total: parts[0] ? parseFloat(parts[0]) : 0,
      size_download: parts[1] ? parseFloat(parts[1]) : 0,
      size_upload: 0,
      time_namelookup: parts[2] ? parseFloat(parts[2]) : 0,
      time_connect: parts[3] ? parseFloat(parts[3]) : 0,
      time_appconnect: parts[4] ? parseFloat(parts[4]) : 0,
      time_pretransfer: parts[5] ? parseFloat(parts[5]) : 0,
      time_starttransfer: parts[6] ? parseFloat(parts[6]) : 0,
      http_version: "",
      num_redirects: 0,
      url_effective: "",
      scheme: "",
      ssl_verify_result: 0,
    };
  }

  return {
    time_total: parts[0] ? parseFloat(parts[0]) : 0,
    size_download: parts[1] ? parseFloat(parts[1]) : 0,
    size_upload: parts[2] ? parseFloat(parts[2]) : 0,
    time_namelookup: parts[3] ? parseFloat(parts[3]) : 0,
    time_connect: parts[4] ? parseFloat(parts[4]) : 0,
    time_appconnect: parts[5] ? parseFloat(parts[5]) : 0,
    time_pretransfer: parts[6] ? parseFloat(parts[6]) : 0,
    time_starttransfer: parts[7] ? parseFloat(parts[7]) : 0,
    http_version: parts[8] ?? "",
    num_redirects: parts[9] ? parseInt(parts[9], 10) : 0,
    url_effective: parts[10] ?? "",
    scheme: parts[11] ?? "",
    ssl_verify_result: parts[12] ? parseInt(parts[12], 10) : 0,
  };
}
