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
  const $elem = $(e.target),
    $this = $(this);
  if ($elem.hasClass("cqz-switch-box")) {
    return;
  } else if ($(e.target).hasClass("dropdown")) {
    return;
  } else if ($(e.target).hasClass("box")) {
    return;
  } else if ($(e.target).hasClass("cqz-switch-box-antiphish")) {
    return;
  } else if ($(e.target).hasClass("cqz-switch-box-antitrack")) {
    return;
  }

  console.log($(e.target));
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
          off = 'off',
          offcol = '#A4A4A4',
          offcolyel = '#FCBB0E',
          on = 'on',
          oncol = '#2B9F5F'
          labelcol = oncol,
          onLabelNext = onLabelCurr;

          if (onLabelCurr.substr(onLabelCurr.length - off.length) !== off) {
            onLabelNext = onLabelCurr.slice(0, -2);
            onLabelNext += off;
            labelcol = offcol;
            countcol = countcoloff;
          } else {
            onLabelNext = onLabelNext.slice(0, -3);
            onLabelNext += on;
            labelcol = oncol;
            countcol = countcolon;
          }

          $onLabel.css('color', labelcol);
          $onLabel.attr('data-i18n', onLabelNext);

          localizeDocument();

          $switches.toggleClass('inactive');

  } else {

      var $switches = $(this).closest('#switches'),
          $counter = $switches.siblings('#counter'),
          $count = $counter.find('#count'),
          $main = $switches.closest("#control-center"),
          $cqzswitch = $switches.find('#cqz-switch'),
          countcolon = '#000',
          countcoloff = '#A4A4A4',
          countcol = countcolon,
          $onLabel = $switches.find('#onlabel'),
          onLabelCurr = $onLabel.attr('data-i18n'),
          off = 'off',
          offcol = '#A4A4A4',
          on = 'on',
          oncol = '#2B9F5F'
          labelcol = oncol,
          onLabelNext = onLabelCurr;


      if (onLabelCurr.substr(onLabelCurr.length - off.length) !== off) {
        onLabelNext = onLabelCurr.slice(0, -2);
        onLabelNext += off;
        labelcol = offcol;
        countcol = countcoloff;
      } else {
        onLabelNext = onLabelNext.slice(0, -3);
        onLabelNext += on;
        labelcol = oncol;
        countcol = countcolon;
      }

      $count.css('color', countcol);
      $onLabel.css('color', labelcol);
      $onLabel.attr('data-i18n', onLabelNext);

      var $desc = $switches.siblings('#description'),
        descLocalCurr = $desc.attr('data-i18n'),
        inActive = '-inactive',
        descLocalNext = descLocalCurr,
        col = '#444444';

      if (descLocalCurr.substr(descLocalCurr.length - inActive.length) !== inActive) {
        descLocalNext += inActive;
        col = '#A4A4A4';
      } else {
        descLocalNext = descLocalNext.slice(0, -9)
        col = '#595959'
      }

      $desc.css('color', col)
      $desc.attr('data-i18n', descLocalNext);

      localizeDocument();

      $switches.toggleClass('inactive');
      $counter.toggleClass('inactive');
  }
});

$(".cqz-switch-antitrack").click(function(e) {
  $(this).toggleClass("active");

  var $switches = $(this).closest('#switches'),
      $counter = $switches.siblings('#counter'),
      $count = $counter.find('#count'),
      $main = $switches.closest("#control-center"),
      $cqzswitch = $switches.find('#cqz-switch'),
      countcolon = '#000',
      countcoloff = '#A4A4A4',
      countcol = countcolon,
      $onLabel = $switches.find('#onlabel'),
      onLabelCurr = $onLabel.attr('data-i18n'),
      onLabelNext = onLabelCurr,
      off = 'off',
      on = 'on',
      offcol = '#FCBB0E',
      oncol = '#2B9F5F',
      labelcol = oncol;

      if (onLabelCurr.substr(onLabelCurr.length - off.length) !== off) {
        onLabelNext = onLabelCurr.slice(0, -2);
        onLabelNext += off;
        labelcol = offcol;
        countcol = countcoloff;
      } else {
        onLabelNext = onLabelNext.slice(0, -3);
        onLabelNext += on;
        labelcol = oncol;
        countcol = countcolon;
      }

      $count.css('color', countcol);
      $onLabel.css('color', labelcol);
      $onLabel.attr('data-i18n', onLabelNext);

      var $desc = $switches.siblings('#description'),
        descLocalCurr = $desc.attr('data-i18n'),
        inActive = '-inactive',
        descLocalNext = descLocalCurr,
        col = '#444444';

      if (descLocalCurr.substr(descLocalCurr.length - inActive.length) !== inActive) {
        descLocalNext += inActive;
        col = '#A4A4A4';
      } else {
        descLocalNext = descLocalNext.slice(0, -9)
        col = '#595959'
      }

      $desc.css('color', col)
      $desc.attr('data-i18n', descLocalNext);

      localizeDocument();

      $switches.toggleClass('inactive');
      $counter.toggleClass('inactive');

  var $main = $(this).closest('#control-center');

  if($(this).hasClass("active")) {
    $main.removeClass("crucial-antitrack");
  } else {
    $main.addClass("crucial-antitrack");
  }
});





$(".cqz-switch-antiphish").click(function(e) {
  $(this).toggleClass("active");

  var $switches = $(this).closest('#switches'),
      $main = $switches.closest('#control-center');
      $onLabel = $switches.find('#onlabel'),
      onLabelCurr = $onLabel.attr('data-i18n'),
      off = 'off',
      offcol = '#FCBB0E',
      on = 'on',
      oncol = '#2B9F5F'
      labelcol = oncol,
      onLabelNext = onLabelCurr;

      if (onLabelCurr.substr(onLabelCurr.length - off.length) !== off) {
        onLabelNext = onLabelCurr.slice(0, -2);
        onLabelNext += off;
        labelcol = offcol;
      } else {
        onLabelNext = onLabelNext.slice(0, -3);
        onLabelNext += on;
        labelcol = oncol;
      }

      $onLabel.css('color', labelcol);
      $onLabel.attr('data-i18n', onLabelNext);

      localizeDocument();

      $switches.toggleClass('inactive');

  var $main = $(this).closest('#control-center');

  if($(this).hasClass("active")) {
    $main.removeClass("crucial-antiphish");
  } else {
    $main.addClass("crucial-antiphish");
  }
});





$(".cqz-switch-grey").click(function() {
  $(this).toggleClass("active");
  var $switches = $(this).closest('#switches-grey'),
      $onLabel = $switches.find('#onlabel'),
      onLabelCurr = $onLabel.attr('data-i18n'),
      off = 'off',
      on = 'on',
      onLabelNext = onLabelCurr;
  if (onLabelCurr.substr(onLabelCurr.length - off.length) !== off) {
    onLabelNext = onLabelCurr.slice(0, -2);
    onLabelNext += off;
  } else {
    onLabelNext = onLabelNext.slice(0, -3);
    onLabelNext += on;
  }
  $onLabel.attr('data-i18n', onLabelNext);
  localizeDocument();
});
