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

function draw(data){
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
    if (isHttpsSection($section)) {
      return;
    } else if ($(e.target).hasClass("cqz-switch-box")) {
      return;
    } else if ($(e.target).hasClass("dropdown-scope")) {
      return;
    } else if ($(e.target).hasClass("opt-t")) {
      return;
    } else if ($(e.target).hasClass("opt-p")) {
      return;
    } else if ($(e.target).hasClass("opt")) {
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
    console.log("AAA", arguments)
    $(this).closest('.frame-container').attr("state", function(idx, attr){
        return attr !== "active" ? "active": "inactive";
    });
    updateGeneralState();
  });

  $(".cqz-switch").click(function() {
    return;
    var $this = $(this),
        $setting = $this.closest('.setting'),
        section = $setting.attr('data-section'),
        $switches = $setting.find('.switches'),
        $main = $switches.closest("#control-center"),
        $desc = $setting.find('.description').attr('data-i18n'),
        onLabelText = 'control-center-switch-on',
        offLabelText = 'control-center-switch-off',
        inactiveDesc = '-inactive',
        $switchSpans = $setting.find('.cqz-switch');

    if (isHttpsSection(section)) {
      $switches.toggleClass('inactive');
    }

    $this.toggleClass("active");
    $setting.toggleClass('inactive');

    var isActive = $this.hasClass('active');

    if (isActive) {
      setLabels($switchSpans, onLabelText);
      if($desc)setDescriptions($switches, $desc.substr(0, $desc.length - inactiveDesc.length));
      $switchSpans.each(function(index, obj) {
        $(obj).addClass('active');
      })
      if($main.hasClass("bad-" + section)) {
        $main.removeClass("bad-" + section);
      }
      $main.removeClass("crucial-" + section);
    } else {
      setLabels($switchSpans, offLabelText);
      setDescriptions($switches, $desc + inactiveDesc);
      $switchSpans.each(function(index, obj) {
        $(obj).removeClass('active');
      })
      $main.addClass("crucial-" + section);
    }

    sendMessageToWindow({
      action: 'updatePref',
      data: {
        pref: this.getAttribute('updatePref'),
        value: isActive
      }
    });

    if (!isHttpsSection(section)) {
      setHeaderText($main);
    }
    localizeDocument();
  });

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
    var state = ev.currentTarget.value;
    $(this).closest('.frame-container')
      .attr("state", state == "all" ? "critical" : "inactive");

    updateGeneralState();
  });

  $(".opt-t").click(function() {
    return;
    var $main = $(this).closest('#control-center');

    if($(this).hasClass("bad")) {
      if ($main.hasClass("crucial-antitrack")) {
        $main.removeClass('crucial-antitrack');
      }
      $main.addClass("bad-antitrack");
    } else {
      if ($main.hasClass("bad-antitrack")) {
        $main.removeClass('bad-antitrack');
        $main.addClass("crucial-antitrack");
      }
    }
  });

  $(".opt-p").click(function() {
    var $main = $(this).closest('#control-center');

    if($(this).hasClass("bad")) {
      if ($main.hasClass("crucial-antiphish")) {
        $main.removeClass('crucial-antiphish');
      }
      $main.addClass("bad-antiphish");
    } else {
      if ($main.hasClass("bad-antiphish")) {
        $main.removeClass('bad-antiphish');
        $main.addClass("crucial-antiphish");
      }
    }
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
