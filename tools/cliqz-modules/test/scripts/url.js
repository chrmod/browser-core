var fs = require("fs"),
    q = require("../../dist/cliqz-modules-test")

exports.script = function(test){
    fs.readFile(__dirname + "/../data/url.json","utf8",function(err,data){
        var tests = JSON.parse(data)
        
        for (var i=0;i<tests.length;i++) {
            var url

            test.doesNotThrow(function(){ url = new q.CLIQZ.URL(tests[i].input) })

            if (url) for (property in tests[i].output) test.ok(tests[i].output[property] === url[property],tests[i].input + ": " + property)
        }
        
        test.done()
    })
}