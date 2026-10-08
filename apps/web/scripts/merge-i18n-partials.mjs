#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const messagesDir = path.join(root, "messages");
const partialsDir = path.join(messagesDir, "partials");

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = deepMerge(
        target[key] && typeof target[key] === "object" ? { ...target[key] } : {},
        value,
      );
    } else {
      target[key] = value;
    }
  }
  return target;
}

async function mergeLocale(locale) {
  const basePath = path.join(messagesDir, `${locale}.json`);
  const base = JSON.parse(await readFile(basePath, "utf8"));
  const files = (await readdir(partialsDir))
    .filter((name) => name.endsWith(`-${locale}.json`))
    .sort();
  for (const file of files) {
    const partial = JSON.parse(await readFile(path.join(partialsDir, file), "utf8"));
    deepMerge(base, partial);
    console.log(`merged ${file}`);
  }
  await writeFile(basePath, `${JSON.stringify(base, null, 2)}\n`);
}

await mergeLocale("en");
await mergeLocale("ru");
console.log("done");
