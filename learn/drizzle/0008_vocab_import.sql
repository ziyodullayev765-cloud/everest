CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"file_name" text DEFAULT '' NOT NULL,
	"format" text NOT NULL,
	"content_hash" text NOT NULL,
	"policy" text NOT NULL,
	"class_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"updated" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"previous" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reverted_at" timestamp with time zone,
	"reverted_by" uuid,
	CONSTRAINT "import_jobs_status" CHECK ("import_jobs"."status" in ('done','failed','reverted')),
	CONSTRAINT "import_jobs_policy" CHECK ("import_jobs"."policy" in ('skip','update'))
);
--> statement-breakpoint
ALTER TABLE "word_lists" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "definition" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "synonyms" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "unit" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "tags" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "import_job_id" uuid;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "words" SET "updated_at" = "created_at";--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_list_id_word_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."word_lists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_reverted_by_users_id_fk" FOREIGN KEY ("reverted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_jobs_list_idx" ON "import_jobs" USING btree ("list_id","created_at");--> statement-breakpoint
CREATE INDEX "import_jobs_created_idx" ON "import_jobs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "import_jobs_hash_idx" ON "import_jobs" USING btree ("list_id","content_hash");--> statement-breakpoint
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Remove duplicate assignments (same list to the same group/student twice) before making them unique.
DELETE FROM "word_list_targets" a USING "word_list_targets" b
WHERE a.list_id = b.list_id AND a.ctid > b.ctid
  AND ((a.class_id IS NOT NULL AND a.class_id = b.class_id) OR (a.student_id IS NOT NULL AND a.student_id = b.student_id));--> statement-breakpoint
CREATE UNIQUE INDEX "word_list_targets_class_key" ON "word_list_targets" USING btree ("list_id","class_id") WHERE "word_list_targets"."class_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "word_list_targets_student_key" ON "word_list_targets" USING btree ("list_id","student_id") WHERE "word_list_targets"."student_id" is not null;--> statement-breakpoint
CREATE INDEX "words_import_idx" ON "words" USING btree ("import_job_id");