function localizeDocument() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
        var elArgs = el.dataset.i18n.split(","),
            key = elArgs.shift();
        el.textContent = chrome.i18n.getMessage(key, elArgs);
    });
}

//====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
Promise.all([
  System.import("control-center/content/helpers"),
  $(document).ready().promise(),
]).then(function(resolvedPromises) {
  // register helpers - start
  var helpers = resolvedPromises[0].default;
  Object.keys(helpers).forEach(function (helperName) {
    Handlebars.registerHelper(helperName, helpers[helperName]);
  });
  // register helpers - end

  document.getElementById('control-center').innerHTML = CLIQZ.templates["template"]()
  document.getElementById('ad-blocking').innerHTML = CLIQZ.templates["ad-blocking"]();
  document.getElementById('anti-phising').innerHTML = CLIQZ.templates["anti-phising"]();
  document.getElementById('anti-tracking').innerHTML = CLIQZ.templates["anti-tracking"]({
    antitrackerCount: '200'
  });

  document.getElementById('currentsite').innerHTML = CLIQZ.templates["current-site"]({
    title: 'sueddeutsche.de/wirtschaft/fsgjbhfkjsbfgkjdbkjdsbficsudjkbfs,mdbfk'
  });


  function close_setting_accordion_section() {
    $('.setting-accordion .setting-accordion-section-title').removeClass('active');
    $('.setting-accordion .setting-accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.setting-accordion-section-title').click(function(e) {

    console.log($(e.target));
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

    console.log($(e.target));
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
        $othersettings = $main.find(".othersettings");
        // return;
    if ($(e.target).hasClass("cqz-switch-box")) {
      return;
    } else if ($(e.target).hasClass("dropdown")) {
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

    // console.log($(e.target)[0].ownerSVGElement); debugger
    if ($(e.target).hasClass("cross") || ($(e.target)[0].ownerSVGElement != null && $(e.target)[0].ownerSVGElement.getAttribute("class") == "cross")) {
      $(this).removeClass("active");
      $othersettings.css('display', 'block');
      return;
    }

    $(this).addClass("active");
    $othersettings.css('display', 'none');
  });

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

  $(".cqz-switch").click(function() {
    var $this = $(this),
        $setting = $this.closest('.setting'),
        section = $setting.attr('data-section'),
        $switches = $setting.find('.switches'),
        $main = $switches.closest("#control-center"),
        onLabelText = 'control-center-switch-on',
        offLabelText = 'control-center-switch-off',
        onDesc = 'control-center-datapoints',
        offDesc = 'control-center-datapoints-inactive',
        $switchSpans = $setting.find('.cqz-switch');
        //https-everywhere
        if ($switchSpans.length === 0) {
          $switches = $this.closest('.switches')
          $switches.toggleClass('inactive');
          $switchSpans = $switches.find('.cqz-switch')
        }

        $this.toggleClass("active");
        $setting.toggleClass('inactive');
        if ($this.hasClass('active')) {
          setLabels($switchSpans, onLabelText);
          setDescriptions($switches, onDesc);
          $switchSpans.each(function(index, obj) {
            $(obj).addClass('active');
          })
          if($main.hasClass("bad-" + section)) {
            $main.removeClass("bad-" + section);
          }
          $main.removeClass("crucial-" + section);
        } else {
          setLabels($switchSpans, offLabelText);
          setDescriptions($switches, offDesc);
          $switchSpans.each(function(index, obj) {
            $(obj).removeClass('active');
          })
          $main.addClass("crucial-" + section);
        }
        setHeaderText($main);
        localizeDocument();
  });

  $(".cqz-switch-grey").click(function() {
    $(this).toggleClass("active");
    var $switches = $(this).closest('#switches-grey'),
        $onLabel = $switches.find('#onlabel'),
        onLabelCurr = $onLabel.attr('data-i18n'),
        onLabelNext = onLabelCurr;

    if ($(this).hasClass('active')) {
      onLabelNext = 'control-center-switch-on';
    } else {
      onLabelNext = 'control-center-switch-off';
    }
    $onLabel.attr('data-i18n', onLabelNext);
    localizeDocument();
  });


  $(".opt-t").click(function() {
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

        $header = $main.find("#header"),
        $headertext = $header.find("#text"),

        $safe = $main.find(".safe"),
        $unsafe = $main.find(".unsafe"),

        $adblock = $main.find(".adblock"),
        $antitracker = $main.find(".antitracker"),

        $cqzswitch = $main.find(".cqz-switch"),
        $switches = $cqzswitch.closest('.switches'),
        $onLabel = $switches.find('#onlabel'),

        $trackswitch = $main.find(".cqz-switch-antitrack"),
        $trackswitches = $trackswitch.closest('.switches'),
        $trackLabel = $trackswitches.find('#onlabel'),
        $trackdesc = $trackswitches.siblings(".description"),

        $adblockdesc = $adblock.find(".description"),

        $phishswitch = $main.find(".cqz-switch-antiphish"),
        $phishswitches = $phishswitch.closest('.switches'),
        $phishLabel = $phishswitches.find('#onlabel');


    if ($main.hasClass("break")) {
      $main.removeClass("break");
      $cqzswitch.addClass("active");
      $trackswitch.addClass("active");
      $phishswitch.addClass("active");
      $onLabel.attr('data-i18n', 'control-center-switch-on');
      $trackLabel.attr('data-i18n', 'control-center-switch-on');
      $trackdesc.attr('data-i18n', 'control-center-datapoints');
      $phishLabel.attr('data-i18n', 'control-center-switch-on');
      $adblockdesc.attr('data-i18n', 'control-center-adblock-description');
      $headertext.attr('data-i18n', 'control-center-txt-header');
      //
      // $safe.css('display', 'block');
      // $unsafe.css('display', 'none');
    } else {
      $main.addClass("break");
      $cqzswitch.removeClass("active");
      $trackswitch.removeClass("active");
      $phishswitch.removeClass("active");

      if ($main.hasClass("crucial-antiphish")){
        $main.removeClass("crucial-antiphish");
      }
      if ($main.hasClass("crucial-antitrack")) {
        $main.removeClass("crucial-antitrack");
      }
      if ($main.hasClass("bad-antiphish")) {
        $main.removeClass("bad-antiphish");
      }
      if ($main.hasClass("bad-antitrack")) {
        $main.removeClass("bad-antitrack");
      }

      // $('[name=dropdown]').each(function(index, val) {
      //   console.log(index, "index")
      // })

      $('[name=dropdown] option').filter(function(index, val) {
          return index === 0; //To select Blue
      }).prop('selected', true);

      $('[name=dropdown2] option').filter(function(index, val) {
          return index === 0; //To select Blue
      }).prop('selected', true);

      $('[name=dropdown3] option').filter(function(index, val) {
          return index === 0; //To select Blue
      }).prop('selected', true);

      $onLabel.attr('data-i18n', 'control-center-switch-off');
      $trackLabel.attr('data-i18n', 'control-center-switch-off');
      $trackdesc.attr('data-i18n', 'control-center-datapoints-inactive');
      $phishLabel.attr('data-i18n', 'control-center-switch-off');
      $adblockdesc.attr('data-i18n', 'control-center-adblock-description-inactive');
      $headertext.attr('data-i18n', 'control-center-txt-header-not');
      //
      // $safe.css('display', 'none');
      // $unsafe.css('display', 'block');
    }

    $adblock.addClass('inactive');
    $switches.addClass('inactive');
    if ($cqzswitch.hasClass('active')) {
      $switches.removeClass('inactive');
      $adblock.removeClass('inactive');
    }
    $antitracker.addClass("inactive");
    if ($trackswitch.hasClass('active')) {
      $antitracker.removeClass("inactive");
    }
    $phishswitches.addClass('inactive');
    if ($phishswitch.hasClass('active')) {
      $phishswitches.removeClass('inactive');
    }
    localizeDocument();
  });

  localizeDocument();

});
