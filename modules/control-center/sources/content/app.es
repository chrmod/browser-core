import helpers from "control-center/content/helpers";
import { messageHandler, sendMessageToWindow } from "control-center/content/data";
import $ from "jquery";
import Handlebars from "handlebars";

var slideUp = $.fn.slideUp;
var slideDown = $.fn.slideDown;
function resize() {
  var $controlCenter = $("#control-center");
  var width = $controlCenter.width();
  var height = $controlCenter.height();
  sendMessageToWindow({
    action: 'resize',
    data: {
      width: width,
      height: height
    }
  });
}
$.fn.slideUp = function () {
  var ret = slideUp.call(this, 0);
  resize()
  return ret;
}
$.fn.slideDown = function () {
  var ret = slideDown.call(this, 0);
  resize();
  return ret;
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
    var elArgs = el.dataset.i18n.split(","),
        key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);
  });
}

function isHttpsSection(section) {
  return section === 'https';
}

//====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
$(document).ready(function(resolvedPromises) {
  Object.keys(helpers).forEach(function (helperName) {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  draw({});
  resize();
  sendMessageToWindow({
    action: 'getData',
    data: { }
  });
});

// actions

// open URL
$('#control-center').on('click', '[openUrl]', function(ev){
  sendMessageToWindow({ action: 'openURL', data: {url: ev.currentTarget.getAttribute('openUrl')}} );
});

$('#control-center').on('click', '[data-function]', function(ev){
  sendMessageToWindow({ action: ev.currentTarget.dataset.function } );
});

$('#control-center').on('click', '[antiTrackingStatusChanger]', function(ev){
  sendMessageToWindow({
    action: 'antitracking-activator',
    data: {
      status: $(this).closest('.frame-container').attr("state"),
      hostname: $(this).closest('.frame-container').attr("hostname")
    }
  });
})

// select box change
$('#control-center').on('change', 'select[updatePref]', function(ev){
  sendMessageToWindow({
    action: 'updatePref',
    data: {
      pref: ev.currentTarget.getAttribute('updatePref'),
      value: ev.currentTarget.value
    }
  });
})


function updateGeneralState() {
  var stateElements = document.querySelectorAll(".frame-container.anti-tracking, .frame-container.antiphishing");
  var states = [].map.call(stateElements, function(el) {
    return el.getAttribute('state');
  }), state = 'active';

  if(states.includes('critical')){
    state = 'critical';
  }
  else if(states.includes('inactive')){
    state = 'inactive';
  }

  $("#header").attr('state', state);
  sendMessageToWindow({
    action: 'updateState',
    data: state
  });
}

function compile(obj) {
  return Object.keys(obj.companies)
      .map(function (companyName) {
        var domains = obj.companies[companyName];
        var company = {
          name: companyName,
          domains: domains.map(function (domain) {
            var domainData = obj.trackers[domain];
            return {
              domain: domain,
              count: (domainData.cookie_blocked || 0) + (domainData.bad_qs || 0)
            }
          }).sort(function (a, b) {
            return a.count < b.count;
          }),
          count: 0
        };
        company.count = company.domains.reduce(function (prev, curr) { return prev + curr.count }, 0)
        return company;
      })
      .sort(function (a,b) {
        return a.count < b.count;
      });
}

function compileAdblockInfo(data) {
  if (!data.module.adblocker) {
    return;
  }
  var advertisers = data.module.adblocker.advertisersList;
  var firstParty = advertisers["First party"];
  var unknown = advertisers["_Unknown"]
  delete advertisers["First party"];
  delete advertisers["_Unknown"];
  data.module.adblocker.advertisersList.companiesArray = Object.keys(advertisers).map(function (advertiser) {
    var resources = advertisers[advertiser];
    return {
      name: advertiser,
      count: resources.length
    }
  }).sort((a,b) => a.count < b.count);

  if (firstParty) {
    data.module.adblocker.advertisersList.companiesArray.unshift({
      name: "First Party", // i18n
      count: firstParty.length
    });
  }
  if (unknown) {
    data.module.adblocker.advertisersList.companiesArray.push({
      name: "Other", // i18n
      count: unknown.length
    });
  }
}

function draw(data){
  if (data.module) {
    data.module.antitracking.trackersList.companiesArray = compile(data.module.antitracking.trackersList)
    compileAdblockInfo(data);
  }
  console.log(data);

  document.getElementById('control-center').innerHTML = CLIQZ.templates["template"](data)
  document.getElementById('ad-blocking').innerHTML = CLIQZ.templates["ad-blocking"](data);
  document.getElementById('anti-phising').innerHTML = CLIQZ.templates["anti-phising"](data);
  document.getElementById('anti-tracking').innerHTML = CLIQZ.templates["anti-tracking"](data);

  function close_setting_accordion_section() {
    $('.setting-accordion .setting-accordion-section-title').removeClass('active');
    $('.setting-accordion .setting-accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.setting-accordion-section-title').click(function(e) {

    // Grab current anchor value
    var currentAttrValue = $(this).attr('href');

    if ($(e.target).is('.active') || ($(e.target)[0].parentElement.className == "setting-accordion-section-title active")) {
      close_setting_accordion_section();
    } else {
      close_setting_accordion_section();

      // Add active class to section title
      $(this).addClass('active');
      // Open up the hidden content panel
      $('.setting-accordion ' + currentAttrValue).slideDown(150).addClass('open');
    }
    e.preventDefault();
  });

  function close_accordion_section() {
    $('.accordion .accordion-section-title').removeClass('active');
    $('.accordion .accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.accordion-section-title').click(function(e) {
    // Grab current anchor value
    var currentAttrValue = $(this).attr('href');

    if ($(e.target).is('.active') || ($(e.target)[0].parentElement.className == "accordion-section-title active")) {
      close_accordion_section();
    } else {
      close_accordion_section();

      // Add active class to section title
      $(this).addClass('active');
      // Open up the hidden content panel
      $('.accordion ' + currentAttrValue).slideDown(150).addClass('open');
    }
    e.preventDefault();
  });

  //====== SETTING SECTION =========//
  $(".setting").click(function(e) {
    var $main = $(this).closest("#control-center"),
        $othersettings = $main.find("#othersettings"),
        $section = $(this).closest('.setting').attr('data-section');

    if (isHttpsSection($section)) {
      return;
    } else if ($(e.target).hasClass("cqz-switch-box")) {
      return;
    } else if ($(e.target).hasClass("dropdown-scope")) {
      return;
    } else if (e.target.hasAttribute && e.target.hasAttribute("stop-navigation")) {
      return;
    } else if ($(e.target).hasClass("box")) {
      return;
    } else if ($(e.target)[0].nodeName == "LABEL") {
      return;
    } else if ($(e.target)[0].nodeName == "INPUT") {
      return;
    } else if ($(e.target).hasClass("cqz-switch-box")) {
      return;
    }

    $("#settings").addClass("open");
    $(this).addClass("active");
    $othersettings.css('display', 'none');
  });

  $(".cross").click(function(e) {
    e.stopPropagation()
    $(this).closest('.setting').removeClass("active");
    $("#othersettings").css('display', 'block');
    $("#settings").removeClass("open");
  });

  $(".cqz-switch-label, .cqz-switch-grey").click(function() {
    var target = $(this).closest('.bullet');
    target.attr("state", function(idx, attr) {
      return attr !== "active" ? "active" : target.attr("inactiveState");
    });

    if(this.hasAttribute('updatePref')){
      sendMessageToWindow({
        action: 'updatePref',
        data: {
          pref: this.getAttribute('updatePref'),
          value: target.attr('state') == 'active' ? true : false
         }
      });
    }
  });

  $(".cqz-switch").click(function() {
    var target = $(this).closest('.frame-container');

    target.attr("state", function(idx, attr){
        return attr !== "active" ? "active": target.attr('inactiveState');
    });

    if(this.hasAttribute('updatePref')){
      sendMessageToWindow({
        action: 'updatePref',
        data: {
          pref: this.getAttribute('updatePref'),
          value: target.attr('state') == 'active' ? true : false
        }
      });
    }

    updateGeneralState();
  });

  $(".dropdown-scope").change(function(ev) {
    var state = ev.currentTarget.value,
        target = $(this).closest('.frame-container');

    target.attr("state", state == "all" ?
      "critical" : target.attr('inactiveState'));

    updateGeneralState();
  });

  $(".pause").click(function() {
    //TODO
    localizeDocument();
  });

  localizeDocument();
}

window.draw = draw;
