# Vocabulary: groups, sets, import

## Data model (PostgreSQL, Drizzle — `src/server/db/schema.ts`)

| Concept | Table | Notes |
|---|---|---|
| Groups | `classes` | `archived_at` = archived group (members lose access to its sets) |
| Group membership | `class_students` | checked on every request |
| Vocabulary set | `word_lists` | `status`: draft / published / archived; `created_by`, `updated_by`, timestamps |
| Word | `words` | belongs to one set; english, uzbek, definition, example(s), phonetic, part of speech, synonyms, unit, tags, difficulty; `import_job_id`; `updated_at`; archived instead of deleted when studied |
| Set ↔ group / student | `word_list_targets` | many-to-many; unique per (set, group) and (set, student) since migration 0008 |
| Learning progress | `vocab_progress`, `vocab_reviews` | per student and word — never shared |
| Imports | `import_jobs` | file, format, content hash, policy, groups, counts, row errors, previous values (for undo) |
| Audit | `audit_logs` | `vocab.import`, `vocab.import_revert`, `vocab.assign`, … |

## Who sees what

A student sees a set only when **all** hold (`studentListIds` in `src/server/services/vocabulary.ts`):
the set is `published`, and it is assigned to the student directly or to a non-archived group the
student belongs to right now. Every student action (list, session, review, game, flag) re-checks this
on the server, so URLs/IDs from another group return "not found". Removing a student from a group or
archiving the group revokes access immediately; progress rows stay and return if access comes back.

A set assigned to several groups is one set — its words exist once. Teachers can assign only to
their own groups and edit only their own sets; admins can do everything.

## Import (Admin → Lug‘at → Fayldan import)

1. Choose an existing set or create one; optionally tick groups (added, existing assignments stay); optionally publish.
2. Upload CSV/TSV (delimiter detected), XLSX (first sheet), JSON (array of objects/arrays, or `{ "words": [...] }`) or TXT (`journey - sayohat | example`), or paste text. Max 3 MB / 5000 rows. UTF-8/UTF-16; other encodings are read as Windows-1251 with a warning.
3. Check the column mapping (headers like English/Word/Term/So‘z, Uzbek/Translation/Meaning/Tarjima, Example, POS, Unit/Lesson, Level, Tags are recognised; change any column by hand).
4. Every row gets a status: new, repeated in file, already in set, in set but different, error.
5. Choose the policy for "different" words: skip or update (only filled fields are written).
6. Confirm. Everything is written in one transaction (set locked, chunks of 500). Errors and skipped rows are stored on the job and downloadable as CSV (`/api/vocab/imports/<id>/report`).
7. Undo from the import page: added words are deleted (archived if a student already studied them), updated words get their previous values back.

Importing the same file again is detected (content hash) and adds no duplicates.

## Backup and restore

* Production database: Neon (eu-central-1). Neon keeps point-in-time history — restore a branch to a time before a bad change from the Neon console.
* Before risky manual work: `pg_dump "$DATABASE_URL" -Fc -f backup.dump` (run where the URL is available; never commit it). Restore: `pg_restore -d "$TARGET_URL" --clean backup.dump`.
* Migrations run automatically on deploy (`scripts/vercel-build.mjs`). Migration 0008 only adds columns/tables and removes exact duplicate group assignments.
