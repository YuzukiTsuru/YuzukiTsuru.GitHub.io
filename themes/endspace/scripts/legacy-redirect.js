'use strict';

// Generate short-format URL pages for posts (live/YYYYMMDD.aspx)
// and redirect pages for long-format URLs (live/YYYY-MM-DD-YYYYMMDD.aspx)
// Default Hexo permalink is changed to posts/:title.aspx to avoid conflict

hexo.extend.generator.register('post-urls', function (locals) {
  const posts = locals.posts.toArray();
  const pages = [];

  posts.forEach(post => {
    if (!post.source) return;
    const match = post.source.match(/\/([0-9]{4}-[0-9]{2}-[0-9]{2}-([0-9]+))\.md$/);
    if (!match) return;

    const shortUrl = `live/${match[2]}.aspx`;
    const longUrl = `live/${match[1]}.aspx`;

    // Generate short URL page (full article)
    pages.push({
      path: shortUrl,
      data: post,
      layout: ['post', 'page']
    });

    // Generate redirect for long URL
    pages.push({
      path: longUrl,
      data: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>${post.title || 'Redirect'}</title>
  <meta http-equiv="refresh" content="0;url=/${shortUrl}">
  <link rel="canonical" href="/${shortUrl}">
  <script>window.location.replace('/${shortUrl}');</script>
</head>
<body>
  <p>Redirecting to <a href="/${shortUrl}">/${shortUrl}</a></p>
</body>
</html>`
    });
  });

  return pages;
});
