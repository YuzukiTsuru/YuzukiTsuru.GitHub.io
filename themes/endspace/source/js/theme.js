/* Endspace — runtime behavior */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;

  // Shared state for swup hooks
  var headings, tocLinks, lastActive, lastPct, pctEl;

  function applyTheme(mode) {
    root.classList.toggle('dark', mode === 'dark');
  }
  try {
    var saved = localStorage.getItem('aic-theme');
    if (saved) applyTheme(saved);
    else if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches)
      applyTheme('dark');
  } catch (_e) {}

  function toggleTheme() {
    var next = root.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem('aic-theme', next);
    } catch (_e) {}
  }

  (function loadingCover() {
    var cover = doc.getElementById('loading-cover');
    if (!cover) return;
    doc.body.style.overflow = 'hidden';

    var fillEl = cover.querySelector('.progress-fill');
    var pctEl = cover.querySelector('.progress-percent');
    var infoEl = cover.querySelector('.progress-info');
    var statusText = cover.querySelector('.status-text');
    var texts = {
      init: cover.dataset.textInit,
      loading: cover.dataset.textLoading,
      complete: cover.dataset.textComplete,
      sweeping: cover.dataset.textSweeping,
      fadeout: cover.dataset.textFadeout
    };

    var displayed = 0;
    var target = 0;
    var done = false;
    var startedExit = false;
    var rafId = 0;
    var lastReal = -1;

    function isMobile() {
      return window.matchMedia('(max-width: 768px)').matches;
    }
    function setPct(p) {
      displayed = p;
      var v = Math.floor(p);
      if (pctEl) pctEl.textContent = v + '%';
      if (fillEl) {
        if (isMobile()) fillEl.style.width = v + '%';
        else fillEl.style.height = v + '%';
      }
      if (infoEl) {
        if (isMobile())
          infoEl.style.transform =
            'translateX(' + (((window.innerWidth - 96) * v) / 100 + 12) + 'px)';
        else infoEl.style.top = v + '%';
      }
    }
    function setPhase(name) {
      cover.classList.remove('init', 'loading', 'complete', 'sweeping', 'fadeout');
      cover.classList.add(name);
      if (statusText && texts[name]) statusText.textContent = texts[name];
    }

    setPhase('init');
    setTimeout(function () {
      setPhase('loading');
    }, 100);

    var images = doc.images;
    var totalImages = Math.max(1, images.length);
    var loaded = 0;
    for (var i = 0; i < images.length; i++) {
      if (images[i].complete) loaded++;
      else {
        images[i].addEventListener('load', function () {
          loaded++;
        });
        images[i].addEventListener('error', function () {
          loaded++;
        });
      }
    }

    function tick() {
      if (displayed < target) {
        var diff = target - displayed;
        setPct(Math.min(target, displayed + Math.max(0.5, diff * 0.15)));
      }
      if (displayed >= 100 && !done) {
        done = true;
        beginExit();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    var ticker = setInterval(function () {
      if (done) return;
      if (window.__aicLoaded) {
        target = 100;
      } else if (loaded !== lastReal) {
        lastReal = loaded;
        target = Math.min(90, Math.max(target, Math.floor((loaded / totalImages) * 100)));
      }
    }, 30);

    var maxWait = setTimeout(function () {
      target = 100;
    }, 5000);
    window.addEventListener('load', function () {
      window.__aicLoaded = true;
    });

    function beginExit() {
      if (startedExit) return;
      startedExit = true;
      clearInterval(ticker);
      clearTimeout(maxWait);
      cancelAnimationFrame(rafId);
      setPhase('complete');
      try {
        sessionStorage.setItem('aic-loaded', '1');
      } catch (_e) {}
      setTimeout(function () {
        setPhase('sweeping');
        setTimeout(function () {
          setPhase('fadeout');
          setTimeout(function () {
            cover.classList.add('hidden');
            doc.body.style.overflow = '';
          }, 300);
        }, 400);
      }, 100);
    }
  })();

  function detectActiveNav(items) {
    var path = location.pathname;
    if (path === '/' || /^\/page\/\d+/.test(path)) return items[0];
    var normalized = path.replace(/\/page\/\d+\/?$/, '');
    for (var i = 0; i < items.length; i++) {
      var p = items[i].getAttribute('data-nav-path');
      if (p && p !== '/' && normalized.indexOf(p) === 0) return items[i];
    }
    return null;
  }

  (function sidenav() {
    var nav = doc.getElementById('sidenav');
    if (!nav) return;
    var indicator = doc.getElementById('sidenav-indicator');
    var navItems = nav.querySelectorAll('[data-nav]');
    var labels = nav.querySelectorAll('.sidenav-label');
    var author = nav.querySelector('.sidenav-author');
    var expanded = nav.querySelector('.sidenav-expanded-contact');
    var triangle = nav.querySelector('.sidenav-triangle');

    function setExpanded(on) {
      nav.classList.toggle('w-[16rem]', on);
      nav.classList.toggle('w-[5rem]', !on);
      labels.forEach(function (l) {
        l.classList.toggle('opacity-100', on);
        l.classList.toggle('opacity-0', !on);
        l.classList.toggle('w-0', !on);
      });
      if (author) {
        author.classList.toggle('opacity-100', on);
        author.classList.toggle('opacity-0', !on);
        if (on) {
          author.style.maxHeight = author.scrollHeight + 'px';
        } else {
          author.style.maxHeight = '0';
        }
      }
      if (expanded) {
        expanded.classList.toggle('opacity-100', on);
        expanded.classList.toggle('opacity-0', !on);
        expanded.classList.toggle('h-0', !on);
        expanded.classList.toggle('overflow-hidden', !on);
      }
      if (triangle) {
        triangle.classList.toggle('border-r-[10px]', on);
        triangle.classList.toggle('border-r-[var(--endspace-text-primary)]', on);
        triangle.classList.toggle('border-l-0', on);
        triangle.classList.toggle('border-l-[10px]', !on);
        triangle.classList.toggle('border-l-[var(--endspace-text-primary)]', !on);
        triangle.classList.toggle('border-r-0', !on);
      }
    }
    nav.addEventListener('mouseenter', function () {
      setExpanded(true);
    });
    nav.addEventListener('mouseleave', function () {
      setExpanded(false);
    });
    var toggleBtn = doc.getElementById('sidenav-toggle');
    if (toggleBtn)
      toggleBtn.addEventListener('click', function () {
        setExpanded(!nav.classList.contains('w-[16rem]'));
      });

    var active = detectActiveNav(navItems);
    navItems.forEach(function (el) {
      el.classList.toggle('active', el === active);
    });

    function positionIndicator() {
      if (!active || !indicator) return;
      var container = nav.querySelector('#sidenav-items');
      if (!container) return;
      var navRect = container.getBoundingClientRect();
      var itemRect = active.getBoundingClientRect();
      if (itemRect.height > 0) {
        indicator.style.top = itemRect.top - navRect.top + 'px';
        indicator.style.opacity = '1';
      }
    }
    positionIndicator();
    window.addEventListener('resize', positionIndicator);
  })();

  (function mobileNav() {
    var btn = doc.getElementById('mobilenav-toggle');
    var panel = doc.getElementById('mobilenav-panel');
    var backdrop = doc.getElementById('mobilenav-backdrop');
    var nav = doc.querySelector('nav.fixed.z-50.md\\:hidden');
    var avatarContainer = nav ? nav.querySelector('.w-10.h-10.rounded-full') : null;
    var spacer = doc.getElementById('mobilenav-spacer');
    if (!btn || !panel || !backdrop) return;
    var iconOpen = btn.querySelector('.icon-open');
    var iconClose = btn.querySelector('.icon-close');

    function isHomepage() {
      return location.pathname === '/' || location.pathname === '/index.html';
    }

    function updateNavStyle() {
      var home = isHomepage();
      if (nav) {
        nav.classList.toggle('bg-transparent', home);
        nav.classList.toggle('bg-white', !home);
        nav.classList.toggle('dark:bg-[#18181b]', !home);
        nav.classList.toggle('border-[var(--endspace-border-base)]', !home);
      }
      if (btn) {
        btn.classList.toggle('text-white', home);
        btn.classList.toggle('text-[var(--endspace-text-primary)]', !home);
      }
      if (avatarContainer) {
        avatarContainer.classList.toggle('border-2', home);
        avatarContainer.classList.toggle('border-white/50', home);
      }
      if (spacer) {
        spacer.classList.toggle('hidden', home);
      }
    }
    updateNavStyle();

    function setOpen(on) {
      panel.classList.toggle('translate-x-full', !on);
      panel.classList.toggle('translate-x-0', on);
      backdrop.classList.toggle('opacity-100', on);
      backdrop.classList.toggle('pointer-events-auto', on);
      backdrop.classList.toggle('opacity-0', !on);
      backdrop.classList.toggle('pointer-events-none', !on);
      doc.body.style.overflow = on ? 'hidden' : '';
      if (iconOpen && iconClose) {
        iconOpen.classList.toggle('hidden', on);
        iconClose.classList.toggle('hidden', !on);
      }
      // When opening panel on homepage, add background to nav
      if (on && nav && isHomepage()) {
        nav.classList.remove('bg-transparent');
        nav.classList.add('bg-white', 'dark:bg-[#18181b]', 'border-[var(--endspace-border-base)]');
        btn.classList.remove('text-white');
        btn.classList.add('text-[var(--endspace-text-primary)]');
        if (avatarContainer) {
          avatarContainer.classList.remove('border-2', 'border-white/50');
        }
      } else if (!on && nav) {
        updateNavStyle();
      }
    }
    btn.addEventListener('click', function () {
      setOpen(panel.classList.contains('translate-x-full'));
    });
    backdrop.addEventListener('click', function () {
      setOpen(false);
    });

    // Expose for swup hooks
    window.__aicUpdateMobileNav = updateNavStyle;

    var items = panel.querySelectorAll('.mobilenav-item');
    var active = detectActiveNav(items);
    items.forEach(function (el) {
      var on = el === active;
      el.classList.toggle('text-black', on);
      el.classList.toggle('dark:text-white', on);
      el.classList.toggle('font-bold', on);
      el.addEventListener('click', function () {
        setOpen(false);
      });
    });
  })();

  (function floatingControls() {
    var capsule = doc.querySelector('.fc-capsule');
    var drawer = doc.getElementById('fc-drawer');
    if (!capsule) return;

    pctEl = capsule.querySelector('.fc-percent');
    var tocBtn = capsule.querySelector('[data-fc-action="toc"]');

    function setOpen(on, tab) {
      if (!drawer) return;
      drawer.classList.toggle('open', on);
      drawer.dataset.tab = on ? tab || '' : '';
      if (tocBtn) tocBtn.classList.toggle('active', on && tab === 'toc');
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
      } else if (action === 'theme') {
        toggleTheme();
      }
    });

    if (drawer) {
      var closeBtn = drawer.querySelector('.fc-close');
      if (closeBtn)
        closeBtn.addEventListener('click', function () {
          setOpen(false);
        });
    }

    headings = doc.querySelectorAll('#notion-article [data-id]');
    tocLinks = doc.querySelectorAll('.fc-toc-item');
    lastActive = null;
    lastPct = -1;

    function onScroll() {
      // Re-query pctEl if lost (e.g., after swup transition)
      if (!pctEl) pctEl = capsule.querySelector('.fc-percent');

      var scrollTop = window.scrollY || window.pageYOffset || doc.documentElement.scrollTop || 0;
      var scrollHeight = Math.max(
        doc.body.scrollHeight || 0,
        doc.documentElement.scrollHeight || 0
      );
      var clientHeight = window.innerHeight || doc.documentElement.clientHeight || 0;
      var docH = scrollHeight - clientHeight;
      var p = docH > 0 ? Math.min((scrollTop / docH) * 100, 100) : 0;
      var rounded = Math.round(p);
      if (rounded !== lastPct) {
        lastPct = rounded;
        if (pctEl) pctEl.textContent = rounded + '%';
      }

      if (!headings.length) return;
      var current = null;
      var prevBox = null;
      for (var i = 0; i < headings.length; i++) {
        var h = headings[i];
        var box = h.getBoundingClientRect();
        var off = Math.max(100, prevBox ? (box.top - prevBox.bottom) / 4 : 0);
        if (box.top - off < 0) {
          current = h.getAttribute('data-id');
          prevBox = box;
          continue;
        }
        break;
      }
      if (!current && headings.length) current = headings[0].getAttribute('data-id');
      if (current !== lastActive) {
        lastActive = current;
        tocLinks.forEach(function (l) {
          l.classList.toggle('active', l.getAttribute('data-toc-id') === current);
        });
      }
    }

    // Expose onScroll for swup hooks
    window.__aicOnScroll = onScroll;

    var lastCall = 0;
    var scrollTimer = null;
    window.addEventListener(
      'scroll',
      function () {
        var now = Date.now();
        if (now - lastCall < 80) return;
        lastCall = now;
        onScroll();

        // Ensure final update after scroll stops
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(onScroll, 150);
      },
      { passive: true }
    );

    // Ensure calculation after page fully loaded
    window.addEventListener('load', function () {
      setTimeout(onScroll, 100);
    });

    onScroll();
  })();

  (function searchHighlight() {
    var q = new URLSearchParams(location.search).get('keyword');
    if (!q) return;
    var container = doc.getElementById('posts-wrapper');
    if (!container) return;
    walk(container, q);
    function walk(node, term) {
      if (node.nodeType === 3) {
        var idx = node.nodeValue.toLowerCase().indexOf(term.toLowerCase());
        if (idx >= 0) {
          var span = doc.createElement('span');
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

  // Swup PJAX for smooth page transitions
  (function initSwup() {
    if (typeof window.Swup === 'undefined') return;

    // Loading spinner — placed outside swup container so it survives content replacement
    var spinner = doc.createElement('div');
    spinner.className = 'swup-spinner';
    spinner.innerHTML = '<div class="swup-spinner-ring"></div>';
    spinner.style.display = 'none';
    var swupMain = doc.getElementById('swup-main');
    if (swupMain && swupMain.parentNode)
      swupMain.parentNode.insertBefore(spinner, swupMain.nextSibling);

    var swup = new Swup({
      containers: ['#swup-main'],
      animateHistoryBrowsing: true,
      animationSelector: '[class*="transition-"]',
      cache: true
    });

    swup.hooks.on('animation:out:start', function () {
      // Safari fix: clone the ring to restart animation smoothly
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
    });

    swup.hooks.on('page:view', function () {
      // Update mobilenav style for homepage
      if (window.__aicUpdateMobileNav) window.__aicUpdateMobileNav();

      // Update sidenav active state
      var navItems = doc.querySelectorAll('#sidenav [data-nav]');
      var active = detectActiveNav(navItems);
      navItems.forEach(function (el) {
        el.classList.toggle('active', el === active);
      });

      // Position indicator
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

      // Update mobilenav active state
      var mobileItems = doc.querySelectorAll('#mobilenav-panel .mobilenav-item');
      var mobileActive = detectActiveNav(mobileItems);
      mobileItems.forEach(function (el) {
        var on = el === mobileActive;
        el.classList.toggle('text-black', on);
        el.classList.toggle('dark:text-white', on);
        el.classList.toggle('font-bold', on);
      });

      // Scroll to top
      window.scrollTo(0, 0);

      // Update TOC from hidden JSON data
      var tocDataEl = doc.getElementById('aic-toc-data');
      var tocNav = doc.getElementById('fc-toc');
      var tocBtn = doc.querySelector('[data-fc-action="toc"]');
      var drawer = doc.getElementById('fc-drawer');

      if (tocDataEl && tocNav) {
        try {
          var raw = tocDataEl.content ? tocDataEl.content.textContent : tocDataEl.textContent;
          var tocList = JSON.parse(raw || '[]');
          // Clear existing TOC
          tocNav.innerHTML = '';
          if (tocList.length) {
            tocList.forEach(function (t) {
              var a = doc.createElement('a');
              a.href = '#' + t.id;
              a.className = 'fc-toc-item';
              a.setAttribute('data-toc-id', t.id);
              a.style.paddingLeft = (t.indentLevel || 0) * 12 + 8 + 'px';
              a.textContent = t.text;
              tocNav.appendChild(a);
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

      // Update floating controls scrollspy
      if (tocBtn && tocBtn.style.display !== 'none') {
        pctEl = doc.querySelector('.fc-percent');
      }
      headings = doc.querySelectorAll('#notion-article [data-id]');
      tocLinks = doc.querySelectorAll('.fc-toc-item');
      lastActive = null;
      lastPct = -1;
      if (window.__aicOnScroll) window.__aicOnScroll();

      // Update page title from new document
      var newTitle = doc.querySelector('title');
      if (newTitle) doc.title = newTitle.textContent;

      // Re-init search on search page
      if (window.__aicInitSearch) window.__aicInitSearch();

      // Re-init donation toggle
      if (window.__aicInitDonation) window.__aicInitDonation();

      // Re-init MathJax if the new page needs it
      var swupMain = doc.getElementById('swup-main');
      if (swupMain && swupMain.getAttribute('data-mathjax') === 'true') {
        if (window.MathJax && window.MathJax.typesetPromise) {
          // MathJax loaded — clear old rendering then re-typeset
          MathJax.typesetClear([doc.getElementById('swup-content')]);
          MathJax.typesetPromise([doc.getElementById('swup-content')]).catch(function (err) {
            console.warn('MathJax typeset failed:', err);
          });
        } else {
          // MathJax not loaded — dynamically load it with the same config as head.ejs
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$']],
              displayMath: [['\\[', '\\]']],
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
              elements: [doc.getElementById('swup-content')]
            }
          };
          var mjScript = doc.createElement('script');
          mjScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
          mjScript.async = true;
          doc.head.appendChild(mjScript);
        }
      }

      // Re-init plot (function-plot) if the new page needs it
      if (swupMain && swupMain.getAttribute('data-plot') === 'true') {
        var d3Src = swupMain.getAttribute('data-plot-d3');
        var fpSrc = swupMain.getAttribute('data-plot-fp');
        function loadScript(src, cb) {
          var existing = doc.querySelector('script[src="' + src + '"]');
          if (existing) {
            cb();
            return;
          }
          var s = doc.createElement('script');
          s.src = src;
          s.onload = cb;
          doc.head.appendChild(s);
        }
        loadScript(d3Src, function () {
          loadScript(fpSrc, function () {
            doc.querySelectorAll('#swup-content script').forEach(function (el) {
              if (el.textContent.indexOf('functionPlot') !== -1) {
                var ns = doc.createElement('script');
                ns.textContent = el.textContent;
                el.parentNode.replaceChild(ns, el);
              }
            });
          });
        });
      }
    });
  })();

  // Funny tab title
  (function funnyTitle() {
    var funnyEl = doc.querySelector('[data-funny-title]');
    if (!funnyEl) return;
    var origTitle = doc.title;
    var funnyTexts = window.__aicI18n
      ? [
          window.__aicI18n.funny_1,
          window.__aicI18n.funny_2,
          window.__aicI18n.funny_3,
          window.__aicI18n.funny_4,
          window.__aicI18n.funny_5
        ]
      : [
          '(≧∇≦) 不要走！',
          '快回来！ಥ_ಥ',
          '你还有未读的文章哦～',
          '页面已崩溃！ (...才怪)',
          '我在这里等你 (つ≧▽≦)つ'
        ];
    var idx = 0;

    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden) {
        idx = Math.floor(Math.random() * funnyTexts.length);
        doc.title = funnyTexts[idx];
      } else {
        doc.title = origTitle;
      }
    });
  })();

  // Donation toggle (re-init on swup page:view)
  function initDonation() {
    var btn = doc.getElementById('donation-toggle');
    var panel = doc.getElementById('donation-qrcode');
    if (!btn || !panel) return;
    // Reset state
    panel.classList.remove('open');
    btn.classList.remove('active');
    btn.onclick = function () {
      var isOpen = panel.classList.contains('open');
      panel.classList.toggle('open', !isOpen);
      btn.classList.toggle('active', !isOpen);
    };
  }
  initDonation();
  window.__aicInitDonation = initDonation;
})();
