var Slider = (function($, window){
  var m = {},
      state = 0,
      start = 0,
      config = {
        "el":         '.newsBox li',
        "gridItems":  3,
        "sliderContainer": '#sliderBtns',
        "sliderBtn": '#sliderBtns a',
      },
      items,
      t0;
      //sliderBtns  = CliqzHandlebars.compile($("#slider-btns").html());

  function transition(container, start) {
    items.fadeOut(100);

    /*console.log("Start", start)
    console.log("State", state)*/

    items.slice(start, start + config.gridItems).delay(200).fadeIn();
    updateSliderBtns(state);

    state++;
    if(state * config.gridItems >= $(config.el).length) {
      state = 0;
    }

    t0 = setTimeout(function() {
      transition(container, config.gridItems * state)
    }, 10000)

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
      transition(config.el, config.gridItems * state);
    }
  };

  return m;
})($, window);
