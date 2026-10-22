CREATE TABLE "vocab_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"list_id" uuid,
	"score" integer NOT NULL,
	"correct" integer NOT NULL,
	"total" integer NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vocab_games_counts" CHECK ("vocab_games"."correct" between 0 and "vocab_games"."total" and "vocab_games"."total" between 1 and 100 and "vocab_games"."score" between 0 and 100000)
);
--> statement-breakpoint
ALTER TABLE "vocab_reviews" DROP CONSTRAINT "vocab_reviews_mode";--> statement-breakpoint
ALTER TABLE "vocab_games" ADD CONSTRAINT "vocab_games_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_games" ADD CONSTRAINT "vocab_games_list_id_word_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."word_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vocab_games_student_idx" ON "vocab_games" USING btree ("student_id","played_at");--> statement-breakpoint
ALTER TABLE "vocab_reviews" ADD CONSTRAINT "vocab_reviews_mode" CHECK ("vocab_reviews"."mode" in ('flashcard','typing','choice','match','listen','game'));