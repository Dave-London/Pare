import { describe, it, expect } from "vitest";
import {
  formatPsqlQuery,
  compactPsqlQueryMap,
  formatPsqlQueryCompact,
  formatPsqlListDatabases,
  compactPsqlListDatabasesMap,
  formatPsqlListDatabasesCompact,
  formatMysqlQuery,
  compactMysqlQueryMap,
  formatMysqlQueryCompact,
  formatMysqlListDatabases,
  formatMysqlListDatabasesCompact,
  formatRedisPing,
  compactRedisPingMap,
  formatRedisPingCompact,
  formatRedisInfo,
  compactRedisInfoMap,
  formatRedisInfoCompact,
  formatRedisCommand,
  compactRedisCommandMap,
  formatRedisCommandCompact,
  formatMongoshEval,
  compactMongoshEvalMap,
  formatMongoshEvalCompact,
  formatMongoshStats,
  compactMongoshStatsMap,
  formatMongoshStatsCompact,
} from "../src/lib/formatters.js";
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
} from "../src/schemas/index.js";

// ── PostgreSQL formatters ───────────────────────────────────────────

describe("formatPsqlQuery", () => {
  it("formats successful query with rows", () => {
    const data: PsqlQueryResult = {
      success: true,
      columns: ["id", "name"],
      rows: [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ],
      rowCount: 2,
      exitCode: 0,
      duration: 42,
    };
    const output = formatPsqlQuery(data);
    expect(output).toContain("psql query: 2 rows (42ms)");
    expect(output).toContain("columns: id, name");
    expect(output).toContain("id=1, name=Alice");
  });

  it("formats failed query", () => {
    const data: PsqlQueryResult = {
      success: false,
      rowCount: 0,
      exitCode: 1,
      duration: 15,
      error: "relation does not exist",
    };
    const output = formatPsqlQuery(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("exit code 1");
    expect(output).toContain("relation does not exist");
  });
});

describe("compactPsqlQueryMap / formatPsqlQueryCompact", () => {
  it("drops rows and columns", () => {
    const data: PsqlQueryResult = {
      success: true,
      columns: ["id"],
      rows: [{ id: "1" }],
      rowCount: 1,
      exitCode: 0,
      duration: 10,
    };
    const compact = compactPsqlQueryMap(data);
    expect(compact).not.toHaveProperty("columns");
    expect(compact).not.toHaveProperty("rows");
    expect(compact.rowCount).toBe(1);
  });

  it("formats compact successful", () => {
    expect(formatPsqlQueryCompact({ success: true, rowCount: 5, exitCode: 0, duration: 20 })).toBe(
      "psql query: 5 rows (20ms)",
    );
  });

  it("formats compact failed", () => {
    expect(
      formatPsqlQueryCompact({ success: false, rowCount: 0, exitCode: 1, duration: 15 }),
    ).toContain("FAILED");
  });
});

describe("formatPsqlListDatabases", () => {
  it("formats database list", () => {
    const data: PsqlListDatabasesResult = {
      success: true,
      databases: [
        { name: "postgres", owner: "postgres", encoding: "UTF8" },
        { name: "mydb", owner: "appuser" },
      ],
      total: 2,
      exitCode: 0,
      duration: 20,
    };
    const output = formatPsqlListDatabases(data);
    expect(output).toContain("psql: 2 databases (20ms)");
    expect(output).toContain("postgres");
    expect(output).toContain("owner=postgres");
    expect(output).toContain("encoding=UTF8");
  });

  it("formats failed list", () => {
    const data: PsqlListDatabasesResult = {
      success: false,
      total: 0,
      exitCode: 2,
      duration: 100,
      error: "connection refused",
    };
    const output = formatPsqlListDatabases(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("connection refused");
  });
});

describe("compactPsqlListDatabasesMap / formatPsqlListDatabasesCompact", () => {
  it("drops database details", () => {
    const data: PsqlListDatabasesResult = {
      success: true,
      databases: [{ name: "postgres" }],
      total: 1,
      exitCode: 0,
      duration: 10,
    };
    const compact = compactPsqlListDatabasesMap(data);
    expect(compact).not.toHaveProperty("databases");
    expect(compact.total).toBe(1);
  });

  it("formats compact", () => {
    expect(
      formatPsqlListDatabasesCompact({ success: true, total: 3, exitCode: 0, duration: 20 }),
    ).toBe("psql: 3 databases (20ms)");
  });
});

// ── MySQL formatters ────────────────────────────────────────────────

describe("formatMysqlQuery", () => {
  it("formats successful query", () => {
    const data: MysqlQueryResult = {
      success: true,
      columns: ["id", "name"],
      rows: [{ id: "1", name: "Alice" }],
      rowCount: 1,
      exitCode: 0,
      duration: 35,
    };
    const output = formatMysqlQuery(data);
    expect(output).toContain("mysql query: 1 rows (35ms)");
    expect(output).toContain("columns: id, name");
  });

  it("formats failed query", () => {
    const data: MysqlQueryResult = {
      success: false,
      rowCount: 0,
      exitCode: 1,
      duration: 12,
      error: "Table doesn't exist",
    };
    const output = formatMysqlQuery(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("Table doesn't exist");
  });
});

describe("compactMysqlQueryMap / formatMysqlQueryCompact", () => {
  it("drops rows and columns", () => {
    const data: MysqlQueryResult = {
      success: true,
      columns: ["id"],
      rows: [{ id: "1" }],
      rowCount: 1,
      exitCode: 0,
      duration: 10,
    };
    const compact = compactMysqlQueryMap(data);
    expect(compact).not.toHaveProperty("columns");
    expect(compact).not.toHaveProperty("rows");
  });

  it("formats compact", () => {
    expect(formatMysqlQueryCompact({ success: true, rowCount: 3, exitCode: 0, duration: 20 })).toBe(
      "mysql query: 3 rows (20ms)",
    );
  });
});

describe("formatMysqlListDatabases", () => {
  it("formats database list", () => {
    const data: MysqlListDatabasesResult = {
      success: true,
      databases: [{ name: "mysql" }, { name: "mydb" }],
      total: 2,
      exitCode: 0,
      duration: 15,
    };
    const output = formatMysqlListDatabases(data);
    expect(output).toContain("mysql: 2 databases (15ms)");
    expect(output).toContain("mysql");
    expect(output).toContain("mydb");
  });
});

describe("compactMysqlListDatabasesMap / formatMysqlListDatabasesCompact", () => {
  it("formats compact", () => {
    expect(
      formatMysqlListDatabasesCompact({ success: true, total: 4, exitCode: 0, duration: 10 }),
    ).toBe("mysql: 4 databases (10ms)");
  });
});

// ── Redis formatters ────────────────────────────────────────────────

describe("formatRedisPing", () => {
  it("formats successful ping", () => {
    const data: RedisPingResult = {
      success: true,
      response: "PONG",
      exitCode: 0,
      duration: 2,
    };
    expect(formatRedisPing(data)).toBe("redis PING: PONG (2ms)");
  });

  it("formats failed ping", () => {
    const data: RedisPingResult = {
      success: false,
      exitCode: 1,
      duration: 100,
      error: "Connection refused",
    };
    const output = formatRedisPing(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("Connection refused");
  });
});

describe("compactRedisPingMap / formatRedisPingCompact", () => {
  it("drops response", () => {
    const data: RedisPingResult = {
      success: true,
      response: "PONG",
      exitCode: 0,
      duration: 2,
    };
    const compact = compactRedisPingMap(data);
    expect(compact).not.toHaveProperty("response");
    expect(compact.success).toBe(true);
  });

  it("formats compact OK", () => {
    expect(formatRedisPingCompact({ success: true, exitCode: 0, duration: 2 })).toBe(
      "redis PING: OK (2ms)",
    );
  });
});

describe("formatRedisInfo", () => {
  it("formats info sections", () => {
    const data: RedisInfoResult = {
      success: true,
      sections: [
        { name: "Server", entries: { redis_version: "7.0.0", redis_mode: "standalone" } },
        { name: "Clients", entries: { connected_clients: "1" } },
      ],
      exitCode: 0,
      duration: 5,
    };
    const output = formatRedisInfo(data);
    expect(output).toContain("redis INFO: 2 sections (5ms)");
    expect(output).toContain("# Server (2 entries)");
    expect(output).toContain("redis_version: 7.0.0");
    expect(output).toContain("# Clients (1 entries)");
  });
});

describe("compactRedisInfoMap / formatRedisInfoCompact", () => {
  it("drops section details", () => {
    const data: RedisInfoResult = {
      success: true,
      sections: [{ name: "Server", entries: { redis_version: "7.0.0" } }],
      exitCode: 0,
      duration: 5,
    };
    const compact = compactRedisInfoMap(data);
    expect(compact).not.toHaveProperty("sections");
    expect(compact.sectionCount).toBe(1);
  });

  it("formats compact", () => {
    expect(
      formatRedisInfoCompact({ success: true, sectionCount: 3, exitCode: 0, duration: 5 }),
    ).toBe("redis INFO: 3 sections (5ms)");
  });
});

describe("formatRedisCommand", () => {
  it("formats successful command with response", () => {
    const data: RedisCommandResult = {
      success: true,
      response: "hello",
      exitCode: 0,
      duration: 1,
    };
    const output = formatRedisCommand(data);
    expect(output).toContain("redis command: OK (1ms)");
    expect(output).toContain("hello");
  });

  it("formats failed command", () => {
    const data: RedisCommandResult = {
      success: false,
      exitCode: 1,
      duration: 1,
      error: "unknown command",
    };
    const output = formatRedisCommand(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("unknown command");
  });
});

describe("compactRedisCommandMap / formatRedisCommandCompact", () => {
  it("drops response", () => {
    const data: RedisCommandResult = {
      success: true,
      response: "hello",
      exitCode: 0,
      duration: 1,
    };
    const compact = compactRedisCommandMap(data);
    expect(compact).not.toHaveProperty("response");
  });

  it("formats compact", () => {
    expect(formatRedisCommandCompact({ success: true, exitCode: 0, duration: 1 })).toBe(
      "redis command: OK (1ms)",
    );
  });
});

// ── MongoDB formatters ──────────────────────────────────────────────

describe("formatMongoshEval", () => {
  it("formats successful eval with output", () => {
    const data: MongoshEvalResult = {
      success: true,
      output: '[ "users", "orders" ]',
      exitCode: 0,
      duration: 120,
    };
    const output = formatMongoshEval(data);
    expect(output).toContain("mongosh eval: OK (120ms)");
    expect(output).toContain("users");
  });

  it("formats failed eval", () => {
    const data: MongoshEvalResult = {
      success: false,
      exitCode: 1,
      duration: 30,
      error: "not authorized",
    };
    const output = formatMongoshEval(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("not authorized");
  });
});

describe("compactMongoshEvalMap / formatMongoshEvalCompact", () => {
  it("drops output", () => {
    const data: MongoshEvalResult = {
      success: true,
      output: "big output",
      exitCode: 0,
      duration: 50,
    };
    const compact = compactMongoshEvalMap(data);
    expect(compact).not.toHaveProperty("output");
  });

  it("formats compact", () => {
    expect(formatMongoshEvalCompact({ success: true, exitCode: 0, duration: 50 })).toBe(
      "mongosh eval: OK (50ms)",
    );
  });
});

describe("formatMongoshStats", () => {
  it("formats successful stats", () => {
    const data: MongoshStatsResult = {
      success: true,
      db: "mydb",
      collections: 5,
      objects: 1234,
      dataSize: 567890,
      storageSize: 1234567,
      indexes: 10,
      indexSize: 45678,
      exitCode: 0,
      duration: 80,
    };
    const output = formatMongoshStats(data);
    expect(output).toContain("mongosh stats: OK (80ms)");
    expect(output).toContain("db: mydb");
    expect(output).toContain("collections: 5");
    expect(output).toContain("objects: 1234");
  });

  it("formats failed stats", () => {
    const data: MongoshStatsResult = {
      success: false,
      exitCode: 1,
      duration: 100,
      error: "ECONNREFUSED",
    };
    const output = formatMongoshStats(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("ECONNREFUSED");
  });
});

describe("compactMongoshStatsMap / formatMongoshStatsCompact", () => {
  it("keeps db and collections, drops other stats", () => {
    const data: MongoshStatsResult = {
      success: true,
      db: "mydb",
      collections: 5,
      objects: 1234,
      dataSize: 567890,
      storageSize: 1234567,
      indexes: 10,
      indexSize: 45678,
      exitCode: 0,
      duration: 80,
    };
    const compact = compactMongoshStatsMap(data);
    expect(compact.db).toBe("mydb");
    expect(compact.collections).toBe(5);
    expect(compact).not.toHaveProperty("objects");
    expect(compact).not.toHaveProperty("dataSize");
  });

  it("formats compact with db and collections", () => {
    expect(
      formatMongoshStatsCompact({
        success: true,
        db: "mydb",
        collections: 5,
        exitCode: 0,
        duration: 80,
      }),
    ).toBe("mongosh stats: OK (80ms) db=mydb collections=5");
  });

  it("formats compact without db", () => {
    expect(formatMongoshStatsCompact({ success: true, exitCode: 0, duration: 40 })).toBe(
      "mongosh stats: OK (40ms)",
    );
  });

  it("formats compact failed", () => {
    expect(formatMongoshStatsCompact({ success: false, exitCode: 1, duration: 100 })).toContain(
      "FAILED",
    );
  });
});

// ── Additional edge cases for branch coverage ───────────────────────

describe("formatPsqlQuery — edge cases", () => {
  it("formats successful query without columns", () => {
    const data: PsqlQueryResult = {
      success: true,
      rowCount: 0,
      exitCode: 0,
      duration: 5,
    };
    const output = formatPsqlQuery(data);
    expect(output).toContain("psql query: 0 rows (5ms)");
    expect(output).not.toContain("columns:");
  });

  it("formats successful query without rows", () => {
    const data: PsqlQueryResult = {
      success: true,
      columns: ["id"],
      rowCount: 0,
      exitCode: 0,
      duration: 5,
    };
    const output = formatPsqlQuery(data);
    expect(output).toContain("columns: id");
  });

  it("formats failed query without error", () => {
    const data: PsqlQueryResult = {
      success: false,
      rowCount: 0,
      exitCode: 1,
      duration: 5,
    };
    const output = formatPsqlQuery(data);
    expect(output).toContain("FAILED");
    expect(output).not.toContain("\n");
  });

  it("formats row with null values", () => {
    const data: PsqlQueryResult = {
      success: true,
      columns: ["id", "name"],
      rows: [{ id: "1", name: null }],
      rowCount: 1,
      exitCode: 0,
      duration: 10,
    };
    const output = formatPsqlQuery(data);
    expect(output).toContain("name=NULL");
  });
});

describe("formatPsqlListDatabases — edge cases", () => {
  it("formats without error on failure", () => {
    const data: PsqlListDatabasesResult = {
      success: false,
      total: 0,
      exitCode: 1,
      duration: 10,
    };
    const output = formatPsqlListDatabases(data);
    expect(output).toContain("FAILED");
    expect(output).not.toContain("\n");
  });

  it("formats databases with size field", () => {
    const data: PsqlListDatabasesResult = {
      success: true,
      databases: [{ name: "db1", size: "8MB" }],
      total: 1,
      exitCode: 0,
      duration: 10,
    };
    const output = formatPsqlListDatabases(data);
    expect(output).toContain("size=8MB");
  });

  it("formats without databases array", () => {
    const data: PsqlListDatabasesResult = {
      success: true,
      total: 0,
      exitCode: 0,
      duration: 5,
    };
    const output = formatPsqlListDatabases(data);
    expect(output).toContain("psql: 0 databases");
  });
});

describe("formatPsqlListDatabasesCompact — edge cases", () => {
  it("formats compact failed", () => {
    const output = formatPsqlListDatabasesCompact({
      success: false,
      total: 0,
      exitCode: 1,
      duration: 10,
    });
    expect(output).toContain("FAILED");
  });
});

describe("formatMysqlQuery — edge cases", () => {
  it("formats without columns", () => {
    const data: MysqlQueryResult = {
      success: true,
      rowCount: 0,
      exitCode: 0,
      duration: 5,
    };
    const output = formatMysqlQuery(data);
    expect(output).toContain("mysql query: 0 rows");
    expect(output).not.toContain("columns:");
  });

  it("formats query without error on failure", () => {
    const data: MysqlQueryResult = {
      success: false,
      rowCount: 0,
      exitCode: 1,
      duration: 5,
    };
    const output = formatMysqlQuery(data);
    expect(output).toContain("FAILED");
  });

  it("formats rows with null values", () => {
    const data: MysqlQueryResult = {
      success: true,
      columns: ["id", "name"],
      rows: [{ id: "1", name: null }],
      rowCount: 1,
      exitCode: 0,
      duration: 10,
    };
    const output = formatMysqlQuery(data);
    expect(output).toContain("name=NULL");
  });
});

describe("formatMysqlQueryCompact — edge cases", () => {
  it("formats compact failed", () => {
    const output = formatMysqlQueryCompact({
      success: false,
      rowCount: 0,
      exitCode: 1,
      duration: 5,
    });
    expect(output).toContain("FAILED");
  });
});

describe("formatMysqlListDatabases — edge cases", () => {
  it("formats failed mysql list", () => {
    const data: MysqlListDatabasesResult = {
      success: false,
      total: 0,
      exitCode: 1,
      duration: 10,
      error: "access denied",
    };
    const output = formatMysqlListDatabases(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("access denied");
  });

  it("formats failed without error", () => {
    const data: MysqlListDatabasesResult = {
      success: false,
      total: 0,
      exitCode: 1,
      duration: 10,
    };
    const output = formatMysqlListDatabases(data);
    expect(output).toContain("FAILED");
  });

  it("formats successful without databases", () => {
    const data: MysqlListDatabasesResult = {
      success: true,
      total: 0,
      exitCode: 0,
      duration: 10,
    };
    const output = formatMysqlListDatabases(data);
    expect(output).toContain("mysql: 0 databases");
  });
});

describe("formatMysqlListDatabasesCompact — edge cases", () => {
  it("formats compact failed", () => {
    const output = formatMysqlListDatabasesCompact({
      success: false,
      total: 0,
      exitCode: 1,
      duration: 10,
    });
    expect(output).toContain("FAILED");
  });
});

describe("formatRedisPing — edge cases", () => {
  it("formats ping without response", () => {
    const data: RedisPingResult = {
      success: true,
      exitCode: 0,
      duration: 2,
    };
    const output = formatRedisPing(data);
    expect(output).toBe("redis PING: OK (2ms)");
  });

  it("formats failed ping without error", () => {
    const data: RedisPingResult = {
      success: false,
      exitCode: 1,
      duration: 100,
    };
    const output = formatRedisPing(data);
    expect(output).toContain("FAILED");
    expect(output).not.toContain("\n");
  });
});

describe("formatRedisPingCompact — edge cases", () => {
  it("formats compact failed", () => {
    const output = formatRedisPingCompact({
      success: false,
      exitCode: 1,
      duration: 100,
    });
    expect(output).toContain("FAILED");
  });
});

describe("formatRedisInfo — edge cases", () => {
  it("formats failed info", () => {
    const data: RedisInfoResult = {
      success: false,
      exitCode: 1,
      duration: 5,
      error: "NOAUTH",
    };
    const output = formatRedisInfo(data);
    expect(output).toContain("FAILED");
    expect(output).toContain("NOAUTH");
  });

  it("formats failed info without error", () => {
    const data: RedisInfoResult = {
      success: false,
      exitCode: 1,
      duration: 5,
    };
    const output = formatRedisInfo(data);
    expect(output).toContain("FAILED");
  });

  it("formats info without sections", () => {
    const data: RedisInfoResult = {
      success: true,
      exitCode: 0,
      duration: 5,
    };
    const output = formatRedisInfo(data);
    expect(output).toContain("redis INFO: 0 sections");
  });
});

describe("formatRedisInfoCompact — edge cases", () => {
  it("formats compact failed", () => {
    const output = formatRedisInfoCompact({
      success: false,
      sectionCount: 0,
      exitCode: 1,
      duration: 5,
    });
    expect(output).toContain("FAILED");
  });
});

describe("formatRedisCommand — edge cases", () => {
  it("formats success without response", () => {
    const data: RedisCommandResult = {
      success: true,
      exitCode: 0,
      duration: 1,
    };
    const output = formatRedisCommand(data);
    expect(output).toBe("redis command: OK (1ms)");
  });

  it("formats failed without error", () => {
    const data: RedisCommandResult = {
      success: false,
      exitCode: 1,
      duration: 1,
    };
    const output = formatRedisCommand(data);
    expect(output).toContain("FAILED");
    expect(output).not.toContain("\n");
  });
});

describe("formatRedisCommandCompact — edge cases", () => {
  it("formats compact failed", () => {
    const output = formatRedisCommandCompact({
      success: false,
      exitCode: 1,
      duration: 1,
    });
    expect(output).toContain("FAILED");
  });
});

describe("formatMongoshEval — edge cases", () => {
  it("formats success without output", () => {
    const data: MongoshEvalResult = {
      success: true,
      exitCode: 0,
      duration: 50,
    };
    const output = formatMongoshEval(data);
    expect(output).toBe("mongosh eval: OK (50ms)");
  });

  it("formats failed without error", () => {
    const data: MongoshEvalResult = {
      success: false,
      exitCode: 1,
      duration: 30,
    };
    const output = formatMongoshEval(data);
    expect(output).toContain("FAILED");
    expect(output).not.toContain("\n");
  });
});

describe("formatMongoshEvalCompact — edge cases", () => {
  it("formats compact failed", () => {
    const output = formatMongoshEvalCompact({
      success: false,
      exitCode: 1,
      duration: 30,
    });
    expect(output).toContain("FAILED");
  });
});

describe("formatMongoshStats — edge cases", () => {
  it("formats stats without optional fields", () => {
    const data: MongoshStatsResult = {
      success: true,
      exitCode: 0,
      duration: 80,
    };
    const output = formatMongoshStats(data);
    expect(output).toBe("mongosh stats: OK (80ms)");
  });

  it("formats failed stats without error", () => {
    const data: MongoshStatsResult = {
      success: false,
      exitCode: 1,
      duration: 100,
    };
    const output = formatMongoshStats(data);
    expect(output).toContain("FAILED");
    expect(output).not.toContain("\n");
  });
});
