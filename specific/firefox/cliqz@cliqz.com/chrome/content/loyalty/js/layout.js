SCRIPTS.layout = function () {
  Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
  if (typeof window == 'undefined') {
    window = {};
  }

  // Loyalty object
  if (typeof window.Loyalty == 'undefined') {
    var Loyalty = Loyalty || {};
    window.Loyalty = Loyalty;
  }

//  function showOptIn() {
//    var showOptIn = !CliqzLoyalty.has_joined();  // todo: check this
//    return showOptIn;
//  }

  function setActiveItem(item) {
    var activeClass = 'active';
    $('.nav-item').each(function () {
      $(this).removeClass(activeClass);
    });
    $("[data-item=" + item + "]").addClass(activeClass);
  }

  /**
   * Loyalty UI extensions
   */
//  Loyalty.UI = {};

  /**
   *
   */
//  Loyalty.UI.Optin = function (opts) {
//    //merge options
//    if (typeof opts === 'object') {
//      $.extend(true, this.options, opts);
//    }
//    this.init();
//  };

//  Loyalty.UI.Optin.prototype = {
//    optinContainerId: 'optinContainer',
//    optinContentId: 'optinContent',
//    optinBackgroundId: 'optinBackground',
//    init: function () {
//      var showOptin = showOptIn(),
//        self = this;
//
//      this.$optinContainer = $('#' + this.optinContainerId);
//      this.$optinContent = $('#' + this.optinContentId);
//      this.$optinBackground = $('#' + this.optinBackgroundId);
//
//      if (showOptin) {
//        self.open();
//      }
//
//      // onresize change the position
//      $(window).on('resize', function () {
//        self.adjustPosition();
//      });
//
//    },
//    open: function () {
//      var self = this;
//      self.adjustPosition();
//      this.$optinContainer.fadeIn(200, function () {
//      });
//    },
//    close: function () {
//      this.$optinContainer.fadeOut(200);
//
//    },
//    adjustPosition: function () {
//      var heightDelta = parseFloat($(window).height() / 2 + $(window).scrollTop() - (this.$optinContent.outerHeight() / 2));
//      var widthDelta = (parseFloat($(window).outerWidth() - $('#leftSide').width() - this.$optinContent.outerWidth())) / 2;
//      widthDelta = (widthDelta > 0) ? widthDelta : 0;
//
//      this.$optinContent.css({top: heightDelta, left: widthDelta});
//
//    }
//  };

  /**
   * Enable option
   **/
//  var optin = new Loyalty.UI.Optin();

  $("a.nav-item").click(function () {
    var viewName = $(this).attr("href").split("#")[1].split("/")[1],
      navItem = $(this).attr('data-item');
//    if (showOptIn()) {
//      optin.open();
//    }

    renderView(viewName);
    setActiveItem(navItem);
  });

//  $('.cqz-optin-btn').click(function () {
//    CliqzUtils.setPref('participateLoyalty', true);
//    CliqzLoyalty.init();
//    document.location.reload(true);
//    CliqzUtils.log("FINSIH THUY");
//    optin.close();
//  });

  $('.toggle-btn').click(function () {
    $('#menu').toggleClass('active');
    $("html, body").animate({
      scrollTop: 0
    }, 600);
    return false;
  });

  //------------------- Helper functions ----------------//
  function clz_hide_element_by_id(itemID) {
    var el = document.getElementById(itemID);
    el.style.display = 'none';
    el.setAttribute("closed", "1");
  }
  window.clz_hide_element_by_id = clz_hide_element_by_id;

  function clz_activate_humanweb_close_optin(optinID) {
    CliqzUtils.setPref("dnt", false);
    CliqzUtils.getWindow().CLIQZ.Core.refreshButtons();
    clz_hide_element_by_id(optinID);
  }
  window.clz_activate_humanweb_close_optin = clz_activate_humanweb_close_optin;

  function optinLoyalty(optinID) {
    CliqzLoyalty.setPref('participateLoyalty', true);
    CliqzLoyalty.init();
//    document.location.reload(true);
    clz_hide_element_by_id(optinID);
  }
  window.optinLoyalty = optinLoyalty;
};
