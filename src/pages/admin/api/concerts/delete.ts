import type { APIRoute } from "astro";
import { createDb, concerts } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    const runtimeEnv = (locals as any).runtime?.env as Record<string, string> | undefined;
    const db = createDb(runtimeEnv);

    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return redirect("/admin/conciertos?error=missing_id");
    }

    // Delete from database
    await db.delete(concerts).where(eq(concerts.id, id));

    return redirect("/admin/conciertos?deleted=1");
  } catch (error) {
    console.error("Error deleting concert:", error);
    return redirect("/admin/conciertos?error=delete_failed");
  }
};
