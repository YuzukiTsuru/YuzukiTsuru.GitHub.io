'use strict';

const SVG_ICONS = {
  cloud:
    '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M6 19a5 5 0 0 1-1.1-9.88A6 6 0 0 1 17 8.46 4.5 4.5 0 0 1 18.5 17H6Z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-8.5Z"/></svg>',
  posts:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v2H4V4Zm0 4h16v2H4V8Zm0 4h10v2H4v-2Zm0 4h8v2H4v-2Z"/></svg>',
  category:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h6l11 11-6 6L3 10V4Z"/><circle cx="7" cy="8" r="1.5" fill="currentColor"/></svg>',
  archive:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v4H3zM4 10h16l-1.5 10a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2L4 10Zm5 3v2h6v-2H9Z"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  friends:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4c2 0 4 1.5 4 4s-2 4-4 4-4-1.5-4-4 2-4 4-4Z"/></svg>',
  promotion:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7l3-7Z"/></svg>',
  portfolio:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  arrow_up:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  list_tree:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M8 12h12M12 18h8M4 6v12"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  message:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16v11H8l-4 4V5Z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l14 14M19 5 5 19"/></svg>',
  refresh:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 4v4h-4M21 12a9 9 0 0 1-15.5 6.3L3 16M3 20v-4h4"/></svg>',
  folder:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/></svg>',
  file_text:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M9 14h6M9 17h4"/></svg>',
  arrow_right:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
  chevron_left:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg>',
  chevron_right:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>',
  chevrons_left:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5l-7 7 7 7M19 5l-7 7 7 7"/></svg>',
  chevrons_right:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>',
  loader:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  radar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 12 4 6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v14H3z M3 5l9 7 9-7"/></svg>'
};

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

hexo.extend.helper.register('icon', function (name, attrs) {
  const svg = SVG_ICONS[name];
  if (!svg) return '';
  const cls = attrs && attrs.class ? ` class="${escAttr(attrs.class)}"` : '';
  const size =
    attrs && attrs.size ? ` width="${escAttr(attrs.size)}" height="${escAttr(attrs.size)}"` : '';
  return svg.replace('<svg', `<svg${cls}${size}`);
});

hexo.extend.helper.register('docId', function (post) {
  const seed = (post && (post.path || post.source || post.title || '')) + '';
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(6, '0').slice(0, 6).toUpperCase();
});

hexo.extend.helper.register('postCover', function (post) {
  if (!post) return '';
  if (post._aicCover !== undefined) return post._aicCover;
  let cover = '';
  if (post.cover) cover = post.cover;
  else if (post.thumbnail) cover = post.thumbnail;
  else if (Array.isArray(post.photos) && post.photos.length) cover = post.photos[0];
  try {
    post._aicCover = cover;
  } catch (_e) {}
  return cover;
});

// Centralized menu + social config consumed by both desktop and mobile nav.
hexo.extend.helper.register('themeMenu', function () {
  const e = this.theme.endspace || {};
  return [
    { name: this.__('menu.home'), path: '/', icon: 'home', show: true },
    { name: this.__('menu.posts'), path: '/posts/', icon: 'posts', show: e.menu_posts !== false },
    { name: this.__('menu.tag'), path: '/tags/', icon: 'tag', show: e.menu_tag !== false },
    {
      name: this.__('menu.archive'),
      path: '/archives/',
      icon: 'archive',
      show: e.menu_archive !== false
    },
    { name: this.__('menu.friends'), path: '/friends/', icon: 'friends', show: true },
    {
      name: this.__('menu.promotion'),
      path: '/promotion/',
      icon: 'promotion',
      show: e.menu_promotion !== false
    },
    {
      name: this.__('menu.search'),
      path: '/search/',
      icon: 'search',
      show: e.menu_search !== false
    }
  ].filter(i => i.show);
});

