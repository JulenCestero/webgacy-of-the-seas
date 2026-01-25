import type { APIRoute } from "astro";
import { createDb, merch } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    const runtimeEnv = (locals as any).runtime?.env as Record<string, string> | undefined;
    const db = createDb(runtimeEnv);

    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return redirect("/admin/tienda?error=missing_id");
    }

    await db.delete(merch).where(eq(merch.id, id));
    return redirect("/admin/tienda?deleted=1");
  } catch (error) {
    console.error("Error deleting merch:", error);
    return redirect("/admin/tienda?error=delete_failed");
  }
};
