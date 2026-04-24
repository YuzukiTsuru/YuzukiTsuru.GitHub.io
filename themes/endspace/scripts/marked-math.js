'use strict';

// Protect $...$ and $$...$$ from Markdown processing so MathJax receives raw LaTeX.
// Without this, Marked mangles _ * \ inside math delimiters, breaking inline math.

hexo.extend.filter.register('marked:extensions', function (extensions) {
  extensions.push({
    name: 'math',
    level: 'inline',
    start(src) {
      return src.indexOf('$');
    },
    tokenizer(src) {
      // $$...$$ display math
      let match = src.match(/^\$\$([\s\S]+?)\$\$/);
      if (match) {
        return { type: 'math', raw: match[0], text: match[0], display: true };
      }
      // $...$ inline math — no line breaks allowed inside
      match = src.match(/^\$([^\n]+?)\$/);
      if (match) {
        return { type: 'math', raw: match[0], text: match[0], display: false };
      }
    },
    renderer(token) {
      return token.text;
    }
  });
});
