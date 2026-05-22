/**
 * storage.ts — JSON file persistence for the SCP Golf alpha.
 *
 * The alpha has no database. All state lives in src/data/*.json. These helpers
 * resolve paths relative to the data directory, fail with readable errors, and
 * never throw an unhandled exception that would corrupt the MCP stdio stream.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
// src/core -> src/data  (and dist/core -> dist/data once compiled)
const DATA_DIR = join(HERE, "..", "data");

function resolve(relativePath: string): string {
  return join(DATA_DIR, relativePath);
}

/** Read and parse a JSON file. Throws a readable error if missing/invalid. */
export function readJsonFile<T>(relativePath: string): T {
  const full = resolve(relativePath);
  if (!existsSync(full)) {
    throw new Error(
      `SCP Golf: data file not found: ${relativePath}. ` +
        `Expected it at ${full}. The alpha ships its own synthetic data — ` +
        `check that src/data/ was packaged correctly.`,
    );
  }
  try {
    return JSON.parse(readFileSync(full, "utf-8")) as T;
  } catch (err) {
    throw new Error(
      `SCP Golf: failed to parse ${relativePath} as JSON: ${
        (err as Error).message
      }`,
    );
  }
}

/** Write a value as pretty-printed JSON. */
export function writeJsonFile<T>(relativePath: string, data: T): void {
  const full = resolve(relativePath);
  try {
    writeFileSync(full, JSON.stringify(data, null, 2) + "\n", "utf-8");
  } catch (err) {
    throw new Error(
      `SCP Golf: failed to write ${relativePath}: ${(err as Error).message}`,
    );
  }
}

/** Read a JSON array, returning [] if the file is missing or empty. */
export function safeReadJsonArray<T>(relativePath: string): T[] {
  const full = resolve(relativePath);
  if (!existsSync(full)) return [];
  try {
    const parsed = JSON.parse(readFileSync(full, "utf-8"));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Write a JSON array. */
export function safeWriteJsonArray<T>(relativePath: string, data: T[]): void {
  writeJsonFile(relativePath, data);
}
