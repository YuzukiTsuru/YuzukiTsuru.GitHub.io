$(document).ready(function () {
  var userAgent = navigator.userAgent.toLowerCase();
  var os = '';
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
  var watermark = $('<div class="watermark"><span class="line1">激活 ' + os + '</span><span class="line2">前往设置页面激活 ' + os + '</span></div>');
  $('body').append(watermark);
});
