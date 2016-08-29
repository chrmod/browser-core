function localizeDocument() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
        var elArgs = el.dataset.i18n.split(","),
            key = elArgs.shift();
        el.textContent = chrome.i18n.getMessage(key, elArgs);
    });
}

//====== GENERIC SETTING ACCORDION FUNCTIONALITY =========//
$(document).ready(function() {
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
    } else if ($(e.target).hasClass("cqz-switch-box-antiphish")) {
      return;
    } else if ($(e.target).hasClass("cqz-switch-box-antitrack")) {
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

  //====== SWITCHES =========//
  $(".cqz-switch").click(function() {
    $(this).toggleClass("active");

    if (($(this).closest('.switches')).hasClass('smallsetting')) {

        var $switches = $(this).closest('.switches'),
            $main = $switches.closest('#control-center');
            $onLabel = $switches.find('#onlabel'),
            onLabel = $onLabel.attr('data-i18n');

        $switches.addClass('inactive');
        if ($(this).hasClass('active')) {
          $switches.removeClass('inactive');
          onLabel = 'control-center-switch-on';
        } else {
          onLabel = 'control-center-switch-off';
        }
        $onLabel.attr('data-i18n', onLabel);
        localizeDocument();

    } else {

        var $main = $(this).closest("#control-center"),

            $adblock = $main.find(".adblock"),
            $activeadblock = $main.find(".active-window-adblock"),

            $one = $adblock.find(".one"),
            $two = $adblock.find(".two"),

            $switchesOne = $one.closest('.switches'),
            $switchesTwo = $two.closest('.switches'),

            $descOne = $switchesOne.siblings('.description'),
            $descTwo = $switchesTwo.siblings('.description'),

            descLocalOne = $descOne.attr('data-i18n'),
            descLocalTwo = $descTwo.attr('data-i18n'),

            $onLabelone = $one.siblings('#onlabel'),
            $onLabeltwo = $two.siblings('#onlabel'),
            onLabelone = $onLabelone.attr('data-i18n'),
            onLabeltwo = $onLabeltwo.attr('data-i18n');

        $adblock.addClass('inactive');
        if ($(this).hasClass('active')) {
          onLabelone = 'control-center-switch-on';
          onLabeltwo = 'control-center-switch-on';
          descLocalOne = 'control-center-adblock-description';
          descLocalTwo = 'control-center-adblock-description';
          $adblock.removeClass('inactive');
          if ($one.hasClass("active") && !$two.hasClass("active")) {
            $two.addClass("active");
          } else if (!$one.hasClass("active") && $two.hasClass("active")) {
            $one.addClass("active");
          }

        } else {
          onLabelone = 'control-center-switch-off';
          onLabeltwo = 'control-center-switch-off';
          descLocalOne = 'control-center-adblock-description-inactive';
          descLocalTwo = 'control-center-adblock-description-inactive';

          if ($one.hasClass("active") && !$two.hasClass("active")) {
            $one.removeClass("active");
          } else if (!$one.hasClass("active") && $two.hasClass("active")) {
            $two.removeClass("active");
          }
        }
        $onLabelone.attr('data-i18n', onLabelone);
        $onLabeltwo.attr('data-i18n', onLabeltwo);
        $descOne.attr('data-i18n', descLocalOne);
        $descTwo.attr('data-i18n', descLocalTwo);
        localizeDocument();
    }
  });


  $(".cqz-switch-antitrack").click(function(e) {
    $(this).toggleClass("active");

    var $switches = $(this).closest('.switches'),
        $main = $switches.closest("#control-center"),
        $antitracker = $main.find(".antitracker"),

        $header = $main.find("#header"),
        $headertext = $header.find("#text"),
        headerstring = $headertext.attr('data-i18n'),

        $one = $antitracker.find(".one"),
        $two = $antitracker.find(".two"),

        $onLabelone = $one.siblings('#onlabel'),
        $onLabeltwo = $two.siblings('#onlabel'),
        onLabelone = $onLabelone.attr('data-i18n'),
        onLabeltwo = $onLabeltwo.attr('data-i18n'),
        $switchesOne = $one.closest('.switches'),
        $switchesTwo = $two.closest('.switches'),

        $descOne = $switchesOne.siblings('.description'),
        $descTwo = $switchesTwo.siblings('.description'),
        descLocalOne = $descOne.attr('data-i18n'),
        descLocalTwo = $descTwo.attr('data-i18n');

        $antitracker.addClass('inactive');
        if ($(this).hasClass('active')) {

          $antitracker.removeClass('inactive');
          if ($main.hasClass("bad-antitrack")) {
            $main.removeClass("bad-antitrack");
          }
          $main.removeClass("crucial-antitrack");
          $antitracker.removeClass('inactive');
          if ($one.hasClass("active") && !$two.hasClass("active")) {
            $two.addClass("active");
          } else if (!$one.hasClass("active") && $two.hasClass("active")) {
            $one.addClass("active");
          }
          onLabelone = 'control-center-switch-on';
          onLabeltwo = 'control-center-switch-on';
          descLocalOne = 'control-center-datapoints';
          descLocalTwo = 'control-center-datapoints';
          headerstring = 'control-center-txt-header';

        } else {

          headerstring = 'control-center-txt-header-not';
          onLabelone = 'control-center-switch-off';
          onLabeltwo = 'control-center-switch-off';
          descLocalOne = 'control-center-datapoints-inactive';
          descLocalTwo = 'control-center-datapoints-inactive';

          $main.addClass("crucial-antitrack");
          if ($one.hasClass("active") && !$two.hasClass("active")) {
            $one.removeClass("active");
          } else if (!$one.hasClass("active") && $two.hasClass("active")) {
            $two.removeClass("active");
          }
        }

        if ($main.hasClass("crucial-antiphish") || $main.hasClass("crucial-antitrack") || $main.hasClass("bad-antiphish") || $main.hasClass("bad-antitrack")) {
          headerstring = 'control-center-txt-header-not';
        } else {
          headerstring = 'control-center-txt-header';
        }

        $onLabelone.attr('data-i18n', onLabelone);
        $onLabeltwo.attr('data-i18n', onLabeltwo);
        $descOne.attr('data-i18n', descLocalOne);
        $descTwo.attr('data-i18n', descLocalTwo);
        $headertext.attr('data-i18n', headerstring);
        localizeDocument();
  });


  $(".cqz-switch-antiphish").click(function(e) {
    $(this).toggleClass("active");

    var $switches = $(this).closest('.switches'),
        $main = $switches.closest('#control-center'),

        $header = $main.find("#header"),
        $headertext = $header.find("#text"),
        headerstring = $headertext.attr('data-i18n'),

        $antiphishing = $main.find(".antiphishing"),
        $activephishing = $main.find(".active-window-phishing"),

        $one = $antiphishing.find(".one"),
        $two = $antiphishing.find(".two"),

        $switchesOne = $one.closest('.switches'),
        $switchesTwo = $two.closest('.switches'),

        $onLabelone = $one.siblings('#onlabel'),
        $onLabeltwo = $two.siblings('#onlabel'),
        onLabelone = $onLabelone.attr('data-i18n'),
        onLabeltwo = $onLabeltwo.attr('data-i18n');

    $switches.addClass('inactive');
    if ($(this).hasClass('active')) {
      onLabelone = 'control-center-switch-on';
      onLabeltwo = 'control-center-switch-on';

      $switches.removeClass('inactive');

      if ($main.hasClass("bad-antiphish")) {
        $main.removeClass("bad-antiphish");
      }
      $main.removeClass("crucial-antiphish");

      if ($one.hasClass("active") && !$two.hasClass("active")) {
        $two.addClass("active");
      } else if (!$one.hasClass("active") && $two.hasClass("active")) {
        $one.addClass("active");
      }

    } else {

      onLabelone = 'control-center-switch-off';
      onLabeltwo = 'control-center-switch-off';
      $main.addClass("crucial-antiphish");

      if ($one.hasClass("active") && !$two.hasClass("active")) {
        $one.removeClass("active");
      } else if (!$one.hasClass("active") && $two.hasClass("active")) {
        $two.removeClass("active");
      }
    }

    if ($main.hasClass("crucial-antiphish") || $main.hasClass("crucial-antitrack") || $main.hasClass("bad-antiphish") || $main.hasClass("bad-antitrack")) {
      headerstring = 'control-center-txt-header-not';
    } else {
      headerstring = 'control-center-txt-header';
    }

    $headertext.attr('data-i18n', headerstring);
    $onLabelone.attr('data-i18n', onLabelone);
    $onLabeltwo.attr('data-i18n', onLabeltwo);
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

  var currSiteTemplate = Handlebars.compile($('#currentsite-handlebars').html()),
      antitrackerTemplate = Handlebars.compile($('#antitracker-counter-handlebars').html());

  document.getElementById('currentsite').innerHTML = currSiteTemplate({
    title: 'sueddeutsche.de/wirtschaft/fsgjbhfkjsbfgkjdbkjdsbficsudjkbfs,mdbfk'
  })
  document.getElementById('antitracker-counter').innerHTML = antitrackerTemplate({
    antitrackerCount: '200'
  })

});
