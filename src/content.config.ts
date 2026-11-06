// Actualités : un fichier Markdown par actu dans src/content/actualites/.
// Les fichiers qui commencent par _ (comme _modele.md) ne sont pas publiés.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { themes } from '../config/themes';

const themeSlugs = themes.map((t) => t.slug) as [string, ...string[]];

const schema = z.object({
  titre: z.string().min(10).max(120),
  date: z.coerce.date(),
  /** Chapô : 1 à 2 phrases, affiché en liste et utilisé comme description Google */
  chapo: z.string().min(40).max(220),
  /** Photo : chemin dans /public/actualites/ (ex. /actualites/2026-11-06-arbitre.jpg) */
  image: z.string().optional(),
  imageAlt: z.string().optional(),
  /** Crédit photo (nom du photographe), affiché sous la photo */
  credit: z.string().optional(),
  source: z.object({ nom: z.string(), url: z.string().url().optional() }).optional(),
  themes: z.array(z.enum(themeSlugs)).default([]),
  /** Identifiant YouTube d'un épisode ou extrait qui parle du sujet (facultatif) */
  video: z.string().optional(),
  brouillon: z.boolean().default(false),
});

const actualites = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/actualites' }),
  schema,
});

/** Actus de démonstration (aperçu DEMO_CONTENT=1 uniquement, jamais publiées en production) */
const actualitesDemo = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './data/demo/actualites' }),
  schema,
});

export const collections = { actualites, actualitesDemo };
