/* Endspace — sidenav and mobile navigation */
(function () {
  'use strict';

  var runtime = window.__aicRuntime;
  if (!runtime) return;

  var doc = runtime.doc;
  var detectActiveNav = runtime.detectActiveNav;

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
      labels.forEach(function (label) {
        label.classList.toggle('opacity-100', on);
        label.classList.toggle('opacity-0', !on);
        label.classList.toggle('w-0', !on);
      });
      if (author) {
        author.classList.toggle('opacity-100', on);
        author.classList.toggle('opacity-0', !on);
        author.style.maxHeight = on ? author.scrollHeight + 'px' : '0';
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

    function positionIndicator() {
      var active = detectActiveNav(navItems);
      navItems.forEach(function (el) {
        el.classList.toggle('active', el === active);
      });
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

    nav.addEventListener('mouseenter', function () {
      setExpanded(true);
    });
    nav.addEventListener('mouseleave', function () {
      setExpanded(false);
    });

    var toggleBtn = doc.getElementById('sidenav-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        setExpanded(!nav.classList.contains('w-[16rem]'));
      });
    }

    positionIndicator();
    window.addEventListener('resize', positionIndicator);
    window.__aicUpdateSidenavIndicator = positionIndicator;
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

    function refreshMobileNavState() {
      var items = panel.querySelectorAll('.mobilenav-item');
      var active = detectActiveNav(items);
      items.forEach(function (el) {
        var on = el === active;
        el.classList.toggle('text-black', on);
        el.classList.toggle('dark:text-white', on);
        el.classList.toggle('font-bold', on);
      });
    }

    updateNavStyle();
    refreshMobileNavState();

    btn.addEventListener('click', function () {
      setOpen(panel.classList.contains('translate-x-full'));
    });
    backdrop.addEventListener('click', function () {
      setOpen(false);
    });

    panel.querySelectorAll('.mobilenav-item').forEach(function (el) {
      el.addEventListener('click', function () {
        setOpen(false);
      });
    });

    window.__aicUpdateMobileNav = updateNavStyle;
    window.__aicRefreshMobileNavState = refreshMobileNavState;
  })();
})();
