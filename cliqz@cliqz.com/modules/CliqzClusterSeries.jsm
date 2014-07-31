'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzClusterSeries'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.14');

var CliqzClusterSeries = {
  collapse: function(urls, cliqzResults, q) {
    //var regexs = [/(.*s[ae][ai]?[sz]on[-\/_ ])(\d{1,2})([-\/_ ]episode[-\/_ ])(\d{1,2})(.*)/,
    //              /(.*s[ae][ai]?[sz]on[-\/_ ])(\d{1,2})([-\/_ ])(\d{1,2})(.*)/,
    //              /(.*s[ae][ai]?[sz]on[-\/_ ])(\d{1,2})(.?\/)(\d{1,2})(.*)/,
    //              /(.*s)(\d{1,2})(_?ep?)(\d{1,2})(.*)/,
    //              /(.*[-_\/])(\d{1,2})(x)(\d{1,2})([-_\.].*)/];

    // FIXME: this regex is duplicated in CliqzClusterSeries.jsm in check_if_series
    var regexs = [/[-\/_]s(\d+)[-\/_ ]?e(\d+)[\/-_\.$]*/, /[-\/_ ]season[-\/_ ](\d+)[-\/_ ]episode[-\/_ ](\d+)[\/-_\.$]*/];


    var domains = {};

    for(let i=0; i<urls.length;i++) {
        var url = urls[i]['value'];
        var title = urls[i]['comment'];

        url = CliqzUtils.cleanMozillaActions(url);
        var [domain, path] = CliqzUtils.splitURL(url);
        var real_domain = url.substring(0, url.indexOf(domain) + domain.length)

        var vpath = path.toLowerCase().split('/');
        // remove last element if '', that means that path ended with /
        // also remove first element if '',
        if (vpath[vpath.length-1]=='') vpath=vpath.slice(0,vpath.length-1);
        if (vpath[0]=='') vpath=vpath.slice(1,vpath.length);

        for (let r = 0; r < regexs.length; r++) {
            var d = path.match(regexs[r]);
            if (d) {
                if (domains[domain]==null) domains[domain]=[];
                domains[domain].push([title, url, 'type' + r, parseInt(d[2]), parseInt(d[4]), d]);
                break;
            }
        }
    }

    var maxDomain = null;
    var maxDomainLen = -1;
    Object.keys(domains).forEach(function (key) {
        if (domains[key].length > maxDomainLen) {
            maxDomainLen=domains[key].length;
            maxDomain=key;
        }
    });

    if (maxDomain!=null && maxDomainLen>4) {
        // at least 5
        log('The watching series detection has triggered!!! ' + maxDomain + ' ' + JSON.stringify(domains[maxDomain]));
        log(JSON.stringify(domains), 'DOMAINS');

        /* Find the last URL in the series. */
        var last_item = domains[maxDomain][0];
        var last_s = 0;
        var last_ep = 0;
        for (let i = 0; i < domains[maxDomain].length; i++) {
            if (domains[maxDomain][i][3] > last_s) {
                last_s = domains[maxDomain][i][3];
                last_ep = domains[maxDomain][i][4];
                last_item = domains[maxDomain][i]
            } else if (domains[maxDomain][i][3] == last_s) {
                if (domains[maxDomain][i][4] > last_ep) {
                    last_ep = domains[maxDomain][i][4];
                    last_item = domains[maxDomain][i]
                }
            }
            log(last_s + ' ' + last_ep, 'last_show')
        }
        var last_title = last_item[0];
        var last_url = last_item[1];
        if(!CliqzClusterSeries.isStreaming(last_url, last_title)) return;

        log('Guessing next episode');
        log(last_url);

        var hisotryTitles = urls.map(function(r){ return r.comment; }),
            cliqzTitles = cliqzResults.map(function(r){
            if(r.snippet)return r.snippet.title;
        });
        var label = CliqzClusterSeries.guess_series_name(last_title, hisotryTitles, cliqzTitles, q);
        var template = {
            summary: 'Your ' + CliqzUtils.getDetailsFromUrl(real_domain).host,
            url: real_domain,
            control: [
            ],
            topics: [
                {
                    label: label,
                    urls: [
                        {
                            href: last_url,
                            path: '',
                            title: titleCleaner(last_title),
                            color: 'gray'
                        }
                    ],
                    color: 'darkgreen',
                    iconCls: 'cliqz-fa fa-video-camera'
                },
            ],
        }

        CliqzClusterSeries.guess_next_url(last_url, function(error, data){
            if(error || !data.next)return;

            if (data.title) {
                template.topics[0].urls.push(
                    {
                        href: data.next,
                        path: '',
                        title: titleCleaner(data.title),
                        color: 'blue',
                        cls: 'cliqz-cluster-topic-guessed'
                    }
                );
            }

            var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                            .getService(Components.interfaces.nsIWindowMediator),
            win = wm.getMostRecentWindow("navigator:browser");
            log('Redraw' + JSON.stringify(template));
            win.CLIQZ.UI.redrawResult(
              '[type="cliqz-cluster"]',
              'clustering',
              {
                data: template,
                // make a helper for computin the width
                width: win.CLIQZ.Core.urlbar.clientWidth - 100
              }
            );
            return
        })
        return template;
    }
    return;
  },
  isStreaming: function(url, title){
    // should return false if it is not a streaming site
    return true;
  },
  guess_next_url: guess_next_url,
  guess_series_name: guess_series_name,
  test: function(){
    var testData = [
      ['http://hhhoo.com/hhh', false],
      ['https://www.ovguide.com/tv_episode/game-of-thrones-season-4-episode-9-the-watchers-on-the-wall-4801609', true],
      ['http://4zon.com/game-of-thrones-season-4-episode-8/', true],
      ['http://4zon.com/game-of-thrones-season-4-episode-8/', true],
      ['http://www.veziserialeonline.info/game-of-thrones-/season/4/episode/1', true],
      ['http://filmozderi.com/game-of-thrones-season-4/episode-3-breaker-of-chains-movie_0bdc00321.html#.U9EdU4CSxQY', true],
      ['http://www.tvids.me/watch104/game-of-thrones/season-02-episode-04-garden-of-bones', true],
      ['http://www.zzstream.li/2012/04/game-of-thrones-season-2-episode-4-garden-of-bones.html', true],
      ['http://serieall.fr/episode/game-of-thrones/s04e09', true],
      ['http://serieall.fr/episode/game-of-thrones/s03e10', true],
      ['http://serieall.fr/episode/game-of-thrones/s04e10', false],
      ['http://putlockertvshows.me/watch/game-of-thrones/s04e10.html', false],
      ['http://www.movie1k.ag/watch-107997-game-of-thrones-season-4-episode-8/', false],
      ['http://screenrant.com/game-of-thrones-season-4-episode-8-the-mountain-and-the-viper-review/', false],
      ['http://videobull.to/game-of-thrones-season-3-episode-9/', true],
      ['http://www.sk-gaming.com/content/1600796-s4e8_watch_game_of_thrones_season_4_episode_8_online_free_yo', false],
      ['http://www.ovguide.com/tv_episode/game-of-thrones-season-4-episode-9-the-watchers-on-the-wall-4801609', false],
      ['http://watchseries.lt/episode/big_bang_theory_s7_e21.html', true],
    ], i=0;

    testData.forEach(function(el){
      CliqzUtils.setTimeout(
        function(){
          guess_next_url(el[0], function(error, data){
            log('');
            log('Expecting ' + el[1] + ' for ' + el[0]);
            if((el[1] && (error || !data.next)) ||
              (!el[0] && !error && data.next)){
              //unexpected result
              log('ERROR:');
            } else {
              log('VALID:');
            }
            log('error: ' + JSON.stringify(error) + ' data: ' + JSON.stringify(data));
          });
        }
        , i+=2000);
    });
  }
};


