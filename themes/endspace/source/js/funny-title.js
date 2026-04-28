/* Endspace — funny tab title */
(function () {
  'use strict';

  if (!document.querySelector('[data-funny-title]')) return;

  var origTitle = document.title;
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

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      document.title = funnyTexts[Math.floor(Math.random() * funnyTexts.length)];
    } else {
      document.title = origTitle;
    }
  });
})();
