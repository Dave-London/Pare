import type { HttpResponse, HttpHeadResponse } from "../schemas/index.js";

/** Sentinel appended via curl -w to separate body from metadata. */
export const PARE_META_SEPARATOR = "---PARE_HTTP_META---";

/**
 * Represents the raw metadata extracted from curl's -w write-out format.
 */
interface CurlMeta {
  time_total: number;
  size_download: number;
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
 *   <time_total> <size_download>
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
  const blocks = splitHttpBlocks(responsePart);
  const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : responsePart;

  const { status, statusText, headers, body } = parseHttpBlock(lastBlock);

  const contentType = headers["content-type"];

  return {
    status,
    statusText,
    headers,
    body: body || undefined,
    timing: { total: meta.time_total },
    size: meta.size_download,
    contentType,
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
    headers: full.headers,
    timing: full.timing,
    contentType: full.contentType,
    contentLength,
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
  const statusMatch = statusLine.match(/^HTTP\/[\d.]+\s+(\d+)\s*(.*)/);
  const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  const statusText = statusMatch ? statusMatch[2].trim() : "";

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

  return { status, statusText, headers, body };
}

/**
 * Parses the metadata section appended by curl's -w format string.
 * Format: "<time_total> <size_download>"
 */
function parseMetaSection(meta: string): CurlMeta {
  const parts = meta.trim().split(/\s+/);
  return {
    time_total: parts[0] ? parseFloat(parts[0]) : 0,
    size_download: parts[1] ? parseFloat(parts[1]) : 0,
  };
}
