


//====== ACCORDION FUNCTIONALITY =========//

$(document).ready(function() {
  function close_accordion_section() {
    $('.accordion .accordion-section-title').removeClass('active');
    $('.accordion .accordion-section-content').slideUp(150).removeClass('open');
  }

  $('.accordion-section-title').click(function(e) {
    // Grab current anchor value
    var currentAttrValue = $(this).attr('href');

    if ($(e.target).is('.active')) {
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
});


//====== SETTING SECTION =========//

$(".setting").click(function(e) {
  // console.log($(e.target));

  const $elem = $(e.target),
    $this = $(this);
  if ($elem.hasClass("cqz-switch-box")) {
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
  } else if ($(e.target).hasClass("squaredFour")) {
    return;
  } else if ($(e.target).hasClass("cqz-switch-box-antiphish")) {
    return;
  } else if ($(e.target).hasClass("cqz-switch-box-antitrack")) {
    return;
  }


  $this.toggleClass("active");
});





//====== SWITCHES =========//

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
    var elArgs = el.dataset.i18n.split(","),
      key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);
  });
}

$(".cqz-switch").click(function() {
  $(this).toggleClass("active");

  if (($(this).closest('#switches')).hasClass('smallsetting')) {
      var $switches = $(this).closest('#switches'),
          $main = $switches.closest('#control-center');
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

          $switches.addClass('inactive');
          if ($(this).hasClass('active')) {
            $switches.removeClass('inactive');
          }

  } else {

      var $switches = $(this).closest('#switches'),
          $counter = $switches.siblings('#counter'),
          $desc = $switches.siblings('#description'),
          $count = $counter.find('#count'),
          $main = $switches.closest("#control-center"),
          $cqzswitch = $switches.find('#cqz-switch'),
          $onLabel = $switches.find('#onlabel'),
          onLabelCurr = $onLabel.attr('data-i18n'),
          onLabelNext = onLabelCurr;


      if ($(this).hasClass('active')) {
        onLabelNext = 'control-center-switch-on';
      } else {
        onLabelNext = 'control-center-switch-off';
      }

      $onLabel.attr('data-i18n', onLabelNext);

      var $desc = $switches.siblings('#description'),
        descLocalCurr = $desc.attr('data-i18n'),
        inActive = '-inactive',
        descLocalNext = descLocalCurr;

      if (descLocalCurr.substr(descLocalCurr.length - inActive.length) !== inActive) {
        descLocalNext += inActive;
      } else {
        descLocalNext = descLocalNext.slice(0, -9)
      }

      $desc.attr('data-i18n', descLocalNext);

      localizeDocument();

      $desc.addClass('inactive');
      $switches.addClass('inactive');
      $counter.addClass('inactive');
      if ($(this).hasClass('active')) {
        $desc.removeClass('inactive');
        $switches.removeClass('inactive');
        $counter.removeClass('inactive');
      }
  }
});

$(".cqz-switch-antitrack").click(function(e) {
  $(this).toggleClass("active");

  var $switches = $(this).closest('#switches'),
      $counter = $switches.siblings('#counter'),
      $count = $counter.find('#count'),
      $main = $switches.closest("#control-center"),
      $header = $main.find("#header"),
      $headertext = $header.find("#text"),
      headerstringCurr = $headertext.attr('data-i18n'),
      headerstringNext = headerstringCurr,
      $safeicon = $headertext.closest('#safe'),
      $unsafeicon = $headertext.closest('#unsafe'),
      $onLabel = $switches.find('#onlabel'),
      onLabelCurr = $onLabel.attr('data-i18n'),
      onLabelNext = onLabelCurr;

      if ($(this).hasClass('active')) {
        onLabelNext = 'control-center-switch-on';
      } else {
        onLabelNext = 'control-center-switch-off';
      }

      $onLabel.attr('data-i18n', onLabelNext);

      var $desc = $switches.siblings('#description'),
        descLocalCurr = $desc.attr('data-i18n'),
        inActive = '-inactive',
        descLocalNext = descLocalCurr;

      if (descLocalCurr.substr(descLocalCurr.length - inActive.length) !== inActive) {
        descLocalNext += inActive;
      } else {
        descLocalNext = descLocalNext.slice(0, -9);
      }

      $desc.attr('data-i18n', descLocalNext);

      if($(this).hasClass("active")) {
        if ($main.hasClass("bad-antitrack")) {
          $main.removeClass("bad-antitrack");
        }
        $main.removeClass("crucial-antitrack");
      } else {
        $main.addClass("crucial-antitrack");
      }

      if ($main.hasClass("crucial-antitrack") && ((headerstringCurr.substr(headerstringCurr.length - 4)) !== '-not')) {
        headerstringNext += '-not';
        $safeicon.css('display', 'none');
        $unsafeicon.css('display', 'block');
      } else {
        headerstringNext = headerstringNext.slice(0, -4);
        $safeicon.css('display', 'block');
        $unsafeicon.css('display', 'none');
      }

      $headertext.attr('data-i18n', headerstringNext);

      localizeDocument();

      $switches.addClass('inactive');
      if ($(this).hasClass('active')) {
        $switches.removeClass('inactive');
      }
});





