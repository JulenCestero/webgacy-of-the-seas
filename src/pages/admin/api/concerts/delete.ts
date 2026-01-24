import type { APIRoute } from "astro";
import { db, concerts } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
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
