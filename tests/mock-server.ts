// Faux serveur YouTube Data v3 + flux podcast + API d'e-mail, pour tester la synchronisation sans réseau.
import { createServer, type Server } from 'node:http';

export interface MockVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  duration: string; // ISO 8601
  tags?: string[];
  privacy?: 'public' | 'private' | 'unlisted';
  short?: boolean;
  deleted?: boolean;
  live?: boolean;
}

export interface MockState {
  channelId: string;
  videos: MockVideo[];
  playlists: Record<string, string[]>;
  podcast: { title: string; pubDate: string; link: string; audio: string; duration: string }[];
  /** 'none' | 'youtube-500' | 'youtube-quota' | 'youtube-empty' | 'podcast-500' | 'all-down' */
  fail: string;
  requests: string[];
  emails: { subject: string; text: string }[];
}

const thumbs = (id: string) => ({
  medium: { url: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, width: 320, height: 180 },
  high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, width: 480, height: 360 },
  standard: { url: `https://i.ytimg.com/vi/${id}/sddefault.jpg`, width: 640, height: 480 },
  maxres: { url: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, width: 1280, height: 720 },
});

function page<T>(items: T[], token: string | null, size = 50) {
  const start = token ? Number(token) : 0;
  const slice = items.slice(start, start + size);
  const next = start + size < items.length ? String(start + size) : undefined;
  return { slice, next };
}

export function startMock(state: MockState, port = 0): Promise<{ server: Server; base: string }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    state.requests.push(url.pathname + url.search);
    const json = (code: number, body: unknown) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const ytDown = state.fail === 'youtube-500' || state.fail === 'all-down';

    if (url.pathname.startsWith('/yt/')) {
      if (ytDown) return json(503, { error: { message: 'backendError', errors: [{ reason: 'backendError' }] } });
      if (state.fail === 'youtube-quota')
        return json(403, { error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } });
      const ep = url.pathname.slice(4);
      const visible = state.videos.filter((v) => !v.deleted && (v.privacy ?? 'public') === 'public' && !v.live);
      if (ep === 'channels') {
        return json(200, {
          items: [
            {
              id: state.channelId,
              snippet: { title: 'UNIFOOT TV', customUrl: '@unifoottv' },
              statistics: { subscriberCount: '16000', videoCount: String(visible.length) },
              contentDetails: { relatedPlaylists: { uploads: 'UU' + state.channelId.slice(2) } },
            },
          ],
        });
      }
      if (ep === 'playlistItems') {
        const pid = url.searchParams.get('playlistId') || '';
        let ids: string[];
        const sorted = [...visible].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
        if (pid === 'UU' + state.channelId.slice(2)) ids = state.fail === 'youtube-empty' ? [] : sorted.map((v) => v.id);
        else if (pid === 'UUSH' + state.channelId.slice(2)) ids = sorted.filter((v) => v.short).map((v) => v.id);
        else if (state.playlists[pid]) ids = state.playlists[pid].filter((id) => visible.some((v) => v.id === id));
        else return json(404, { error: { message: 'playlistNotFound', errors: [{ reason: 'playlistNotFound' }] } });
        const { slice, next } = page(ids, url.searchParams.get('pageToken'));
        return json(200, {
          nextPageToken: next,
          items: slice.map((id, i) => {
            const v = state.videos.find((x) => x.id === id)!;
            return {
              snippet: { title: v.title, position: i, resourceId: { videoId: id } },
              contentDetails: { videoPublishedAt: v.publishedAt },
            };
          }),
        });
      }
      if (ep === 'videos') {
        const ids = (url.searchParams.get('id') || '').split(',');
        const items = state.videos
          .filter((v) => ids.includes(v.id) && !v.deleted)
          .map((v) => ({
            id: v.id,
            snippet: {
              title: v.title,
              description: v.description,
              publishedAt: v.publishedAt,
              tags: v.tags,
              liveBroadcastContent: v.live ? 'live' : 'none',
              thumbnails: thumbs(v.id),
            },
            contentDetails: { duration: v.duration },
            status: { privacyStatus: v.privacy ?? 'public', uploadStatus: 'processed', embeddable: true },
            statistics: { viewCount: '1234' },
          }));
        return json(200, { items });
      }
      return json(404, {});
    }

    if (url.pathname === '/podcast.xml') {
      if (state.fail === 'podcast-500' || state.fail === 'all-down') {
        res.writeHead(500);
        return res.end('down');
      }
      const items = state.podcast
        .map(
          (p, i) => `<item><title><![CDATA[${p.title}]]></title><link>${p.link}</link><guid isPermaLink="false">ep-${i}-${p.pubDate}</guid>
<pubDate>${new Date(p.pubDate).toUTCString()}</pubDate><enclosure url="${p.audio}" length="1000" type="audio/mpeg"/><itunes:duration>${p.duration}</itunes:duration></item>`,
        )
        .join('\n');
      res.writeHead(200, { 'content-type': 'application/rss+xml' });
      return res.end(
        `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel><title>Kick in the Foot</title>${items}</channel></rss>`,
      );
    }

    if (url.pathname === '/mail/emails' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        state.emails.push(JSON.parse(body));
        json(200, { id: 'mail_' + state.emails.length });
      });
      return;
    }
    json(404, {});
  });
  return new Promise((resolve) =>
    server.listen(port, '127.0.0.1', () => {
      const a = server.address();
      const p = typeof a === 'object' && a ? a.port : port;
      resolve({ server, base: `http://127.0.0.1:${p}` });
    }),
  );
}
