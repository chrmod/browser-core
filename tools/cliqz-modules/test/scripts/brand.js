var fs = require("fs"),
    q = require("../../dist/cliqz-modules-test")

exports.script = function(test){
    fs.readFile(__dirname + "/../data/brand.json","utf8",function(err,data){
        if (err) throw err
        
        var tests = JSON.parse(data)

        for (var i=0;i<tests.length;i++) {
            var url = new q.CLIQZ.URL(tests[i].input),
                brand

            test.doesNotThrow(function(){ brand = new q.CLIQZ.Brand(url) })

            if (brand) for (property in tests[i].output) test.ok(tests[i].output[property] === brand[property],tests[i].input + ": " + property)
        }

        test.done()
    })
}