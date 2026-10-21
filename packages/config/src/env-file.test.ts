import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadEnvFile, parseEnvFile } from "./index.js";

const touchedKeys = new Set<string>();

function uniqueKey(name: string): string {
  const key = `FORGE_ENV_TEST_${name}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  touchedKeys.add(key);
  return key;
}

afterEach(() => {
  for (const key of touchedKeys) {
    Reflect.deleteProperty(process.env, key);
  }
  touchedKeys.clear();
});

describe("parseEnvFile", () => {
  it("parses comments, export, quotes, inline comments, and escaped values", () => {
    const result = parseEnvFile(
      [
        "# comment",
        "",
        "export PLAIN=value",
        "SINGLE='single value'",
        'DOUBLE="line\\nnext\\ttab"',
        "INLINE=value # comment",
        "HASH_IN_VALUE=abc#def",
        'QUOTED_COMMENT="quoted value" # comment',
        "SINGLE_COMMENT='single value' # comment",
      ].join("\n"),
    );

    expect(result.errors).toEqual([]);
    expect(result.values.get("PLAIN")).toBe("value");
    expect(result.values.get("SINGLE")).toBe("single value");
    expect(result.values.get("DOUBLE")).toBe("line\nnext\ttab");
    expect(result.values.get("INLINE")).toBe("value");
    expect(result.values.get("HASH_IN_VALUE")).toBe("abc#def");
    expect(result.values.get("QUOTED_COMMENT")).toBe("quoted value");
    expect(result.values.get("SINGLE_COMMENT")).toBe("single value");
  });

  it("reports malformed lines without echoing values", () => {
    const result = parseEnvFile(
      ['MISSING_EQUALS', '=value', 'BAD-NAME=value', 'UNTERMINATED="secret'].join("\n"),
    );

    expect(result.errors).toHaveLength(4);
    expect(result.errors.join(" ")).not.toContain("secret");
  });
});

describe("loadEnvFile", () => {
  it("applies variables that are not already present and preserves existing ones", () => {
    const directory = mkdtempSync(join(tmpdir(), "forge-env-"));
    const file = join(directory, ".env");
    const newKey = uniqueKey("NEW");
    const existingKey = uniqueKey("EXISTING");
    process.env[existingKey] = "from-shell";
    writeFileSync(file, `${newKey}=from-file\n${existingKey}=from-file\n`, "utf8");

    try {
      const result = loadEnvFile(file);
      expect(result.loaded).toBe(true);
      expect(result.applied).toContain(newKey);
      expect(result.preserved).toContain(existingKey);
      expect(process.env[newKey]).toBe("from-file");
      expect(process.env[existingKey]).toBe("from-shell");
      expect(result.errors).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("returns a non-error result when the file is absent", () => {
    const directory = mkdtempSync(join(tmpdir(), "forge-env-"));
    const missing = join(directory, "missing.env");

    try {
      const result = loadEnvFile(missing);
      expect(result.loaded).toBe(false);
      expect(result.errors).toEqual([]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
