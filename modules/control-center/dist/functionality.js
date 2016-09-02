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

function setLabels(switchSpans, labelText) {
  switchSpans.each(function(index, obj) {
    var $onLabel = $(obj).siblings('#onlabel');
    $onLabel.attr('data-i18n', labelText);
  });
}

function setDescriptions(switches, descText) {
  switches.each(function(index, obj) {
    var $desc = $(obj).siblings('.description');
    $desc.attr('data-i18n', descText);
  });
}

function setHeaderText(main) {
  var $header = $("#header"),
      $headertext = $header.find("#text"),
      headerstring = '';
  if (main.hasClass("crucial-antiphish") || main.hasClass("crucial-antitrack") || main.hasClass("bad-antiphish") || main.hasClass("bad-antitrack")) {
    headerstring = 'control-center-txt-header-not';
  } else {
    headerstring = 'control-center-txt-header';
  }
  $headertext.attr('data-i18n', headerstring);
}

function isHttpsSection(section) {
  return section === 'https';
}

//====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
Promise.all([
  System.import("control-center/content/helpers"),
  $(document).ready().promise(),
]).then(function(resolvedPromises) {
  var helpers = resolvedPromises[0].default;
  Object.keys(helpers).forEach(function (helperName) {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });

  draw({});
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
  console.log(ev, arguments)
  sendMessageToWindow({
    action: 'updatePref',
    data: {
      pref: ev.currentTarget.getAttribute('updatePref'),
      value: ev.currentTarget.value
    }
  });
})


function updateGeneralState() {
  var stateElements = document.querySelectorAll(".frame-container.antitracking, .frame-container.antiphishing");
  var states = [].map.call(stateElements, function(el) {
    return el.getAttribute('state');
  });

  if(states.includes('critical')){
    $("#header").attr('state', 'critical');
  }
  else if(states.includes('inactive')){
    $("#header").attr('state', 'inactive');
  } else {
    $("#header").attr('state', 'active');
  }
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

function draw(data){
  if (data.module) {
    data.module.antitracking.trackersList.companiesArray = compile(data.module.antitracking.trackersList)
    data.module.adblocker.advertisersList.companiesArray = compile(data.module.adblocker.advertisersList)
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
        $othersettings = $main.find(".othersettings"),
        $section = $(this).closest('.setting').attr('data-section');

    console.log(arguments, e.target)
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

    $(this).addClass("active");
    $othersettings.css('display', 'none');
  });

  $(".cross").click(function(e) {
    e.stopPropagation()
    $(this).closest('.setting').removeClass("active");
    $(".othersettings").css('display', 'block');
  })

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

  // TODO: improve this - make more in CSS
  $(".cqz-switch-grey").click(function() {
    $(this).toggleClass("active");
    var $switches = $(this).closest('.switches-grey'),
        $onLabel = $switches.find('#onlabel'),
        onLabelNext = $onLabel.attr('data-i18n'),
        isActive = $(this).hasClass('active');

    if (isActive) {
      onLabelNext = 'control-center-switch-on';
    } else {
      onLabelNext = 'control-center-switch-off';
    }
    $onLabel.attr('data-i18n', onLabelNext);

    sendMessageToWindow({
      action: 'updatePref',
      data: {
        pref: this.getAttribute('updatePref'),
        value: isActive
      }
    });

    localizeDocument();
  });

  $(".dropdown-scope").change(function(ev) {
    var state = ev.currentTarget.value,
        target = $(this).closest('.frame-container');

    target.attr("state", state == "all" ?
      "critical" : target.attr('inactiveState'));

    updateGeneralState();
  });

  $(".pause").click(function() {
    var $main = $(this).closest('#control-center'),
        $headertext = $main.find("#header").find("#text"),
        $section = $main.find('.setting'),
        $cqzswitch = $main.find(".cqz-switch"),
        $switches = $cqzswitch.closest('.switches'),
        $onLabel = $switches.find('#onlabel'),
        $trackswitch = $main.find(".cqz-switch"),
        $trackdesc = $trackswitch.closest('.switches').siblings(".description"),
        $adblock = $main.find(".adblock"),
        $adblockdesc = $adblock.find(".description");

    if ($main.hasClass("break")) {
      $main.removeClass("break");
      $cqzswitch.addClass("active");
      $onLabel.attr('data-i18n', 'control-center-switch-on');
      $trackdesc.attr('data-i18n', 'control-center-datapoints');
      $adblockdesc.attr('data-i18n', 'control-center-adblock-description');
      $headertext.attr('data-i18n', 'control-center-txt-header');
      $section.removeClass('inactive');
      $switches.removeClass('inactive');
    } else {
      $main.addClass("break");
      $cqzswitch.removeClass("active");
      $onLabel.attr('data-i18n', 'control-center-switch-off');
      $trackdesc.attr('data-i18n', 'control-center-datapoints-inactive');
      $adblockdesc.attr('data-i18n', 'control-center-adblock-description-inactive');
      $headertext.attr('data-i18n', 'control-center-txt-header-not');
      $section.addClass('inactive');

      $main.removeClass("crucial-antiphish");
      $main.removeClass("crucial-antitrack");
      $main.removeClass("crucial-https");
      $main.removeClass("bad-antiphish");
      $main.removeClass("bad-antitrack");

      $('.dropdown option:first-child').prop("selected", true);
    }
    localizeDocument();
  });

  localizeDocument();
}
