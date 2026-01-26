/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type R2Bucket = import("@cloudflare/workers-types").R2Bucket;

interface CloudflareEnv {
  R2_BUCKET: R2Bucket;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends Runtime {}
}
