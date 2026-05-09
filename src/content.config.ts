import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const classes = defineCollection({
  loader: glob({
    base: './src/content/classes',
    pattern: '**/*.md',
    // Use the full filename (without .md) as the ID to avoid collisions
    // between class-01.dev.md and class-01.iast.md
    generateId: ({ entry }) => {
      // entry is like "brhadaranyaka/2-4/class-01.dev.md"
      // Remove just the final .md extension, keep .dev / .iast
      return entry.replace(/\.md$/, '');
    },
  }),
  schema: z.object({
    series: z.string(),
    series_title: z.string(),
    adhyaya: z.number(),
    brahmana: z.number(),
    brahmana_name: z.string(),
    class_number: z.number(),
    date: z.string(),
    coverage: z.string(),
    audio_url: z.string().optional().default(''),
    video_url: z.string().optional().default(''),
    materials_url: z.string().optional().default(''),
    script: z.enum(['devanagari', 'iast']),
    source_ref: z.string().optional().default(''),
    source_text_content: z.string().optional().default(''),
    related_verses: z.string().optional().default(''),
  }),
});

export const collections = { classes };
