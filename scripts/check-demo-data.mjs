import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(process.cwd(), "src", "demo-data");
const files = (await readdir(root)).filter((file) => /\.(ts|tsx)$/.test(file));
const invalid = [];
for (const file of files) {
  const source = await readFile(join(root, file), "utf8");
  if (!source.trimStart().startsWith("// demo_data")) invalid.push(file);
}
if (invalid.length) {
  console.error(`Missing // demo_data marker: ${invalid.join(", ")}`);
  process.exit(1);
}
console.log(`Demo-data marker check passed for ${files.length} files.`);
