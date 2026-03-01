/**
 * Telegraph API Service
 * Handles all communication with the Telegraph API
 * API Documentation: https://telegra.ph/api
 */

const TELEGRAPH_API_BASE = 'https://api.telegra.ph';

export interface TelegraphAccount {
  short_name: string;
  author_name: string;
  author_url?: string;
  access_token?: string;
  auth_url?: string;
}

export interface TelegraphPage {
  path: string;
  url: string;
  title: string;
  description: string;
  author_name?: string;
  author_url?: string;
  image_url?: string;
  content?: TelegraphNode[];
  views: number;
  can_edit?: boolean;
}

export type TelegraphNode = string | TelegraphNodeElement;

export interface TelegraphNodeElement {
  tag: string;
  attrs?: Record<string, string>;
  children?: TelegraphNode[];
}

export interface TelegraphResponse<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

/**
 * Create a new Telegraph account
 */
export async function createAccount(
  shortName: string,
  authorName?: string,
  authorUrl?: string
): Promise<TelegraphResponse<TelegraphAccount>> {
  const params = new URLSearchParams({
    short_name: shortName,
    ...(authorName && { author_name: authorName }),
    ...(authorUrl && { author_url: authorUrl }),
  });

  try {
    const response = await fetch(`${TELEGRAPH_API_BASE}/createAccount?${params}`, {
      method: 'GET',
    });
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: `Chyba při vytváření účtu: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
    };
  }
}

/**
 * Convert markdown-like text to Telegraph content format
 * Supports: **bold**, *italic*, `code`, [links](url), # headings
 */
export function markdownToTelegraphContent(markdown: string): TelegraphNode[] {
  const lines = markdown.split('\n');
  const nodes: TelegraphNode[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Handle headings
    if (line.startsWith('# ')) {
      nodes.push({
        tag: 'h3',
        children: parseInlineMarkdown(line.substring(2)),
      });
      continue;
    }

    if (line.startsWith('## ')) {
      nodes.push({
        tag: 'h4',
        children: parseInlineMarkdown(line.substring(3)),
      });
      continue;
    }

    // Handle paragraphs
    nodes.push({
      tag: 'p',
      children: parseInlineMarkdown(line),
    });
  }

  return nodes;
}

/**
 * Parse inline markdown formatting
 */
function parseInlineMarkdown(text: string): TelegraphNode[] {
  const nodes: TelegraphNode[] = [];
  let currentIndex = 0;

  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, tag: 'strong' },
    { regex: /\*(.+?)\*/g, tag: 'em' },
    { regex: /`(.+?)`/g, tag: 'code' },
    { regex: /\[(.+?)\]\((.+?)\)/g, tag: 'a', isLink: true },
  ];

  let lastIndex = 0;
  const matches: Array<{ start: number; end: number; tag: string; content: string; href?: string }> = [];

  // Find all matches
  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      if (pattern.isLink) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          tag: pattern.tag,
          content: match[1],
          href: match[2],
        });
      } else {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          tag: pattern.tag,
          content: match[1],
        });
      }
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Build nodes from matches
  for (const match of matches) {
    if (match.start > lastIndex) {
      nodes.push(text.substring(lastIndex, match.start));
    }

    if (match.tag === 'a') {
      nodes.push({
        tag: 'a',
        attrs: { href: match.href! },
        children: [match.content],
      });
    } else {
      nodes.push({
        tag: match.tag,
        children: [match.content],
      });
    }

    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

/**
 * Publish a page with access token
 */
export async function publishPage(
  accessToken: string,
  title: string,
  content: TelegraphNode[],
  authorName?: string,
  authorUrl?: string
): Promise<TelegraphResponse<TelegraphPage>> {
  const body = new FormData();
  body.append('access_token', accessToken);
  body.append('title', title);
  body.append('content', JSON.stringify(content));
  if (authorName) body.append('author_name', authorName);
  if (authorUrl) body.append('author_url', authorUrl);
  body.append('return_content', 'true');

  try {
    const response = await fetch(`${TELEGRAPH_API_BASE}/createPage`, {
      method: 'POST',
      body,
    });
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: `Chyba při publikování: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
    };
  }
}

/**
 * Get a Telegraph page
 */
export async function getPage(
  path: string,
  returnContent: boolean = true
): Promise<TelegraphResponse<TelegraphPage>> {
  const params = new URLSearchParams({
    return_content: returnContent ? 'true' : 'false',
  });

  try {
    const response = await fetch(`${TELEGRAPH_API_BASE}/getPage/${path}?${params}`, {
      method: 'GET',
    });
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: `Chyba při načítání stránky: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
    };
  }
}

/**
 * Get page views
 */
export async function getViews(
  path: string,
  year?: number,
  month?: number,
  day?: number,
  hour?: number
): Promise<TelegraphResponse<{ views: number }>> {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  if (day) params.append('day', day.toString());
  if (hour) params.append('hour', hour.toString());

  try {
    const response = await fetch(`${TELEGRAPH_API_BASE}/getViews/${path}?${params}`, {
      method: 'GET',
    });
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: `Chyba při načítání počtu zobrazení: ${error instanceof Error ? error.message : 'Neznámá chyba'}`,
    };
  }
}