$(".cqz-switch-antiphish").click(function(e) {
  $(this).toggleClass("active");

  var $switches = $(this).closest('#switches'),
      $main = $switches.closest('#control-center'),
      $header = $main.find("#header"),
      $headertext = $header.find("#text"),
      headerstringCurr = $headertext.attr('data-i18n'),
      headerstringNext = headerstringCurr,
      $safeicon = $headertext.closest('#safe'),
      $unsafeicon = $headertext.closest('#unsafe'),
      $onLabel = $switches.find('#onlabel'),
      onLabelCurr = $onLabel.attr('data-i18n'),
      onLabelNext = onLabelCurr;

      if ($(this).hasClass('active')) {
        onLabelNext = 'control-center-switch-on';
      } else {
        onLabelNext = 'control-center-switch-off';
      }

      if($(this).hasClass("active")) {
        if ($main.hasClass("bad-antiphish")) {
          $main.removeClass("bad-antiphish");
        }
        $main.removeClass("crucial-antiphish");
      } else {
        $main.addClass("crucial-antiphish");
      }

      if ($main.hasClass("crucial-antiphish") && ((headerstringCurr.substr(headerstringCurr.length - 3)) !== 'not')) {
        headerstringNext += '-not';
      } else {
        headerstringNext = headerstringNext.slice(0, -4);
      }

      $headertext.attr('data-i18n', headerstringNext);
      $onLabel.attr('data-i18n', onLabelNext);

      localizeDocument();

      $switches.addClass('inactive');
      if ($(this).hasClass('active')) {
        $switches.removeClass('inactive');
      }
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

      $cqzswitch = $main.find(".cqz-switch"),
      $switches = $cqzswitch.closest('#switches'),
      $onLabel = $switches.find('#onlabel'),

      $trackswitch = $main.find(".cqz-switch-antitrack"),
      $trackswitches = $trackswitch.closest('#switches'),
      $trackLabel = $trackswitches.find('#onlabel'),

      $phishswitch = $main.find(".cqz-switch-antiphish"),
      $phishswitches = $phishswitch.closest('#switches'),
      $phishLabel = $phishswitches.find('#onlabel');

      if ($main.hasClass("break")) {
        $main.removeClass("break");

        $cqzswitch.addClass("active");
        $trackswitch.addClass("active");
        $phishswitch.addClass("active");

        $onLabel.attr('data-i18n', 'control-center-switch-on');
        $trackLabel.attr('data-i18n', 'control-center-switch-on');
        $phishLabel.attr('data-i18n', 'control-center-switch-on');

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

        $onLabel.attr('data-i18n', 'control-center-switch-off');
        $trackLabel.attr('data-i18n', 'control-center-switch-off');
        $phishLabel.attr('data-i18n', 'control-center-switch-off');
      }

      $switches.addClass('inactive');
      if ($cqzswitch.hasClass('active')) {
        $switches.removeClass('inactive');
      }

      $trackswitches.addClass('inactive');
      if ($trackswitch.hasClass('active')) {
        $trackswitches.removeClass('inactive');
      }

      $phishswitches.addClass('inactive');
      if ($phishswitch.hasClass('active')) {
        $phishswitches.removeClass('inactive');
      }

      localizeDocument();
});


$(".lock").click(function() {

    $(".lock").addClass("flash");
    setTimeout(function() {
        $(".lock").removeClass("flash");
    },50);

});
