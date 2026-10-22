CREATE TABLE "weekly_medals" (
	"class_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"student_id" uuid NOT NULL,
	"place" integer NOT NULL,
	"score" integer NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_medals_class_id_week_start_student_id_pk" PRIMARY KEY("class_id","week_start","student_id"),
	CONSTRAINT "weekly_medals_place" CHECK ("weekly_medals"."place" between 1 and 3)
);
--> statement-breakpoint
ALTER TABLE "weekly_medals" ADD CONSTRAINT "weekly_medals_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_medals" ADD CONSTRAINT "weekly_medals_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weekly_medals_student_idx" ON "weekly_medals" USING btree ("student_id");