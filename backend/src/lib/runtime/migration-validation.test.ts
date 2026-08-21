import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { acceptedMigrationHashes, validateMigrationJournal } from "./migration-validation";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

describe("migration journal validation", () => {
  it("accepts LF and CRLF forms of identical migration SQL", () => {
    const sql = "create table example (\n  id uuid primary key\n);\n";
    const expected = [{ tag: "0000_example", createdAt: "1000", acceptedHashes: acceptedMigrationHashes(sql) }];
    expect(() => validateMigrationJournal("live", [{ hash: hash(sql), created_at: "1000" }], expected)).not.toThrow();
    expect(() => validateMigrationJournal("demo", [{ hash: hash(sql.replace(/\n/g, "\r\n")), created_at: "1000" }], expected)).not.toThrow();
  });

  it("rejects actual SQL changes", () => {
    const expected = [{ tag: "0000_example", createdAt: "1000", acceptedHashes: acceptedMigrationHashes("select 1;\n") }];
    expect(() => validateMigrationJournal("live", [{ hash: hash("select 2;\n"), created_at: "1000" }], expected)).toThrow(/differs from the checked-in SQL/i);
  });

  it("rejects a changed migration timeline", () => {
    const expected = [{ tag: "0000_example", createdAt: "1000", acceptedHashes: acceptedMigrationHashes("select 1;\n") }];
    expect(() => validateMigrationJournal("live", [{ hash: hash("select 1;\n"), created_at: "2000" }], expected)).toThrow(/timestamp does not match/i);
  });
});
