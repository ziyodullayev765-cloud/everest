-- Integrity guards that must hold no matter which code path touches the database.

-- 1. History tables are append-only.
CREATE OR REPLACE FUNCTION forbid_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END $$;
--> statement-breakpoint
CREATE TRIGGER grade_history_append_only BEFORE UPDATE OR DELETE ON grade_history
  FOR EACH ROW EXECUTE FUNCTION forbid_history_mutation();
--> statement-breakpoint
CREATE TRIGGER submission_versions_append_only BEFORE UPDATE OR DELETE ON submission_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_history_mutation();
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION forbid_history_mutation();
--> statement-breakpoint

-- 2. A finalized grade can only change inside a transaction that declares an audited reason
--    (the application sets app.grade_change_reason and writes grade_history in the same transaction).
CREATE OR REPLACE FUNCTION guard_final_grade() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'final' AND (NEW.points IS DISTINCT FROM OLD.points OR NEW.status IS DISTINCT FROM OLD.status)
     AND coalesce(current_setting('app.grade_change_reason', true), '') = '' THEN
    RAISE EXCEPTION 'finalized grade % cannot change without an audited reason', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER grades_guard_final BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION guard_final_grade();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION forbid_grade_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'grades are never deleted' USING ERRCODE = 'restrict_violation';
END $$;
--> statement-breakpoint
CREATE TRIGGER grades_no_delete BEFORE DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION forbid_grade_delete();
--> statement-breakpoint

-- 3. Avatar reference (added here because users <-> files reference each other).
ALTER TABLE users ADD CONSTRAINT users_avatar_file_id_fk FOREIGN KEY (avatar_file_id) REFERENCES files(id) ON DELETE SET NULL;
