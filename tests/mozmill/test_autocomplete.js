"use strict";

var {assert} = require("lib/assertions");

var WAIT_TIME_FOR_SUGGESTINS = 800,
    WAIT_TIME_FOR_KEY_PRESS = 300;

var setupModule = function (module) {
    module.controller = mozmill.getBrowserController();
    module.CLIQZ = controller.window.CLIQZ;

}

function clearLocationBar (locationBar) {
    var locationBarNode = locationBar.getNode();
    locationBarNode.value = "";
}

var locationAction = function(){
    let locationBar = new findElement.ID(controller.window.document, "urlbar");
    this.clean = function(){ locationBar.getNode().value = ""; };
    this.kepPress = function(key) {
        locationBar.sendKeys(key);
        controller.sleep(WAIT_TIME_FOR_KEY_PRESS);
    };
    this.enter = function(){
        locationBar.keypress('VK_ENTER');
    };
    this.navigateTo = function(url) {
        this.clean();
        locationBar.sendKeys(url);
        this.enter();
    }
    this.open = function(url, wait){
        controller.open(url);
        wait && controller.waitForPageLoad();
    }

    // replace https to http to enable mocking
    CLIQZ.Utils.setPref('suggestionAPI', CLIQZ.Utils.SUGGESTIONS.replace('https', 'http'));
    CLIQZ.Core.restart();

    this.clean();

    return this;
}



function testAutocomplete() {
  let action = new locationAction();
  for(let key of 'facebook the social page'){
    action.kepPress(key);
  }
}