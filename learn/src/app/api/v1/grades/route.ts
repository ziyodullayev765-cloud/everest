import { json } from "@/server/http";
import { requireRole } from "@/server/auth/session";
import { studentGrades } from "@/server/services/grades";

/** GET /api/v1/grades — the signed-in student's own grades only. */
export async function GET() {
  return json(async () => studentGrades((await requireRole("student")).id));
}
