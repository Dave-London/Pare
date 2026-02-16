import { z } from "zod";

/** Zod schema for a single HTTP header key-value pair as a record. */
export const HttpHeadersSchema = z.record(z.string(), z.string());

/** Zod schema for HTTP timing information. */
export const HttpTimingSchema = z.object({
  total: z.number(),
});

/** Zod schema for the full HTTP response result (used by request, get, post). */
export const HttpResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  headers: HttpHeadersSchema.optional(),
  body: z.string().optional(),
  timing: HttpTimingSchema,
  size: z.number(),
  contentType: z.string().optional(),
});

export type HttpResponse = z.infer<typeof HttpResponseSchema>;

/** Zod schema for the HEAD-only HTTP response result (no body). */
export const HttpHeadResponseSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  headers: HttpHeadersSchema.optional(),
  timing: HttpTimingSchema,
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
});

export type HttpHeadResponse = z.infer<typeof HttpHeadResponseSchema>;

/** Compact response: status, timing, size. Drop headers and body. */
export const HttpResponseCompactSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  contentType: z.string().optional(),
  size: z.number(),
  timing: HttpTimingSchema,
});

export type HttpResponseCompact = z.infer<typeof HttpResponseCompactSchema>;

/** Compact HEAD response: status and timing only. Drop headers. */
export const HttpHeadResponseCompactSchema = z.object({
  status: z.number(),
  statusText: z.string(),
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
  timing: HttpTimingSchema,
});

export type HttpHeadResponseCompact = z.infer<typeof HttpHeadResponseCompactSchema>;
