CREATE TABLE "lesson_marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"area" text NOT NULL,
	"lesson_date" date NOT NULL,
	"mark" integer NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"given_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_marks_mark" CHECK ("lesson_marks"."mark" between 3 and 5)
);
--> statement-breakpoint
ALTER TABLE "lesson_marks" ADD CONSTRAINT "lesson_marks_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_marks" ADD CONSTRAINT "lesson_marks_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_marks" ADD CONSTRAINT "lesson_marks_given_by_users_id_fk" FOREIGN KEY ("given_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_marks_key" ON "lesson_marks" USING btree ("class_id","student_id","area","lesson_date");--> statement-breakpoint
CREATE INDEX "lesson_marks_student_idx" ON "lesson_marks" USING btree ("student_id","lesson_date");