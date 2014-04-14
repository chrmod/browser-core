"use strict";

var {assert} = require("lib/assertions");

var WAIT_TIME_FOR_SUGGESTINS = 800;

var setupModule = function (module) {
   module.controller = mozmill.getBrowserController();
}

function clearLocationBar (locationBar) {
  var locationBarNode = locationBar.getNode();
  locationBarNode.value = "";
}

function testGitSugesstionPopupMoreThanFiveResults () {
  var locationBar = new findElement.ID(controller.window.document, "urlbar");
  clearLocationBar(locationBar);
  locationBar.sendKeys("git");
  controller.sleep(WAIT_TIME_FOR_SUGGESTINS);

  var suggestions = new findElement.ID(controller.window.document, "PopupAutoCompleteRichResult");
  var suggestionsNode = suggestions.getNode()
  assert.ok(suggestionsNode, "PopupAutoCompleteRichResult element exists.");
  var sugesstionResults = suggestionsNode.richlistbox.childNodes;
  assert.greaterOrEqual(sugesstionResults.length, 5, "Five or more results shown for git query.");
}

function testTwitterSugesstionPopupMoreThanFiveResults () {
  var locationBar = new findElement.ID(controller.window.document, "urlbar");
  clearLocationBar(locationBar);
  locationBar.sendKeys("twitter");
  controller.sleep(WAIT_TIME_FOR_SUGGESTINS);

  var suggestions = new findElement.ID(controller.window.document, "PopupAutoCompleteRichResult");
  var suggestionsNode = suggestions.getNode()
  assert.ok(suggestionsNode, "PopupAutoCompleteRichResult element exists.");
  var sugesstionResults = suggestionsNode.richlistbox.childNodes;
  assert.greaterOrEqual(sugesstionResults.length, 5, "Five or more results shown for twitter query.");
}

function testTwitterFirstResult () {
  var locationBar = new findElement.ID(controller.window.document, "urlbar");
  clearLocationBar(locationBar);
  locationBar.sendKeys("twitter");
  controller.sleep(WAIT_TIME_FOR_SUGGESTINS);

  var suggestions = new findElement.ID(controller.window.document, "PopupAutoCompleteRichResult");
  var suggestionsNode = suggestions.getNode()
  assert.ok(suggestionsNode, "PopupAutoCompleteRichResult element exists.");
  var firsResult = suggestionsNode.richlistbox.childNodes[0];
  var firstResultURL = firsResult.getAttribute('url');
  assert.equal(firstResultURL, "https://twitter.com", "First result for twitter is https://twitter.com.");
}

function testTwitterAutocomplete () {
  var locationBar = new findElement.ID(controller.window.document, "urlbar");
  clearLocationBar(locationBar);
  locationBar.sendKeys("twitter");
  controller.sleep(WAIT_TIME_FOR_SUGGESTINS);

  var locationBarNode = locationBar.getNode();
  var autocompleteSelectionStart = locationBarNode.selectionStart
  assert.equal(autocompleteSelectionStart, 7, "Start selection after inputed text.");
  var autocompleteSelectionEnd = locationBarNode.selectionEnd
  assert.equal(autocompleteSelectionEnd, 12, "End selection after autocomplete text.");
  var autocompleteValue = locationBarNode.value
  assert.equal(autocompleteValue, "twitter.com/", "For twitter autocomplete twitter.com/");
}
