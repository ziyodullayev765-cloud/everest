ALTER TYPE "public"."assignment_type" ADD VALUE 'homework';--> statement-breakpoint
CREATE TABLE "book_audio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"title" text NOT NULL,
	"file_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"level" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_file_id" uuid,
	"pdf_file_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_status" CHECK ("books"."status" in ('draft','published','archived')),
	CONSTRAINT "books_category" CHECK ("books"."category" in ('reading','listening','vocabulary','grammar','speaking','writing','other'))
);
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "items" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "storage" text DEFAULT 'db' NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "blob_url" text;--> statement-breakpoint
ALTER TABLE "submission_versions" ADD COLUMN "item_progress" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "item_progress" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "book_audio" ADD CONSTRAINT "book_audio_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_audio" ADD CONSTRAINT "book_audio_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_cover_file_id_files_id_fk" FOREIGN KEY ("cover_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_pdf_file_id_files_id_fk" FOREIGN KEY ("pdf_file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_audio_book_idx" ON "book_audio" USING btree ("book_id","position");--> statement-breakpoint
CREATE INDEX "books_status_idx" ON "books" USING btree ("status","title");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_storage" CHECK (("files"."storage" = 'db' and "files"."data" is not null) or ("files"."storage" = 'blob' and "files"."blob_url" is not null));