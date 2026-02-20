import { describe, it, expect } from "vitest";
import {
  parsePsqlQuery,
  parsePsqlListDatabases,
  parseMysqlQuery,
  parseMysqlListDatabases,
  parseRedisPing,
  parseRedisInfo,
  parseRedisCommand,
  parseMongoshEval,
  parseMongoshStats,
} from "../src/lib/parsers.js";

// ── PostgreSQL parsers ──────────────────────────────────────────────

describe("parsePsqlQuery", () => {
  it("parses successful query with rows", () => {
    const stdout = [
      "id|name|email",
      "1|Alice|alice@example.com",
      "2|Bob|bob@example.com",
      "(2 rows)",
      "",
    ].join("\n");

    const result = parsePsqlQuery(stdout, "", 0, 42);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual(["id", "name", "email"]);
    expect(result.rowCount).toBe(2);
    expect(result.rows).toEqual([
      { id: "1", name: "Alice", email: "alice@example.com" },
      { id: "2", name: "Bob", email: "bob@example.com" },
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBe(42);
  });

  it("parses query with NULL values", () => {
    const stdout = ["id|name|email", "1|Alice|", "2||bob@example.com", "(2 rows)"].join("\n");

    const result = parsePsqlQuery(stdout, "", 0, 10);

    expect(result.success).toBe(true);
    expect(result.rows![0]).toEqual({ id: "1", name: "Alice", email: null });
    expect(result.rows![1]).toEqual({ id: "2", name: null, email: "bob@example.com" });
  });

  it("parses empty result set", () => {
    const stdout = "";

    const result = parsePsqlQuery(stdout, "", 0, 5);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it("parses single-column result", () => {
    const stdout = ["count", "42", "(1 row)"].join("\n");

    const result = parsePsqlQuery(stdout, "", 0, 8);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual(["count"]);
    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([{ count: "42" }]);
  });

  it("handles failed query", () => {
    const stderr =
      'ERROR:  relation "nonexistent" does not exist\nLINE 1: SELECT * FROM nonexistent';

    const result = parsePsqlQuery("", stderr, 1, 15);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.rowCount).toBe(0);
    expect(result.error).toContain("nonexistent");
  });

  it("handles headers-only result (no data rows)", () => {
    const stdout = ["id|name|email", "(0 rows)"].join("\n");

    const result = parsePsqlQuery(stdout, "", 0, 3);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual(["id", "name", "email"]);
    expect(result.rowCount).toBe(0);
    expect(result.rows).toEqual([]);
  });
});

describe("parsePsqlListDatabases", () => {
  it("parses database list with multiple columns", () => {
    const stdout = [
      "Name|Owner|Encoding|Collate|Ctype|Access privileges",
      "postgres|postgres|UTF8|en_US.utf8|en_US.utf8|",
      "template0|postgres|UTF8|en_US.utf8|en_US.utf8|=c/postgres",
      "mydb|appuser|UTF8|en_US.utf8|en_US.utf8|",
      "(3 rows)",
    ].join("\n");

    const result = parsePsqlListDatabases(stdout, "", 0, 20);

    expect(result.success).toBe(true);
    expect(result.total).toBe(3);
    expect(result.databases![0]).toEqual({
      name: "postgres",
      owner: "postgres",
      encoding: "UTF8",
      collation: "en_US.utf8",
      ctype: "en_US.utf8",
    });
    expect(result.databases![2].name).toBe("mydb");
    expect(result.databases![2].owner).toBe("appuser");
  });

  it("handles empty database list", () => {
    const stdout = "Name|Owner|Encoding|Collate|Ctype|Access privileges\n(0 rows)\n";

    const result = parsePsqlListDatabases(stdout, "", 0, 5);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.databases).toEqual([]);
  });

  it("handles failed connection", () => {
    const stderr =
      'psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed';

    const result = parsePsqlListDatabases("", stderr, 2, 100);

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.error).toContain("connection to server");
  });
});

// ── MySQL parsers ───────────────────────────────────────────────────

describe("parseMysqlQuery", () => {
  it("parses successful query with tab-separated output", () => {
    const stdout = [
      "id\tname\temail",
      "1\tAlice\talice@example.com",
      "2\tBob\tbob@example.com",
    ].join("\n");

    const result = parseMysqlQuery(stdout, "", 0, 35);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual(["id", "name", "email"]);
    expect(result.rowCount).toBe(2);
    expect(result.rows).toEqual([
      { id: "1", name: "Alice", email: "alice@example.com" },
      { id: "2", name: "Bob", email: "bob@example.com" },
    ]);
  });

  it("parses NULL values in mysql output", () => {
    const stdout = ["id\tname", "1\tNULL", "2\tBob"].join("\n");

    const result = parseMysqlQuery(stdout, "", 0, 10);

    expect(result.success).toBe(true);
    expect(result.rows![0]).toEqual({ id: "1", name: null });
    expect(result.rows![1]).toEqual({ id: "2", name: "Bob" });
  });

  it("handles empty result", () => {
    const result = parseMysqlQuery("", "", 0, 5);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it("handles failed query", () => {
    const stderr = "ERROR 1146 (42S02) at line 1: Table 'mydb.nonexistent' doesn't exist";

    const result = parseMysqlQuery("", stderr, 1, 12);

    expect(result.success).toBe(false);
    expect(result.error).toContain("nonexistent");
    expect(result.rowCount).toBe(0);
  });

  it("parses single-column result", () => {
    const stdout = ["count(*)", "42"].join("\n");

    const result = parseMysqlQuery(stdout, "", 0, 8);

    expect(result.success).toBe(true);
    expect(result.columns).toEqual(["count(*)"]);
    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([{ "count(*)": "42" }]);
  });
});

describe("parseMysqlListDatabases", () => {
  it("parses SHOW DATABASES output", () => {
    const stdout = ["Database", "information_schema", "mysql", "performance_schema", "mydb"].join(
      "\n",
    );

    const result = parseMysqlListDatabases(stdout, "", 0, 15);

    expect(result.success).toBe(true);
    expect(result.total).toBe(4);
    expect(result.databases).toEqual([
      { name: "information_schema" },
      { name: "mysql" },
      { name: "performance_schema" },
      { name: "mydb" },
    ]);
  });

  it("handles empty database list", () => {
    const stdout = "Database\n";

    const result = parseMysqlListDatabases(stdout, "", 0, 5);

    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
    expect(result.databases).toEqual([]);
  });

  it("handles failed connection", () => {
    const stderr = "ERROR 2002 (HY000): Can't connect to local MySQL server";

    const result = parseMysqlListDatabases("", stderr, 1, 50);

    expect(result.success).toBe(false);
    expect(result.total).toBe(0);
    expect(result.error).toContain("Can't connect");
  });
});

// ── Redis parsers ───────────────────────────────────────────────────

describe("parseRedisPing", () => {
  it("parses successful PONG response", () => {
    const result = parseRedisPing("PONG\n", "", 0, 2);

    expect(result.success).toBe(true);
    expect(result.response).toBe("PONG");
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBe(2);
  });

  it("handles non-PONG response as not successful", () => {
    const result = parseRedisPing("NOAUTH Authentication required.\n", "", 0, 3);

    expect(result.success).toBe(false);
    expect(result.response).toBe("NOAUTH Authentication required.");
  });

  it("handles failed connection", () => {
    const stderr = "Could not connect to Redis at 127.0.0.1:6379: Connection refused";

    const result = parseRedisPing("", stderr, 1, 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Connection refused");
  });
});

describe("parseRedisInfo", () => {
  it("parses multi-section INFO output", () => {
    const stdout = [
      "# Server",
      "redis_version:7.0.0",
      "redis_mode:standalone",
      "os:Linux 5.15.0",
      "",
      "# Clients",
      "connected_clients:1",
      "blocked_clients:0",
      "",
      "# Memory",
      "used_memory:1048576",
      "used_memory_human:1.00M",
      "",
    ].join("\n");

    const result = parseRedisInfo(stdout, "", 0, 5);

    expect(result.success).toBe(true);
    expect(result.sections).toHaveLength(3);

    expect(result.sections![0].name).toBe("Server");
    expect(result.sections![0].entries["redis_version"]).toBe("7.0.0");
    expect(result.sections![0].entries["redis_mode"]).toBe("standalone");
    expect(result.sections![0].entries["os"]).toBe("Linux 5.15.0");

    expect(result.sections![1].name).toBe("Clients");
    expect(result.sections![1].entries["connected_clients"]).toBe("1");

    expect(result.sections![2].name).toBe("Memory");
    expect(result.sections![2].entries["used_memory"]).toBe("1048576");
    expect(result.sections![2].entries["used_memory_human"]).toBe("1.00M");
  });

  it("parses single-section INFO output", () => {
    const stdout = ["# Server", "redis_version:7.0.0", "redis_mode:standalone", ""].join("\n");

    const result = parseRedisInfo(stdout, "", 0, 3);

    expect(result.success).toBe(true);
    expect(result.sections).toHaveLength(1);
    expect(result.sections![0].name).toBe("Server");
    expect(Object.keys(result.sections![0].entries)).toHaveLength(2);
  });

  it("handles empty output", () => {
    const result = parseRedisInfo("", "", 0, 2);

    expect(result.success).toBe(true);
    expect(result.sections).toEqual([]);
  });

  it("handles failed connection", () => {
    const stderr = "Could not connect to Redis at 127.0.0.1:6379: Connection refused";

    const result = parseRedisInfo("", stderr, 1, 50);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Connection refused");
  });
});

describe("parseRedisCommand", () => {
  it("parses simple GET response", () => {
    const result = parseRedisCommand("hello world\n", "", 0, 1);

    expect(result.success).toBe(true);
    expect(result.response).toBe("hello world");
  });

  it("parses DBSIZE response", () => {
    const result = parseRedisCommand("(integer) 42\n", "", 0, 1);

    expect(result.success).toBe(true);
    expect(result.response).toBe("(integer) 42");
  });

  it("parses KEYS response (multi-line)", () => {
    const stdout = ['1) "key1"', '2) "key2"', '3) "key3"'].join("\n");

    const result = parseRedisCommand(stdout, "", 0, 2);

    expect(result.success).toBe(true);
    expect(result.response).toContain("key1");
    expect(result.response).toContain("key3");
  });

  it("handles nil response", () => {
    const result = parseRedisCommand("(nil)\n", "", 0, 1);

    expect(result.success).toBe(true);
    expect(result.response).toBe("(nil)");
  });

  it("handles empty response", () => {
    const result = parseRedisCommand("", "", 0, 1);

    expect(result.success).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("handles error response", () => {
    const stderr = "(error) ERR unknown command 'BADCMD'";

    const result = parseRedisCommand("", stderr, 1, 1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("unknown command");
  });
});

// ── MongoDB parsers ─────────────────────────────────────────────────

describe("parseMongoshEval", () => {
  it("parses successful eval output", () => {
    const stdout = '[ "users", "orders", "products" ]\n';

    const result = parseMongoshEval(stdout, "", 0, 120);

    expect(result.success).toBe(true);
    expect(result.output).toBe('[ "users", "orders", "products" ]');
    expect(result.duration).toBe(120);
  });

  it("handles empty output", () => {
    const result = parseMongoshEval("", "", 0, 50);

    expect(result.success).toBe(true);
    expect(result.output).toBeUndefined();
  });

  it("handles failed eval", () => {
    const stderr = "MongoServerError: not authorized on admin to execute command";

    const result = parseMongoshEval("", stderr, 1, 30);

    expect(result.success).toBe(false);
    expect(result.error).toContain("not authorized");
  });

  it("parses multi-line output", () => {
    const stdout = ["{", '  _id: ObjectId("abc123"),', '  name: "test"', "}"].join("\n");

    const result = parseMongoshEval(stdout, "", 0, 25);

    expect(result.success).toBe(true);
    expect(result.output).toContain("_id: ObjectId");
  });
});

describe("parseMongoshStats", () => {
  it("parses valid JSON stats output", () => {
    const stdout = JSON.stringify({
      db: "mydb",
      collections: 5,
      objects: 1234,
      dataSize: 567890,
      storageSize: 1234567,
      indexes: 10,
      indexSize: 45678,
    });

    const result = parseMongoshStats(stdout, "", 0, 80);

    expect(result.success).toBe(true);
    expect(result.db).toBe("mydb");
    expect(result.collections).toBe(5);
    expect(result.objects).toBe(1234);
    expect(result.dataSize).toBe(567890);
    expect(result.storageSize).toBe(1234567);
    expect(result.indexes).toBe(10);
    expect(result.indexSize).toBe(45678);
    expect(result.raw).toBeDefined();
  });

  it("handles non-JSON output gracefully", () => {
    const stdout = "some non-json output from mongosh\n";

    const result = parseMongoshStats(stdout, "", 0, 50);

    expect(result.success).toBe(true);
    expect(result.raw).toBe("some non-json output from mongosh");
    expect(result.db).toBeUndefined();
    expect(result.collections).toBeUndefined();
  });

  it("handles failed stats command", () => {
    const stderr = "MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017";

    const result = parseMongoshStats("", stderr, 1, 100);

    expect(result.success).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("handles partial JSON with missing fields", () => {
    const stdout = JSON.stringify({
      db: "testdb",
      collections: 3,
    });

    const result = parseMongoshStats(stdout, "", 0, 40);

    expect(result.success).toBe(true);
    expect(result.db).toBe("testdb");
    expect(result.collections).toBe(3);
    expect(result.objects).toBeUndefined();
    expect(result.dataSize).toBeUndefined();
  });

  it("handles empty output", () => {
    const result = parseMongoshStats("", "", 0, 10);

    expect(result.success).toBe(true);
    expect(result.raw).toBeUndefined();
  });
});
