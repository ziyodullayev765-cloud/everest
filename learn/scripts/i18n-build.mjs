/** Rebuilds src/lib/i18n/en.json from scripts/i18n/*.tsv (indexed against i18n-keys.json) and extra.json. */
import fs from "node:fs";
const keys = JSON.parse(fs.readFileSync("scripts/i18n-keys.json", "utf8"));
const out = {};
const ph = (s) => (s.match(/\{\d+\}/g) || []).sort().join();
for (const f of fs.readdirSync("scripts/i18n").filter((f) => f.endsWith(".tsv")).sort())
  for (const line of fs.readFileSync(`scripts/i18n/${f}`, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const i = line.indexOf("\t");
    const key = keys[Number(line.slice(0, i))];
    const v = line.slice(i + 1).replace(/\\n/g, "\n");
    if (key === undefined) throw new Error(`bad index in ${f}: ${line}`);
    if (ph(key) !== ph(v)) throw new Error(`placeholder mismatch: ${key} → ${v}`);
    if (v !== key) out[key] = v;
  }
Object.assign(out, JSON.parse(fs.readFileSync("scripts/i18n/extra.json", "utf8")));
fs.writeFileSync("src/lib/i18n/en.json", JSON.stringify(out, null, 1) + "\n");
console.log(`en.json: ${Object.keys(out).length} entries`);
