/**
 * One-off codemod: wraps user-facing Uzbek strings in tr() so they can be shown in English.
 *   node scripts/i18n-codemod.mjs            → rewrites files, writes scripts/i18n-keys.json
 *   node scripts/i18n-codemod.mjs --dry      → only lists what it would change
 * Skips code-ish strings (classes, URLs, keys, SQL, comparisons) and keeps formatting intact.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve("src");
const DRY = process.argv.includes("--dry");
const SKIP_FILES = [/^lib\/i18n\//, /^server\/db\//, /^server\/locale\.ts$/, /^app\/sw\.js\//, /^middleware\.ts$/, /\.d\.ts$/, /^server\/services\/notifications\.ts$/];

const SKIP_ATTRS = new Set([
  "className", "href", "src", "id", "key", "type", "name", "value", "defaultValue", "htmlFor", "role", "method", "action", "target", "rel", "accept",
  "autoComplete", "inputMode", "pattern", "d", "viewBox", "fill", "stroke", "transform", "style", "tone", "variant", "size", "icon", "as", "lang", "dir",
  "form", "encType", "mode", "kind", "status", "align", "side", "storageKey", "base", "path", "fileId", "category", "color", "controlsList", "preload",
  "capture", "scope", "aria-hidden", "aria-current", "aria-live", "autoCapitalize", "autoCorrect", "spellCheck", "sizes", "media", "crossOrigin", "testId",
]);
const UI_PROPS = new Set(["label", "title", "description", "hint", "text", "placeholder", "message", "caption", "subtitle", "empty", "emptyText", "confirm", "confirmLabel", "cta", "heading", "help", "error", "success", "unit", "tagline", "prompt", "body", "short", "long", "info", "note", "tip", "question", "answer", "name"]);
const UI_CALLS = new Set(["success", "error", "info", "warning", "invalid", "forbidden", "notFound", "confirm", "alert", "setError", "setMsg", "setMessage", "unavailable", "closed", "conflict"]);
const NO_CALLS = new Set(["cn", "clsx", "cva", "startsWith", "endsWith", "includes", "replace", "replaceAll", "split", "getItem", "setItem", "removeItem", "get", "set", "has", "delete", "redirect", "revalidatePath", "fetch", "URL", "require", "log", "warn", "debug", "audit", "notify", "execute", "unsafe", "querySelector", "addEventListener", "removeEventListener", "dispatchEvent", "Event", "postMessage", "createElement", "setAttribute", "getAttribute", "matchMedia", "enum", "literal", "localeCompare", "toLocaleString", "Intl", "DateTimeFormat", "NumberFormat", "join", "encodeURIComponent", "test", "exec", "match", "padStart", "Error", "sha256", "keyedHash", "enforce", "regex", "TypeError", "AppError", "push", "parse", "tr", "headers", "cookies", "searchParams", "append", "open", "assign", "record", "dedupeKey"]);

const LETTER = /[A-Za-zʻ‘’]/;
const UZ_MARK = /[a-zA-Z][‘’ʻ][a-zA-Z]|[oOgG]‘|’[a-z]/;
function isCodeish(s) {
  const x = s.trim();
  if (!x || !LETTER.test(x)) return true;
  if (/^(\/|https?:|#|@|\.|mailto:|data:|blob:|image\/|audio\/|application\/|text\/|video\/)/.test(x)) return true;
  if (/^[a-z0-9_.:\/\-\[\]*?=&%$]+$/.test(x) && !/^(hozir|bor|yo‘q|biriktirilmagan|muddatsiz)$/.test(x)) return true; // identifiers, keys, paths, mime
  if (/\b(select|insert|update|delete|from|where|returning)\b.*\b(from|into|set|where|values)\b/i.test(x)) return true;
  const toks = x.split(/\s+/);
  if (toks.every((t) => /^[!a-z0-9:\[\]()\/.%#_,&>~*+-]+$/.test(t)) && toks.some((t) => /[-:\[]/.test(t))) return true; // tailwind
  if (/[{}<>;=]/.test(x) && !UZ_MARK.test(x)) return true;
  return false;
}
/** strong: looks like a sentence/phrase or Uzbek word; weak: a capitalised single word. */
function uiStrength(s) {
  if (isCodeish(s)) return 0;
  const x = s.trim();
  if (UZ_MARK.test(x)) return 2;
  if (/\s/.test(x) && /[A-Za-z]{2,}/.test(x)) return 2;
  if (/^[A-ZÀ-Ž][a-zà-ž‘’ʻ'-]{1,}[.!?…:]?$/.test(x)) return 1;
  // lowercase Uzbek words (shown values like "biriktirilmagan", "hozir")
  if (/^[a-z‘’ʻ' -]{3,}$/.test(x) && /(lmagan|lgan|moqda|ilgan|siz|lar|dan|ga|hozir|yo‘q|bor|kun|ta|ball|marta|soat|daqiqa)\b/.test(x)) return 1;
  return 0;
}

const esc = (s) => JSON.stringify(s);
const keys = new Set();
let changedFiles = 0, edits = 0;
const moduleLevelLeft = [];

function walkDir(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (/\.(tsx?|mts)$/.test(e.name)) out.push(p);
  }
  return out;
}

function inFunction(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isFunctionLike(p) && !ts.isTypeNode?.(p)) return true;
    if (ts.isSourceFile(p)) return false;
  }
  return false;
}
function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return "";
}
function inside(node, pred) {
  for (let p = node.parent; p && !ts.isSourceFile(p); p = p.parent) if (pred(p)) return p;
  return null;
}
function jsxAttrName(n) {
  return ts.isIdentifier(n.name) ? n.name.text : n.name.getText();
}

