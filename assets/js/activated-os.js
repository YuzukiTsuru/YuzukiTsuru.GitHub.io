$(document).ready(function () {
  let userAgent = navigator.userAgent.toLowerCase();
  let os = '';
  if (userAgent.indexOf("windows") !== -1) {
    os = 'Windows';
  } else if (userAgent.indexOf("linux") !== -1) {
    os = 'Linux';
  } else if (userAgent.indexOf("macintosh") !== -1 || userAgent.indexOf("mac os x") !== -1) {
    os = 'macOS';
  } else if (userAgent.indexOf("android") !== -1) {
    os = 'Android';
  } else if (userAgent.indexOf("iphone") !== -1 || userAgent.indexOf("ipad") !== -1) {
    os = 'iOS';
  } else {
    os = 'Unknown OS';
  }

  let language = navigator.language || navigator.languages[0];
  let languageText_a = 'Activate';
  let languageText_b = '';
  if (language.startsWith('zh')) {
    languageText_a = '激活 ';
    languageText_b = '转到"设置"以激活 '
  } else {
    languageText_a = 'Activate ';
    languageText_b = 'Go to Settings to active ';
  }

  var watermark = $('<div class="watermark"><span class="line1">' + languageText_a + os + '</span><span class="line2">' + languageText_b + os + '</span></div>');
  $('body').append(watermark);
});
