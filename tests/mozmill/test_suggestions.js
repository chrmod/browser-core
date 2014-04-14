'use strict'

// var {assert, expect} = require("assertions");

var setupModule = function (module) {
   module.controller = mozmill.getBrowserController();
}

var testFacebook = function() {
    var locationBar = new elementslib.ID(controller.window.document, "urlbar");
    locationBar.sendKeys('git')
    controller.sleep(500)
    // controller.screenshot(locationBar.getNode(), 'location-bar', true);
    // controller.sleep(1000)
}