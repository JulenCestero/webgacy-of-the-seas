import type { APIRoute } from "astro";

// Type for R2 bucket
type R2Bucket = {
  get: (key: string) => Promise<{
    arrayBuffer: () => Promise<ArrayBuffer>;
    httpMetadata?: { contentType?: string };
  } | null>;
};

export const GET: APIRoute = async ({ params, locals }) => {
  const filePath = params.path;

  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  const runtime = locals.runtime;
  const env = runtime?.env as Record<string, unknown> | undefined;
  const R2_BUCKET = env?.R2_BUCKET as R2Bucket | undefined;

  if (!R2_BUCKET) {
    return new Response("R2 not configured", { status: 501 });
  }

  try {
    const object = await R2_BUCKET.get(filePath);

    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const data = await object.arrayBuffer();
    const contentType = object.httpMetadata?.contentType || "application/octet-stream";

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("R2 fetch error:", error);
    return new Response("Error fetching file", { status: 500 });
  }
};
