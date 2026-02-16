import type {
  HttpResponse,
  HttpHeadResponse,
  HttpResponseCompact,
  HttpHeadResponseCompact,
  HttpTiming,
} from "../schemas/index.js";
import { HEAD_ESSENTIAL_HEADERS } from "../schemas/index.js";

/** Formats timing details into a human-readable string. */
function formatTimingLine(timing: HttpTiming): string {
  let line = `Time: ${timing.total.toFixed(3)}s`;
  if (timing.details) {
    const d = timing.details;
    const parts: string[] = [];
    parts.push(`dns=${d.namelookup.toFixed(3)}s`);
    parts.push(`tcp=${d.connect.toFixed(3)}s`);
    if (d.appconnect !== undefined) {
      parts.push(`tls=${d.appconnect.toFixed(3)}s`);
    }
    if (d.pretransfer !== undefined) {
      parts.push(`pre=${d.pretransfer.toFixed(3)}s`);
    }
    if (d.starttransfer !== undefined) {
      parts.push(`ttfb=${d.starttransfer.toFixed(3)}s`);
    }
    line += ` (${parts.join(", ")})`;
  }
  return line;
}

/** Formats a full HTTP response into human-readable text. */
export function formatHttpResponse(data: HttpResponse): string {
  const lines: string[] = [];

  lines.push(`HTTP ${data.status} ${data.statusText}`);

  if (data.contentType) {
    lines.push(`Content-Type: ${data.contentType}`);
  }

  lines.push(`Size: ${data.size} bytes | ${formatTimingLine(data.timing)}`);

  const headers = data.headers ?? {};
  const headerCount = Object.keys(headers).length;
  lines.push(`Headers: ${headerCount}`);

  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  ${key}: ${value}`);
  }

  if (data.body) {
    const bodyPreview = data.body.length > 500 ? data.body.substring(0, 500) + "..." : data.body;
    lines.push("");
    lines.push(bodyPreview);
  }

  return lines.join("\n");
}

/** Formats a HEAD response into human-readable text. */
export function formatHttpHeadResponse(data: HttpHeadResponse): string {
  const lines: string[] = [];

  lines.push(`HTTP ${data.status} ${data.statusText}`);

  if (data.contentType) {
    lines.push(`Content-Type: ${data.contentType}`);
  }

  if (data.contentLength !== undefined) {
    lines.push(`Content-Length: ${data.contentLength}`);
  }

  lines.push(formatTimingLine(data.timing));

  const headers = data.headers ?? {};
  const headerCount = Object.keys(headers).length;
  lines.push(`Headers: ${headerCount}`);

  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  ${key}: ${value}`);
  }

  return lines.join("\n");
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Maps full HTTP response to compact form (drop headers and body). */
export function compactResponseMap(data: HttpResponse): HttpResponseCompact {
  return {
    status: data.status,
    statusText: data.statusText,
    contentType: data.contentType,
    size: data.size,
    timing: data.timing,
  };
}

/** Formats compact HTTP response. */
export function formatResponseCompact(data: HttpResponseCompact): string {
  const ct = data.contentType ? ` (${data.contentType})` : "";
  return `HTTP ${data.status} ${data.statusText}${ct} | ${data.size} bytes | ${data.timing.total.toFixed(3)}s`;
}

/**
 * Maps full HEAD response to compact form.
 * Preserves essential headers (content-length, cache-control, etag, last-modified, content-type)
 * even in compact mode, since HEAD responses are primarily about headers.
 */
export function compactHeadResponseMap(data: HttpHeadResponse): HttpHeadResponseCompact {
  const headers = data.headers ?? {};
  const essential: Record<string, string> = {};

  for (const key of HEAD_ESSENTIAL_HEADERS) {
    if (headers[key] !== undefined) {
      essential[key] = headers[key];
    }
  }

  return {
    status: data.status,
    statusText: data.statusText,
    contentType: data.contentType,
    contentLength: data.contentLength,
    timing: data.timing,
    ...(Object.keys(essential).length > 0 ? { essentialHeaders: essential } : {}),
  };
}

/** Formats compact HEAD response. */
export function formatHeadResponseCompact(data: HttpHeadResponseCompact): string {
  const ct = data.contentType ? ` (${data.contentType})` : "";
  const cl = data.contentLength !== undefined ? ` | ${data.contentLength} bytes` : "";
  let line = `HTTP ${data.status} ${data.statusText}${ct}${cl} | ${data.timing.total.toFixed(3)}s`;

  if (data.essentialHeaders && Object.keys(data.essentialHeaders).length > 0) {
    const headerParts: string[] = [];
    for (const [key, value] of Object.entries(data.essentialHeaders)) {
      // Skip content-type (already shown) and content-length (already shown as bytes)
      if (key === "content-type" || key === "content-length") continue;
      headerParts.push(`${key}: ${value}`);
    }
    if (headerParts.length > 0) {
      line += "\n  " + headerParts.join("\n  ");
    }
  }

  return line;
}
