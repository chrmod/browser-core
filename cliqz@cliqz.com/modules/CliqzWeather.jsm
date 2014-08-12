'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Cu.import('chrome://cliqzmodules/content/Result.jsm?v=0.5.07');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.07');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm?v=0.5.07');

XPCOMUtils.defineLazyModuleGetter(this, 'Promise',
  'chrome://cliqzmodules/content/extern/Promise.jsm');

var EXPORTED_SYMBOLS = ['CliqzWeather'];

Date.locale = {
    en: {
       month_names: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
       dow_names:   ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    },
    de: {
       month_names: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
       dow_names:   ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
    },
    it: {
       month_names: ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"],
       dow_names:   ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"]
    },
    fr: {
       month_names: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
       dow_names:   ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]
    }
};

Date.prototype.getMonthName = function() {
    return Date.locale[determineUserLang()].month_names[this.getMonth()];
};

Date.prototype.getDayOfWeekName = function() {
    return Date.locale[determineUserLang()].dow_names[this.getDay()];
};


function determineUserLang(){
    var locales = CliqzLanguage.state();
    var len = locales.length;
    for(var i=0; i<len; i++){
        if(locales[i] in Date.locale){
          return locales[i];
        }
    }
    return "de";
};

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
        }
        // get weather for the current day
        // http://api.openweathermap.org/data/2.5/weather?q=M%C3%BCnchen&lang=de&units=metric&cnt=1&mode=json
        CliqzUtils._weatherReq && CliqzUtils._weatherReq.abort();
        var URL= WEATHER_URL_CURR_DAY
          + '&lat=' + coord.lat
          + '&lon=' + coord.lon
          + '&lang=' + determineUserLang();

        CliqzUtils._weatherReq = CliqzUtils.httpGet(URL, function(res){ allDone(res, null, callback, locName); });

        // get weather for the current day
        // http://api.openweathermap.org/data/2.5/weather?q=M%C3%BCnchen&lang=de&units=metric&cnt=1&mode=json
        CliqzUtils._weatherReqNext && CliqzUtils._weatherReqNext.abort();
        URL= WEATHER_URL_3DAYS_FORECAST
          + '&lat=' + coord.lat
          + '&lon=' + coord.lon
          + '&lang=' + determineUserLang();

        //TODO: fix this, using Promises
        CliqzUtils._weatherReqNext = CliqzUtils.httpGet(URL,  function(res){ allDone(null, res, callback, locName); });
    }
}

var WEATHER_URL_3DAYS_FORECAST = 'http://api.openweathermap.org/data/2.5/forecast/daily?units=metric&type=accurate&cnt=3&mode=json',
    WEATHER_URL_CURR_DAY       = 'http://api.openweathermap.org/data/2.5/weather?units=metric&type=accurate&cnt=1&mode=json',
    WEATHER_GEOLOC_URL         = 'http://weather-search.fbt.co:8081/?autocomplete=true&maxInterpretations=1';

var CliqzWeather = {
    get: function(q, callback){
        var originalQ = q;
        q = q.replace(/^(wetter|weather|meteo|temps) /gi, "")

        var GEOLOC_API = WEATHER_GEOLOC_URL
                        + '&query=' + encodeURIComponent(q)
                        + '&lang=' + determineUserLang();

        CliqzUtils.httpHandler('GET', GEOLOC_API, function(res){
            geocodeCallback(res, function(today, next, locName){
                callback(CliqzWeather.parse(today, next, q, locName), originalQ)
            });

        });
    },
    parse: function(today, next, q, locName){
        //var WEATHER_ICON_BASE_URL= "http://openweathermap.org/img/w/";
        var WEATHER_ICON_BASE_URL= "chrome://cliqzres/content/skin/weather/";

        var old_q = q.replace(/^(wetter|weather|meteo|temps) /gi, "");
        if(q == old_q){ // be sure this is not a delayed result
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
                        todayDate: today.getDayOfWeekName() + " " + today.getDate() + ". " + today.getMonthName(),
                        todayIcon: WEATHER_ICON_BASE_URL + todayData.weather[0].icon + ".png",
                        tomorrowDay: tomorrow.getDayOfWeekName(),
                        tomorrowDate: tomorrow.getDate()+ '. ' + tomorrow.getMonthName(),
                        tomorrowMin: Math.round(days[1].temp.min) + DEGREE,
                        tomorrowMax: Math.round(days[1].temp.max) + DEGREE,
                        tomorrowDesc: days[1].weather[0].description,
                        tomorrowIcon: WEATHER_ICON_BASE_URL + days[1].weather[0].icon + ".png",
                        aTomorrowDay: aTomorrow.getDayOfWeekName(),
                        aTomorrowDate: aTomorrow.getDate()+ '. ' + aTomorrow.getMonthName(),
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
        q = q.trim().toLowerCase();
        return q.indexOf("wetter ") == 0 ||
               q.indexOf("weather ") == 0 ||
               q.indexOf("meteo ") == 0 ||
               q.indexOf("temps ") == 0;
    }
}
