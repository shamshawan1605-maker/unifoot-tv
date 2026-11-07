import type { APIRoute } from 'astro';
import { abs } from '~/lib/seo';
import { isDemo } from '~/lib/content';
export const GET: APIRoute = () =>
  new Response(
    isDemo
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\nDisallow: /merci/\nDisallow: /api/\n\nSitemap: ${abs('/sitemap.xml')}\nSitemap: ${abs('/news-sitemap.xml')}\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
