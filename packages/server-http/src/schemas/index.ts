import { z } from "zod";

/** Zod schema for a single HTTP header key-value pair as a record. */
export const HttpHeadersSchema = z.record(z.string(), z.string());

/** Zod schema for expanded timing details from curl's -w format variables.
 * Individual phase timings (namelookup, connect, appconnect, pretransfer, starttransfer)
 * are display-only — moved to human-readable formatter. */
export const TimingDetailsSchema = z.object({});

export type TimingDetails = z.infer<typeof TimingDetailsSchema>;

/** Internal type with full timing breakdown for formatters. */
export interface TimingDetailsInternal {
  namelookup: number;
  connect: number;
  appconnect?: number;
  pretransfer?: number;
  starttransfer?: number;
}

/** Internal timing type that carries details for formatters. */
export interface HttpTimingInternal {
  total: number;
  details?: TimingDetailsInternal;
}

/** Zod schema for HTTP timing information. */
export const HttpTimingSchema = z.object({
  total: z.number(),
  details: TimingDetailsSchema.optional(),
});

export type HttpTiming = z.infer<typeof HttpTimingSchema>;

/** A single redirect hop captured from intermediate HTTP response headers. */
export const RedirectHopSchema = z.object({
  status: z.number(),
  location: z.string(),
});

export type RedirectHop = z.infer<typeof RedirectHopSchema>;

/** Zod schema for the full HTTP response result (used by request, get, post).
 * Removed: uploadSize (display-only), scheme (display-only).
 * Replaced: tlsVerifyResult number -> tlsVerified boolean. */
export const HttpResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  httpVersion: z.string().optional(),
  headers: HttpHeadersSchema.optional(),
  body: z.string().optional(),
  timing: HttpTimingSchema,
  size: z.number(),
  contentType: z.string().optional(),
  redirectChain: z.array(RedirectHopSchema).optional(),
  finalUrl: z.string().optional(),
  tlsVerified: z.boolean().optional(),
});

export type HttpResponse = z.infer<typeof HttpResponseSchema>;

/** Internal type for parser -> formatter data flow (includes display-only fields). */
export type HttpResponseInternal = Omit<HttpResponse, "timing"> & {
  uploadSize?: number;
  scheme?: string;
  /** Raw TLS verify result code, used by formatter. */
  tlsVerifyResult?: number;
  timing: HttpTimingInternal;
};

/** Zod schema for the HEAD-only HTTP response result (no body).
 * Removed: scheme (display-only).
 * Replaced: tlsVerifyResult number -> tlsVerified boolean. */
export const HttpHeadResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  httpVersion: z.string().optional(),
  headers: HttpHeadersSchema.optional(),
  timing: HttpTimingSchema,
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
  redirectChain: z.array(RedirectHopSchema).optional(),
  finalUrl: z.string().optional(),
  tlsVerified: z.boolean().optional(),
});

export type HttpHeadResponse = z.infer<typeof HttpHeadResponseSchema>;

/** Internal type for HEAD parser -> formatter data flow. */
export type HttpHeadResponseInternal = Omit<HttpHeadResponse, "timing"> & {
  scheme?: string;
  /** Raw TLS verify result code, used by formatter. */
  tlsVerifyResult?: number;
  timing: HttpTimingInternal;
};

/** Compact response: status, timing, size. Drop headers and body. */
export const HttpResponseCompactSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  httpVersion: z.string().optional(),
  contentType: z.string().optional(),
  size: z.number(),
  timing: HttpTimingSchema,
});

export type HttpResponseCompact = z.infer<typeof HttpResponseCompactSchema>;

/**
 * Compact HEAD response: status, timing, and key headers.
 * Retains essential headers even in compact mode: content-length, cache-control,
 * etag, last-modified, content-type.
 */
export const HttpHeadResponseCompactSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  httpVersion: z.string().optional(),
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
  timing: HttpTimingSchema,
  essentialHeaders: HttpHeadersSchema.optional(),
});

export type HttpHeadResponseCompact = z.infer<typeof HttpHeadResponseCompactSchema>;

/** Headers that should be preserved in HEAD compact mode. */
export const HEAD_ESSENTIAL_HEADERS = [
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "content-type",
] as const;
