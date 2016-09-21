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
      console.log(msg.response, "!!response")
      action.call(null, msg.response);
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

  $("body").addClass("cqb-step2");
  $('#cqb-atr-on').tooltipster('close');

  // Show search btn
  setTimeout(function () {
     $('#cqb-search-btn').css('opacity', '1');
  }, 3000);

  // Open Tool Tip
  openTooltip2 = setTimeout(function () {
     $('#cqb-search-btn').tooltipster('open');
  }, 5000);

  //Open control center
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'step2'
  }), '*');
}


// =================
// ====== STEP 3 ===
// =================

function step3() {
  clearTimeout(openTooltip2);

  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'step3',
  }), '*');

  $("body").addClass("cqb-step3");
  $('#cqb-search-btn').tooltipster('close');

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

var stepPromise = new Promise(function (resolve, reject) {
  CALLBACKS['initOnboarding'] = resolve;
}).then(function (step) {
  return step;
});
window.postMessage(JSON.stringify({
  target: 'cliqz',
  module: 'onboarding-v2',
  action: 'initOnboarding'
}), '*');


Promise.all([
  $(document).ready().promise(),
  stepPromise
]).then(function (resolvedPromises) {
  var step = resolvedPromises[1];
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

  if(step === 2) {
    step2()
  } else {
    step1();
  }

  //==== Step 2 Click
  $("#cqb-search-btn").click(function () {
    step3();
  });
});
