var Slider = (function($, window){
  var m = {},
      state = 0,
      start = 0,
      config = {
        "el":         '.newsBox li',
        "gridItems":  3,
        "sliderContainer": '#sliderBtns',
        "sliderBtn": '#sliderBtns a',
        "interval": 15000
      },
      items,
      t0;

  function transition(container, start, firstStart) {
    if($('.topnews:hover').length ===0 ) {
      items.fadeOut(100);
      if(firstStart) {
        items.slice(start, start + config.gridItems).css('display', 'block');
      } else {
        items.slice(start, start + config.gridItems).delay(200).fadeIn();
      }

      updateSliderBtns(state);

      state++;
      if(state * config.gridItems >= $(config.el).length) {
        state = 0;
      }
    }

    t0 = setTimeout(function() {
      transition(container, config.gridItems * state);
    }, config.interval);
  }

  function updateSliderBtns(state) {
    $(config.sliderContainer).find('div').removeClass('active');
    $(config.sliderContainer).find('a[data-state=' + state +']').parent().addClass('active');
  }

  function displaySliderBtns(num) {
    var sliderBtns = '';
    for(var i=0; i < num; i++) {
      sliderBtns += '<div><a data-state="' + i +'" href="#" onclick="return false;">' + i + '</a></div>';
    }
    document.getElementById('sliderBtns').innerHTML = sliderBtns;

    $(config.sliderBtn).on('click', function(e) {
      state = $(this).attr('data-state');
      clearTimeout(t0);
      transition(config.el, config.gridItems * state)
    });
  }

  m.init = function(options) {
    for(var prop in options){
      if(options.hasOwnProperty(prop)) {
        config[prop] = options[prop];
      }
    }

    items = $(config.el);
    // start the rotation only if we have more than gridItems
    if (options.totalNews / config.gridItems > 1) {
      displaySliderBtns(options.totalNews / config.gridItems);
      $(config.el).hide();
      transition(config.el, config.gridItems * state, true);
    }
  };

  return m;
})($, window);
