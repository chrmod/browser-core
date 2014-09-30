'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Promise',
  'chrome://cliqzmodules/content/extern/Promise.jsm');

var EXPORTED_SYMBOLS = ['CliqzWeather'];

function cap(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function geocodeCallback(res, callback){
    var DATA = [null,null];
    function allDone(today, next, callback, locName){
        if(!today && !next){
            callback();
            return;
        }

        if(today)DATA[0] = today;
        if(next)DATA[1] = next;

        if(DATA[0] && DATA[1]){
            callback(DATA[0], DATA[1], locName);
        }
    }
    if(res.status == 200){
        var data = JSON.parse(res.response);

        // skip if the returned location represents a bigger area (such a: country or administrative area)
        //  see https://github.com/foursquare/twofishes/blob/master/interface/src/main/thrift/geocoder.thrift
        //  for a full list of woeTypes
        if (data &&
            data.interpretations &&
            data.interpretations.length &&
            data.interpretations[0].feature &&
            data.interpretations[0].feature.woeType in [0, 8, 9, 10, 12]){
          return [];
        }

        var locName= null;
        var coord= null;
        if (data &&
            data.interpretations &&
            data.interpretations.length &&
            data.interpretations[0].feature &&
            data.interpretations[0].feature.geometry &&
            data.interpretations[0].feature.geometry.center) {
            coord= {"lat": data.interpretations[0].feature.geometry.center.lat,
                    "lon": data.interpretations[0].feature.geometry.center.lng};
            locName= data.interpretations[0].feature.name;
        } else {
            callback();
            return;
        }

        // get weather for the current day
        // http://api.openweathermap.org/data/2.5/weather?q=M%C3%BCnchen&lang=de&units=metric&cnt=1&mode=json
        var URL= WEATHER_URL_CURR_DAY
          + '&lat=' + encodeURIComponent(coord.lat)
          + '&lon=' + encodeURIComponent(coord.lon)
          + '&lang=' + encodeURIComponent(CliqzUtils.currLocale);

        CliqzUtils._weatherReq = CliqzUtils.httpGet(URL, function(res){ allDone(res, null, callback, locName); });

        // get weather for the current day
        // http://api.openweathermap.org/data/2.5/weather?q=M%C3%BCnchen&lang=de&units=metric&cnt=1&mode=json
        URL= WEATHER_URL_3DAYS_FORECAST
          + '&lat=' + encodeURIComponent(coord.lat)
          + '&lon=' + encodeURIComponent(coord.lon)
          + '&lang=' + encodeURIComponent(CliqzUtils.currLocale);

        //TODO: fix this, using Promises
        CliqzUtils._weatherReqNext = CliqzUtils.httpGet(URL,  function(res){ allDone(null, res, callback, locName); });
    }
}

var WEATHER_URL_3DAYS_FORECAST = 'http://api.openweathermap.org/data/2.5/forecast/daily?units=metric&type=accurate&cnt=3&mode=json',
    WEATHER_URL_CURR_DAY       = 'http://api.openweathermap.org/data/2.5/weather?units=metric&type=accurate&cnt=1&mode=json',
    WEATHER_GEOLOC_URL         = 'http://weather-search.fbt.co:8081/?autocomplete=true&maxInterpretations=1',
    TRIGGER                    = /(\W|^)(wetter|weather|meteo|m\u00E9t\u00e9o|temps)(\W|^|$)/gi;

var CliqzWeather = {
    get: function(q, callback){
        var originalQ = q;
        q = q.replace(TRIGGER, "")

        var GEOLOC_API = WEATHER_GEOLOC_URL
                        + '&query=' + encodeURIComponent(q)
                        + '&lang=' + encodeURIComponent(CliqzUtils.currLocale);

        CliqzUtils.httpHandler('GET', GEOLOC_API, function(res){
            geocodeCallback(res, function(today, next, locName){
                callback(CliqzWeather.parse(today, next, q, locName), originalQ)
            });

        });
    },
    parse: function(today, next, q, locName){
        //var WEATHER_ICON_BASE_URL= "http://openweathermap.org/img/w/";
        var WEATHER_ICON_BASE_URL= "chrome://cliqzres/content/skin/weather/";

        var old_q = q.replace(TRIGGER, "");
        if(q == old_q){ // be sure this is not a delayed result
            if(!today || !next) return [];

            var response = [],
                DEGREE = "\u00B0";

            if(this.startTime)
                CliqzTimings.add("search_weather", ((new Date()).getTime() - this.startTime));

            var todayData = JSON.parse(today.response),
                nextDaysData = JSON.parse(next.response);


            var days = nextDaysData.list,
                today = new Date(),
                tomorrow = new Date(today.getTime() + 24*60*60*1000),
                aTomorrow = new Date(tomorrow.getTime() + 24*60*60*1000);

            return [
                Result.generic(
                    Result.CLIQZW,
                    "",
                    null,
                    locName,
                    "",
                    null,
                    {
                        city: locName,
                        todayTemp: Math.round(todayData.main.temp) + DEGREE,
                        todayMin: Math.round(todayData.main.temp_min) + DEGREE,
                        todayMax: Math.round(todayData.main.temp_max) + DEGREE,
                        todayDate: cap(today.toLocaleDateString(CliqzUtils.currLocale, {weekday: "long", month: "long", day: "numeric"})),
                        todayIcon: WEATHER_ICON_BASE_URL + todayData.weather[0].icon + ".png",
                        tomorrowDay: cap(tomorrow.toLocaleDateString(CliqzUtils.currLocale, {weekday: "long"})),
                        tomorrowDate: cap(tomorrow.toLocaleDateString(CliqzUtils.currLocale, {month: "long", day: "numeric"})),
                        tomorrowMin: Math.round(days[1].temp.min) + DEGREE,
                        tomorrowMax: Math.round(days[1].temp.max) + DEGREE,
                        tomorrowDesc: days[1].weather[0].description,
                        tomorrowIcon: WEATHER_ICON_BASE_URL + days[1].weather[0].icon + ".png",
                        aTomorrowDay: cap(aTomorrow.toLocaleDateString(CliqzUtils.currLocale, {weekday: "long"})),
                        aTomorrowDate: cap(aTomorrow.toLocaleDateString(CliqzUtils.currLocale, {month: "long", day: "numeric"})),
                        aTomorrowMin: Math.round(days[2].temp.min) + DEGREE,
                        aTomorrowMax: Math.round(days[2].temp.max) + DEGREE,
                        aTomorrowDesc: days[2].weather[0].description,
                        aTomorrowIcon: WEATHER_ICON_BASE_URL + days[2].weather[0].icon + ".png",
                    }
                )
            ];

            CliqzUtils.log(JSON.stringify(this.cliqzWeather), 'WEATHER');
        }

        return [];
    },
    isWeatherSearch: function(q){
        return TRIGGER.test(q);
    },
    test: function(){
        //Cu.import('chrome://cliqzmodules/content/CliqzWeather.jsm'); CliqzWeather.test();
        var data = {
            'wetter munich':true,
            'munich wetter':true,
            'wetter munich wetter':true,
            'munich wetter munich':true,
            'wetter munich germany':true,
            'germany wetter munich':true,
            'germany wetterr munich':false,
            'germany bwetter':false,
            'wwetter  munich':false,
        }, lg = function(txt){ CliqzUtils.log(txt, 'weather test'); }

        for(var k in data){
            lg('');
            lg('q='+k);
            lg('test '+ TRIGGER.test(k));
            lg('clean -'+ k.replace(TRIGGER,'') + '-');
        }

    }
}