function titleCleaner(title){
  return title.replace(/(watch|online|free|stream)/ig,'').trim();
}

function get(url, callback, onerror){
    var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
    req.open('GET', url, true);
    req.timeout = 5000;
    req.onload = function(){
      if(req.status < 200 || req.status >= 300){
        onerror();
      } else callback(req);
    }
    req.onerror = function(){ onerror() };
    req.ontimeout = function(){ onerror() };
    req.send();
}

function log(msg){
  CliqzUtils.log(msg, 'Series Guessing');
}

var check_if_series = function(source_url) {

  var regexs = [/[-\/_]s(\d+)[-\/_ ]?e(\d+)[\/-_\.$]*/, /[-\/_ ]season[-\/_ ](\d+)[-\/_ ]episode[-\/_ ](\d+)[\/-_\.$]*/];

  log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

  for(var i=0;i<regexs.length;i++) {
    var d = source_url.match(regexs[i]);
    if (d) {
      return [d[0], d[1], d[2]];
    }
  }
  return false;
}

var guessCache = Array(10),
    guessCachePos = 0;

function guess_next_url(source_url, origCallback) {
  for(var i=0; i<guessCache.length; i++){
    if(guessCache[i] && guessCache[i].url == source_url){
      if(guessCache[i].status == 'DONE'){
        origCallback(null, guessCache[i].data);
      }
      return
    }
  }
  guessCache[(++guessCachePos)%10] = { url: source_url, status:'STARTED'};
  var cachePos = guessCachePos;
  var callback = function(error, data){
    if(!error && data.title){
      guessCache[cachePos].data = data;
      guessCache[cachePos].status = 'DONE';
    }
    origCallback(error, data);
  }

  var result = {};

  var get_title = function(body) {
    try {
      var start = body.indexOf("<title>")
      if (start>0) {
        var end = body.indexOf("<\/title>",start);
        if ((end>0) && (end>start)) {
          var title = body.substring(start+7,end);
          return title;
        }
      }
    }
    catch(err){}

    return null;
  }

  var guess_next_number = function(str) {

    var trailing_zeros = false
    if (str[0]=='0') trailing_zeros = true;

    var new_str = '' + (parseInt(str)+1);

    if (!trailing_zeros) return new_str;
    else {
      if (new_str.length>=str.length) return new_str;
      else {
        var padding = '';
        for(var i=0;i<(str.length-new_str.length);i++) padding=padding+'0';
        return padding + new_str;
      }
    }
  }

  var guess_first_episode = function(str) {
    if (str[0]=='0') {
      var padding = '';
      for(var i=0;i<episode_data[1].length-1;i++) padding=padding+'0';
      var first_episode = padding + '1';
    }
    else {
      var first_episode = '1';
    }

    return first_episode;
  }


  var guess_candidates = function(source_url, episode_data) {

    var ipath = source_url.indexOf('/',10);
    if (ipath<0) return null;

    var path = source_url.substring(ipath);

    var res = {};

    // the season (really, it's the first one, depends on the regex)
    var next_season = guess_next_number(episode_data[1]);
    var first_episode = guess_first_episode(episode_data[1]);

    var v = episode_data[0].split(episode_data[1]);
    if (v.length==2) {
      // old episode and season are not the same, easy case
      res['min_season'] = v[0] + next_season + v[1].replace(episode_data[2], first_episode);
    }
    else {
      // old episode and seeason are the same, in this case maintain the episode since we increment the season
      res['min_season'] = v[0] + next_season + v[1] + first_episode + v[2];
    }

    var next_episode = guess_next_number(episode_data[2]);
    v = episode_data[0].split(episode_data[2]);
    if (v.length==2) {
      // old episode and season are not the same, easy case
      res['min_episode'] = v[0] + next_episode + v[1];
    }
    else {
      // old episode and seeason are the same, in this case maintain the episode since we increment the season
      res['min_episode'] = v[0] + episode_data[1] + v[1] + next_episode + v[2];
    }

    var until_min_pos = path.indexOf(episode_data[0]);
    var until_min = path.substring(0,until_min_pos);

    res['partial_episode'] = until_min + res['min_episode'];
    res['partial_season'] = until_min + res['min_season'];

    res['path_episode'] = path.replace(episode_data[0], res['min_episode']);
    res['path_season'] = path.replace(episode_data[0], res['min_season']);

    //log('path', path, res['partial_episode'], res['partial_season']);
    return res;
  }

  var get_before_path = function(url) {
    var end = url.indexOf('/',10);
    return url.substring(0,end);
  }

  var is_soft_404 = function(body) {
    if (body.match(/not found/i) || (body.match(/not be found/i))) return true;
    var title = get_title(body);
    if (title && ((title.match(/404/i) || title.match(/error/i) || title.match(/invalid/i) || title.match(/redirect/i)))) return true;

    return false;
  }


  var is_soft_404_for_size = function(size_body1, size_body2) {

    var ratio = 0.0;
    if (size_body1 > size_body2) ratio = size_body2 / (size_body1 + 0.0);
    else ratio = size_body1 / (size_body2 + 0.0);

    // if the difference is less than 66% assume that it has been redirected to some odd place
    if (ratio > 0.666) return false;
    else return true;

  }

  var end_first_stage = function(end_first_stage_callback) {

    var is_not_found = true;
    var next_url = null;
    var next_url_type = null;
    var old_title = null;
    var old_body_size = null;

    for(var i=0;i<num_attemps;i++) {
      if (results[i]['type']=='found') {
        is_not_found=false;
        old_title = results[i]['title'];
        old_body_size = results[i]['body_size'];

        if (results[i]['next']!=null) {
          if (next_url==null) {
            next_url = results[i]['next'];
            next_url_type = results[i]['next_type'];
          }
          else {
            if (results[i]['next_type']=='episode' && next_url_type=='season') {
              next_url = results[i]['next'];
              next_url_type = results[i]['next_type'];
            }
          }
        }
      }
      //log(">>", i, results[i]['type'], results[i]['next']);
    }


    // now, let's validate that the next episode actually exists
    if (next_url!=null) {
      get(next_url,
        function(req){
          if(!is_soft_404(req.response)){
            var title = get_title(req.response);
            var res = {'not-found': is_not_found, 'next': next_url, 'title': title};
            end_first_stage_callback(res);
          } else {
            var res = {'not-found': is_not_found, 'next': null, 'title': null};
            end_first_stage_callback(res);
          }
        },
        function(){
          // the next_url seems to be a 404. We must give up at this point. Do not try anything else,
          // we could find the next_url but failed to fetch the content
          var res = {'not-found': is_not_found, 'next': null, 'title': null};
          end_first_stage_callback(res);
        });
    }
    else {
      // could not guess the next_url on the first methodology (from the source_page),
      // let's try guessing.
      try_guessing(source_url, candidates, old_title, old_body_size, end_first_stage_callback);
    }
  }

  var try_guessing = function(source_url, candidates, source_title, source_body_size, end_first_stage_callback) {

    var all_received = function(results, end_first_stage_callback) {
      var position_found = null;

      for(var i=0;i<cand_url.length;i++) {
        if (results[i]!=null) {
            position_found=i;
            break;
        }
      }

      if (position_found!=null) {
        var res = {'not-found': false, 'next': results[position_found]['next'], 'title': results[position_found]['title']};
        end_first_stage_callback(res);
      }
      else {
        var res = {'not-found': false, 'next': null, 'title': null};
        end_first_stage_callback(res);
      }
    }


    // let's guess all combinations
    var cand_url = [];
    cand_url.push(get_before_path(source_url) + candidates['path_episode']);
    if (candidates['path_episode']!=candidates['partial_episode']) {
      cand_url.push(get_before_path(source_url) + candidates['partial_episode']);
    }
    cand_url.push(get_before_path(source_url) + candidates['path_season']);
    if (candidates['path_season']!=candidates['partial_season']) {
      cand_url.push(get_before_path(source_url) + candidates['partial_season']);
    }

    // order matters, the first to be true is the one that we will take

    var results = []
    var results_received = cand_url.length;

    for(var i=0;i<cand_url.length;i++) {
      (function(user_data_i, href){
        get(href,
          function(req){
            var title = get_title(req.response);
            var found = true;
            var position = parseInt(user_data_i);

            if ((is_soft_404(req.response)) || req.channel.URI.path=='/') {
              found = false;
            }
            else {
              // must validate that the source_title and new_title have changed
              if (title==source_title) found = false;

              // must validate that the cand_url bit is part of the url, avoid jumpy redirects
              // outside /
              if (req.channel.URI.spec.indexOf(cand_url[position])<0) {
                found = false;
              }
            }

            if (found) results[position] = {'next': req.channel.URI.spec, 'title': title, 'source': cand_url[position]};
            else result[position] = null;


            results_received--;
            if (results_received<=0) all_received(results, end_first_stage_callback);
          },
          function(){
            results_received--;
            if (results_received<=0) all_received(results, end_first_stage_callback);
          }
        );
      })(i, cand_url[i]);
    }
  }



  try {

    var episode_data = check_if_series(source_url);
    if (!episode_data) callback('not-a-valid-pattern', {'title':null, 'next':null});
    else {
      var candidates = guess_candidates(source_url, episode_data);
      var results = [];
      var num_attemps = 5;

      for(var i=0;i<num_attemps;i++) {
        get(source_url,
            function(req){
              if(is_soft_404(req.response)){
                results.push({'type': 'not-found', 'next': null, 'title': null, 'body_size': 0});
              } else {
                try {
                  // FIXME:
                  // this is somewhat of a hack, it's very slow and it can fail
                  // reason: URL from file are downcased, and URL path is case sensitive on the RFC spec.
                  // If we don't normalize all to lowercase we miss cases in which the internal links have upcases since
                  // indexOf is not case-insensitive.
                  candidates['partial_episode'] = candidates['partial_episode'].toLowerCase();
                  candidates['path_episode'] = candidates['path_episode'].toLowerCase();
                  var body = req.response.toLowerCase();
                  // ----

                  //log('>>>', candidates['partial_episode'], candidates['path_episode']);
                  var ind = -1;
                  if ((ind = body.indexOf(candidates['partial_episode']))>0) {
                    var end1 = body.indexOf('"',ind);
                    var end2 = body.indexOf("'",ind);
                    var end = (end1<end2) ? end1 : end2;
                    var next_url = body.substring(ind,end);
                    next_url = get_before_path(source_url) + next_url;
                    results.push({'type': 'found', 'next': next_url, 'next_type': 'episode', 'title': get_title(body), 'body_size': body.length});
                  }
                  else {
                    if ((ind = body.indexOf(candidates['partial_season']))>0) {
                      var end1 = body.indexOf('"',ind);
                      var end2 = body.indexOf("'",ind);
                      var end = (end1<end2) ? end1 : end2;
                      var next_url = body.substring(ind,end);
                      next_url = get_before_path(source_url) + next_url;
                      results.push({'type': 'found', 'next': next_url, 'next_type': 'season', 'title': get_title(body), 'body_size': body.length});
                    }
                    else {
                      // not found next on body
                      results.push({'type': 'found', 'next': null, 'title': get_title(body), 'body_size': body.length});
                    }
                  }
                }
                catch(err) {
                  log(JSON.stringify(err), 'Clustering Error:');
                  results.push({'type': 'error', 'next': null, 'title': null, 'body_size': 0})
                }
              }

              if (results.length==num_attemps) end_first_stage(function(res) {
                if (res['not-found']) callback('source-does-not-exist', {'title':null, 'next':null, 'body_size': O});
                else callback(null, {'next': res['next'], 'title': res['title']});
              });
            },
            function(){
              results.push({'type': 'not-found', 'next': null, 'title': null, 'body_size': 0});
              if (results.length==num_attemps) end_first_stage(function(res) {
                if (res['not-found']) callback('source-does-not-exist', {'title':null, 'next':null, 'body_size': O});
                else callback(null, {'next': res['next'], 'title': res['title']});
              });
            }
        );
      }
    }
  } catch(err) {
    log(JSON.stringify(err), 'Clustering Error:');
    callback('unprocessable-error-on-guess-next-url', {'title':null, 'next':null});
  }
}

