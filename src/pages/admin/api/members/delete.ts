import type { APIRoute } from "astro";
import { db, members } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return redirect("/admin/miembros?error=missing_id");
    }

    await db.delete(members).where(eq(members.id, id));
    return redirect("/admin/miembros?deleted=1");
  } catch (error) {
    console.error("Error deleting member:", error);
    return redirect("/admin/miembros?error=delete_failed");
  }
};
