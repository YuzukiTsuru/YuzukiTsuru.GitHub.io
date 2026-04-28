/* Endspace — donation widget */
(function () {
  'use strict';

  function initDonation() {
    var btn = document.getElementById('donation-toggle');
    var panel = document.getElementById('donation-qrcode');
    if (!btn || !panel) return;

    panel.classList.remove('open');
    btn.classList.remove('active');
    btn.onclick = function () {
      var isOpen = panel.classList.contains('open');
      panel.classList.toggle('open', !isOpen);
      btn.classList.toggle('active', !isOpen);
    };
  }

  window.__aicInitDonation = initDonation;
  initDonation();
})();
