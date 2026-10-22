ALTER TYPE "public"."question_type" ADD VALUE 'arrange_words';--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'translation';--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'grammar_correction';--> statement-breakpoint
ALTER TYPE "public"."question_type" ADD VALUE 'irregular_verb';--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"input_chars" integer NOT NULL,
	"output_chars" integer DEFAULT 0 NOT NULL,
	"ok" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vocab_progress" (
	"student_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"state" text DEFAULT 'learning' NOT NULL,
	"ease" numeric(4, 2) DEFAULT 2.5 NOT NULL,
	"interval_days" numeric(7, 2) DEFAULT 0 NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"favorite" boolean DEFAULT false NOT NULL,
	"difficult" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocab_progress_student_id_word_id_pk" PRIMARY KEY("student_id","word_id"),
	CONSTRAINT "vocab_progress_state" CHECK ("vocab_progress"."state" in ('learning','review','mastered'))
);
--> statement-breakpoint
CREATE TABLE "vocab_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"word_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"grade" integer NOT NULL,
	"correct" boolean NOT NULL,
	"response" text,
	"interval_days" numeric(7, 2) NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocab_reviews_grade" CHECK ("vocab_reviews"."grade" between 0 and 3),
	CONSTRAINT "vocab_reviews_mode" CHECK ("vocab_reviews"."mode" in ('flashcard','typing','choice','match','listen'))
);
--> statement-breakpoint
CREATE TABLE "word_list_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"class_id" uuid,
	"student_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "word_list_targets_one" CHECK (("word_list_targets"."class_id" is null) <> ("word_list_targets"."student_id" is null))
);
--> statement-breakpoint
CREATE TABLE "word_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"level" text DEFAULT '' NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "word_lists_status" CHECK ("word_lists"."status" in ('draft','published','archived'))
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"english" text NOT NULL,
	"uzbek" text NOT NULL,
	"example" text DEFAULT '' NOT NULL,
	"example_uz" text DEFAULT '' NOT NULL,
	"phonetic" text DEFAULT '' NOT NULL,
	"part_of_speech" text DEFAULT '' NOT NULL,
	"audio_file_id" uuid,
	"image_file_id" uuid,
	"difficulty" integer DEFAULT 2 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "words_difficulty" CHECK ("words"."difficulty" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "academic_year" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "level" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "topic" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "passage" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "audio_file_id" uuid;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "transcript" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "transcript_mode" text DEFAULT 'after_submit' NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "replay_limit" integer;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "level" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "daily_goal" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "new_words_per_day" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_progress" ADD CONSTRAINT "vocab_progress_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_progress" ADD CONSTRAINT "vocab_progress_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_reviews" ADD CONSTRAINT "vocab_reviews_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_reviews" ADD CONSTRAINT "vocab_reviews_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_list_targets" ADD CONSTRAINT "word_list_targets_list_id_word_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."word_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_list_targets" ADD CONSTRAINT "word_list_targets_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_list_targets" ADD CONSTRAINT "word_list_targets_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_list_id_word_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."word_lists"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_audio_file_id_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "words" ADD CONSTRAINT "words_image_file_id_files_id_fk" FOREIGN KEY ("image_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_requests_user_idx" ON "ai_requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "vocab_progress_due_idx" ON "vocab_progress" USING btree ("student_id","due_at");--> statement-breakpoint
CREATE INDEX "vocab_reviews_student_idx" ON "vocab_reviews" USING btree ("student_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "vocab_reviews_word_idx" ON "vocab_reviews" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "word_list_targets_list_idx" ON "word_list_targets" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "word_list_targets_class_idx" ON "word_list_targets" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "word_list_targets_student_idx" ON "word_list_targets" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "word_lists_status_idx" ON "word_lists" USING btree ("status");--> statement-breakpoint
CREATE INDEX "words_list_idx" ON "words" USING btree ("list_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "words_list_english_key" ON "words" USING btree ("list_id",lower("english")) WHERE "words"."archived_at" is null;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_audio_file_id_files_id_fk" FOREIGN KEY ("audio_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_transcript_mode" CHECK ("assignments"."transcript_mode" in ('never','after_submit','always'));--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_replay_limit" CHECK ("assignments"."replay_limit" is null or "assignments"."replay_limit" between 1 and 20);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_daily_goal_range" CHECK ("users"."daily_goal" between 1 and 20 and "users"."new_words_per_day" between 0 and 50);--> statement-breakpoint
-- English course: the subjects table becomes the fixed list of English assignment categories.
INSERT INTO subjects (code, name, color)
SELECT v.code, v.name, v.color FROM (VALUES
  ('GRAMMAR', 'Grammatika', '#0f7a5a'),
  ('VOCAB', 'Lug‘at', '#2f64c8'),
  ('TR_EN_UZ', 'Tarjima: EN → UZ', '#6a4fc1'),
  ('TR_UZ_EN', 'Tarjima: UZ → EN', '#8a4fc1'),
  ('READING', 'Reading', '#a8650c'),
  ('LISTENING', 'Listening', '#c03a33'),
  ('SENTENCE', 'Gap tuzish', '#17804a'),
  ('WRITING', 'Writing', '#36423b'),
  ('MCQ', 'Variantli test', '#2f8fc8'),
  ('FILL', 'Bo‘sh joyni to‘ldirish', '#4f7a0f'),
  ('MATCH', 'So‘z va ma’noni moslash', '#c0761e'),
  ('IRREG', 'Noto‘g‘ri fe’llar', '#9a3f7a'),
  ('CUSTOM', 'Boshqa mashq', '#66726b')
) AS v(code, name, color)
WHERE NOT EXISTS (SELECT 1 FROM subjects s WHERE lower(s.code) = lower(v.code));--> statement-breakpoint
UPDATE subjects SET archived_at = NULL WHERE code IN ('GRAMMAR','VOCAB','TR_EN_UZ','TR_UZ_EN','READING','LISTENING','SENTENCE','WRITING','MCQ','FILL','MATCH','IRREG','CUSTOM');--> statement-breakpoint
-- Existing work keeps its history; non-English-category subjects map to "Boshqa mashq".
UPDATE assignments SET subject_id = (SELECT id FROM subjects WHERE code = 'CUSTOM')
WHERE subject_id IN (SELECT id FROM subjects WHERE code NOT IN ('GRAMMAR','VOCAB','TR_EN_UZ','TR_UZ_EN','READING','LISTENING','SENTENCE','WRITING','MCQ','FILL','MATCH','IRREG','CUSTOM'));--> statement-breakpoint
UPDATE questions SET bank_subject_id = (SELECT id FROM subjects WHERE code = 'CUSTOM')
WHERE bank_subject_id IN (SELECT id FROM subjects WHERE code NOT IN ('GRAMMAR','VOCAB','TR_EN_UZ','TR_UZ_EN','READING','LISTENING','SENTENCE','WRITING','MCQ','FILL','MATCH','IRREG','CUSTOM'));--> statement-breakpoint
-- Teachers are assigned to whole groups (no per-subject scope).
DELETE FROM class_teachers a USING class_teachers b
WHERE a.class_id = b.class_id AND a.teacher_id = b.teacher_id AND (a.subject_id IS NOT NULL) AND (b.subject_id IS NULL OR a.id > b.id);--> statement-breakpoint
UPDATE class_teachers SET subject_id = NULL WHERE subject_id IS NOT NULL;--> statement-breakpoint
UPDATE subjects SET archived_at = now() WHERE code NOT IN ('GRAMMAR','VOCAB','TR_EN_UZ','TR_UZ_EN','READING','LISTENING','SENTENCE','WRITING','MCQ','FILL','MATCH','IRREG','CUSTOM') AND archived_at IS NULL;--> statement-breakpoint
-- Vocabulary review history is append-only, like the other history tables.
CREATE TRIGGER vocab_reviews_append_only BEFORE UPDATE OR DELETE ON vocab_reviews
  FOR EACH ROW EXECUTE FUNCTION forbid_history_mutation();
