CLIQZ.UI.VIEWS["local-data-sc"] = {
  enhanceResults: function(data) {

    function parseTime(timeStr) {  // e.g. timeStr: 10.30
      var time = timeStr.split(".");
      return {
        hours: parseInt(time[0]) || 0,
        minutes: parseInt(time[1]) || 0
      };
    }

    function twoDigit(num) {
      return [
        num < 10 ? "0" : "",
        num
      ].join("");
    }

    var isBigSnippet = Boolean(data.phonenumber || data.address || data.opening_hours || data.no_location),
        rating_img = null,
        t = new Date(),
        current_t = [
          twoDigit(t.getHours()),
          twoDigit(t.getMinutes())
        ].join("."),
        open_stt, timeInfos = [],
        openingColors =  {
          open: "#74d463",
          closed: "#E92207",
          open_soon: "#FFC802",
          close_soon: "#FFC802"
        };

    data.phone_address = data.phonenumber || data.address;

    if (data.opening_hours) {

      data.opening_hours.forEach(function (el) {
        if (!el.open || !el.close) { return; }
        timeInfos.push(el.open.time + " - " + el.close.time);
        if(open_stt && open_stt !== "closed") { return; }


        var openTime  = parseTime(el.open.time),
        closeTime = parseTime(el.close.time),
        closesNextDay = el.close.day !== el.open.day,
        /** Difference in minutes from opening/closing times to current time **/
        minutesFrom = {
          opening:  60 * (t.getHours() - openTime.hours) + (t.getMinutes() - openTime.minutes),
          /* If it closes the next day, we need to subtract 24 hours from the hour difference */
          closing: 60 * (t.getHours() - closeTime.hours - ( closesNextDay ? 24 : 0) ) + (t.getMinutes() - closeTime.minutes)
        };

        if (minutesFrom.opening > 0 && minutesFrom.closing < 0) {
          open_stt = "open";
          if (minutesFrom.closing > -60){
            open_stt =  "close_soon";
          }
        } else {
          open_stt = "closed";
          if (minutesFrom.opening > -60 && minutesFrom.opening < 0) {
            open_stt = "open_soon";
          }
        }
      });


      data.opening_status = {
        color: openingColors[open_stt],
        stt_text: open_stt && CliqzUtils.getLocalizedString(open_stt),
        time_info_til: CliqzUtils.getLocalizedString("open_hour"),
        time_info_str: timeInfos.join(", ")
      };
    }

    if (!data.rating) { data.rating = 0; }

    rating_img = "http://cdn.cliqz.com/extension/EZ/richresult/stars" + Math.max(0, Math.min(Math.round(data.rating), 5)) + ".svg";

    if (!isBigSnippet) {
      data.richData = {
        image: data.image,
        url_ratingimg: rating_img,
        name: data.t,
        des: data.desc
      };
    } else {
      data.url_ratingimg = rating_img;
    }


    data.big_rs_size = isBigSnippet;

    data.distance = CLIQZEnvironment.distance(
                        data.lon,
                        data.lat,
                      CLIQZEnvironment.USER_LNG,
                      CLIQZEnvironment.USER_LAT)*1000;
  }
}







CLIQZ.UI.VIEWS["local-cinema-sc"] = {

  enhanceMovieSC: function (data) {

    var rating = data.ratingStars.rating ? Math.round(data.ratingStars.rating) : 0,
        ratingCss = {
          true: 'on',
          false: 'off'
        };
    data.stars = Array.apply(null,Array(5)).map(function(_, i) {
      return {
        star_class: "cqz-rating-star-" + ratingCss[i<rating]
      };
    });


    //distance

    //
    //


    for(var i in data.cinemas) {
      data.cinemas[i].cinema.distance = CLIQZEnvironment.distance(
                        data.cinemas[i].cinema.lon,
                        data.cinemas[i].cinema.lat,
                      CLIQZEnvironment.USER_LNG,
                      CLIQZEnvironment.USER_LAT)*1000;
    }
    //Logger.log(data.cinemas,"DATAAAAAAA");

    if (data.emptyColumns) {
      data.emptyColumns.map(function(x, _) {
        x.num_empty_columns = data.table_size - x.showtimes.length;
      });
    }
  },

  enhanceResults: function(data) {
    data.cinema.distance = CLIQZEnvironment.distance(
                        data.cinema.lon,
                        data.cinema.lat,
                      CLIQZEnvironment.USER_LNG,
                      CLIQZEnvironment.USER_LAT)*1000;
    data.ratingStars = data.cinema;
    data.emptyColumns = data.movies;
    CLIQZ.UI.VIEWS["local-cinema-sc"].enhanceMovieSC(data);
  }





}


CLIQZ.UI.VIEWS["local-movie-sc"] = {

  enhanceMovieSC: CLIQZ.UI.VIEWS["local-cinema-sc"].enhanceMovieSC,

  enhanceResults: function(data) {
    data.ratingStars = data.movie;
    data.emptyColumns = data.cinemas;
    this.enhanceMovieSC(data);
  }
}




CLIQZ.UI.VIEWS["stocks"] = {

  enhanceResults: function(data) {
    var myTime = new Date(data.message.last_update * 1000);
      data.message.time_string = myTime.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  }
}


CLIQZ.UI.VIEWS["_generic"]
= CLIQZ.UI.VIEWS["entity-generic"]
= CLIQZ.UI.VIEWS["hq"] = {

  enhanceResults: function(data) {

    for(var i in data.external_links) {
      data.external_links[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.external_links[i].url));
    }

    if( data.richData && data.richData.additional_sources) {
      for(var i in data.richData.additional_sources) {
        data.richData.additional_sources[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.richData.additional_sources[i].url));
      }
    }

    for(var i in data.news) {
      data.news[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.news[i].url));
    }

    if(data.actions && data.external_links) {
      data.actionsExternalMixed = data.actions.concat(data.external_links);
      data.actionsExternalMixed.sort(function(a,b) {
        if (a.rank < b.rank) {return 1;}
        if (a.rank > b.rank) {return -1;}
        return 0;
      });
    }

  }
}


CLIQZ.UI.VIEWS["weatherEZ"] = {
  enhanceResults: function(data) {
    if (data.forecast_url) {
      data.btns = [
        {
          'title_key': 'extended_forecast',
          'url': data.forecast_url
        }
      ];
    }
  }
}


CLIQZ.UI.VIEWS["weatherAlert"] = CLIQZ.UI.VIEWS["weatherEZ"];

// currency converter code


CLIQZ.UI.VIEWS["currency"] = {

  enhanceResults: function(data) {
      console.log(data);
  }
}
