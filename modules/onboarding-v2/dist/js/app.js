var tlmTimer = 0;

var tlmTimerFn = function () {
  setTimeout(function () {
    tlmTimer += 50;
    tlmTimerFn();
  }, 50);
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), el => {
    var elArgs = el.dataset.i18n.split(','),
    key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);

  if(el.classList.contains('search-link')) {
      el.setAttribute('href',chrome.i18n.getMessage(key, elArgs));
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), el => {
    var elArgs = el.dataset.i18nTitle.split(','),
    key = elArgs.shift();

    el.setAttribute('title', chrome.i18n.getMessage(key, elArgs));
  });
}

function telemetrySig(msg) {
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'core',
    action: 'sendTelemetry',
    args: [{
      type: 'onboarding',
      version: '2.0',
      action: msg.action,
      view: msg.view,
      target: msg.target,
      show_duration: tlmTimer
    }]
  }), '*');
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

  //=== Telemetry
  telemetrySig({
    action: 'show',
    view: 'intro',
    target: 'page',
    resumed: 'false'
  });

  //=== STEP 1 Tooltip Trigger
  openTooltip1 = setTimeout(function () {
    $('#cqb-atr-on').tooltipster('open');
    telemetrySig({
      action: 'show',
      view: 'intro',
      target: 'tooltip'
    });
  }, 1000);

  //==== Step 1 Click
  $("#cqb-atr-on").click(function (e) {
    e.stopPropagation();
    step2();
  });

  // Open Tooltip if user click
  $(".cqb-steps .cqb-step1").click(function(e) {

    //=== Telemetry
    telemetrySig({
      type: 'onboarding',
      version: '2.0',
      action: 'click',
      view: 'intro',
      target: 'body_click',
      show_duration: tlmTimer
    });
    $('#cqb-atr-on').tooltipster('open');
  });
}

// =================
// ====== STEP 2 ===
// =================

function step2() {
  clearTimeout(openTooltip1);

  //=== Telemetry
  telemetrySig({
    action: 'show',
    view: 'privacy',
    target: 'page',
    resumed: 'false'
  });

  $("body").addClass("cqb-step2");
  $('#cqb-atr-on').tooltipster('close');

  // Show search btn
  setTimeout(function () {
      telemetrySig({
        action: 'show',
        view: 'privacy',
        target: 'next'
      });
     $('#cqb-search-btn').css('opacity', '1');
  }, 3000);

  // Open Tool Tip
  openTooltip2 = setTimeout(function () {
    $('#cqb-search-btn').tooltipster('open');
    telemetrySig({
      action: 'show',
      view: 'privacy',
      target: 'tooltip',
      show_duration: tlmTimer
    });
  }, 5000);

  //Open control center
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'step2'
  }), '*');

  //=== STEP 2 Tooltip Trigger
  $(".cqb-steps .cqb-step2").click(function(e) {

    //=== Telemetry
    telemetrySig({
      type: 'onboarding',
      version: '2.0',
      action: 'click',
      view: 'privacy',
      target: 'body_click',
      show_duration: tlmTimer
    });
    $('#cqb-search-btn').css('opacity', '1')
    $('#cqb-search-btn').tooltipster('open');
  });
}


// =================
// ====== STEP 3 ===
// =================

function step3() {
  clearTimeout(openTooltip2);

  //=== Telemetry
  telemetrySig({
    action: 'show',
    view: 'search',
    target: 'page',
    resumed: 'false'
  });
  window.postMessage(JSON.stringify({
    target: 'cliqz',
    module: 'onboarding-v2',
    action: 'step3',
  }), '*');

  // Show search btn
  var homeBtn = setTimeout(function () {
     $('#cqb-fresh-tab').css('display', 'inline-block');
  }, 7000);

  $("body").addClass("cqb-step3");
  $('#cqb-search-btn').tooltipster('close');

  setTimeout(function () {
    $('.cqb-search-tooltip').tooltipster('open');
  }, 600);

  //Click Search Suggestions
  $('.search-link').click(function (e) {
    clearTimeout(homeBtn);

    $(this).addClass('active');

    var homeBtn = setTimeout(function () {
      $('#cqb-fresh-tab').css('display', 'inline-block');
      telemetrySig({
        action: 'show',
        view: 'search',
        target: 'next',
      });
    }, 3000);

    e.preventDefault();
    var val = $(this).attr('href');
    autoQuery(val);
  });


  //=== STEP 3 Tooltip Trigger
  $(".cqb-steps .cqb-step3").click(function(e) {
    //=== Telemetry
    telemetrySig({
      type: 'onboarding',
      version: '2.0',
      action: 'click',
      view: 'search',
      target: 'body_click',
      show_duration: tlmTimer
    });
    $('#cqb-search-btn').css('opacity', '1')
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
    }, 60000);
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



// =================
// == Document Ready
// =================

Promise.all([
  $(document).ready().promise(),
  stepPromise
]).then(function (resolvedPromises) {
  var step = resolvedPromises[1];
  localizeDocument();

  // Blocks the right click on the onboarding
  $("*").on("contextmenu",function(){
     return false;
  });

  //Telemetry Trigger
  $('[data-cqb-tlmtr-target]').click(function (e) {
    e.stopPropagation();

    telemetrySig({
        action: 'click',
        view: $(this).data('cqb-tlmtr-view'),
        target: $(this).data('cqb-tlmtr-target')
    });
  });

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

  //Call Telemetry Timer
  tlmTimerFn();
});
