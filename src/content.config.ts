import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const members = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/members" }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    image: z.string().optional(),
    order: z.number().default(0),
  }),
});

const concerts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/concerts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    venue: z.string(),
    city: z.string(),
    ticketUrl: z.string().optional(),
    isSoldOut: z.boolean().default(false),
  }),
});

export const collections = { members, concerts };
