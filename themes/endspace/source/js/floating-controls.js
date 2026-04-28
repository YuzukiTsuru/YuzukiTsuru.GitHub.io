/* Endspace — floating controls and scrollspy */
(function () {
  'use strict';

  var runtime = window.__aicRuntime;
  if (!runtime) return;

  var doc = runtime.doc;
  var state = runtime.state;

  var capsule = doc.querySelector('.fc-capsule');
  var drawer = doc.getElementById('fc-drawer');
  if (!capsule) return;

  state.pctEl = capsule.querySelector('.fc-percent');
  var tocBtn = capsule.querySelector('[data-fc-action="toc"]');

  function setOpen(on, tab) {
    if (!drawer) return;
    drawer.classList.toggle('open', on);
    drawer.dataset.tab = on ? tab || '' : '';
    if (tocBtn) tocBtn.classList.toggle('active', on && tab === 'toc');
  }

  function refreshAnchors() {
    state.headings = doc.querySelectorAll('#notion-article [data-id]');
    state.tocLinks = doc.querySelectorAll('.fc-toc-item');
    state.lastActive = null;
    state.lastPct = -1;
  }

  function onScroll() {
    if (!state.pctEl) state.pctEl = capsule.querySelector('.fc-percent');

    var scrollTop = window.scrollY || window.pageYOffset || doc.documentElement.scrollTop || 0;
    var scrollHeight = Math.max(doc.body.scrollHeight || 0, doc.documentElement.scrollHeight || 0);
    var clientHeight = window.innerHeight || doc.documentElement.clientHeight || 0;
    var docHeight = scrollHeight - clientHeight;
    var progress = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
    var rounded = Math.round(progress);

    if (rounded !== state.lastPct) {
      state.lastPct = rounded;
      if (state.pctEl) state.pctEl.textContent = rounded + '%';
    }

    if (!state.headings.length) return;

    var current = null;
    var prevBox = null;
    for (var i = 0; i < state.headings.length; i++) {
      var heading = state.headings[i];
      var box = heading.getBoundingClientRect();
      var offset = Math.max(100, prevBox ? (box.top - prevBox.bottom) / 4 : 0);
      if (box.top - offset < 0) {
        current = heading.getAttribute('data-id');
        prevBox = box;
        continue;
      }
      break;
    }
    if (!current && state.headings.length) current = state.headings[0].getAttribute('data-id');

    if (current !== state.lastActive) {
      state.lastActive = current;
      state.tocLinks.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('data-toc-id') === current);
      });
    }
  }

  capsule.addEventListener('click', function (e) {
    var btn = e.target.closest('.fc-btn');
    if (!btn) return;

    var action = btn.getAttribute('data-fc-action');
    if (action === 'toc') {
      var open = !drawer.classList.contains('open') || drawer.dataset.tab !== 'toc';
      setOpen(open, 'toc');
    } else if (action === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (action === 'theme' && window.__aicToggleTheme) {
      window.__aicToggleTheme();
    }
  });

  if (drawer) {
    var closeBtn = drawer.querySelector('.fc-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        setOpen(false);
      });
    }
  }

  refreshAnchors();
  window.__aicOnScroll = onScroll;
  window.__aicRefreshFloatingControls = refreshAnchors;

  var lastCall = 0;
  var scrollTimer = null;
  window.addEventListener(
    'scroll',
    function () {
      var now = Date.now();
      if (now - lastCall < 80) return;
      lastCall = now;
      onScroll();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(onScroll, 150);
    },
    { passive: true }
  );

  window.addEventListener('load', function () {
    setTimeout(onScroll, 100);
  });

  onScroll();
})();
