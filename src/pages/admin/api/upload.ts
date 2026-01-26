import type { APIRoute } from "astro";
import * as fs from "node:fs";
import * as path from "node:path";

// Type for R2 bucket
type R2Bucket = {
  put: (key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType: string } }) => Promise<void>;
  get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string || "uploads";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No se proporcionó ningún archivo" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Tipo de archivo no permitido. Usa JPG, PNG, WebP, GIF o SVG." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "El archivo es demasiado grande. Máximo 10MB." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filename = `${timestamp}-${randomStr}.${extension}`;

    // Clean folder path
    const cleanFolder = folder.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9\-_\/]/g, "");
    const key = `${cleanFolder}/${filename}`;

    // Get file content
    const arrayBuffer = await file.arrayBuffer();

    // Try R2 first (production), fallback to local filesystem (development)
    const runtime = locals.runtime;
    const env = runtime?.env as Record<string, unknown> | undefined;
    const R2_BUCKET = env?.R2_BUCKET as R2Bucket | undefined;

    if (R2_BUCKET) {
      // Production: Upload to Cloudflare R2
      await R2_BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });

      // Return URL pointing to our R2 serve endpoint
      const url = `/r2/${key}`;

      return new Response(
        JSON.stringify({ success: true, url, key, filename, size: file.size, type: file.type }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Development: Save to local filesystem
      const publicDir = path.join(process.cwd(), "public");
      const uploadDir = path.join(publicDir, cleanFolder);

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

      // Return local URL
      const url = `/${key}`;

      return new Response(
        JSON.stringify({ success: true, url, key, filename, size: file.size, type: file.type }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(
      JSON.stringify({
        error: "Error al subir el archivo",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
