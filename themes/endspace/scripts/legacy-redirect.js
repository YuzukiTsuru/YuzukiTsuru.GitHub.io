'use strict';

// Generate redirect pages for legacy long URL format
// Long format: live/2026-04-19-20260419.aspx (Hexo default without custom permalink)
// Short format: live/20260419.aspx (custom permalink in front matter)

hexo.extend.generator.register('legacy-redirect', function (locals) {
  const posts = locals.posts.toArray();
  const redirects = [];

  posts.forEach(post => {
    // Get the canonical URL from permalink
    const canonicalUrl = post.permalink;

    // Build the legacy long-format URL that Hexo would have generated
    // Pattern: YYYY-MM-DD-title.aspx -> live/YYYY-MM-DD-title.aspx
    const sourceMatch = post.source.match(/\/([0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]+)\.md$/);
    if (!sourceMatch) return;

    const legacyLongUrl = `live/${sourceMatch[1]}.aspx`;

    // Skip if legacy and canonical are the same
    if (legacyLongUrl === canonicalUrl) return;

    redirects.push({
      path: legacyLongUrl,
      data: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${post.title || 'Redirect'}</title>
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
  <link rel="canonical" href="${canonicalUrl}">
  <script>window.location.replace('${canonicalUrl}');</script>
</head>
<body>
  <p>Redirecting to <a href="${canonicalUrl}">${canonicalUrl}</a></p>
</body>
</html>`
    });
  });

  return redirects;
});
