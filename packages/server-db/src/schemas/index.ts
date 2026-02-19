import { z } from "zod";

// ── PostgreSQL schemas ──────────────────────────────────────────────

/** A single row from a psql query result. */
export const PsqlRowSchema = z.record(z.string(), z.string().or(z.null()));

/** Zod schema for psql query output. */
export const PsqlQueryResultSchema = z.object({
  success: z.boolean(),
  columns: z.array(z.string()).optional(),
  rows: z.array(PsqlRowSchema).optional(),
  rowCount: z.number(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type PsqlQueryResult = z.infer<typeof PsqlQueryResultSchema>;

/** A single PostgreSQL database entry. */
export const PsqlDatabaseSchema = z.object({
  name: z.string(),
  owner: z.string().optional(),
  encoding: z.string().optional(),
  collation: z.string().optional(),
  ctype: z.string().optional(),
  size: z.string().optional(),
});

/** Zod schema for psql list databases output. */
export const PsqlListDatabasesResultSchema = z.object({
  success: z.boolean(),
  databases: z.array(PsqlDatabaseSchema).optional(),
  total: z.number(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type PsqlListDatabasesResult = z.infer<typeof PsqlListDatabasesResultSchema>;

// ── MySQL schemas ───────────────────────────────────────────────────

/** Zod schema for mysql query output. */
export const MysqlQueryResultSchema = z.object({
  success: z.boolean(),
  columns: z.array(z.string()).optional(),
  rows: z.array(z.record(z.string(), z.string().or(z.null()))).optional(),
  rowCount: z.number(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type MysqlQueryResult = z.infer<typeof MysqlQueryResultSchema>;

/** A single MySQL database entry. */
export const MysqlDatabaseSchema = z.object({
  name: z.string(),
});

/** Zod schema for mysql list databases output. */
export const MysqlListDatabasesResultSchema = z.object({
  success: z.boolean(),
  databases: z.array(MysqlDatabaseSchema).optional(),
  total: z.number(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type MysqlListDatabasesResult = z.infer<typeof MysqlListDatabasesResultSchema>;

// ── Redis schemas ───────────────────────────────────────────────────

/** Zod schema for redis ping output. */
export const RedisPingResultSchema = z.object({
  success: z.boolean(),
  response: z.string().optional(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type RedisPingResult = z.infer<typeof RedisPingResultSchema>;

/** A single Redis info section. */
export const RedisInfoSectionSchema = z.object({
  name: z.string(),
  entries: z.record(z.string(), z.string()),
});

/** Zod schema for redis info output. */
export const RedisInfoResultSchema = z.object({
  success: z.boolean(),
  sections: z.array(RedisInfoSectionSchema).optional(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type RedisInfoResult = z.infer<typeof RedisInfoResultSchema>;

/** Zod schema for redis command output. */
export const RedisCommandResultSchema = z.object({
  success: z.boolean(),
  response: z.string().optional(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type RedisCommandResult = z.infer<typeof RedisCommandResultSchema>;

// ── MongoDB schemas ─────────────────────────────────────────────────

/** Zod schema for mongosh eval output. */
export const MongoshEvalResultSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type MongoshEvalResult = z.infer<typeof MongoshEvalResultSchema>;

/** Zod schema for mongosh stats output. */
export const MongoshStatsResultSchema = z.object({
  success: z.boolean(),
  db: z.string().optional(),
  collections: z.number().optional(),
  objects: z.number().optional(),
  dataSize: z.number().optional(),
  storageSize: z.number().optional(),
  indexes: z.number().optional(),
  indexSize: z.number().optional(),
  raw: z.string().optional(),
  exitCode: z.number(),
  duration: z.number(),
  error: z.string().optional(),
});

export type MongoshStatsResult = z.infer<typeof MongoshStatsResultSchema>;
