import { describe, it, expect } from "vitest";
import { columnKind, selectExpression, sqlLiteral } from "./databaseDump";

/**
 * The value rules of the database export. The full export and restore was
 * rehearsed against MySQL 9.7.2 on 15 October 2026 (every table identical
 * by CHECKSUM TABLE, row count and SHOW CREATE TABLE); these pin the rules
 * that rehearsal depended on.
 */
describe("column kinds", () => {
  it("knows every type in the website schema and the common others", () => {
    for (const t of ["int", "bigint", "tinyint", "decimal", "float", "double", "year"]) expect(columnKind(t)).toBe("number");
    for (const t of ["varchar", "text", "mediumtext", "longtext", "enum", "set", "timestamp", "datetime", "date", "time", "char"]) expect(columnKind(t)).toBe("text");
    for (const t of ["binary", "varbinary", "blob", "longblob"]) expect(columnKind(t)).toBe("binary");
    expect(columnKind("bit")).toBe("bit");
    expect(columnKind("json")).toBe("json");
    expect(columnKind("VARCHAR")).toBe("text");
  });

  it("stops on a type it does not handle rather than write a backup that might not restore", () => {
    expect(() => columnKind("geometry")).toThrow(/not handled by the database export/);
    expect(() => columnKind("vector")).toThrow(/not handled/);
  });
});

describe("reading", () => {
  it("reads binary as hex, bit as a number and JSON as text; everything else as it is", () => {
    expect(selectExpression({ name: "blb", kind: "binary" })).toBe("HEX(`blb`)");
    expect(selectExpression({ name: "bt", kind: "bit" })).toBe("CAST(`bt` AS UNSIGNED)");
    expect(selectExpression({ name: "js", kind: "json" })).toBe("CAST(`js` AS CHAR CHARACTER SET utf8mb4)");
    expect(selectExpression({ name: "odd`name", kind: "text" })).toBe("`odd``name`");
  });
});

describe("writing", () => {
  it("writes NULL as NULL whatever the kind", () => {
    for (const k of ["number", "bit", "binary", "json", "text"] as const) expect(sqlLiteral(k, null)).toBe("NULL");
  });

  it("writes numbers unquoted, exactly as the server rendered them", () => {
    expect(sqlLiteral("number", "-9223372036854775808")).toBe("-9223372036854775808");
    expect(sqlLiteral("number", "18446744073709551615")).toBe("18446744073709551615");
    expect(sqlLiteral("number", "-12345678901234567890.0123456789")).toBe("-12345678901234567890.0123456789");
    expect(sqlLiteral("number", "1.7976931348623157e308")).toBe("1.7976931348623157e308");
    expect(sqlLiteral("number", "-1.5e-30")).toBe("-1.5e-30");
  });

  it("refuses anything in a number column that is not a number", () => {
    expect(() => sqlLiteral("number", "1; DROP TABLE users")).toThrow(/Unexpected text in a numeric column/);
    expect(() => sqlLiteral("number", "")).toThrow();
  });

  it("writes binary as a hex literal and refuses anything else", () => {
    expect(sqlLiteral("binary", "00275C0A")).toBe("X'00275C0A'");
    expect(sqlLiteral("binary", "")).toBe("X''");
    expect(() => sqlLiteral("binary", "00'; --")).toThrow(/Unexpected hex/);
  });

  it("escapes text so quotes, backslashes, newlines, NUL and Ctrl-Z survive", () => {
    expect(sqlLiteral("text", "O'Brien \"q\" back\\slash")).toBe("'O\\'Brien \\\"q\\\" back\\\\slash'");
    expect(sqlLiteral("text", "a\nb\r\n\tc")).toBe("'a\\nb\\r\\n\\tc'");
    expect(sqlLiteral("text", "nul\0z\x1a")).toBe("'nul\\0z\\Z'");
    expect(sqlLiteral("text", "🎓 العربية ƙ")).toBe("'🎓 العربية ƙ'");
    // A value can never put a raw line break into the file.
    expect(sqlLiteral("json", '{"a":"x\ny"}')).not.toMatch(/\n/);
  });
});
