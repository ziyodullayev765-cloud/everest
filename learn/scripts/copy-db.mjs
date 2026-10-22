/**
 * Copies every row of the public schema from SOURCE_URL to TARGET_URL (a freshly migrated database,
 * e.g. the same app moved to another region). Used once by the build when USE_NEW_DATABASE=1.
 *
 *  - Refuses to touch a target that already has users (so a re-run after the move is a no-op).
 *  - Copies parents before children; a foreign-key cycle is broken by inserting a nullable column as
 *    NULL first and filling it in afterwards.
 *  - Rows travel as JSON (row_to_json → json_populate_recordset), so every type keeps its exact value.
 *  - Runs in one transaction on the target and checks the row count of every table before committing.
 *  The source is only read.
 */
import postgres from "postgres";

const SOURCE = process.env.SOURCE_URL;
const TARGET = process.env.TARGET_URL;
if (!SOURCE || !TARGET) throw new Error("SOURCE_URL and TARGET_URL are required");
if (SOURCE === TARGET) throw new Error("source and target are the same database");

const src = postgres(SOURCE, { max: 1, onnotice: () => {} });
const dst = postgres(TARGET, { max: 1, onnotice: () => {} });
const ident = (s) => `"${s.replace(/"/g, '""')}"`;

try {
  const [{ n: targetUsers }] = await dst`select count(*)::int as n from users`;
  if (targetUsers > 0) {
    console.log("• Target database already has data — copy skipped.");
    process.exit(0);
  }

  const tables = (await dst`select tablename as t from pg_tables where schemaname = 'public' order by 1`).map((r) => r.t);
  const srcTables = new Set((await src`select tablename as t from pg_tables where schemaname = 'public'`).map((r) => r.t));
  const missing = tables.filter((t) => !srcTables.has(t));
  if (missing.length) console.log(`• Not in source (left empty): ${missing.join(", ")}`);

  // Columns per table (target order) and which are nullable.
  const colRows = await dst`select table_name as t, column_name as c, is_nullable = 'YES' as nullable from information_schema.columns
    where table_schema = 'public' order by table_name, ordinal_position`;
  const cols = new Map(tables.map((t) => [t, []]));
  for (const r of colRows) cols.get(r.t)?.push(r);

  // Foreign keys: child table, parent table, child columns.
  const fks = await dst`select c.conrelid::regclass::text as t, c.confrelid::regclass::text as r,
      array(select a.attname::text from unnest(c.conkey) k join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k) as cols
    from pg_constraint c where c.contype = 'f' and c.connamespace = 'public'::regnamespace`;
  const pk = new Map();
  for (const r of await dst`select i.indrelid::regclass::text as t, array(select a.attname::text from unnest(i.indkey) k join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k) as cols
      from pg_index i join pg_class c on c.oid = i.indrelid where i.indisprimary and c.relnamespace = 'public'::regnamespace`)
    pk.set(r.t.replace(/"/g, ""), r.cols);

  // Tables whose rows may not be updated (append-only / final-grade guards): never fill in later.
  const guarded = new Set((await dst`select distinct c.relname as t from pg_trigger g join pg_class c on c.oid = g.tgrelid
    where not g.tgisinternal and c.relnamespace = 'public'::regnamespace`).map((r) => r.t));

  // Topological order; break cycles on nullable FK columns.
  const edges = fks.map((f) => ({ ...f, t: f.t.replace(/"/g, ""), r: f.r.replace(/"/g, "") })).filter((f) => f.t !== f.r);
  const selfRefs = fks.filter((f) => f.t === f.r);
  if (selfRefs.length) throw new Error(`self-referencing tables not supported: ${selfRefs.map((f) => f.t).join(", ")}`);
  const deferred = new Map(); // table -> Set(columns inserted as NULL first)
  const order = [];
  const done = new Set();
  let active = [...edges];
  while (order.length < tables.length) {
    const ready = tables.filter((t) => !done.has(t) && active.every((e) => e.t !== t || done.has(e.r)));
    if (ready.length) {
      for (const t of ready) {
        order.push(t);
        done.add(t);
      }
      continue;
    }
    const nullableOf = (e) => e.cols.every((c) => cols.get(e.t).find((x) => x.c === c)?.nullable);
    // Find a real cycle among the remaining tables and cut one nullable edge on it.
    const left = active.filter((e) => !done.has(e.t) && !done.has(e.r));
    let cycle = null;
    const walk = (t, path) => {
      if (cycle) return;
      const at = path.findIndex((e) => e.t === t);
      if (path.length && at >= 0) return void (cycle = path.slice(at));
      if (path.length > tables.length) return;
      for (const e of left.filter((x) => x.t === t)) walk(e.r, [...path, e]);
    };
    for (const t of tables.filter((x) => !done.has(x))) if (!cycle) walk(t, []);
    const cut = cycle?.find((e) => nullableOf(e) && pk.has(e.t) && !guarded.has(e.t));
    if (!cut) throw new Error("foreign-key cycle without a nullable, updatable column");
    if (!deferred.has(cut.t)) deferred.set(cut.t, new Set());
    for (const c of cut.cols) deferred.get(cut.t).add(c);
    active = active.filter((e) => e !== cut);
  }
  if (deferred.size) console.log(`• Filled in after the copy: ${[...deferred].map(([t, c]) => `${t}(${[...c].join(",")})`).join(", ")}`);

  await dst.begin(async (tx) => {
    // Migrations may have seeded rows (categories, settings…); the copy replaces them with the source's.
    await tx.unsafe(`truncate ${tables.map(ident).join(", ")} cascade`);
    for (const t of order) {
      if (!srcTables.has(t)) continue;
      const srcCols = new Set((await src`select column_name as c from information_schema.columns where table_schema = 'public' and table_name = ${t}`).map((r) => r.c));
      const use = cols.get(t).filter((c) => srcCols.has(c.c) && !deferred.get(t)?.has(c.c)).map((c) => ident(c.c));
      const hasBytes = (await src`select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = ${t} and data_type = 'bytea'`)[0].n > 0;
      let copied = 0;
      const cursor = src.unsafe(`select row_to_json(x)::text as j from ${ident(t)} x`).cursor(hasBytes ? 5 : 500);
      for await (const rows of cursor) {
        const json = `[${rows.map((r) => r.j).join(",")}]`;
        await tx.unsafe(`insert into ${ident(t)} (${use.join(", ")}) select ${use.join(", ")} from json_populate_recordset(null::${ident(t)}, $1::text::json)`, [json]);
        copied += rows.length;
      }
      process.stdout.write(`  ${t}: ${copied}\n`);
    }
    for (const [t, set] of deferred) {
      const keys = pk.get(t);
      const list = [...set];
      const rows = await src.unsafe(`select row_to_json(x)::text as j from (select ${[...keys, ...list].map(ident).join(", ")} from ${ident(t)} where ${list.map((c) => `${ident(c)} is not null`).join(" or ")}) x`);
      for (const r of rows) {
        await tx.unsafe(
          `update ${ident(t)} d set ${list.map((c) => `${ident(c)} = s.${ident(c)}`).join(", ")}
           from json_populate_record(null::${ident(t)}, $1::text::json) s where ${keys.map((k) => `d.${ident(k)} = s.${ident(k)}`).join(" and ")}`,
          [r.j],
        );
      }
    }
    // Verify before committing.
    for (const t of tables) {
      if (!srcTables.has(t)) continue;
      const [a] = await src.unsafe(`select count(*)::int as n from ${ident(t)}`);
      const [b] = await tx.unsafe(`select count(*)::int as n from ${ident(t)}`);
      if (a.n !== b.n) throw new Error(`row count mismatch in ${t}: source ${a.n}, target ${b.n}`);
    }
  });
  console.log(`✓ Copied ${order.length} tables; row counts match.`);
} finally {
  await src.end();
  await dst.end();
}
