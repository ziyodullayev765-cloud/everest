/**
 * Relational data model for the learning platform.
 *
 * Conventions
 * - UUID primary keys (gen_random_uuid()), timestamptz everywhere.
 * - Nothing that carries academic history is hard-deleted: users are deactivated, classes and
 *   assignments archived. Foreign keys from history tables use RESTRICT so a stray DELETE fails loudly.
 * - Scores are numeric(7,2) to avoid float drift.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const score = (name: string) => numeric(name, { precision: 7, scale: 2, mode: "number" });

export const roleEnum = pgEnum("user_role", ["super_admin", "admin", "teacher", "student"]);
export const userStatusEnum = pgEnum("user_status", ["active", "deactivated"]);
export const assignmentTypeEnum = pgEnum("assignment_type", [
  "written",
  "file_upload",
  "multiple_choice",
  "short_answer",
  "true_false",
  "timed_quiz",
  "practice",
  "material",
  "homework",
]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["draft", "scheduled", "published", "archived"]);
export const reviewModeEnum = pgEnum("review_mode", ["never", "after_submit", "after_due", "after_grading"]);
export const questionTypeEnum = pgEnum("question_type", [
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
  "matching",
  "essay",
]);
export const submissionStatusEnum = pgEnum("submission_status", ["draft", "submitted", "returned", "graded"]);
export const attemptStatusEnum = pgEnum("attempt_status", ["in_progress", "submitted", "graded"]);
export const gradeStatusEnum = pgEnum("grade_status", ["provisional", "final"]);

// ─── Identity ────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    email: text("email"),
    displayName: text("display_name").notNull(),
    role: roleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("active"),
    passwordHash: text("password_hash").notNull(),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    /** Extra grants, e.g. "classes.all", "grades.edit_final", "assignments.create". */
    permissions: text("permissions").array().notNull().default(sql`'{}'::text[]`),
    studentCode: text("student_code"),
    avatarFileId: uuid("avatar_file_id"),
    locale: text("locale").notNull().default("uz"),
    gamificationEnabled: boolean("gamification_enabled").notNull().default(true),
    notificationPrefs: jsonb("notification_prefs").$type<Record<string, boolean>>().notNull().default({}),
    weeklyTaskGoal: integer("weekly_task_goal").notNull().default(5),
    dailyXpGoal: integer("daily_xp_goal").notNull().default(30),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_username_key").on(sql`lower(${t.username})`),
    uniqueIndex("users_email_key").on(sql`lower(${t.email})`).where(sql`${t.email} is not null`),
    uniqueIndex("users_student_code_key").on(t.studentCode).where(sql`${t.studentCode} is not null`),
    index("users_role_status_idx").on(t.role, t.status),
    check("users_username_format", sql`${t.username} ~ '^[a-zA-Z0-9._-]{3,40}$'`),
    check("users_goals_range", sql`${t.weeklyTaskGoal} between 1 and 100 and ${t.dailyXpGoal} between 5 and 1000`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the random cookie token; the raw token never touches the database. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("password_resets_user_idx").on(t.userId)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull(),
});

// ─── Files ───────────────────────────────────────────────────────────────────

/**
 * Uploaded files are stored in Postgres so private files are only ever served through an authorised
 * route handler. Swap for object storage (S3/R2) behind src/server/services/files.ts when volume grows.
 */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    /** "public" files (logo, assignment images) may be cached; "private" (submissions) never. */
    visibility: text("visibility").notNull().default("private"),
    /** "db": bytes in `data`; "blob": object storage (large books/audio), bytes at `blobUrl`. */
    storage: text("storage").notNull().default("db"),
    data: bytea("data"),
    blobUrl: text("blob_url"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("files_owner_idx").on(t.ownerId),
    check("files_size_positive", sql`${t.size} > 0`),
    check("files_visibility", sql`${t.visibility} in ('public','private')`),
    check("files_storage", sql`(${t.storage} = 'db' and ${t.data} is not null) or (${t.storage} = 'blob' and ${t.blobUrl} is not null)`),
  ],
);

