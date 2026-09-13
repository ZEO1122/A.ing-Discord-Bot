const Utils = {
  ARXIV_API_URL: 'https://export.arxiv.org/api/query',
  ARXIV_RSS_URL: 'https://rss.arxiv.org/rss',

  TRACK_QUERY_MAP: {
    llm: '(cat:cs.CL OR cat:cs.AI) AND (all:llm OR all:instruction OR all:alignment OR all:agent OR all:reasoning)',
    'detection-segmentation': 'cat:cs.CV AND (all:detection OR all:segmentation OR all:instance OR all:panoptic)',
    'vision-language': '(cat:cs.CV OR cat:cs.CL OR cat:cs.AI) AND (all:vision-language OR all:image-text OR all:captioning OR all:multimodal OR all:vlm)',
  },

  RSS_CATEGORY_MAP: {
    llm: ['cs.CL', 'cs.AI'],
    'detection-segmentation': ['cs.CV'],
    'vision-language': ['cs.CV', 'cs.CL', 'cs.AI'],
  },

  RSS_KEYWORDS_MAP: {
    llm: ['llm', 'language model', 'alignment', 'agent', 'reasoning', 'instruction'],
    'detection-segmentation': ['detection', 'segmentation', 'instance', 'panoptic', 'mask'],
    'vision-language': ['vision-language', 'image-text', 'multimodal', 'caption', 'vlm'],
  },

  nowIso() {
    return new Date().toISOString();
  },

  formatUtcDate(date) {
    return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
  },

  parseFrontmatter(markdown) {
    if (!markdown.startsWith('---\n')) {
      throw new Error('Markdown must start with YAML frontmatter');
    }
    const parts = markdown.split('\n---\n');
    if (parts.length < 2) {
      throw new Error('Markdown frontmatter split failed');
    }
    const frontmatterText = parts[0].replace(/^---\n/, '');
    const body = parts.slice(1).join('\n---\n').trim();
    return { frontmatterText, body };
  },

  normalizeArxivUrl(url) {
    const trimmed = String(url).trim();
    if (!trimmed.includes('/abs/')) {
      return trimmed;
    }
    const parts = trimmed.split('/abs/');
    let arxivId = parts[1].split('?')[0];
    if (/v\d+$/.test(arxivId)) {
      arxivId = arxivId.replace(/v\d+$/, '');
    }
    return `${parts[0]}/abs/${arxivId}`;
  },

  buildArxivUrl(track, maxResults) {
    const query = this.TRACK_QUERY_MAP[track] || `all:${track}`;
    const params = [
      `search_query=${encodeURIComponent(query)}`,
      'sortBy=submittedDate',
      'sortOrder=descending',
      'start=0',
      `max_results=${maxResults}`,
    ].join('&');
    return `${this.ARXIV_API_URL}?${params}`;
  },

  truncateText(text, limit) {
    const value = String(text || '').trim();
    if (value.length <= limit) {
      return value;
    }
    if (limit <= 1) {
      return value.slice(0, limit);
    }
    return `${value.slice(0, limit - 3).trim()}...`;
  },

  safeTruncateText(text, limit) {
    const value = String(text || '').trim();
    if (value.length <= limit) {
      return value;
    }
    const searchWindow = value.slice(0, limit);
    const boundaries = ['. ', '.\n', '다.', '요.', '! ', '? ', '\n', ' ']
      .map((token) => searchWindow.lastIndexOf(token))
      .filter((index) => index >= 0);
    const cut = boundaries.length ? Math.max(...boundaries) : -1;
    if (cut < Math.floor(limit * 0.6)) {
      return this.truncateText(value, limit);
    }
    return this.truncateText(searchWindow.slice(0, cut + 1).trim(), limit);
  },

  parseMarkdownSections(body) {
    const lines = String(body).split('\n');
    const sections = [];
    let currentHeading = null;
    let currentLines = [];

    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        if (currentHeading) {
          sections.push({ heading: currentHeading, value: currentLines.join('\n').trim() });
        }
        currentHeading = line.replace(/^##\s+/, '').trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    });

    if (currentHeading) {
      sections.push({ heading: currentHeading, value: currentLines.join('\n').trim() });
    }

    return sections.filter((section) => section.value);
  }
};
