/* Endspace — keyword highlight on list pages */
(function () {
  'use strict';

  var q = new URLSearchParams(location.search).get('keyword');
  if (!q) return;

  var container = document.getElementById('posts-wrapper');
  if (!container) return;

  walk(container, q);

  function walk(node, term) {
    if (node.nodeType === 3) {
      var idx = node.nodeValue.toLowerCase().indexOf(term.toLowerCase());
      if (idx >= 0) {
        var span = document.createElement('span');
        span.className = 'search-hit';
        span.textContent = node.nodeValue.substr(idx, term.length);
        var after = node.splitText(idx);
        after.nodeValue = after.nodeValue.substr(term.length);
        node.parentNode.insertBefore(span, after);
      }
    } else if (node.nodeType === 1 && !/^(SCRIPT|STYLE)$/.test(node.tagName)) {
      for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i], term);
    }
  }
})();