hexo.extend.helper.register('themeSocial', function () {
  const c = this.theme.contact || {};
  return [
    { url: c.github, icon: 'ri-github-fill', label: 'GitHub' },
    { url: c.twitter, icon: 'ri-twitter-x-fill', label: 'X' },
    { url: c.weibo, icon: 'ri-weibo-fill', label: 'Weibo' },
    { url: c.bilibili, icon: 'ri-bilibili-fill', label: 'Bilibili' },
    { url: c.telegram, icon: 'ri-telegram-fill', label: 'Telegram' },
    { url: c.instagram, icon: 'ri-instagram-fill', label: 'Instagram' },
    { url: c.youtube, icon: 'ri-youtube-fill', label: 'YouTube' },
    { url: c.xiaohongshu, icon: 'ri-heart-3-fill', label: 'Xiaohongshu' },
    { url: c.linkedin, icon: 'ri-linkedin-box-fill', label: 'LinkedIn' },
    { url: c.zhishixingqiu, icon: 'ri-global-fill', label: 'Zhishixingqiu' },
    { url: c.wechat_public, icon: 'ri-wechat-fill', label: 'WeChat' }
  ].filter(s => s.url);
});

const HEADING_PROBE = /<h[1-4][\s>]/i;

function ensureToc(post) {
  if (!post || !post.content) return { toc: [], html: post && post.content };
  if (post._aicToc) return post._aicToc;
  if (!HEADING_PROBE.test(post.content)) {
    const empty = { toc: [], html: post.content };
    try {
      post._aicToc = empty;
    } catch (_e) {}
    return empty;
  }
  const cheerio = require('cheerio');
  const $ = cheerio.load(post.content, null, false);
  const toc = [];
  const used = new Set();
  $('h1, h2, h3, h4').each(function () {
    const el = $(this);
    const text = el.text().trim();
    if (!text) return;
    let id = el.attr('id');
    if (!id) {
      id =
        text
          .toLowerCase()
          .replace(/[^\w一-龥]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'h';
    }
    let candidate = id;
    let n = 1;
    while (used.has(candidate)) {
      candidate = id + '-' + ++n;
    }
    used.add(candidate);
    el.attr('id', candidate);
    el.attr('data-id', candidate);
    el.addClass('notion-h');
    const level = parseInt(this.tagName.slice(1), 10);
    toc.push({ id: candidate, text, indentLevel: Math.max(0, level - 1) });
  });
  const out = { toc, html: $.html() };
  try {
    post._aicToc = out;
  } catch (_e) {}
  return out;
}

hexo.extend.helper.register('tocFromPost', function (post) {
  return ensureToc(post).toc;
});

// Skip non-posts; only post layouts need the heading anchors + TOC.
hexo.extend.filter.register('after_post_render', function (data) {
  if (!data || !data.content || data.layout !== 'post') return data;
  const result = ensureToc(data);
  data.content = result.html;
  data.__toc = result.toc;
  return data;
});

hexo.extend.generator.register('aic_categories_index', function (locals) {
  return {
    path: 'categories/index.html',
    layout: ['categories'],
    data: { title: 'title_categories', categories: locals.categories }
  };
});

hexo.extend.generator.register('aic_tags_index', function (locals) {
  return {
    path: 'tags/index.html',
    layout: ['tags'],
    data: { title: 'title_tags', tags: locals.tags }
  };
});

hexo.extend.generator.register('aic_404', function () {
  return {
    path: '404.html',
    layout: ['404'],
    data: { title: 'title_404', fullWidth: false }
  };
});

hexo.extend.generator.register('aic_search', function () {
  return {
    path: 'search/index.html',
    layout: ['search'],
    data: { title: 'title_search', __search_page: true }
  };
});

hexo.extend.generator.register('aic_posts_index', function (locals) {
  const config = this.config;
  const perPage = config.per_page || 10;
  const posts = locals.posts.sort('-date');
  const total = Math.ceil(posts.length / perPage);

  const results = [];

  for (let i = 0; i < total; i++) {
    const start = i * perPage;
    const end = start + perPage;

    results.push({
      path: i === 0 ? 'posts/index.html' : `posts/page/${i + 1}/index.html`,
      layout: ['posts'],
      data: {
        title: 'Posts',
        posts: posts.slice(start, end),
        current: i + 1,
        total: total,
        base: '/posts/',
        __pagination: true
      }
    });
  }

  return results;
});
