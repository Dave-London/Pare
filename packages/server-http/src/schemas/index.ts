import { z } from "zod";

/** Zod schema for a single HTTP header key-value pair as a record. */
export const HttpHeadersSchema = z.record(z.string(), z.string());

/** Zod schema for expanded timing details from curl's -w format variables. */
export const TimingDetailsSchema = z.object({
  namelookup: z.number().describe("Time from start until DNS resolution completed (seconds)"),
  connect: z.number().describe("Time from start until TCP connection established (seconds)"),
  appconnect: z
    .number()
    .optional()
    .describe("Time from start until TLS handshake completed (seconds)"),
  pretransfer: z
    .number()
    .optional()
    .describe("Time from start until just before transfer begins (seconds)"),
  starttransfer: z
    .number()
    .optional()
    .describe("Time from start until first response byte received (seconds)"),
});

export type TimingDetails = z.infer<typeof TimingDetailsSchema>;

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

/** Zod schema for the full HTTP response result (used by request, get, post). */
export const HttpResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  httpVersion: z.string().optional(),
  headers: HttpHeadersSchema.optional(),
  body: z.string().optional(),
  timing: HttpTimingSchema,
  size: z.number(),
  uploadSize: z.number().optional(),
  contentType: z.string().optional(),
  redirectChain: z.array(RedirectHopSchema).optional(),
  finalUrl: z.string().optional(),
  scheme: z.string().optional(),
  tlsVerifyResult: z.number().optional(),
});

export type HttpResponse = z.infer<typeof HttpResponseSchema>;

/** Zod schema for the HEAD-only HTTP response result (no body). */
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
  scheme: z.string().optional(),
  tlsVerifyResult: z.number().optional(),
});

export type HttpHeadResponse = z.infer<typeof HttpHeadResponseSchema>;

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
