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

// ── PostgreSQL parsers ──────────────────────────────────────────────

/**
 * Parses psql unaligned output (`-A -t` with `-F` separator).
 *
 * When using `psql -A` (unaligned mode), output uses `|` as the default
 * field separator. The first line (when not using `-t`) contains column
 * headers. Subsequent lines are data rows.
 *
 * With `-A` (no `-t`), the output looks like:
 * ```
 * col1|col2|col3
 * val1|val2|val3
 * val4|val5|val6
 * (2 rows)
 * ```
 */
export function parsePsqlQuery(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): PsqlQueryResult {
  if (exitCode !== 0) {
    return {
      success: false,
      rowCount: 0,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const lines = stdout.split("\n").filter((l) => l.length > 0);

  // Filter out the "(N rows)" footer line
  const dataLines = lines.filter((l) => !/^\(\d+ rows?\)$/.test(l.trim()));

  if (dataLines.length === 0) {
    return { success: true, columns: [], rows: [], rowCount: 0, exitCode, duration };
  }

  // First line is column headers
  const columns = dataLines[0].split("|").map((c) => c.trim());
  const rows: Record<string, string | null>[] = [];

  for (let i = 1; i < dataLines.length; i++) {
    const values = dataLines[i].split("|");
    const row: Record<string, string | null> = {};
    for (let j = 0; j < columns.length; j++) {
      const val = values[j]?.trim();
      row[columns[j]] = val === "" || val === undefined ? null : val;
    }
    rows.push(row);
  }

  return { success: true, columns, rows, rowCount: rows.length, exitCode, duration };
}

/**
 * Parses `psql -l -A` output (list databases in unaligned mode).
 *
 * Expected format:
 * ```
 * Name|Owner|Encoding|Collate|Ctype|Access privileges
 * postgres|postgres|UTF8|en_US.utf8|en_US.utf8|
 * template0|postgres|UTF8|en_US.utf8|en_US.utf8|=c/postgres
 * template1|postgres|UTF8|en_US.utf8|en_US.utf8|=c/postgres
 * (3 rows)
 * ```
 */
export function parsePsqlListDatabases(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): PsqlListDatabasesResult {
  if (exitCode !== 0) {
    return {
      success: false,
      total: 0,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const lines = stdout.split("\n").filter((l) => l.length > 0);
  const dataLines = lines.filter((l) => !/^\(\d+ rows?\)$/.test(l.trim()));

  if (dataLines.length <= 1) {
    return { success: true, databases: [], total: 0, exitCode, duration };
  }

  // First line is headers: Name|Owner|Encoding|Collate|Ctype|...
  const headers = dataLines[0].split("|").map((h) => h.trim().toLowerCase());
  const databases: {
    name: string;
    owner?: string;
    encoding?: string;
    collation?: string;
    ctype?: string;
    size?: string;
  }[] = [];

  const nameIdx = headers.indexOf("name");
  const ownerIdx = headers.indexOf("owner");
  const encodingIdx = headers.indexOf("encoding");
  const collateIdx = headers.indexOf("collate");
  const ctypeIdx = headers.indexOf("ctype");
  const sizeIdx = headers.indexOf("size");

  for (let i = 1; i < dataLines.length; i++) {
    const values = dataLines[i].split("|").map((v) => v.trim());
    const name = nameIdx >= 0 ? values[nameIdx] : values[0];
    if (!name) continue;

    databases.push({
      name,
      owner: ownerIdx >= 0 ? values[ownerIdx] || undefined : undefined,
      encoding: encodingIdx >= 0 ? values[encodingIdx] || undefined : undefined,
      collation: collateIdx >= 0 ? values[collateIdx] || undefined : undefined,
      ctype: ctypeIdx >= 0 ? values[ctypeIdx] || undefined : undefined,
      size: sizeIdx >= 0 ? values[sizeIdx] || undefined : undefined,
    });
  }

  return { success: true, databases, total: databases.length, exitCode, duration };
}

// ── MySQL parsers ───────────────────────────────────────────────────

/**
 * Parses mysql `--batch --raw` output (tab-separated).
 *
 * Expected format:
 * ```
 * col1\tcol2\tcol3
 * val1\tval2\tval3
 * val4\tval5\tval6
 * ```
 *
 * The first line contains column headers, subsequent lines are data rows.
 */
export function parseMysqlQuery(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): MysqlQueryResult {
  if (exitCode !== 0) {
    return {
      success: false,
      rowCount: 0,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const lines = stdout.split("\n").filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { success: true, columns: [], rows: [], rowCount: 0, exitCode, duration };
  }

  const columns = lines[0].split("\t");
  const rows: Record<string, string | null>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split("\t");
    const row: Record<string, string | null> = {};
    for (let j = 0; j < columns.length; j++) {
      const val = values[j];
      row[columns[j]] = val === "NULL" || val === undefined ? null : val;
    }
    rows.push(row);
  }

  return { success: true, columns, rows, rowCount: rows.length, exitCode, duration };
}

/**
 * Parses `mysql -e "SHOW DATABASES" --batch` output.
 *
 * Expected format:
 * ```
 * Database
 * information_schema
 * mysql
 * performance_schema
 * mydb
 * ```
 */
export function parseMysqlListDatabases(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): MysqlListDatabasesResult {
  if (exitCode !== 0) {
    return {
      success: false,
      total: 0,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const lines = stdout.split("\n").filter((l) => l.length > 0);

  // First line is the "Database" header
  if (lines.length <= 1) {
    return { success: true, databases: [], total: 0, exitCode, duration };
  }

  const databases = lines.slice(1).map((name) => ({ name: name.trim() }));

  return { success: true, databases, total: databases.length, exitCode, duration };
}

// ── Redis parsers ───────────────────────────────────────────────────

/**
 * Parses `redis-cli PING` output.
 *
 * Expected output: `PONG`
 */
export function parseRedisPing(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): RedisPingResult {
  if (exitCode !== 0) {
    return {
      success: false,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const response = stdout.trim();
  return {
    success: response === "PONG",
    response: response || undefined,
    exitCode,
    duration,
  };
}

/**
 * Parses `redis-cli INFO` output into sections.
 *
 * Expected format:
 * ```
 * # Server
 * redis_version:7.0.0
 * redis_mode:standalone
 *
 * # Clients
 * connected_clients:1
 * ```
 */
export function parseRedisInfo(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): RedisInfoResult {
  if (exitCode !== 0) {
    return {
      success: false,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const sections: { name: string; entries: Record<string, string> }[] = [];
  let currentSection: { name: string; entries: Record<string, string> } | undefined;

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("# ")) {
      currentSection = { name: trimmed.slice(2).trim(), entries: {} };
      sections.push(currentSection);
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0 && currentSection) {
      const key = trimmed.slice(0, colonIdx);
      const value = trimmed.slice(colonIdx + 1);
      currentSection.entries[key] = value;
    }
  }

  return { success: true, sections, exitCode, duration };
}

/**
 * Parses generic `redis-cli` command output.
 *
 * Redis CLI output is line-based text. For simple values it's a single line;
 * for arrays it may be multi-line with numbering.
 */
export function parseRedisCommand(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): RedisCommandResult {
  if (exitCode !== 0) {
    return {
      success: false,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const response = stdout.trim();
  return {
    success: true,
    response: response || undefined,
    exitCode,
    duration,
  };
}

// ── MongoDB parsers ─────────────────────────────────────────────────

/**
 * Parses `mongosh --eval` output.
 *
 * mongosh outputs JSON or JavaScript-formatted results.
 */
export function parseMongoshEval(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): MongoshEvalResult {
  if (exitCode !== 0) {
    return {
      success: false,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const output = stdout.trim();
  return {
    success: true,
    output: output || undefined,
    exitCode,
    duration,
  };
}

/**
 * Parses `mongosh --eval "db.stats()"` output.
 *
 * Expected JSON format:
 * ```json
 * {
 *   "db": "mydb",
 *   "collections": 5,
 *   "objects": 1234,
 *   "dataSize": 567890,
 *   "storageSize": 1234567,
 *   "indexes": 10,
 *   "indexSize": 45678
 * }
 * ```
 */
export function parseMongoshStats(
  stdout: string,
  stderr: string,
  exitCode: number,
  duration: number,
): MongoshStatsResult {
  if (exitCode !== 0) {
    return {
      success: false,
      exitCode,
      duration,
      error: stderr.trim() || stdout.trim() || undefined,
    };
  }

  const raw = stdout.trim();

  // Try to parse as JSON to extract structured fields
  try {
    const parsed = JSON.parse(raw);
    return {
      success: true,
      db: typeof parsed.db === "string" ? parsed.db : undefined,
      collections: typeof parsed.collections === "number" ? parsed.collections : undefined,
      objects: typeof parsed.objects === "number" ? parsed.objects : undefined,
      dataSize: typeof parsed.dataSize === "number" ? parsed.dataSize : undefined,
      storageSize: typeof parsed.storageSize === "number" ? parsed.storageSize : undefined,
      indexes: typeof parsed.indexes === "number" ? parsed.indexes : undefined,
      indexSize: typeof parsed.indexSize === "number" ? parsed.indexSize : undefined,
      raw: raw || undefined,
      exitCode,
      duration,
    };
  } catch {
    // Not valid JSON — return raw output
    return {
      success: true,
      raw: raw || undefined,
      exitCode,
      duration,
    };
  }
}
