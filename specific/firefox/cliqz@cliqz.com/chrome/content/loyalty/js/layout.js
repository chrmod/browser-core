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

  function setActiveItem(item) {
    var activeClass = 'active';
    $('.nav-item').each(function () {
      $(this).removeClass(activeClass);
    });
    $("[data-item=" + item + "]").addClass(activeClass);
  }

  $("a.nav-item").click(function () {
    var viewName = $(this).attr("href").split("#")[1].split("/")[1],
      navItem = $(this).attr('data-item');
//    if (showOptIn()) {
//      optin.open();
//    }

    renderView(viewName);
    setActiveItem(navItem);
  });

  $('.toggle-btn').click(function () {
    $('#menu').toggleClass('active');
    $("html, body").animate({
      scrollTop: 0
    }, 600);
    return false;
  });

  //------------------- Helper functions ----------------//
  function clzHideElementById(itemID) {
    var el = document.getElementById(itemID);
    el.style.display = 'none';
    el.setAttribute("closed", "1");
  }

  window.clzHideElementById = clzHideElementById;

  function clzActivateHumanwebCloseOptin(optinID) {
    CliqzUtils.setPref("dnt", false);
    CliqzUtils.getWindow().CLIQZ.Core.refreshButtons();
    clzHideElementById(optinID);
  }

  window.clzActivateHumanwebCloseOptin = clzActivateHumanwebCloseOptin;

  function optinLoyalty(optinID) {
    CliqzLoyalty.setPref('participateLoyalty', true);
    CliqzLoyalty.init();
//    document.location.reload(true);
    clzHideElementById(optinID);
  }

  window.optinLoyalty = optinLoyalty;
};
