/**
 * A complete, restorable SQL export of the website's MySQL database, made
 * from inside the application so it needs no mysqldump binary on Railway.
 *
 * Tom Arrington, 15 October 2026: a copy of the database outside Railway,
 * alongside Railway's own volume backups. This file makes the export; the
 * nightly run in databaseBackup.ts stores it in Google Drive.
 *
 * What it guarantees:
 *   - One consistent moment. Every table is read inside a single
 *     REPEATABLE READ transaction opened WITH CONSISTENT SNAPSHOT, so a
 *     form submitted halfway through cannot leave two tables disagreeing.
 *   - Every base table, including drizzle's own __drizzle_migrations, so a
 *     restored database knows which migrations it already has.
 *   - Exact values. Each column is read as the server's own text for it
 *     (binary columns as hex), TIMESTAMPs in UTC on both sides, and numbers
 *     unquoted. A column type this file does not know stops the export
 *     rather than risk writing something that would not restore.
 *   - Checked. Every table's streamed row count must equal its COUNT(*)
 *     inside the same snapshot, and the file ends with a completion line so
 *     a truncated copy is obvious.
 *
 * The output restores into an EMPTY database with the standard client:
 *   gunzip -c database.sql.gz | mysql --host=HOST --port=PORT --user=USER --password DATABASE
 * It carries no DROP TABLE, so pointed at a database that already has
 * these tables it stops at the first CREATE rather than overwrite anything.
 */
import { createHash } from "crypto";
import { once } from "events";
import { createGzip } from "zlib";
import mysql from "mysql2";

export const DUMP_FILE_NAME = "database.sql.gz";

/** Kept well under MySQL's default 64 MB max_allowed_packet. */
const INSERT_BATCH_BYTES = 512 * 1024;
const INSERT_BATCH_ROWS = 500;
/** Far above today's size. Past it the in-memory approach needs revisiting, so stop and say so. */
export const MAX_COMPRESSED_BYTES = 250 * 1024 * 1024;

export type ColumnKind = "number" | "bit" | "binary" | "json" | "text";

const NUMBER_TYPES = ["tinyint", "smallint", "mediumint", "int", "integer", "bigint", "decimal", "numeric", "float", "double", "real", "year"];
const BINARY_TYPES = ["binary", "varbinary", "tinyblob", "blob", "mediumblob", "longblob"];
const TEXT_TYPES = ["char", "varchar", "tinytext", "text", "mediumtext", "longtext", "enum", "set", "date", "datetime", "timestamp", "time"];

/** How a column is read and written. Throws for a type this export does not handle. */
export function columnKind(dataType: string): ColumnKind {
  const t = dataType.toLowerCase();
  if (NUMBER_TYPES.includes(t)) return "number";
  if (t === "bit") return "bit";
  if (BINARY_TYPES.includes(t)) return "binary";
  if (t === "json") return "json";
  if (TEXT_TYPES.includes(t)) return "text";
  throw new Error(`Column type "${dataType}" is not handled by the database export; it stopped rather than write a backup that might not restore.`);
}

export interface DumpColumn { name: string; kind: ColumnKind }

/** The SELECT expression for a column, shaped so every value arrives as plain text. */
export function selectExpression(c: DumpColumn): string {
  const id = mysql.escapeId(c.name);
  switch (c.kind) {
    case "binary": return `HEX(${id})`;
    case "bit": return `CAST(${id} AS UNSIGNED)`;
    case "json": return `CAST(${id} AS CHAR CHARACTER SET utf8mb4)`;
    default: return id;
  }
}

/** The SQL literal for a value read by selectExpression. */
export function sqlLiteral(kind: ColumnKind, value: string | null): string {
  if (value === null) return "NULL";
  switch (kind) {
    case "number":
    case "bit":
      // The server's own rendering of a number is a valid literal; refuse anything else.
      if (!/^-?(\d+(\.\d*)?|\.\d+)(e[-+]?\d+)?$/i.test(value)) throw new Error(`Unexpected numeric text "${value.slice(0, 40)}".`);
      return value;
    case "binary":
      if (!/^[0-9A-F]*$/i.test(value)) throw new Error("Unexpected hex text for a binary column.");
      return `X'${value}'`;
    default:
      return mysql.escape(value);
  }
}

export interface DumpTable { name: string; rows: number; columns: number }
export interface DumpResult {
  bytes: Buffer;
  uncompressedBytes: number;
  sha256: string;
  md5: string;
  database: string;
  serverVersion: string;
  tables: DumpTable[];
  totalRows: number;
  migrationsApplied: number | null;
  otherObjects: { views: number; triggers: number; routines: number; events: number };
  startedAt: Date;
  finishedAt: Date;
}

type Row = Array<string | null>;

