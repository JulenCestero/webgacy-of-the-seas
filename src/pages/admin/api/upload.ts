import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  // Cloudflare Workers no soporta el sistema de archivos local.
  // Las imágenes deben subirse manualmente a /public/uploads/
  // o configurar Cloudflare R2 para almacenamiento.
  return new Response(
    JSON.stringify({
      error: "Upload no disponible en producción. Sube las imágenes manualmente al repositorio en /public/uploads/ o contacta al administrador.",
      hint: "Para habilitar uploads, configurar Cloudflare R2"
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    }
  );
};
