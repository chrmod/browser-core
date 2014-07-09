'use strict';

(function(ctx) {

var TEMPLATES = ['main'],
    TEMPLATES_PATH = 'chrome://cliqz/content/templates/',
    tpl = {};

function generateLogoClass(urlDetails){
    var cls = '';
    // lowest priority: base domain, no tld
    cls += ' logo-' + urlDetails.name;
    // domain.tld
    cls += ' logo-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    if (urlDetails.subdomains.length > 0) {
        // subdomain.domain - to match domains like maps.google.co.uk and maps.google.de with maps-google
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name;
        // subdomain.domain.tld
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    }

    return cls;
}


function enhanceResults(res){
    for(var i=0; i<res.results.length; i++){
        var r = res.results[i];

        r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
        r.logo = generateLogoClass(r.urlDetails);
        r.width = res.width;
    }

    return res;
}


ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = ctx.CLIQZ.UI || {
    init: function(){
        for(var i in TEMPLATES){
            var name = TEMPLATES[i];
            CliqzUtils.httpGet(TEMPLATES_PATH + name + '.tpl', function(res){
                tpl[name] = Handlebars.compile(res.response);
            });
        }
    },
    create: function(res){
        var enhanced = enhanceResults(res);
        return tpl.main(enhanced);
    }
}

})(this);