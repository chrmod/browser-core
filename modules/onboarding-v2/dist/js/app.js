function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), el => {
    var elArgs = el.dataset.i18n.split(','),
    key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), el => {
    var elArgs = el.dataset.i18nTitle.split(','),
    key = elArgs.shift();

    el.setAttribute('title', chrome.i18n.getMessage(key, elArgs));
  });
}

var CALLBACKS = {};
window.addEventListener("message", function (ev) {
  var msg;
  try {
    msg = JSON.parse(ev.data);
  } catch (e) {
    msg = {};
  }

  if (msg.type === "response") {
    var action = CALLBACKS[msg.action];
    if (action) {
      action();
    }
  }
});

var openTooltip1, openTooltip2;
// =================
// ====== STEP 1 ===
// =================
function step1() {
  //=== STEP 1 Tooltip Trigger
  openTooltip1 = setTimeout(function () {
    $('#cqb-atr-on').tooltipster('open');
  }, 1000);

  //==== Step 1 Click
  $("#cqb-atr-on").click(function (e) {
    e.stopPropagation();
    step2();
  });
}

// =================
// ====== STEP 2 ===
// =================

function step2() {
  clearTimeout(openTooltip1);

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'core',
    action: 'addClassToWindow',
    args: ['cqz-step2']
  }), '*');

  $("body").addClass("cqb-step2");
  $('#cqb-atr-on').tooltipster('close');

  // Show search btn
  setTimeout(function () {
     $('#cqb-search-btn').css('opacity', '1');
  }, 2500);

  // Open Tool Tip
  openTooltip2 = setTimeout(function () {
     $('#cqb-search-btn').tooltipster('open');
  }, 5000);

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'moveToStep',
    args: [2]
  }), '*')

  // Open PRIVACY CENTER
  setTimeout(function () {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'control-center',
      action: 'openPopUp',
    }), '*')
  }, 400);

  setTimeout(function() {
    window.postMessage(JSON.stringify({
      target: 'cliqz',
      module: 'control-center',
      action: 'setBadge',
      args: [17]
      }), '*')
  }, 1000);
}


// =================
// ====== STEP 3 ===
// =================

function step3() {
  clearTimeout(openTooltip2);

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'core',
    action: 'removeClassFromWindow',
    args: ['cqz-step1', 'cqz-step2']
  }), '*');

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'control-center',
    action: 'setBadge',
    args: [0]
  }), '*');

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'control-center',
    action: 'updateState',
    args: ['active']
  }), '*');

  $("body").addClass("cqb-step3");
  $('#cqb-search-btn').tooltipster('close');

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'moveToStep',
    args: [3]
  }), '*');

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'focusUrlbar',
  }), '*');

  setTimeout(function () {
    $('.cqb-search-tooltip').tooltipster('open');
  }, 600);

  $('.search-link').click(function (e) {
    e.preventDefault();
    var val = $(this).attr('href');
    autoQuery(val);
  });

  // Open Tooltip if user click
  $(".cqb-steps .cqb-step1").click(function(e) {
    if (e.target !== this)
      return;
    $('#cqb-atr-on').tooltipster('open');
  });

  $(".cqb-steps .cqb-step2").click(function(e) {
    if (e.target !== this)
      return;
    $('#cqb-search-btn').tooltipster('open');
  });
}

function autoQuery(val) {

  //Go to freshtab
  CALLBACKS['queryCliqz'] = function () {
    setTimeout(function() {
      $('body').css('background', '#f7f7f7');
      setTimeout(function() {
        window.postMessage(JSON.stringify({
            target: 'cliqz',
            module: 'core',
            action: 'closePopup',
            args: [val]
        }), "*");
        window.location.href = "about:cliqz";
      }, 600);
    }, 30000);
  };
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'core',
    action: 'queryCliqz',
    args: [val]
  }), "*");
}

window.postMessage(JSON.stringify({
  target: 'cliqz',
  module: 'core',
  action: 'addClassToWindow',
  args: ['cqz-onboarding', 'cqz-step1']
}), '*')

$(document).ready(function () {

  localizeDocument();

  $('#cqb-atr-on').tooltipster({
    theme: 'tooltipster-light',
    side: "right",
    maxWidth: 250,
    trigger: 'custom',
    animation: 'grow',
    animationDuration: 250,
  });

  $('.cqb-search-tooltip').tooltipster({
    theme: 'tooltipster-light',
    side: "bottom",
    maxWidth: 250,
    interactive: true,
    trigger: 'custom',
    animation: 'grow',
    animationDuration: 250,
  });

  $('#cqb-search-btn').tooltipster({
    theme: 'tooltipster-light',
    side: "right",
    maxWidth: 250,
    interactive: true,
    trigger: 'custom',
    animation: 'grow',
    animationDuration: 250,
  });

  step1();

  //==== Step 2 Click
  $("#cqb-search-btn").click(function () {
    step3();
  });
});
