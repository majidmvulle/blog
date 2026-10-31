import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { strapiPostsLoader } from './loaders/strapi';

// Read from .env files (import.meta.env) or the build environment (process.env).
const env = (name: string): string | undefined => import.meta.env[name] ?? process.env[name];

const strapiUrl = env('STRAPI_URL');

const blog = defineCollection({
	// With STRAPI_URL set, posts come from the shared Strapi; otherwise from src/content/blog/.
	loader: strapiUrl
		? strapiPostsLoader({
				url: strapiUrl,
				token: env('STRAPI_TOKEN'),
				cfAccessClientId: env('CF_ACCESS_CLIENT_ID'),
				cfAccessClientSecret: env('CF_ACCESS_CLIENT_SECRET'),
			})
		: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			// A local image in Markdown frontmatter, or an absolute URL from Strapi.
			heroImage: z.optional(z.union([z.url(), image()])),
		}),
});

export const collections = { blog };
