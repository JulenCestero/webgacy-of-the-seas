import type { APIRoute } from "astro";
import { createDb, posts } from "../../../../lib/db";
import { eq } from "drizzle-orm";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  try {
    const runtimeEnv = (locals as any).runtime?.env as Record<string, string> | undefined;
    const db = createDb(runtimeEnv);

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
