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
