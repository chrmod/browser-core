'use strict';

/*
    handlebars wrapper which adds all the needed helpers
*/

var EXPORTED_SYMBOLS = ['CliqzHandlebars'];
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


Components.utils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript('chrome://cliqzmodules/content/extern/handlebars-v1.3.0.js', this);
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var CliqzHandlebars = Handlebars || this.Handlebars;

var TEMPLATES = CliqzUtils.TEMPLATES,
    MESSAGE_TEMPLATES = [
      'footer-message',
      'onboarding-callout',
      'onboarding-callout-extended',
      'slow_connection',
      'partials/missing_location_2',
      'partials/no-locale-data'
    ],
    PARTIALS = [
        'url',
        'logo',
        'EZ-category',
        'EZ-history',
        'rd-h3-w-rating',
        'pcgame_movie_side_snippet',
        'partials/missing_location_1',
        'partials/timetable-cinema',
        'partials/timetable-movie'
    ],
    AGO_CEILINGS = [
        [0            , '',1],
        [120          , 'ago1Minute' , 1],
        [3600         , 'agoXMinutes'   , 60],
        [7200         , 'ago1Hour' , 1],
        [86400        , 'agoXHours'   , 3600],
        [172800       , 'agoYesterday'          , 1],
        [604800       , 'agoXDays'     , 86400],
        [4838400      , 'ago1Month'  , 1],
        [29030400     , 'agoXMonths'   , 2419200],
        [58060800     , 'ago1year'   , 1],
        [2903040000   , 'agoXYears'     , 29030400]
    ],
    ZERO_CLICK_INFO_PRIO = [["Phone", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/phone.svg"],
                            ["BIC", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/BIC.svg"],
//                            ["BLZ"],
//                            ["Sperrnummer"],
                            ["E-Mail", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/emaill.svg"]
                           ];



CliqzHandlebars.tplCache = {};

/* Needed by the view layer */
CliqzHandlebars.TEMPLATES = TEMPLATES;
CliqzHandlebars.MESSAGE_TEMPLATES = MESSAGE_TEMPLATES;
CliqzHandlebars.PARTIALS = PARTIALS;

compileTemplates();
registerHelpers();
function compileTemplates(){
    Object.keys(TEMPLATES).forEach(fetchTemplate);
    MESSAGE_TEMPLATES.forEach(fetchTemplate);
    PARTIALS.forEach(function(tName){ fetchTemplate(tName, true); });
}

function fetchTemplate(tName, isPartial) {
    try {
        CliqzUtils.httpGet(CliqzUtils.TEMPLATES_PATH + tName + '.tpl', function(res){
            if(isPartial === true)
                Handlebars.registerPartial(tName, res.response);
            else
                CliqzHandlebars.tplCache[tName] = Handlebars.compile(res.response);
        });
    } catch(e){
        CliqzUtils.log('ERROR loading template ' + tName);
    }
}


function registerHelpers(){
    Handlebars.registerHelper('show_main_iframe', function(){
        if (CliqzUtils.IFRAME_SHOW)
            return "inherit";
        return "none";
    });

    Handlebars.registerHelper('partial', function(name, options) {
        var template = CliqzHandlebars.tplCache[name] || CliqzHandlebars.tplCache.empty;
        return new Handlebars.SafeString(template(this));
    });

    Handlebars.registerHelper('get_array_element', function(arr, idx, subelement) {
      if (typeof(subelement) == undefined)
        return arr && arr[idx];
      else
        return arr && arr[idx] && arr[idx][subelement];
    });

    Handlebars.registerHelper('agoline', function(ts, options) {
        if(!ts) return '';
        var now = (new Date().getTime() / 1000),
            seconds = parseInt(now - ts),
            i=0, slot;

        while (slot = AGO_CEILINGS[i++])
            if (seconds < slot[0])
                return CliqzUtils.getLocalizedString(slot[1], parseInt(seconds / slot[2]))
        return '';
    });

    Handlebars.registerHelper('sec_to_duration', function(seconds) {
        if(!seconds)return null;
        try {
            var s = parseInt(seconds);
            return Math.floor(s/60) + ':' + ("0" + (s%60)).slice(-2);
        } catch(e) {
            return null;
        }
    });

    Handlebars.registerHelper('generate_logo', function(url, options) {
        return generateLogoClass(CliqzUtils.getDetailsFromUrl(url));
    });


    Handlebars.registerHelper('distance', function(meters) {
        if(meters < 1000) {
            return meters.toFixed(0) + " m";
        }
        return (meters/1000).toFixed(1) + " km";
    });

    Handlebars.registerHelper('shopping_stars_width', function(rating) {
        return rating * 14;
    });

    Handlebars.registerHelper('even', function(value, options) {
        if (value%2) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });

    Handlebars.registerHelper('local', function(key) {
        var args = Array.prototype.slice.call(arguments);
        var name = args.shift();
        return CliqzUtils.getLocalizedString.apply(null, [name, args]);
    });

    Handlebars.registerHelper('views_helper', function(val) {
        if(!val || val == '-1')return '';

        try {
            return parseFloat(val).toLocaleString() + ' ' + CliqzUtils.getLocalizedString('views');
        } catch(e) {
            return ''
        }
    });

    Handlebars.registerHelper('wikiEZ_height', function(data_richData){
        if (data_richData && data_richData.hasOwnProperty('images') && data_richData.images.length > 0){
            if ( (this.type === 'cliqz-extra') || (this.data === CliqzAutocomplete.lastResult._results[0].data))  // is the first result in the show list
                return 'cqz-result-h2';
            // BM hq result, but not the 1st result -> remove images
            data_richData.images = [];
        }

        return 'cqz-result-h3';
    });

    Handlebars.registerHelper('recipe_rd_template', function(data_richData) {
        var minimalData = data_richData
                          && typeof(data_richData["cook_time"]) !== "undefined"
                          && typeof(data_richData["numportion"]) !== "undefined"
                          && typeof(data_richData["total_review"]) !== "undefined";

        // is the only result in the show list
        return (CliqzAutocomplete.lastResult._results.length === 1 && minimalData);
    });

    Handlebars.registerHelper('cpgame_movie_rd_template', function(data_richData) {
        if(!CliqzAutocomplete.lastResult) return false;

        var minimalData_pcgame = data_richData && ((typeof(data_richData["image"]) !== "undefined" ) || (typeof(data_richData["game_cat"]) !== "undefined" && typeof(data_richData["rating"]) !== "undefined" && typeof(data_richData["categories"]) !== "undefined" ));
        var minimalData_movie = data_richData && ((typeof(data_richData["image"]) !== "undefined" ) || (data_richData["director"] && data_richData["director"]["title"]) || (data_richData["length"] &&  data_richData["length"] !== "_") || (data_richData["categories"]));
        // 5Jul2015, thuy@cliqz.com, used for computer game rich-snippet (rich-data) from BM.
        return (CliqzAutocomplete.lastResult._results.length == 1 && (minimalData_pcgame || minimalData_movie)); // is the only result in the show list
    });

    Handlebars.registerHelper('image_rd_specification', function(richData){
        return richData['superType'] === "movie" ? "50px" : "76px";
    });

    Handlebars.registerHelper('localizeNumbers', function(num) {
        /*
        * USE only when you really understand your data (see below)!
        * this function supports localization for:
        *   + normal number strings (e.g. 1.2, 3...),
        *   + standardized abrv. strings: 12e-4, and
        *   + extended forms, e.g. 1.2B, 1M etc.
        * In general, any string in the form of xxxyyy where xxx is a standardized number string (recognized by isFinite())
        * and yyy is an arbitrary string (called postfix) that does not start with a number will be localized
        * WARNING: numbers in the form such as: 12e3M, which might be seen as 12000 Million, will be parsed incorrectly
        */
        try {
            var parsedNum = parseFloat(num), postfix, dummy = "-";
            if (!isNaN(parsedNum) && isFinite(parsedNum)) {
                postfix = isFinite(num) ? "" : (num + "").substring((parsedNum + "").length);
                return parsedNum.toLocaleString(CliqzUtils.getLocalizedString('locale_lang_code')) + postfix;
            }
            return dummy;
        }
        catch(e) {
            return num
        }
    });

    Handlebars.registerHelper('limit_images_shown', function(idx, max_idx){
        return idx < max_idx;
    });

    Handlebars.registerHelper('json', function(value, options) {
        return JSON.stringify(value);
    });

    Handlebars.registerHelper('log', function(value, key) {
        console.log('TEMPLATE LOG HELPER', value);
    });

    Handlebars.registerHelper('toLowerCase', function(str) {
       return str.toLowerCase();
    });

    Handlebars.registerHelper('toUpperCase', function(str) {
       return str.toUpperCase();
    });

    Handlebars.registerHelper('emphasis', function(text, q, minQueryLength, cleanControlChars) {
        // lucian: questionable solution performance wise
        // strip out all the control chars
        // eg :text = "... \u001a"
        if(!q) return text;
        q = q.trim();
        if(text && cleanControlChars) text = text.replace(/[\u0000-\u001F]/g, ' ')

        if(!text || !q || q.length < (minQueryLength || 2)) return text;

        var map = Array(text.length),
            tokens = q.toLowerCase().split(/\s+|\.+/).filter(function(t){ return t && t.length>1; }),
            lowerText = text.toLowerCase(),
            out, high = false;

        tokens.forEach(function(token){
            var poz = lowerText.indexOf(token);
            while(poz !== -1){
                for(var i=poz; i<poz+token.length; i++)
                    map[i] = true;
                poz = lowerText.indexOf(token, poz+1);
            }
        });
        out=[];
        var current = ''
        for(var i=0; i<text.length; i++){
            if(map[i] && !high){
                out.push(current);
                current='';
                current += text[i];
                high = true;
            }
            else if(!map[i] && high){
                out.push(current);
                current='';
                current +=text[i];
                high = false;
            }
            else current += text[i];
        }
        out.push(current);

        return new Handlebars.SafeString(CliqzHandlebars.tplCache.emphasis(out));
    });

    Handlebars.registerHelper('hasimage', function(image) {
        if(image && image.src &&
            !(image.src.indexOf('xing') !== -1 && image.src.indexOf('nobody_') !==-1))
            return true;
        else
            return false
    });

    Handlebars.registerHelper('date', function(_date) {
        var d = new Date(_date);
        var date = d.getDate();
        var month = d.getMonth();
        month++;
        var year = d.getFullYear();
        var formatedDate = date + '/' + month + '/' + year;
        return formatedDate;
    });

    Handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);

        switch(operator) {
            case "+": return lvalue + rvalue;
            case "-": return lvalue - rvalue;
            case "*": return lvalue * rvalue;
            case "/": return lvalue / rvalue;
            case "%": return lvalue % rvalue;
        }
    });

    Handlebars.registerHelper("logic", function(lvalue, operator, rvalue, options) {
        switch(operator) {
            case "|":           return lvalue | rvalue;
            case "||":          return lvalue || rvalue;
            case "&":           return lvalue & rvalue;
            case "&&":          return lvalue && rvalue;
            case "^":           return lvalue ^ rvalue;
            case "is":          return lvalue == rvalue;
            case "starts_with": return lvalue.indexOf(rvalue) == 0;
            case "===":         return lvalue === rvalue;
            case "!=":          return lvalue != rvalue;
            case "<":           return lvalue < rvalue;
            case ">":           return lvalue > rvalue;
        }
    });

    Handlebars.registerHelper('is_not_dummy', function(s){
        return s && s!=="_";
    });

    Handlebars.registerHelper('nameify', function(str) {
        if (str.length == 0) return "";
        else return str[0].toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('reduce_width', function(width, reduction) {
        return width - reduction;
    });

    Handlebars.registerHelper('kind_printer', function(kind) {
        //we need to join with semicolon to avoid conflicting with the comma from json objects
        return kind ? kind.join(';'): '';
    });

    Handlebars.registerHelper('links_or_sources', function(richData) {
        return richData ? ((richData.internal_links && richData.internal_links.length > 0) ? richData.internal_links : (richData.additional_sources ? richData.additional_sources : [])) : 0;
    });

    Handlebars.registerHelper('pref', function(key) {
        return CliqzUtils.getPref(key, false);
    });

    Handlebars.registerHelper('isLatest', function(data) {
        // default setting is determined by latest-vs-trending AB test (50-50)
        // or is "latest" if not part of the AB test
        var defaultSetting = CliqzUtils.getPref('news-default-latest', true);

        // news-toggle not active
        if(!data.trending ||
            data.trending.length == 0 ||
            CliqzUtils.getPref('news-toggle', false) == false) {
                return defaultSetting;
        }

        try {
          var trending = JSON.parse(CliqzUtils.getPref('news-toggle-trending', '{}')),
              ezID = JSON.parse(data.subType).ez;
          // user-defined setting exists for EZ:
          if (trending.hasOwnProperty(ezID)) {
            return !trending[ezID];
          } else {
            // no user-defined setting, use default value
            return defaultSetting;
          }
        } catch(e){
          return defaultSetting;
        }
    });

    Handlebars.registerHelper('repeat', function(num, block) {
      var accum = '';
      for(var i = 0; i < num; i++) {
        accum += block.fn(i);
      }
      return accum;
    });

    /* Math comparisons */
    Handlebars.registerHelper('ifeq', function(v1, v2, options) { // if equal
      return v1 == v2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifleq', function(v1, v2, options) { // if less than or equal
      return v1 <= v2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('iflt', function(v1, v2, options) {  // if less than
      return v1 < v2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifgeq', function(v1, v2, options) { // if greater than or equal
      return v1 >= v2 ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('ifgt', function(v1, v2, options) { // if geater than
      return v1 > v2 ? options.fn(this) : options.inverse(this);
    });

    /* End Math comparisons */

    /* If conditions on preferences */
    Handlebars.registerHelper('ifpref', function(name, val, options) {
      if (val == undefined)
        return CliqzUtils.getPref(name) ? options.fn(this) : options.inverse(this) ;
      else
        return CliqzUtils.getPref(name) == val ? options.fn(this) : options.inverse(this) ;
    });

    Handlebars.registerHelper('unlesspref', function(name, val, options) {
      if (val == undefined)
        return CliqzUtils.getPref(name) ? options.inverse(this) : options.fn(this);
      else
        return CliqzUtils.getPref(name) == val ? options.inverse(this) : options.fn(this);
    });
    /* End If conditions on preferences */

    Handlebars.registerHelper('zeroclick_prep', function(zeroInfo_raw) {
        var n, name, item, zeroInfo = [];
        for (n = 0; n < ZERO_CLICK_INFO_PRIO.length; n++) {
            item = ZERO_CLICK_INFO_PRIO[n];
            name = item[0];
            if (zeroInfo_raw[name]) {
                zeroInfo.push({
                    'name': name,
                    'val': zeroInfo_raw[name],
                    'img': item[1]
                });
            }
        }
        zeroInfo_raw = zeroInfo;
        return zeroInfo_raw;
    });

    Handlebars.registerHelper('convRateDigitSplit', function (rate) {
        var result = "<span class='cqz-conv-rate'>" +
            rate.substr(0, rate.length - 2) +
            "<span class='cqz-rate-last-digits'>" + rate.substr(-2) + "</span>" +
            "</span>";

        return new Handlebars.SafeString(result);
    });

    Handlebars.registerHelper('numberFormat', function (number) {
        try { //just in case this helper is used on unsanitezed data from backend
          number = parseFloat(number);
          number = number.toFixed(2);
          return parseFloat(number).toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
        } catch(e){
          return ''
        }
    });
    });
}