for (const file of walkDir(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (SKIP_FILES.some((r) => r.test(rel))) continue;
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const reps = []; // {start, end, text}
  const add = (start, end, text, key) => {
    reps.push({ start, end, text });
    if (key) keys.add(key);
  };

  const skipContext = (node) => {
    const p = node.parent;
    if (!p) return true;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
    if (ts.isLiteralTypeNode(p) || inside(node, (x) => ts.isTypeNode(x) && !ts.isTypeQueryNode(x))) return true;
    if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isEnumMember(p) || ts.isPropertySignature(p)) && p.name === node) return true;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
    if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword].includes(p.operatorToken.kind)) return true;
    if (ts.isCaseClause(p)) return true;
    if (ts.isTaggedTemplateExpression(p) || inside(node, ts.isTaggedTemplateExpression)) return true;
    if (inside(node, (x) => ts.isJsxAttribute(x) && ["className", "href", "src", "style", "key"].includes(jsxAttrName(x)))) return true;
    if (ts.isExpressionStatement(p)) return true; // "use client"
    const call = inside(node, ts.isCallExpression);
    if (call && NO_CALLS.has(calleeName(call)) && call.arguments.some((a) => a.pos <= node.pos && a.end >= node.end)) return true;
    const nw = inside(node, ts.isNewExpression);
    if (nw && ["URL", "Error", "TypeError", "RegExp", "Date", "Map", "Set"].includes(nw.expression.getText())) return true;
    if (inside(node, (x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.expression.getText() === "z")) return true; // zod at module level
    return false;
  };

  const visit = (node) => {
    // JSX children: merge text + simple expressions into one template.
    if ((ts.isJsxElement(node) || ts.isJsxFragment(node)) && node.children.length) {
      handleChildren(node.children);
    }
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = jsxAttrName(node);
      const v = node.initializer.text;
      if (!SKIP_ATTRS.has(name) && !name.startsWith("data-") && uiStrength(v) >= (UI_PROPS.has(name) || name.startsWith("aria-") || ["alt", "title", "placeholder"].includes(name) ? 1 : 2)) {
        add(node.initializer.getStart(sf), node.initializer.end, `{tr(${esc(v)})}`, v);
      }
      return; // don't descend into the literal
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!(ts.isJsxAttribute(node.parent))) handleString(node);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      if (handleTemplate(node)) return;
    }
    ts.forEachChild(node, visit);
  };

  function propNameOf(node) {
    const p = node.parent;
    if (ts.isPropertyAssignment(p) && p.initializer === node) return p.name.getText(sf).replace(/["']/g, "");
    if (ts.isParameter(p) && p.initializer === node) return p.name.getText(sf);
    return null;
  }

  function handleString(node) {
    const v = node.text;
    const strength = uiStrength(v);
    if (!strength || skipContext(node)) return;
    const prop = propNameOf(node);
    const call = node.parent && ts.isCallExpression(node.parent) ? calleeName(node.parent) : "";
    const uiish = (prop && UI_PROPS.has(prop)) || UI_CALLS.has(call) || ts.isConditionalExpression(node.parent) || ts.isJsxExpression(node.parent) || ts.isReturnStatement(node.parent) || ts.isBinaryExpression(node.parent);
    if (strength === 1 && !uiish) return;
    if (prop === "name" && strength < 2) return;
    if (!inFunction(node)) {
      const p = node.parent;
      if (ts.isPropertyAssignment(p) && p.initializer === node && ts.isObjectLiteralExpression(p.parent)) {
        add(p.getStart(sf), p.end, `get ${p.name.getText(sf)}() { return tr(${esc(v)}); }`, v);
      } else moduleLevelLeft.push(`${rel}: ${v}`);
      return;
    }
    add(node.getStart(sf), node.end, `tr(${esc(v)})`, v);
  }

  function handleTemplate(node) {
    if (skipContext(node) || !inFunction(node)) return false;
    let text = node.head.text;
    const args = [];
    node.templateSpans.forEach((s, i) => {
      text += `{${i}}` + s.literal.text;
      args.push(s.expression.getText(sf));
    });
    const plain = text.replace(/\{\d+\}/g, " ");
    if (uiStrength(plain) < 2 || /^\s*[\/#?]/.test(text) || /[\/?=&]\{\d+\}/.test(text)) return false;
    // keep nested templates/JSX out of it
    if (node.templateSpans.some((s) => /[`<]/.test(s.expression.getText(sf)))) return false;
    add(node.getStart(sf), node.end, `tr(${esc(text)}, ${args.join(", ")})`, text);
    return true;
  }

  function simpleExpr(e) {
    return e && (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isCallExpression(e) || ts.isElementAccessExpression(e) || ts.isNumericLiteral(e) || ts.isParenthesizedExpression(e) || ts.isBinaryExpression(e) || ts.isConditionalExpression(e)) && !/[<`]/.test(e.getText(sf));
  }

  function handleChildren(children) {
    // Split into runs separated by elements; each run of JsxText/simple JsxExpression becomes one tr().
    let run = [];
    const flush = () => {
      const texts = run.filter((c) => ts.isJsxText(c));
      if (texts.some((c) => LETTER.test(c.text) && uiStrength(c.text.replace(/\s+/g, " ")) >= 1 || (LETTER.test(c.text) && c.text.trim().length > 1))) {
        let tpl = "";
        const args = [];
        for (const c of run) {
          if (ts.isJsxText(c)) tpl += src.slice(c.pos, c.end);
          else {
            tpl += `{${args.length}}`;
            args.push(c.expression.getText(sf));
          }
        }
        const lead = tpl.match(/^\s*/)[0], trail = tpl.match(/\s*$/)[0];
        let core = tpl.slice(lead.length, tpl.length - trail.length).replace(/\s*\n\s*/g, " ");
        if (core && LETTER.test(core.replace(/\{\d+\}/g, "")) && /[a-zA-Z‘’ʻ]{2,}/.test(core)) {
          // Only the text core is replaced; surrounding whitespace stays in the source, so JSX spacing is unchanged.
          const first = run[0], last = run[run.length - 1];
          const start = (ts.isJsxText(first) ? first.pos : first.getStart(sf)) + lead.length;
          const end = last.end - trail.length;
          add(start, end, `{tr(${esc(core)}${args.length ? ", " + args.join(", ") : ""})}`, core);
        }
      }
      run = [];
    };
    for (const c of children) {
      if (ts.isJsxText(c)) run.push(c);
      else if (ts.isJsxExpression(c) && simpleExpr(c.expression) && run.length) run.push(c);
      else if (ts.isJsxExpression(c) && simpleExpr(c.expression) && !run.length && children[children.indexOf(c) + 1] && ts.isJsxText(children[children.indexOf(c) + 1]) && LETTER.test(children[children.indexOf(c) + 1].text)) run.push(c);
      else {
        flush();
      }
    }
    flush();
  }

  visit(sf);
  if (!reps.length) continue;
  // apply from the end; drop overlapping (keep outermost = first added for templates/children)
  reps.sort((a, b) => b.start - a.start || b.end - a.end);
  const kept = [];
  for (const r of reps) if (!kept.some((k) => r.start < k.end && r.end > k.start)) kept.push(r);
  let out = src;
  for (const r of kept) out = out.slice(0, r.start) + r.text + out.slice(r.end);
  if (!/import \{[^}]*\btr\b[^}]*\} from "@\/lib\/i18n(\/tr)?"/.test(out)) {
    const lines = out.split("\n");
    let idx = 0;
    for (let i = 0; i < lines.length; i++) if (/^import .*;$/.test(lines[i]) || /^import ["']/.test(lines[i])) idx = i + 1;
    if (idx === 0 && /^["']use (client|server)["'];?/.test(lines[0])) idx = 1;
    lines.splice(idx, 0, 'import { tr } from "@/lib/i18n/tr";');
    out = lines.join("\n");
  }
  edits += kept.length;
  changedFiles++;
  if (DRY) console.log(`${rel}: ${kept.length}`);
  else fs.writeFileSync(file, out);
}

// Dictionary leaves (t.*) go through tr() too.
const uzSrc = fs.readFileSync(path.join(ROOT, "lib/i18n/uz.ts"), "utf8");
for (const m of uzSrc.matchAll(/:\s*"([^"]+)"/g)) keys.add(m[1]);

if (!DRY) {
  // Append new keys; existing indexes (used by scripts/i18n/*.tsv) must never move.
  const old = fs.existsSync("scripts/i18n-keys.json") ? JSON.parse(fs.readFileSync("scripts/i18n-keys.json", "utf8")) : [];
  const have = new Set(old);
  fs.writeFileSync("scripts/i18n-keys.json", JSON.stringify([...old, ...[...keys].filter((k) => !have.has(k)).sort()], null, 1));
}
console.log(`files ${changedFiles}, edits ${edits}, keys ${keys.size}`);
if (moduleLevelLeft.length) console.log(`module-level strings left as is: ${moduleLevelLeft.length}\n` + moduleLevelLeft.slice(0, 80).join("\n"));
