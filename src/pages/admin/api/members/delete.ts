import type { APIRoute } from "astro";
import { createDb, members } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    const runtimeEnv = (locals as any).runtime?.env as Record<string, string> | undefined;
    const db = createDb(runtimeEnv);

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
