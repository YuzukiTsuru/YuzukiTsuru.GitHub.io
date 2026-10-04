'use strict';

// CommonMark refuses to close `**` when it follows punctuation and precedes a letter,
// so `**页表项(PTE)**是` renders literally. CJK text has no spaces, so accept it anyway.

hexo.extend.filter.register('marked:extensions', function (extensions) {
  extensions.push({
    name: 'cjkStrong',
    level: 'inline',
    start(src) {
      return src.indexOf('**');
    },
    tokenizer(src) {
      const match = src.match(/^\*\*([^\s*](?:[^*\n]*[^\s*])?)\*\*/);
      if (match) {
        return {
          type: 'cjkStrong',
          raw: match[0],
          text: match[1],
          tokens: this.lexer.inlineTokens(match[1])
        };
      }
    },
    renderer(token) {
      return '<strong>' + this.parser.parseInline(token.tokens) + '</strong>';
    }
  });
});