// ─── Organisation ────────────────────────────────────────────────────────────

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    color: text("color").notNull().default("#0f766e"),
    archivedAt: ts("archived_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("subjects_code_key").on(sql`lower(${t.code})`),
    check("subjects_color_hex", sql`${t.color} ~ '^#[0-9a-fA-F]{6}$'`),
  ],
);

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    gradeLevel: integer("grade_level"),
    academicYear: text("academic_year").notNull(),
    joinCode: text("join_code"),
    archivedAt: ts("archived_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("classes_join_code_key").on(t.joinCode).where(sql`${t.joinCode} is not null`),
    check("classes_grade_level", sql`${t.gradeLevel} is null or ${t.gradeLevel} between 1 and 12`),
  ],
);

export const classStudents = pgTable(
  "class_students",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    joinedAt: ts("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.studentId] }), index("class_students_student_idx").on(t.studentId)],
);

/** A teacher only has access to the classes listed here (unless granted "classes.all"). */
export const classTeachers = pgTable(
  "class_teachers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    /** null = all subjects in this class. */
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "restrict" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("class_teachers_key").on(t.classId, t.teacherId, sql`coalesce(${t.subjectId}, '00000000-0000-0000-0000-000000000000'::uuid)`),
    index("class_teachers_teacher_idx").on(t.teacherId),
  ],
);

// ─── Assignments & quizzes ───────────────────────────────────────────────────

export type RubricCriterion = { id: string; title: string; description?: string; maxPoints: number };
export const HOMEWORK_KINDS = ["reading", "vocabulary", "listening", "translation", "tapescript", "writing", "other"] as const;
export type HomeworkKind = (typeof HOMEWORK_KINDS)[number];
/** One line of a homework list, e.g. "Barron's Reading — Passage 1-2". */
export type HomeworkItem = { id: string; kind: HomeworkKind; title: string; bookId?: string | null; range?: string; note?: string };
export type ItemProgress = Record<string, { done: boolean; text?: string }>;
export type AssignmentLink = { title: string; url: string };

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    type: assignmentTypeEnum("type").notNull(),
    status: assignmentStatusEnum("status").notNull().default("draft"),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishAt: ts("publish_at"),
    dueAt: ts("due_at"),
    maxScore: score("max_score").notNull().default(100),
    links: jsonb("links").$type<AssignmentLink[]>().notNull().default([]),
    rubric: jsonb("rubric").$type<RubricCriterion[]>().notNull().default([]),
    items: jsonb("items").$type<HomeworkItem[]>().notNull().default([]),
    allowLate: boolean("allow_late").notNull().default(true),
    latePenaltyPercent: integer("late_penalty_percent").notNull().default(0),
    lateCutoffAt: ts("late_cutoff_at"),
    allowResubmission: boolean("allow_resubmission").notNull().default(false),
    maxResubmissions: integer("max_resubmissions").notNull().default(0),
    // Quiz settings (used when the assignment has questions)
    timeLimitMinutes: integer("time_limit_minutes"),
    maxAttempts: integer("max_attempts").notNull().default(1),
    passingPercent: integer("passing_percent").notNull().default(60),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
    shuffleOptions: boolean("shuffle_options").notNull().default(false),
    allowBackNavigation: boolean("allow_back_navigation").notNull().default(true),
    showOverview: boolean("show_overview").notNull().default(true),
    reviewMode: reviewModeEnum("review_mode").notNull().default("after_submit"),
    showCorrectAnswers: boolean("show_correct_answers").notNull().default(true),
    publishedAt: ts("published_at"),
    archivedAt: ts("archived_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("assignments_status_idx").on(t.status, t.publishAt),
    index("assignments_due_idx").on(t.dueAt),
    index("assignments_subject_idx").on(t.subjectId),
    check("assignments_max_score", sql`${t.maxScore} > 0 and ${t.maxScore} <= 1000`),
    check("assignments_late_penalty", sql`${t.latePenaltyPercent} between 0 and 100`),
    check("assignments_attempts", sql`${t.maxAttempts} between 1 and 20`),
    check("assignments_passing", sql`${t.passingPercent} between 0 and 100`),
    check("assignments_time_limit", sql`${t.timeLimitMinutes} is null or ${t.timeLimitMinutes} between 1 and 600`),
    check("assignments_scheduled_has_date", sql`${t.status} <> 'scheduled' or ${t.publishAt} is not null`),
  ],
);

/** Visibility: one row per targeted class or individual student. */
export const assignmentTargets = pgTable(
  "assignment_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "restrict" }),
    studentId: uuid("student_id").references(() => users.id, { onDelete: "restrict" }),
  },
  (t) => [
    index("assignment_targets_assignment_idx").on(t.assignmentId),
    index("assignment_targets_class_idx").on(t.classId),
    index("assignment_targets_student_idx").on(t.studentId),
    check("assignment_targets_one", sql`(${t.classId} is null) <> (${t.studentId} is null)`),
  ],
);

