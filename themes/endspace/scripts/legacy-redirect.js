'use strict';

// Generate both short-format and long-format URL pages for posts
// Short format: live/YYYYMMDD.aspx (for backward compatibility)
// Long format: live/YYYY-MM-DD-YYYYMMDD.aspx (default Hexo format)
// Both are full article pages, no redirect

hexo.extend.generator.register('post-urls', function (locals) {
  const posts = locals.posts.toArray();
  const pages = [];

  posts.forEach(post => {
    if (!post.source) return;
    const match = post.source.match(/\/([0-9]{4}-[0-9]{2}-[0-9]{2}-([0-9]+))\.md$/);
    if (!match) return;

    const shortUrl = `live/${match[2]}.aspx`;
    const longUrl = `live/${match[1]}.aspx`;

    // Generate long URL page (full article - default)
    pages.push({
      path: longUrl,
      data: post,
      layout: ['post', 'page']
    });

    // Generate short URL page (full article - for backward compatibility)
    pages.push({
      path: shortUrl,
      data: post,
      layout: ['post', 'page']
    });
  });

  return pages;
});
