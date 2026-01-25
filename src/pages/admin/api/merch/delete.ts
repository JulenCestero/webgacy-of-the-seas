import type { APIRoute } from "astro";
import { db, merch } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
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