export const assignmentAttachments = pgTable(
  "assignment_attachments",
  {
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.assignmentId, t.fileId] })],
);

export type QuestionConfig = {
  /** short_answer / fill_blank: accepted answers (one list per blank for fill_blank). */
  accepted?: string[][];
  caseSensitive?: boolean;
  /** matching: left/right pairs. */
  pairs?: { id: string; left: string; right: string }[];
};

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** null = lives in the question bank only. */
    assignmentId: uuid("assignment_id").references(() => assignments.id, { onDelete: "cascade" }),
    bankSubjectId: uuid("bank_subject_id").references(() => subjects.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
    points: score("points").notNull().default(1),
    explanation: text("explanation").notNull().default(""),
    config: jsonb("config").$type<QuestionConfig>().notNull().default({}),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("questions_assignment_idx").on(t.assignmentId, t.position),
    index("questions_bank_idx").on(t.bankSubjectId).where(sql`${t.assignmentId} is null`),
    check("questions_points", sql`${t.points} >= 0 and ${t.points} <= 100`),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    label: text("label").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (t) => [index("question_options_question_idx").on(t.questionId, t.position)],
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    attemptNo: integer("attempt_no").notNull(),
    status: attemptStatusEnum("status").notNull().default("in_progress"),
    questionOrder: jsonb("question_order").$type<string[]>().notNull(),
    optionOrder: jsonb("option_order").$type<Record<string, string[]>>().notNull().default({}),
    startedAt: ts("started_at").notNull().defaultNow(),
    expiresAt: ts("expires_at"),
    submittedAt: ts("submitted_at"),
    autoScore: score("auto_score"),
    manualScore: score("manual_score"),
    score: score("score"),
    maxScore: score("max_score").notNull(),
    needsManualGrading: boolean("needs_manual_grading").notNull().default(false),
    isLate: boolean("is_late").notNull().default(false),
  },
  (t) => [
    uniqueIndex("quiz_attempts_no_key").on(t.assignmentId, t.studentId, t.attemptNo),
    uniqueIndex("quiz_attempts_one_open_key")
      .on(t.assignmentId, t.studentId)
      .where(sql`${t.status} = 'in_progress'`),
    index("quiz_attempts_student_idx").on(t.studentId, t.submittedAt),
  ],
);

export const quizResponses = pgTable(
  "quiz_responses",
  {
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "restrict" }),
    answer: jsonb("answer").$type<unknown>(),
    isCorrect: boolean("is_correct"),
    pointsAwarded: score("points_awarded"),
    gradedBy: uuid("graded_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.questionId] })],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: submissionStatusEnum("status").notNull().default("draft"),
    content: text("content").notNull().default(""),
    itemProgress: jsonb("item_progress").$type<ItemProgress>().notNull().default({}),
    /** Number of times the work was submitted (1 = first submission). */
    version: integer("version").notNull().default(0),
    isLate: boolean("is_late").notNull().default(false),
    submittedAt: ts("submitted_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("submissions_assignment_student_key").on(t.assignmentId, t.studentId),
    index("submissions_student_idx").on(t.studentId, t.submittedAt),
    index("submissions_status_idx").on(t.status),
  ],
);

/** Immutable snapshot of every submitted version. */
export const submissionVersions = pgTable(
  "submission_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "restrict" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    itemProgress: jsonb("item_progress").$type<ItemProgress>().notNull().default({}),
    fileIds: jsonb("file_ids").$type<string[]>().notNull().default([]),
    isLate: boolean("is_late").notNull(),
    submittedAt: ts("submitted_at").notNull(),
  },
  (t) => [uniqueIndex("submission_versions_key").on(t.submissionId, t.version)],
);

export const submissionFiles = pgTable(
  "submission_files",
  {
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "restrict" }),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.fileId] })],
);

// ─── Library ─────────────────────────────────────────────────────────────────

export const BOOK_CATEGORIES = ["reading", "listening", "vocabulary", "grammar", "speaking", "writing", "other"] as const;

