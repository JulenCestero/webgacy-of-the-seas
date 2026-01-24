import type { APIRoute } from "astro";
import { db, posts } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return redirect("/admin/archivo?error=missing_id");
    }

    await db.delete(posts).where(eq(posts.id, id));
    return redirect("/admin/archivo?deleted=1");
  } catch (error) {
    console.error("Error deleting post:", error);
    return redirect("/admin/archivo?error=delete_failed");
  }
};
