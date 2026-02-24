import type {
  HttpResponse,
  HttpHeadResponse,
  HttpResponseInternal,
  HttpHeadResponseInternal,
  HttpResponseCompact,
  HttpHeadResponseCompact,
  HttpTimingInternal,
} from "../schemas/index.js";

/** Formats timing details into a human-readable string. */
function formatTimingLine(timing: HttpTimingInternal): string {
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
export function formatHttpResponse(data: HttpResponseInternal): string {
  const lines: string[] = [];

  const version = data.httpVersion ? `/${data.httpVersion}` : "";
  lines.push(`HTTP${version} ${data.status} ${data.statusText}`);

  if (data.contentType) {
    lines.push(`Content-Type: ${data.contentType}`);
  }

  const upload = data.uploadSize !== undefined ? ` | uploaded ${data.uploadSize} bytes` : "";
  lines.push(`Size: ${data.size} bytes${upload} | ${formatTimingLine(data.timing)}`);

  if (data.redirectChain && data.redirectChain.length > 0) {
    lines.push(`Redirects: ${data.redirectChain.length}`);
    for (const hop of data.redirectChain) {
      lines.push(`  ${hop.status} -> ${hop.location}`);
    }
  }
  if (data.finalUrl) {
    lines.push(`Final URL: ${data.finalUrl}`);
  }
  if (data.scheme) {
    lines.push(`Scheme: ${data.scheme}`);
  }
  if (data.tlsVerifyResult !== undefined) {
    lines.push(`TLS verify result: ${data.tlsVerifyResult}`);
  }

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
export function formatHttpHeadResponse(data: HttpHeadResponseInternal): string {
  const lines: string[] = [];

  const version = data.httpVersion ? `/${data.httpVersion}` : "";
  lines.push(`HTTP${version} ${data.status} ${data.statusText}`);

  if (data.contentType) {
    lines.push(`Content-Type: ${data.contentType}`);
  }

  if (data.contentLength !== undefined) {
    lines.push(`Content-Length: ${data.contentLength}`);
  }

  lines.push(formatTimingLine(data.timing));

  if (data.redirectChain && data.redirectChain.length > 0) {
    lines.push(`Redirects: ${data.redirectChain.length}`);
    for (const hop of data.redirectChain) {
      lines.push(`  ${hop.status} -> ${hop.location}`);
    }
  }
  if (data.finalUrl) {
    lines.push(`Final URL: ${data.finalUrl}`);
  }
  if (data.scheme) {
    lines.push(`Scheme: ${data.scheme}`);
  }
  if (data.tlsVerifyResult !== undefined) {
    lines.push(`TLS verify result: ${data.tlsVerifyResult}`);
  }

  const headers = data.headers ?? {};
  const headerCount = Object.keys(headers).length;
  lines.push(`Headers: ${headerCount}`);

  for (const [key, value] of Object.entries(headers)) {
    lines.push(`  ${key}: ${value}`);
  }

  return lines.join("\n");
}

// ── Schema maps (strip Internal-only fields for structuredContent) ──

/** Strips Internal-only fields from HTTP response for structuredContent. */
export function schemaResponseMap(data: HttpResponseInternal): HttpResponse {
  return {
    status: data.status,
    statusText: data.statusText,
    httpVersion: data.httpVersion,
    headers: data.headers,
    body: data.body,
    timing: { total: data.timing.total, details: {} },
    size: data.size,
    contentType: data.contentType,
    redirectChain: data.redirectChain,
    finalUrl: data.finalUrl,
    tlsVerified: data.tlsVerified,
  };
}

/** Strips Internal-only fields from HEAD response for structuredContent. */
export function schemaHeadResponseMap(data: HttpHeadResponseInternal): HttpHeadResponse {
  return {
    status: data.status,
    statusText: data.statusText,
    httpVersion: data.httpVersion,
    headers: data.headers,
    timing: { total: data.timing.total, details: {} },
    contentType: data.contentType,
    contentLength: data.contentLength,
    redirectChain: data.redirectChain,
    finalUrl: data.finalUrl,
    tlsVerified: data.tlsVerified,
  };
}

// ── Compact types, mappers, and formatters ───────────────────────────

/** Maps full HTTP response to compact form (drop headers and body). */
export function compactResponseMap(data: HttpResponseInternal): HttpResponseCompact {
  return {
    status: data.status,
    statusText: data.statusText,
    httpVersion: data.httpVersion,
    contentType: data.contentType,
    size: data.size,
    timing: { total: data.timing.total },
  };
}

/** Formats compact HTTP response. */
export function formatResponseCompact(data: HttpResponseCompact): string {
  const version = data.httpVersion ? `/${data.httpVersion}` : "";
  const ct = data.contentType ? ` (${data.contentType})` : "";
  return `HTTP${version} ${data.status} ${data.statusText}${ct} | ${data.size} bytes | ${data.timing.total.toFixed(3)}s`;
}

/**
 * Maps full HEAD response to compact form (schema-compatible).
 * Only includes fields present in HttpHeadResponseSchema.
 * Essential headers are shown in human-readable text but not in structuredContent.
 */
export function compactHeadResponseMap(data: HttpHeadResponseInternal): HttpHeadResponseCompact {
  return {
    status: data.status,
    statusText: data.statusText,
    httpVersion: data.httpVersion,
    contentType: data.contentType,
    contentLength: data.contentLength,
    timing: { total: data.timing.total },
  };
}

/** Formats compact HEAD response. */
export function formatHeadResponseCompact(data: HttpHeadResponseCompact): string {
  const version = data.httpVersion ? `/${data.httpVersion}` : "";
  const ct = data.contentType ? ` (${data.contentType})` : "";
  const cl = data.contentLength !== undefined ? ` | ${data.contentLength} bytes` : "";
  return `HTTP${version} ${data.status} ${data.statusText}${ct}${cl} | ${data.timing.total.toFixed(3)}s`;
}
