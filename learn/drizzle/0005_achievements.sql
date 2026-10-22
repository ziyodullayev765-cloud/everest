CREATE TABLE "achievements" (
	"code" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'Award' NOT NULL,
	"metric" text NOT NULL,
	"threshold" integer NOT NULL,
	"xp_reward" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "achievements_category" CHECK ("achievements"."category" in ('reading','quiz','vocab','grammar','activity')),
	CONSTRAINT "achievements_threshold" CHECK ("achievements"."threshold" between 1 and 100000),
	CONSTRAINT "achievements_xp" CHECK ("achievements"."xp_reward" between 0 and 1000)
);
--> statement-breakpoint
ALTER TABLE "user_achievements" ADD COLUMN "seen_at" timestamp with time zone;--> statement-breakpoint
-- Earlier badges that map onto the new catalogue keep their earn date under the new code.
UPDATE "user_achievements" u SET "code" = m.new_code FROM (VALUES ('first_submission','first_step'),('first_quiz','first_win'),('perfect_quiz','perfect_score')) AS m(old_code, new_code)
  WHERE u."code" = m.old_code AND NOT EXISTS (SELECT 1 FROM "user_achievements" x WHERE x."user_id" = u."user_id" AND x."code" = m.new_code);
--> statement-breakpoint
DELETE FROM "user_achievements" WHERE "code" IN ('first_submission','first_quiz','perfect_quiz');
--> statement-breakpoint
-- Badges earned before this release were already announced; don't pop them up again.
UPDATE "user_achievements" SET "seen_at" = "earned_at" WHERE "seen_at" IS NULL;
