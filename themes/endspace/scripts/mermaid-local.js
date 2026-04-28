'use strict';

const CDN_MERMAID_BLOCK =
  /<!-- hexo injector body_end start -->\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/mermaid@[^"]+\/dist\/mermaid\.min\.js"><\/script>\s*<script>\s*document\.addEventListener\('DOMContentLoaded', function\(\) \{\s*mermaid\.initialize\([\s\S]*?\);\s*\}\);\s*<\/script>\s*<!-- hexo injector body_end end -->/g;

hexo.extend.filter.register('after_render:html', function (html) {
  if (!html || html.indexOf('cdn.jsdelivr.net/npm/mermaid@') === -1) return html;
  return html.replace(CDN_MERMAID_BLOCK, '');
});
