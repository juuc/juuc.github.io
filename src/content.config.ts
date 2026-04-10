import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// i18n: language of this post. Defaults to 'en' so existing posts keep working.
			lang: z.enum(['en', 'ko']).default('en'),
			// i18n: slug (relative to /blog/) of the same post in the other language.
			// Example: on an English post, set translation: 'ko/my-post'.
			// When set, BlogPost layout renders a language switcher link.
			translation: z.string().optional(),
		}),
});

export const collections = { blog };
