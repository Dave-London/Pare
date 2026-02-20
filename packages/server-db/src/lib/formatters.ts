import type {
  PsqlQueryResult,
  PsqlListDatabasesResult,
  MysqlQueryResult,
  MysqlListDatabasesResult,
  RedisPingResult,
  RedisInfoResult,
  RedisCommandResult,
  MongoshEvalResult,
  MongoshStatsResult,
} from "../schemas/index.js";

// ── PostgreSQL formatters ───────────────────────────────────────────

/** Formats psql query results into human-readable text. */
export function formatPsqlQuery(data: PsqlQueryResult): string {
  if (!data.success) {
    return `psql query: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  const lines: string[] = [`psql query: ${data.rowCount} rows (${data.duration}ms)`];
  if (data.columns && data.columns.length > 0) {
    lines.push(`columns: ${data.columns.join(", ")}`);
  }
  if (data.rows) {
    for (const row of data.rows) {
      const values = Object.entries(row)
        .map(([k, v]) => `${k}=${v ?? "NULL"}`)
        .join(", ");
      lines.push(`  ${values}`);
    }
  }
  return lines.join("\n");
}

/** Compact psql query: row count, success, duration. Drop rows. */
export interface PsqlQueryCompact {
  [key: string]: unknown;
  success: boolean;
  rowCount: number;
  exitCode: number;
  duration: number;
}

export function compactPsqlQueryMap(data: PsqlQueryResult): PsqlQueryCompact {
  return {
    success: data.success,
    rowCount: data.rowCount,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatPsqlQueryCompact(data: PsqlQueryCompact): string {
  if (!data.success) return `psql query: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `psql query: ${data.rowCount} rows (${data.duration}ms)`;
}

/** Formats psql list databases results into human-readable text. */
export function formatPsqlListDatabases(data: PsqlListDatabasesResult): string {
  if (!data.success) {
    return `psql databases: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  const lines: string[] = [`psql: ${data.total} databases (${data.duration}ms)`];
  if (data.databases) {
    for (const db of data.databases) {
      const parts: string[] = [`  ${db.name}`];
      if (db.owner) parts.push(`owner=${db.owner}`);
      if (db.encoding) parts.push(`encoding=${db.encoding}`);
      if (db.size) parts.push(`size=${db.size}`);
      lines.push(parts.join(" "));
    }
  }
  return lines.join("\n");
}

/** Compact psql list databases: total, success, duration. */
export interface PsqlListDatabasesCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  exitCode: number;
  duration: number;
}

export function compactPsqlListDatabasesMap(
  data: PsqlListDatabasesResult,
): PsqlListDatabasesCompact {
  return {
    success: data.success,
    total: data.total,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatPsqlListDatabasesCompact(data: PsqlListDatabasesCompact): string {
  if (!data.success)
    return `psql databases: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `psql: ${data.total} databases (${data.duration}ms)`;
}

// ── MySQL formatters ────────────────────────────────────────────────

/** Formats mysql query results into human-readable text. */
export function formatMysqlQuery(data: MysqlQueryResult): string {
  if (!data.success) {
    return `mysql query: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  const lines: string[] = [`mysql query: ${data.rowCount} rows (${data.duration}ms)`];
  if (data.columns && data.columns.length > 0) {
    lines.push(`columns: ${data.columns.join(", ")}`);
  }
  if (data.rows) {
    for (const row of data.rows) {
      const values = Object.entries(row)
        .map(([k, v]) => `${k}=${v ?? "NULL"}`)
        .join(", ");
      lines.push(`  ${values}`);
    }
  }
  return lines.join("\n");
}

/** Compact mysql query: row count, success, duration. */
export interface MysqlQueryCompact {
  [key: string]: unknown;
  success: boolean;
  rowCount: number;
  exitCode: number;
  duration: number;
}

export function compactMysqlQueryMap(data: MysqlQueryResult): MysqlQueryCompact {
  return {
    success: data.success,
    rowCount: data.rowCount,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatMysqlQueryCompact(data: MysqlQueryCompact): string {
  if (!data.success) return `mysql query: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `mysql query: ${data.rowCount} rows (${data.duration}ms)`;
}

/** Formats mysql list databases results into human-readable text. */
export function formatMysqlListDatabases(data: MysqlListDatabasesResult): string {
  if (!data.success) {
    return `mysql databases: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  const lines: string[] = [`mysql: ${data.total} databases (${data.duration}ms)`];
  if (data.databases) {
    for (const db of data.databases) {
      lines.push(`  ${db.name}`);
    }
  }
  return lines.join("\n");
}

/** Compact mysql list databases: total, success, duration. */
export interface MysqlListDatabasesCompact {
  [key: string]: unknown;
  success: boolean;
  total: number;
  exitCode: number;
  duration: number;
}

export function compactMysqlListDatabasesMap(
  data: MysqlListDatabasesResult,
): MysqlListDatabasesCompact {
  return {
    success: data.success,
    total: data.total,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatMysqlListDatabasesCompact(data: MysqlListDatabasesCompact): string {
  if (!data.success)
    return `mysql databases: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `mysql: ${data.total} databases (${data.duration}ms)`;
}

// ── Redis formatters ────────────────────────────────────────────────

/** Formats redis ping results into human-readable text. */
export function formatRedisPing(data: RedisPingResult): string {
  if (!data.success) {
    return `redis PING: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  return `redis PING: ${data.response ?? "OK"} (${data.duration}ms)`;
}

/** Compact redis ping: success, duration. */
export interface RedisPingCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
}

export function compactRedisPingMap(data: RedisPingResult): RedisPingCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatRedisPingCompact(data: RedisPingCompact): string {
  if (!data.success) return `redis PING: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `redis PING: OK (${data.duration}ms)`;
}

/** Formats redis info results into human-readable text. */
export function formatRedisInfo(data: RedisInfoResult): string {
  if (!data.success) {
    return `redis INFO: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  const lines: string[] = [
    `redis INFO: ${data.sections?.length ?? 0} sections (${data.duration}ms)`,
  ];
  if (data.sections) {
    for (const section of data.sections) {
      const entryCount = Object.keys(section.entries).length;
      lines.push(`  # ${section.name} (${entryCount} entries)`);
      for (const [key, value] of Object.entries(section.entries)) {
        lines.push(`    ${key}: ${value}`);
      }
    }
  }
  return lines.join("\n");
}

/** Compact redis info: section count, success, duration. */
export interface RedisInfoCompact {
  [key: string]: unknown;
  success: boolean;
  sectionCount: number;
  exitCode: number;
  duration: number;
}

export function compactRedisInfoMap(data: RedisInfoResult): RedisInfoCompact {
  return {
    success: data.success,
    sectionCount: data.sections?.length ?? 0,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatRedisInfoCompact(data: RedisInfoCompact): string {
  if (!data.success) return `redis INFO: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `redis INFO: ${data.sectionCount} sections (${data.duration}ms)`;
}

/** Formats redis command results into human-readable text. */
export function formatRedisCommand(data: RedisCommandResult): string {
  if (!data.success) {
    return `redis command: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  return `redis command: OK (${data.duration}ms)${data.response ? `\n${data.response}` : ""}`;
}

/** Compact redis command: success, duration. */
export interface RedisCommandCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
}

export function compactRedisCommandMap(data: RedisCommandResult): RedisCommandCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatRedisCommandCompact(data: RedisCommandCompact): string {
  if (!data.success)
    return `redis command: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `redis command: OK (${data.duration}ms)`;
}

// ── MongoDB formatters ──────────────────────────────────────────────

/** Formats mongosh eval results into human-readable text. */
export function formatMongoshEval(data: MongoshEvalResult): string {
  if (!data.success) {
    return `mongosh eval: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  return `mongosh eval: OK (${data.duration}ms)${data.output ? `\n${data.output}` : ""}`;
}

/** Compact mongosh eval: success, duration. */
export interface MongoshEvalCompact {
  [key: string]: unknown;
  success: boolean;
  exitCode: number;
  duration: number;
}

export function compactMongoshEvalMap(data: MongoshEvalResult): MongoshEvalCompact {
  return {
    success: data.success,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatMongoshEvalCompact(data: MongoshEvalCompact): string {
  if (!data.success) return `mongosh eval: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  return `mongosh eval: OK (${data.duration}ms)`;
}

/** Formats mongosh stats results into human-readable text. */
export function formatMongoshStats(data: MongoshStatsResult): string {
  if (!data.success) {
    return `mongosh stats: FAILED (exit code ${data.exitCode}, ${data.duration}ms)${data.error ? `\n${data.error}` : ""}`;
  }
  const lines: string[] = [`mongosh stats: OK (${data.duration}ms)`];
  if (data.db) lines.push(`  db: ${data.db}`);
  if (data.collections !== undefined) lines.push(`  collections: ${data.collections}`);
  if (data.objects !== undefined) lines.push(`  objects: ${data.objects}`);
  if (data.dataSize !== undefined) lines.push(`  dataSize: ${data.dataSize}`);
  if (data.storageSize !== undefined) lines.push(`  storageSize: ${data.storageSize}`);
  if (data.indexes !== undefined) lines.push(`  indexes: ${data.indexes}`);
  if (data.indexSize !== undefined) lines.push(`  indexSize: ${data.indexSize}`);
  return lines.join("\n");
}

/** Compact mongosh stats: success, db name, collections count, duration. */
export interface MongoshStatsCompact {
  [key: string]: unknown;
  success: boolean;
  db?: string;
  collections?: number;
  exitCode: number;
  duration: number;
}

export function compactMongoshStatsMap(data: MongoshStatsResult): MongoshStatsCompact {
  return {
    success: data.success,
    db: data.db,
    collections: data.collections,
    exitCode: data.exitCode,
    duration: data.duration,
  };
}

export function formatMongoshStatsCompact(data: MongoshStatsCompact): string {
  if (!data.success)
    return `mongosh stats: FAILED (exit code ${data.exitCode}, ${data.duration}ms)`;
  const parts: string[] = [`mongosh stats: OK (${data.duration}ms)`];
  if (data.db) parts.push(`db=${data.db}`);
  if (data.collections !== undefined) parts.push(`collections=${data.collections}`);
  return parts.join(" ");
}