/** Books and course materials uploaded by admins; visible to every signed-in user once published. */
export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    author: text("author").notNull().default(""),
    level: text("level").notNull().default(""),
    category: text("category").notNull().default("other"),
    description: text("description").notNull().default(""),
    coverFileId: uuid("cover_file_id").references(() => files.id, { onDelete: "set null" }),
    pdfFileId: uuid("pdf_file_id").references(() => files.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("books_status_idx").on(t.status, t.title),
    check("books_status", sql`${t.status} in ('draft','published','archived')`),
    check("books_category", sql`${t.category} in ('reading','listening','vocabulary','grammar','speaking','writing','other')`),
  ],
);

export const bookAudio = pgTable(
  "book_audio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "restrict" }),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("book_audio_book_idx").on(t.bookId, t.position)],
);

// ─── Grading ─────────────────────────────────────────────────────────────────

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "restrict" }),
    attemptId: uuid("attempt_id").references(() => quizAttempts.id, { onDelete: "restrict" }),
    points: score("points").notNull(),
    maxPoints: score("max_points").notNull(),
    percent: score("percent").notNull(),
    /** Label from the configured grading scale at the time of grading (e.g. "5", "A"). */
    scaleLabel: text("scale_label").notNull(),
    status: gradeStatusEnum("status").notNull().default("provisional"),
    rubricScores: jsonb("rubric_scores").$type<Record<string, number>>().notNull().default({}),
    latePenaltyApplied: score("late_penalty_applied").notNull().default(0),
    gradedBy: uuid("graded_by").references(() => users.id, { onDelete: "restrict" }),
    gradedAt: ts("graded_at").notNull().defaultNow(),
    finalizedAt: ts("finalized_at"),
  },
  (t) => [
    uniqueIndex("grades_assignment_student_key").on(t.assignmentId, t.studentId),
    index("grades_student_idx").on(t.studentId, t.gradedAt),
    check("grades_points_range", sql`${t.points} >= 0 and ${t.points} <= ${t.maxPoints}`),
    check("grades_percent_range", sql`${t.percent} between 0 and 100`),
  ],
);

/** Append-only audit trail of every grade change. */
export const gradeHistory = pgTable(
  "grade_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gradeId: uuid("grade_id")
      .notNull()
      .references(() => grades.id, { onDelete: "restrict" }),
    oldPoints: score("old_points"),
    newPoints: score("new_points").notNull(),
    oldStatus: gradeStatusEnum("old_status"),
    newStatus: gradeStatusEnum("new_status").notNull(),
    reason: text("reason").notNull().default(""),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    changedAt: ts("changed_at").notNull().defaultNow(),
  },
  (t) => [index("grade_history_grade_idx").on(t.gradeId, t.changedAt)],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    kind: text("kind").notNull().default("comment"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("feedback_target_idx").on(t.assignmentId, t.studentId),
    check("feedback_kind", sql`${t.kind} in ('comment','revision_request')`),
  ],
);

// ─── Gamification ────────────────────────────────────────────────────────────

/** XP ledger. `sourceKey` is unique so repeated requests can never award the same XP twice. */
export const xpTransactions = pgTable(
  "xp_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    sourceKey: text("source_key").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("xp_transactions_source_key").on(t.sourceKey),
    index("xp_transactions_user_idx").on(t.userId, t.createdAt),
    check("xp_amount_range", sql`${t.amount} between -1000 and 1000`),
  ],
);

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    earnedAt: ts("earned_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.code] })],
);

/** Optional class-wide goals; progress is shown in aggregate only. */
export const classChallenges = pgTable(
  "class_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    targetSubmissions: integer("target_submissions").notNull(),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("class_challenges_class_idx").on(t.classId, t.endsAt),
    check("class_challenges_window", sql`${t.endsAt} > ${t.startsAt}`),
    check("class_challenges_target", sql`${t.targetSubmissions} between 1 and 100000`),
  ],
);

// ─── Communication ───────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    link: text("link"),
    /** Prevents duplicate notifications for the same event (e.g. deadline reminder). */
    dedupeKey: text("dedupe_key"),
    readAt: ts("read_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("notifications_dedupe_key").on(t.userId, t.dedupeKey).where(sql`${t.dedupeKey} is not null`),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("announcements_class_idx").on(t.classId, t.createdAt)],
);

// ─── Platform ────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ipHash: text("ip_hash"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorId),
  ],
);

export type User = typeof users.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type QuestionOption = typeof questionOptions.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type Book = typeof books.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type AssignmentType = (typeof assignmentTypeEnum.enumValues)[number];
export type QuestionType = (typeof questionTypeEnum.enumValues)[number];
