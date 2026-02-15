import type {
  HttpResponse,
  HttpHeadResponse,
  HttpResponseCompact,
  HttpHeadResponseCompact,
} from "../schemas/index.js";

/** Formats a full HTTP response into human-readable text. */
export function formatHttpResponse(data: HttpResponse): string {
  const lines: string[] = [];

  lines.push(`HTTP ${data.status} ${data.statusText}`);

  if (data.contentType) {
    lines.push(`Content-Type: ${data.contentType}`);
  }

  lines.push(`Size: ${data.size} bytes | Time: ${data.timing.total.toFixed(3)}s`);

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

  lines.push(`Time: ${data.timing.total.toFixed(3)}s`);

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

/** Maps full HEAD response to compact form (drop headers). */
export function compactHeadResponseMap(data: HttpHeadResponse): HttpHeadResponseCompact {
  return {
    status: data.status,
    statusText: data.statusText,
    contentType: data.contentType,
    timing: data.timing,
  };
}

/** Formats compact HEAD response. */
export function formatHeadResponseCompact(data: HttpHeadResponseCompact): string {
  const ct = data.contentType ? ` (${data.contentType})` : "";
  return `HTTP ${data.status} ${data.statusText}${ct} | ${data.timing.total.toFixed(3)}s`;
}