function guess_series_name(source_title, other_history_titles, other_cliqz_titles, q) {
  log('Guessing Series name for');
  log(source_title);
  log(q);
  log(JSON.stringify(other_history_titles));
  log(JSON.stringify(other_cliqz_titles));

  // those will work for the regexp that we have now, if we extend to other languages
  // we should modify this too
  var v_stop_words = ['season', 'episode', 'watch', 'online', 'stream', 'player'];

  var sanitize = function(str) {
    var s = str.toLowerCase();
    return s.replace(/\W+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  var tokenize = function(str) {
    return str.split(' ');
  }

  var combinations = function(str) {

    var res = [];
    var v = tokenize(sanitize(str));


    for(var len=v.length;len>1;len--) {
      for(var i=0;i<=(v.length-len);i++) {
        res.push(v.slice(i,i+len).join(' '));
      }

    }
    return res;
  }

  var toTitleCase = function(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  }

  var sanitize_other_history_titles = [];
  for(var i=0;i<other_history_titles.length;i++) {
    sanitize_other_history_titles.push(sanitize(other_history_titles[i]));
  }

  var sanitize_q = sanitize(q);
  var v_sanitize_q = sanitize_q.split(' ');


  var combs = combinations(source_title);
  var scores = [];
  for(var i=0;i<combs.length;i++) scores[i]=0;

  // filter the stop words to remove those who are also part of the query, for the case where the name of the
  // series were a stopword, e.g. "last watch",

  var v_filtered_stop_words = [];
  var allok = true;
  for(var i=0;i<v_stop_words.length;i++) {
    allok = true;
    for(var j=0;j<v_sanitize_q.length;j++) {
        if ((v_sanitize_q[j].length>0) && (v_stop_words[i].indexOf(v_sanitize_q[j])>=0)) allok=false;
    }
    if (allok) v_filtered_stop_words.push(v_stop_words[i]);
  }

  var query_count = 0.0;

  for(var i=0;i<combs.length;i++) {

    query_count = 0.0;

    for(var j=0;j<v_sanitize_q.length;j++) {
        if ((v_sanitize_q[j].length>0) && (combs[i].indexOf(v_sanitize_q[j])>=0)) query_count+=1.0;
    }

    for(var j=0;j<v_filtered_stop_words.length;j++) {
        if (combs[i].indexOf(v_filtered_stop_words[j])>=0) query_count=0.0;
    }

    if ((query_count/(v_sanitize_q.length+0.0)) > 0.5) {
      for(var j=0;j<sanitize_other_history_titles.length;j++) {
        if (sanitize_other_history_titles[j].indexOf(combs[i])>=0) {
          scores[i]++;
        }
      }
    }
  }

  var max = -1;
  var maxi = -1;
  for(var i=0;i<combs.length;i++) {
    scores[i] = scores[i] * combs[i].split(' ').length;
    if (scores[i]>max) {
      maxi = i;
      max = scores[i];
    }
  }

  if (maxi>=0){
    log('res - ' + combs[maxi]);
    return toTitleCase(combs[maxi]);
  }
  return null;

}