/** Make the export. Opens and closes its own connection; never writes to the database. */
export async function dumpDatabase(databaseUrl: string, now: () => Date = () => new Date()): Promise<DumpResult> {
  const startedAt = now();
  const conn = mysql.createConnection({
    uri: databaseUrl,
    // Every selected expression is text by construction; take the server's text as it is.
    typeCast: (field: { string: () => string | null }) => field.string(),
    connectTimeout: 20_000,
  });
  const q = conn.promise();
  let failed = false;
  const rows = async (sql: string, params: unknown[] = []): Promise<Row[]> => {
    const [result] = await q.query({ sql, rowsAsArray: true }, params);
    return result as unknown as Row[];
  };
  try {
    await rows("SET SESSION time_zone = '+00:00'");
    await rows("SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    await rows("START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY");

    const [[database, serverVersion]] = await rows("SELECT DATABASE(), VERSION()");
    if (!database) throw new Error("The database URL names no database.");
    const tableNames = (await rows("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", [database])).map(r => r[0]!);
    const [[views]] = await rows("SELECT COUNT(*) FROM information_schema.VIEWS WHERE TABLE_SCHEMA = ?", [database]);
    const [[triggers]] = await rows("SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?", [database]);
    const [[routines]] = await rows("SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?", [database]);
    const [[events]] = await rows("SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA = ?", [database]);

    const gzip = createGzip({ level: 9 });
    const chunks: Buffer[] = [];
    let compressed = 0;
    gzip.on("data", (c: Buffer) => { chunks.push(c); compressed += c.length; });
    const finished = new Promise<void>((resolve, reject) => { gzip.on("end", () => resolve()); gzip.on("error", reject); });
    finished.catch(() => undefined);
    let uncompressedBytes = 0;
    const write = async (s: string) => {
      uncompressedBytes += Buffer.byteLength(s, "utf8");
      if (compressed > MAX_COMPRESSED_BYTES) throw new Error(`The export passed ${MAX_COMPRESSED_BYTES / 1024 / 1024} MB compressed; the in-memory backup needs revisiting before it can carry this much.`);
      if (!gzip.write(s, "utf8")) await once(gzip, "drain");
    };

    await write([
      "-- World Student Advisors: website database backup",
      `-- Database ${database}, MySQL ${serverVersion}, exported ${startedAt.toISOString()} from one consistent snapshot.`,
      "-- Restore into an EMPTY database:",
      "--   gunzip -c database.sql.gz | mysql --host=HOST --port=PORT --user=USER --password DATABASE",
      "",
      "SET NAMES utf8mb4;",
      "SET @OLD_TIME_ZONE=@@TIME_ZONE, TIME_ZONE='+00:00';",
      "SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;",
      "SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;",
      "SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';",
      "",
    ].join("\n") + "\n");

    const tables: DumpTable[] = [];
    for (const table of tableNames) {
      const id = mysql.escapeId(table);
      const [[, createSql]] = await rows(`SHOW CREATE TABLE ${id}`);
      const columnRows = await rows("SELECT COLUMN_NAME, DATA_TYPE, EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION", [database, table]);
      // Generated columns are computed by the server and cannot be inserted.
      const columns: DumpColumn[] = columnRows
        .filter(([, , extra]) => !/\b(VIRTUAL|STORED) GENERATED\b/i.test(extra ?? ""))
        .map(([name, dataType]) => ({ name: name!, kind: columnKind(dataType!) }));
      const [[expected]] = await rows(`SELECT COUNT(*) FROM ${id}`);

      await write(`--\n-- Table ${id}\n--\n${createSql};\n\n`);
      const insertHead = `INSERT INTO ${id} (${columns.map(c => mysql.escapeId(c.name)).join(", ")}) VALUES\n`;
      let batch: string[] = [];
      let batchBytes = 0;
      const flush = async () => {
        if (!batch.length) return;
        await write(insertHead + batch.join(",\n") + ";\n");
        batch = []; batchBytes = 0;
      };
      let count = 0;
      if (columns.length) {
        const stream = conn.query({ sql: `SELECT ${columns.map(selectExpression).join(", ")} FROM ${id}`, rowsAsArray: true }).stream({ highWaterMark: 200 });
        for await (const row of stream as AsyncIterable<Row>) {
          const tuple = `(${row.map((v, i) => sqlLiteral(columns[i].kind, v)).join(",")})`;
          batch.push(tuple);
          batchBytes += tuple.length;
          count += 1;
          if (batch.length >= INSERT_BATCH_ROWS || batchBytes >= INSERT_BATCH_BYTES) await flush();
        }
      }
      await flush();
      if (String(count) !== String(expected)) throw new Error(`Table ${table}: streamed ${count} rows but COUNT(*) in the same snapshot says ${expected}.`);
      await write("\n");
      tables.push({ name: table, rows: count, columns: columns.length });
    }

    let migrationsApplied: number | null = null;
    if (tableNames.includes("__drizzle_migrations")) migrationsApplied = tables.find(t => t.name === "__drizzle_migrations")!.rows;
    await rows("COMMIT");

    const totalRows = tables.reduce((n, t) => n + t.rows, 0);
    await write([
      "SET SQL_MODE=@OLD_SQL_MODE;",
      "SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;",
      "SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;",
      "SET TIME_ZONE=@OLD_TIME_ZONE;",
      "",
      `-- WSA database backup complete: ${tables.length} tables, ${totalRows} rows.`,
    ].join("\n") + "\n");
    gzip.end();
    await finished;

    const bytes = Buffer.concat(chunks);
    return {
      bytes,
      uncompressedBytes,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      md5: createHash("md5").update(bytes).digest("hex"),
      database,
      serverVersion: serverVersion ?? "unknown",
      tables,
      totalRows,
      migrationsApplied,
      otherObjects: { views: Number(views), triggers: Number(triggers), routines: Number(routines), events: Number(events) },
      startedAt,
      finishedAt: now(),
    };
  } catch (error) {
    // A query may still be streaming; drop the connection rather than wait on it.
    failed = true;
    conn.destroy();
    throw error;
  } finally {
    if (!failed) await q.end().catch(() => conn.destroy());
  }
}
