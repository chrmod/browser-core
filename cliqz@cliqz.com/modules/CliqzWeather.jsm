'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Cu.import('chrome://cliqzmodules/content/Result.jsm?v=0.4.14');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm?v=0.4.14');

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

var CliqzWeather = {
	parse: function(req, q, locName){
		//var WEATHER_ICON_BASE_URL= "http://openweathermap.org/img/w/";
        var WEATHER_ICON_BASE_URL= "chrome://cliqzres/content/skin/weather/";

        var old_q = q.replace(/^(wetter|weather|meteo|temps) /gi, "");
        if(q == old_q){ // be sure this is not a delayed result
            var response = [],
                DEGREE = "\u00B0";

            if(this.startTime)
                CliqzTimings.add("search_weather", ((new Date()).getTime() - this.startTime));

            if(req.status == 200){
                response = JSON.parse(req.response);


                var days = response.list,
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
                            todayTemp: 11,//Math.round(getTempByDayhour(days[0].temp, today.getHours())) + DEGREE,
                            todayMin: Math.round(days[0].temp.min) + DEGREE,
                            todayMax: Math.round(days[0].temp.max) + DEGREE,
                            todayDate: today.getDayOfWeekName() + " " + today.getDate() + ". " + today.getMonthName(),
                            todayIcon: WEATHER_ICON_BASE_URL + days[0].weather[0].icon + ".png",
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
