import { json } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { listForStaff, listForStudent } from "@/server/services/assignments";

/** GET /api/v1/assignments — students: assignments visible to them with status; staff: what they manage. */
export async function GET() {
  return json(async () => {
    const u = await requireUser();
    return u.role === "student" ? listForStudent(u.id) : listForStaff(u);
  });
}
