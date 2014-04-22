'use strict';

/*
    check mockserver/server.py for mocks !
*/

var {assert} = require('lib/assertions');
var WAIT_TIME_FOR_KEY_PRESS = 700,
    WAIT_TIME_FOR_MULTIPLE_KEY_PRESSES = 200;

var setupModule = function (module) {
    module.controller = mozmill.getBrowserController();
    module.CLIQZ = controller.window.CLIQZ;
}

function clearLocationBar (locationBar) {
    var locationBarNode = locationBar.getNode();
    locationBarNode.value = '';
}

var locationAction = function(){
    let locationBar = new findElement.ID(controller.window.document, 'urlbar')
        ,popup = new findElement.ID(controller.window.document, 'PopupAutoCompleteRichResult')
        ,suggestionsbox = popup.getNode()
        ;


    this.getNode = function(){ return locationBar.getNode(); };
    this.clean = function(){ locationBar.getNode().value = ''; };
    // adds a key to the urlbar
    this.kepPress = function(key) {
        locationBar.sendKeys(key);
        controller.sleep(WAIT_TIME_FOR_KEY_PRESS);
    };
    // multiple key press
    this.multiKeyPress = function(data, wait) {
        for(let key of data){
            locationBar.sendKeys(key);
            controller.sleep(WAIT_TIME_FOR_MULTIPLE_KEY_PRESSES);
        }
        wait && controller.sleep(WAIT_TIME_FOR_KEY_PRESS);
    };
    this.enter = function(){
        locationBar.keypress('VK_ENTER');
    };
    this.navigateTo = function(url) {
        this.clean();
        locationBar.sendKeys(url);
        this.enter();
    };
    this.open = function(url, wait){
        controller.open(url);
        wait && controller.waitForPageLoad();
    };
    this.suggestions = function(){
        return this.jsonifySuggestions(suggestionsbox.richlistbox.childNodes);
    };
    this.jsonifySuggestions = function(results){
        function json(item){
            return item && {
                url: item.getAttribute('url'),
                source: item.getAttribute('source'),
                type: item.getAttribute('type'),
                title: item.getAttribute('title'),
                text: item.getAttribute('text'),
                collapsed: item.collapsed,
                className: item.className
            }
        }
        function visible(item){
            return !item.collapsed;
        }
        return Array.prototype.map.call(results, json).filter(visible);
    }

    // replace https to http to enable mocking
    CLIQZ.Utils.setPref('suggestionAPI', CLIQZ.Utils.SUGGESTIONS.replace('https', 'http'));
    CLIQZ.Core.restart();

    this.clean();

    return this;
}


function testResults() {
    let input = 'facebook', expectedUrl ='https://www.facebook.com',
        expectedTitle = 'Willkommen bei Facebook',
        action = new locationAction(),
        currentInput = '',
        locNode = action.getNode();;

    for(let key of input){
        action.kepPress(key);
        currentInput += key;
        let suggestions = action.suggestions();

        // mocked results kick in from the 4th caracter for "face..."
        if(currentInput.length>3){
            assert.equal(suggestions[0].url, expectedUrl, 'url should be facebook');
            assert.equal(suggestions[0].source, 'cliqz-results', 'Is a cliqz result');
            assert.equal(suggestions[0].title, expectedTitle, 'title is the expected facebook title');

            //all the other results should be suggestions
            for(let suggestion of suggestions.slice(1)){
                assert.equal(suggestion.source, 'cliqz-suggestions', 'Is query suggestion');
            }
        } else {
            for(let suggestion of suggestions){
                assert.notEqual(suggestion.source, 'cliqz-results', 'Is not a result');
            }
        }
    }
}


function testQuerySuggestions() {
  let input = 'random string',
      action = new locationAction(),
      currentInput = '';

    for(let key of input){
        action.kepPress(key);
        currentInput += key;
        if(currentInput.length > 3){
            let suggestions = action.suggestions();
            //controller.window.alert(JSON.stringify(suggestions));
            for(let suggestion of suggestions){
                assert.equal(suggestion.collapsed, false, 'Visible suggestion');
                assert.equal(suggestion.source, 'cliqz-suggestions', 'Is query suggestion');
            }

            // first suggestion
            assert.equal(suggestions[0].url, currentInput, 'url what the user typed');

            // next 3 mocked suggestions
            var mocked = ['one', 'two', 'three'];
            for(let i in mocked){
                assert.equal(suggestions[+i+1].url, mocked[+i], 'url is mocked suggestion');
            }
        }
    }
}

function testAutocomplete () {
    let input = 'facebook', expected = 'facebook.com/',
        action = new locationAction(),
        currentInput = '',
        locNode = action.getNode();;

    currentInput = input.slice(0,3);
    action.multiKeyPress(currentInput, true);


    for(let key of input.slice(3)){
        action.kepPress(key);
        currentInput += key;

        assert.equal(locNode.selectionStart, currentInput.length, "Start selection after inputed text.");
        assert.equal(locNode.selectionEnd, 13, "End selection after autocomplete text.");
        assert.equal(locNode.value, "facebook.com/", "For faceboo autocomplete facebook.com/");
      }
}

