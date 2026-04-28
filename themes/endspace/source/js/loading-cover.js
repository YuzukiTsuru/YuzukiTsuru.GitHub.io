/* Endspace — loading cover */
(function () {
  'use strict';

  var runtime = window.__aicRuntime;
  if (!runtime) return;

  var doc = runtime.doc;
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

  function setPct(progress) {
    displayed = progress;
    var value = Math.floor(progress);
    if (pctEl) pctEl.textContent = value + '%';
    if (fillEl) {
      if (isMobile()) fillEl.style.width = value + '%';
      else fillEl.style.height = value + '%';
    }
    if (infoEl) {
      if (isMobile())
        infoEl.style.transform =
          'translateX(' + (((window.innerWidth - 96) * value) / 100 + 12) + 'px)';
      else infoEl.style.top = value + '%';
    }
  }

  function setPhase(name) {
    cover.classList.remove('init', 'loading', 'complete', 'sweeping', 'fadeout');
    cover.classList.add(name);
    if (statusText && texts[name]) statusText.textContent = texts[name];
  }

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
})();
