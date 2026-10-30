import { readFile, mkdir, writeFile } from "node:fs/promises";
import { compactContext } from "../src/lib/knowledge";
const dataset = JSON.parse(
  await readFile(
    new URL("../data/knowledge/dataset.json", import.meta.url),
    "utf8",
  ),
);
const query = process.argv[2] || "";
const family = process.argv[3];
const context = compactContext(dataset, query, family);
await mkdir("data/knowledge/context", { recursive: true });
await writeFile(
  "data/knowledge/context/latest.json",
  JSON.stringify(context, null, 2),
);
console.log(JSON.stringify(context, null, 2));
