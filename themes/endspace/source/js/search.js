/* Endspace — search page client (uses hexo-generator-search XML) */
(function () {
  'use strict';

  var index = null;
  var pending = null;

  function text(node, sel) {
    var el = node.querySelector(sel);
    return el ? el.textContent : '';
  }
  function tags(node, parent, child) {
    var p = node.querySelector(parent);
    if (!p) return [];
    return Array.prototype.map.call(p.querySelectorAll(child), function (n) { return n.textContent; });
  }
  function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function highlight(text, term) {
    if (!term) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return escaped.replace(re, '<span class="search-hit">$1</span>');
  }

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (pending) return pending;
    var meta = document.querySelector('meta[name="aic-search-path"]');
    var searchPath = (meta && meta.content) || '/search.xml';
    pending = fetch(searchPath, { credentials: 'same-origin' })
      .then(function (r) { return r.text(); })
      .then(function (xml) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(xml, 'text/xml');
        var entries = doc.querySelectorAll('entry');
        index = [];
        entries.forEach(function (e) {
          var title = text(e, 'title');
          var content = stripTags(text(e, 'content'));
          var cats = tags(e, 'categories', 'category');
          var tg = tags(e, 'tags', 'tag');
          index.push({
            title: title,
            url: text(e, 'url'),
            content: content,
            date: text(e, 'date'),
            categories: cats,
            tags: tg,
            _lc: (title + ' ' + content + ' ' + cats.join(' ') + ' ' + tg.join(' ')).toLowerCase()
          });
        });
        return index;
      });
    return pending;
  }

  function render(wrapper, emptyEl, items, term) {
    if (!items.length) {
      wrapper.innerHTML = '';
      emptyEl && emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl && emptyEl.classList.add('hidden');
    var html = items.map(function (p) {
      var date = p.date ? p.date.slice(0, 10) : '';
      var category = p.categories && p.categories[0] ? p.categories[0].toUpperCase() : '';
      var tagsHtml = (p.tags || []).slice(0, 3).map(function (t) {
        return '<span class="text-[10px] text-[var(--endspace-text-muted)] bg-[var(--endspace-bg-secondary)] px-1.5 py-0.5 rounded">#' + escapeHtml(t) + '</span>';
      }).join('');
      var summary = '';
      if (term) {
        var src = p.content || '';
        var idx = src.toLowerCase().indexOf(term.toLowerCase());
        var start = Math.max(0, idx - 60);
        var end = Math.min(src.length, (idx >= 0 ? idx : 0) + 220);
        summary = (start > 0 ? '… ' : '') + src.slice(start, end) + (end < src.length ? ' …' : '');
      } else {
        summary = (p.content || '').slice(0, 220);
      }
      return '' +
        '<a href="' + escapeHtml(p.url) + '" class="block">' +
          '<article class="endspace-frame group mb-6 flex flex-col overflow-hidden relative transition-all duration-300">' +
            '<div class="flex-1 flex flex-col justify-center relative z-10 p-5 md:p-6 overflow-hidden">' +
              '<div class="absolute inset-0 bg-[#FBFB45] transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out z-0"></div>' +
              '<div class="relative z-10">' +
                '<div class="flex items-center gap-3 text-xs font-mono text-[var(--endspace-text-muted)] mb-3 group-hover:text-black/60">' +
                  '<span class="text-[var(--endspace-text-primary)] font-bold group-hover:text-black">' + escapeHtml(date) + '</span>' +
                  (category ? '<span class="w-px h-3 bg-[var(--endspace-border-base)]"></span><span class="tracking-wider">' + escapeHtml(category) + '</span>' : '') +
                '</div>' +
                '<h2 class="text-2xl md:text-3xl font-black text-[var(--endspace-text-primary)] mb-4 leading-tight group-hover:text-black">' + highlight(p.title, term) + '</h2>' +
                '<p class="text-[var(--endspace-text-secondary)] text-sm leading-relaxed line-clamp-3 mb-6 font-medium group-hover:text-black/70">' + highlight(summary, term) + '</p>' +
                '<div class="mt-auto flex items-center justify-between">' +
                  '<div class="flex gap-2">' + tagsHtml + '</div>' +
                  '<div class="flex items-center gap-2 text-[var(--endspace-text-primary)] text-xs font-bold uppercase tracking-wider group-hover:text-black"><span>Access</span></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</article>' +
        '</a>';
    }).join('');
    wrapper.innerHTML = html;
  }

  function doSearch(wrapper, emptyEl, term) {
    term = (term || '').trim();
    var url = new URL(location.href);
    if (term) url.searchParams.set('keyword', term); else url.searchParams.delete('keyword');
    history.replaceState(null, '', url.toString());
    if (!term) { wrapper.innerHTML = ''; emptyEl && emptyEl.classList.add('hidden'); return; }
    loadIndex().then(function (idx) {
      var lc = term.toLowerCase();
      var matches = idx.filter(function (p) { return p._lc.indexOf(lc) >= 0; });
      render(wrapper, emptyEl, matches, term);
    });
  }

  function initSearch() {
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    var form = document.getElementById('search-form');
    var wrapper = document.getElementById('posts-wrapper');
    var emptyEl = document.getElementById('search-empty');
    if (!input || !wrapper) return;

    // Initial query from ?keyword=
    var initial = new URLSearchParams(location.search).get('keyword') || '';
    if (initial) { input.value = initial; clear && clear.classList.remove('hidden'); doSearch(wrapper, emptyEl, initial); }

    var debounceId = 0;
    input.addEventListener('input', function () {
      clear && clear.classList.toggle('hidden', !input.value);
      clearTimeout(debounceId);
      debounceId = setTimeout(function () { doSearch(wrapper, emptyEl, input.value); }, 200);
    });
    if (clear) clear.addEventListener('click', function () {
      input.value = ''; clear.classList.add('hidden'); doSearch(wrapper, emptyEl, '');
    });
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); doSearch(wrapper, emptyEl, input.value); });
  }

  // Expose for swup page:view hook
  window.__aicInitSearch = initSearch;

  // Auto-init on direct page load
  initSearch();
})();
