/** Lists Uzbek-looking UI text that is not inside tr(): node scripts/i18n-audit.mjs */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const WORDS = /(^|[^a-z‘’ʻ])(kun|ta|daraja|hozir|muddat\w*|eng|yo‘q|bor|soat|daqiqa|hafta|marta|so‘z\w*|ball|qoldi|oldin|keyin|uchun|bilan|va|yoki|emas|hali|yangi|bugun|ertaga)([^a-z‘’ʻ]|$)/i;
const UZ = /[a-z][‘’ʻ][a-z]|[oOgG]‘/;
const skipFile = (r) => /^(lib\/i18n|server\/db|app\/sw\.js|middleware|server\/services\/notifications)/.test(r);
const walk = (d, o = []) => (fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name), o) : /\.tsx?$/.test(e.name) && o.push(path.join(d, e.name)))), o);
let n = 0;
for (const f of walk("src")) {
  const rel = path.relative("src", f).split(path.sep).join("/");
  if (skipFile(rel)) continue;
  const src = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const inTr = (node) => { for (let p = node.parent; p; p = p.parent) if (ts.isCallExpression(p) && ["tr", "cn", "clsx", "audit", "notify"].includes(p.expression.getText())) return true; else if (ts.isTaggedTemplateExpression(p) || ts.isImportDeclaration(p)) return true; return false; };
  const visit = (node) => {
    let text = null;
    if (ts.isJsxText(node)) text = node.text;
    else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) text = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) text = node.text;
    if (text && text.trim() && (UZ.test(text) || WORDS.test(" " + text + " ")) && !inTr(node)) {
      const p = node.parent;
      const isClass = p && ts.isJsxAttribute(p) && /className|href|src/.test(p.name.getText());
      const isCmp = p && ts.isBinaryExpression(p);
      if (!isClass && !isCmp && !/^[a-z0-9_.\-:/[\]%# ]+$/.test(text.trim()) || UZ.test(text)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        if (!(p && ts.isJsxAttribute(p) && /className/.test(p.name.getText()))) { console.log(`${rel}:${line + 1}\t${text.trim().slice(0, 90)}`); n++; }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
console.error(`${n} candidates`);
