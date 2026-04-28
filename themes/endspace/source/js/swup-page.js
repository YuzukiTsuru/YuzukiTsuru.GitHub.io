/* Endspace — swup lifecycle and page re-init */
(function () {
  'use strict';

  if (typeof window.Swup === 'undefined') return;

  var runtime = window.__aicRuntime;
  if (!runtime) return;

  var doc = runtime.doc;
  var state = runtime.state;
  var detectActiveNav = runtime.detectActiveNav;
  var rerenderMermaidBlocks = runtime.rerenderMermaidBlocks;

  function rerenderMermaidAfterSwup() {
    if (!window.mermaid) return;

    var attempts = 0;
    var maxAttempts = 12;

    function tryRender() {
      var mermaidPres = doc.querySelectorAll('#swup-content pre.mermaid');
      if (!mermaidPres.length) return;

      var ready = true;
      mermaidPres.forEach(function (el) {
        if (el.getBoundingClientRect().width <= 0) ready = false;
      });

      if (!ready && attempts < maxAttempts) {
        attempts++;
        window.requestAnimationFrame(tryRender);
        return;
      }

      rerenderMermaidBlocks(doc.getElementById('swup-content') || doc);
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(tryRender);
    });
  }

  function updateToc() {
    var tocDataEl = doc.getElementById('aic-toc-data');
    var tocNav = doc.getElementById('fc-toc');
    var tocBtn = doc.querySelector('[data-fc-action="toc"]');
    var drawer = doc.getElementById('fc-drawer');
    if (!tocDataEl || !tocNav) return;

    try {
      var raw = tocDataEl.content ? tocDataEl.content.textContent : tocDataEl.textContent;
      var tocList = JSON.parse(raw || '[]');
      tocNav.innerHTML = '';

      if (tocList.length) {
        tocList.forEach(function (item) {
          var link = doc.createElement('a');
          link.href = '#' + item.id;
          link.className = 'fc-toc-item';
          link.setAttribute('data-toc-id', item.id);
          link.style.paddingLeft = (item.indentLevel || 0) * 12 + 8 + 'px';
          link.textContent = item.text;
          tocNav.appendChild(link);
        });
        if (tocBtn) {
          tocBtn.style.display = '';
          tocBtn.style.animation = 'none';
          tocBtn.offsetHeight;
          tocBtn.style.animation = '';
        }
      } else {
        tocNav.innerHTML =
          '<div class="text-xs text-gray-400 italic">' +
          ((window.__aicI18n && window.__aicI18n.no_headings) || 'No headings') +
          '</div>';
        if (tocBtn) {
          tocBtn.classList.add('fc-btn-exit');
          setTimeout(function () {
            tocBtn.style.display = 'none';
            tocBtn.classList.remove('fc-btn-exit');
          }, 300);
        }
        if (drawer) drawer.classList.remove('open');
      }
    } catch (_e) {}
  }

  function decodeMathJax(scope) {
    function walk(node) {
      if (node.nodeType === 3) {
        var text = node.textContent;
        if (text.indexOf('$') !== -1) {
          node.textContent = text
            .replace(/\$\$[\s\S]*?\$\$/g, function (m) {
              return m.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            })
            .replace(/\$[^$]+\$/g, function (m) {
              return m.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            });
        }
      } else if (node.nodeType === 1 && !/^(SCRIPT|STYLE|CODE|PRE)$/.test(node.tagName)) {
        for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
      }
    }

    if (scope) walk(scope);
  }

  function reinitMathJax(swupMain) {
    if (!swupMain || swupMain.getAttribute('data-mathjax') !== 'true') return;

    var swupContent = doc.getElementById('swup-content');
    if (swupContent) decodeMathJax(swupContent);

    if (window.MathJax && window.MathJax.typesetPromise) {
      MathJax.typesetClear([swupContent]);
      MathJax.typesetPromise([swupContent]).catch(function (err) {
        console.warn('MathJax typeset failed:', err);
      });
      return;
    }

    window.MathJax = {
      tex: {
        inlineMath: [['$', '$']],
        displayMath: [
          ['$$', '$$'],
          ['\\[', '\\]']
        ],
        processEnvironments: true,
        processRefs: true
      },
      options: {
        skipHtmlTags: ['noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore'
      },
      svg: { fontCache: 'global' },
      loader: { load: ['[tex]/mhchem'] },
      startup: {
        typeset: true,
        elements: [swupContent]
      }
    };

    var mjScript = doc.createElement('script');
    mjScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    mjScript.async = true;
    doc.head.appendChild(mjScript);
  }

  function reinitPlot(swupMain) {
    if (!swupMain || swupMain.getAttribute('data-plot') !== 'true') return;

    var d3Src = swupMain.getAttribute('data-plot-d3');
    var fpSrc = swupMain.getAttribute('data-plot-fp');

    function loadScript(src, cb) {
      var existing = doc.querySelector('script[src="' + src + '"]');
      if (existing) {
        cb();
        return;
      }
      var script = doc.createElement('script');
      script.src = src;
      script.onload = cb;
      doc.head.appendChild(script);
    }

    loadScript(d3Src, function () {
      loadScript(fpSrc, function () {
        doc.querySelectorAll('#swup-content script').forEach(function (el) {
          if (el.textContent.indexOf('functionPlot') !== -1) {
            var nextScript = doc.createElement('script');
            nextScript.textContent = el.textContent;
            el.parentNode.replaceChild(nextScript, el);
          }
        });
      });
    });
  }

  function updatePageNavigation() {
    var navItems = doc.querySelectorAll('#sidenav [data-nav]');
    var active = detectActiveNav(navItems);
    navItems.forEach(function (el) {
      el.classList.toggle('active', el === active);
    });

    var indicator = doc.getElementById('sidenav-indicator');
    var container = doc.querySelector('#sidenav-items');
    if (active && indicator && container) {
      var navRect = container.getBoundingClientRect();
      var itemRect = active.getBoundingClientRect();
      if (itemRect.height > 0) {
        indicator.style.top = itemRect.top - navRect.top + 'px';
        indicator.style.opacity = '1';
      }
    }

    var mobileItems = doc.querySelectorAll('#mobilenav-panel .mobilenav-item');
    var mobileActive = detectActiveNav(mobileItems);
    mobileItems.forEach(function (el) {
      var on = el === mobileActive;
      el.classList.toggle('text-black', on);
      el.classList.toggle('dark:text-white', on);
      el.classList.toggle('font-bold', on);
    });
  }

  var spinner = doc.createElement('div');
  spinner.className = 'swup-spinner';
  spinner.innerHTML = '<div class="swup-spinner-ring"></div>';
  spinner.style.display = 'none';

  var swupMain = doc.getElementById('swup-main');
  if (swupMain && swupMain.parentNode) {
    swupMain.parentNode.insertBefore(spinner, swupMain.nextSibling);
  }

  var swup = new Swup({
    containers: ['#swup-main'],
    animateHistoryBrowsing: true,
    animationSelector: '[class*="transition-"]',
    cache: false
  });

  swup.hooks.on('animation:out:start', function () {
    var oldRing = spinner.querySelector('.swup-spinner-ring');
    if (oldRing) {
      var newRing = oldRing.cloneNode(true);
      oldRing.parentNode.replaceChild(newRing, oldRing);
    }
    spinner.style.display = '';
    spinner.style.opacity = '1';
  });

  swup.hooks.on('animation:in:end', function () {
    spinner.style.opacity = '0';
    setTimeout(function () {
      spinner.style.display = 'none';
    }, 300);
    rerenderMermaidAfterSwup();
  });

  swup.hooks.on('page:view', function () {
    if (window.__aicUpdateMobileNav) window.__aicUpdateMobileNav();
    if (window.__aicRefreshMobileNavState) window.__aicRefreshMobileNavState();
    if (window.__aicUpdateSidenavIndicator) window.__aicUpdateSidenavIndicator();
    else updatePageNavigation();

    window.scrollTo(0, 0);

    updateToc();

    if (window.__aicRefreshFloatingControls) window.__aicRefreshFloatingControls();
    var tocAction = doc.querySelector('[data-fc-action="toc"]');
    if (tocAction && tocAction.style.display !== 'none') {
      state.pctEl = doc.querySelector('.fc-percent');
    }
    if (window.__aicOnScroll) window.__aicOnScroll();

    var newTitle = doc.querySelector('title');
    if (newTitle) doc.title = newTitle.textContent;

    if (window.__aicInitSearch) window.__aicInitSearch();
    if (window.__aicInitDonation) window.__aicInitDonation();

    var nextSwupMain = doc.getElementById('swup-main');
    reinitMathJax(nextSwupMain);
    reinitPlot(nextSwupMain);
  });
})();
