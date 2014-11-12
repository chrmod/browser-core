'use strict';

var {assert} = require('../lib/assertions');
var setupModule = function (module) {
    module.controller = mozmill.getBrowserController();
    module.CLIQZ = controller.window.CLIQZ;

    //mock the tracking to avoid noise
    controller.window.CliqzUtils.track = function(){ };

    module.CliqzUtils = controller.window.CliqzUtils;
}

function alert(txt){
    controller.window.alert(txt);
}

// replaces ',' and '-' in the urlbar if it can be autocompleted and if it contains 'www'
function testUrlBarCleaner() {
    var data = {
        'http://faceboook.com':'http://faceboook.com',
        'http://www.faceboook.com':'http://www.faceboook.com',
        'http://www.faceboook.com/login.html':'http://www.faceboook.com/login.html',
        //do not clean anything in the path
        'http://www.faceboook.com/login,html':'http://www.faceboook.com/login,html',
        'http://www,faceboook.com':'http://www.faceboook.com',
        'http://www.faceboook,com':'http://www.faceboook.com',
        'http://faceboook,com':'http://faceboook,com', // do not clean if no www detected
        'www,faceboook.com':'www.faceboook.com',
        'www.faceboook-com':'www.faceboook.com',
        'www.faceboook,com':'www.faceboook.com',
        'www,faceboook,com':'www.faceboook.com',
        'www-faceboook,com':'www.faceboook.com',
        '192.168.1.1':'192.168.1.1',
        '192,168,1.1':'192,168,1.1',
        'http://192,168,1.1':'http://192,168,1.1'
    }

    for(var k in data){
        assert.equal(CLIQZ.Core.cleanUrlBarValue(k), data[k]);
    }
}

