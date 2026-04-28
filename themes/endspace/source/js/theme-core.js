/* Endspace — shared runtime and theme helpers */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var runtime = (window.__aicRuntime = window.__aicRuntime || {});

  runtime.doc = doc;
  runtime.root = root;
  runtime.state = runtime.state || {
    headings: [],
    tocLinks: [],
    lastActive: null,
    lastPct: -1,
    pctEl: null
  };

  function getMermaidThemeConfig(isDark) {
    return {
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      securityLevel: 'loose',
      themeVariables: isDark
        ? {
            primaryColor: '#fbfb45',
            primaryTextColor: '#fafafa',
            primaryBorderColor: '#fbfb45',
            lineColor: '#a1a1aa',
            secondaryColor: '#27272a',
            tertiaryColor: '#3f3f46',
            background: '#18181b',
            mainBkg: '#18181b',
            nodeBorder: '#fbfb45',
            clusterBkg: '#27272a',
            titleColor: '#fafafa',
            edgeLabelBackground: '#27272a',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }
        : {
            primaryColor: '#fbfb45',
            primaryTextColor: '#18181b',
            primaryBorderColor: '#fbfb45',
            lineColor: '#52525b',
            secondaryColor: '#f4f4f5',
            tertiaryColor: '#e4e4e7',
            background: '#fff',
            mainBkg: '#fff',
            nodeBorder: '#18181b',
            clusterBkg: '#f4f4f5',
            titleColor: '#18181b',
            edgeLabelBackground: '#f4f4f5',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }
    };
  }

  runtime.applyTheme = function applyTheme(mode) {
    root.classList.toggle('dark', mode === 'dark');
  };

  runtime.rerenderMermaidBlocks = function rerenderMermaidBlocks(scope) {
    if (!window.mermaid) return;

    var container = scope || doc;
    var mermaidPres = container.querySelectorAll('pre.mermaid');
    if (!mermaidPres.length) return;

    mermaid.initialize(getMermaidThemeConfig(root.classList.contains('dark')));

    mermaidPres.forEach(function (el) {
      var source = el.getAttribute('data-mermaid-source');
      if (!source) {
        source = el.textContent;
        el.setAttribute('data-mermaid-source', source);
      }

      el.innerHTML = source;
      el.removeAttribute('data-processed');
    });

    try {
      mermaid.init(undefined, mermaidPres);
    } catch (err) {
      console.warn('Mermaid re-render failed:', err);
      mermaidPres.forEach(function (el) {
        var source = el.getAttribute('data-mermaid-source');
        if (source) el.textContent = source;
      });
    }
  };

  runtime.detectActiveNav = function detectActiveNav(items) {
    if (!items || !items.length) return null;

    var path = location.pathname;
    if (path === '/' || /^\/page\/\d+/.test(path)) return items[0];

    var normalized = path.replace(/\/page\/\d+\/?$/, '');
    for (var i = 0; i < items.length; i++) {
      var navPath = items[i].getAttribute('data-nav-path');
      if (navPath && navPath !== '/' && normalized.indexOf(navPath) === 0) return items[i];
    }
    return null;
  };

  runtime.toggleTheme = function toggleTheme() {
    var next = root.classList.contains('dark') ? 'light' : 'dark';
    runtime.applyTheme(next);
    try {
      localStorage.setItem('aic-theme', next);
    } catch (_e) {}
  };

  window.__aicToggleTheme = runtime.toggleTheme;

  try {
    var saved = localStorage.getItem('aic-theme');
    if (saved) runtime.applyTheme(saved);
    else if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)
      runtime.applyTheme('dark');
  } catch (_e) {}
})();
