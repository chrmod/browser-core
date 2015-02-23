'use strict';
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

var EXPORTED_SYMBOLS = ['CliqzHistory'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

var DATA = {
    "171317248": 28,
    "42311681": 25,
    "77498370": 7,
    "217888772": 10,
    "238980097": 13,
    "70324236": 12,
    "214478866": 25,
    "178778135": 8,
    "143673372": 0,
    "69471268": 14,
    "74905638": 2,
    "41599028": 22,
    "244467766": 10,
    "206276680": 30,
    "13480631": 25,
    "241031245": 6,
    "136925262": 13,
    "101412944": 30,
    "80171090": 9,
    "176351323": 4,
    "77725789": 4,
    "243320926": 28,
    "210145381": 30,
    "243681383": 25,
    "77723754": 2,
    "177054055": 24,
    "47503472": 14,
    "81551720": 21,
    "79061110": 2,
    "173635703": 7,
    "48466040": 18,
    "134721659": 6,
    "75518079": 15,
    "250134663": 19,
    "205047831": 26,
    "50067599": 30,
    "148506773": 9,
    "242110616": 24,
    "79224516": 10,
    "7346339": 19,
    "168546473": 21,
    "235503788": 28,
    "74498223": 1,
    "44017850": 30,
    "82412576": 25,
    "247575243": 12,
    "11092165": 30,
    "69818566": 24,
    "76165319": 19,
    "182561484": 28,
    "248502474": 21,
    "34642295": 31,
    "71809228": 19,
    "79703758": 24,
    "1847512": 19,
    "170003492": 10,
    "144101595": 8,
    "238803166": 2,
    "108882143": 7,
    "101568745": 30,
    "970991": 7,
    "49961201": 20,
    "49643764": 10,
    "104696056": 7,
    "8880381": 30,
    "138879230": 19,
    "149207295": 0,
    "179192068": 28,
    "11043201": 4,
    "150522121": 12,
    "73740558": 29,
    "180371732": 22,
    "139907350": 23,
    "103446807": 23,
    "214090014": 1,
    "169689378": 0,
    "170742053": 18,
    "103502119": 8,
    "206369066": 12,
    "107979973": 29,
    "76998968": 28,
    "244238656": 28,
    "40802625": 7,
    "247095618": 15,
    "102928715": 26,
    "138432848": 24,
    "207642967": 10,
    "207305048": 6,
    "48435545": 24,
    "174902229": 29,
    "45085023": 2,
    "209539425": 20,
    "103901538": 10,
    "207642980": 10,
    "135332198": 9,
    "16053649": 22,
    "113570152": 8,
    "67178857": 25,
    "6248810": 24,
    "35490194": 6,
    "205889902": 0,
    "75131249": 23,
    "41521523": 26,
    "203923831": 10,
    "111946108": 26,
    "136995198": 28,
    "67953728": 10,
    "48687497": 8,
    "100788626": 8,
    "140059029": 2,
    "206100886": 25,
    "239584149": 28,
    "115532187": 16,
    "83009951": 25,
    "171950497": 7,
    "10230179": 8,
    "75137450": 21,
    "237703599": 14,
    "104698241": 28,
    "39362995": 13,
    "115315125": 3,
    "218102199": 7,
    "45441465": 24,
    "147313085": 30,
    "175022528": 1,
    "104264131": 30,
    "211816900": 15,
    "42670497": 2,
    "234959304": 12,
    "36542924": 21,
    "7184845": 1,
    "136296912": 7,
    "13351377": 12,
    "178108892": 7,
    "11952609": 9,
    "140126691": 18,
    "75270637": 26,
    "44231150": 10,
    "177717747": 7,
    "49717748": 0,
    "135365109": 26,
    "205433940": 24,
    "36325882": 11,
    "237699581": 14,
    "14484565": 19,
    "45791747": 12,
    "142584326": 6,
    "110848519": 12,
    "47202825": 10,
    "247133000": 21,
    "208640532": 4,
    "1155610": 7,
    "38576671": 21,
    "16386480": 29,
    "245858857": 9,
    "76274218": 1,
    "249494063": 24,
    "105906746": 21,
    "38286090": 30,
    "208546369": 22,
    "16032325": 23,
    "6154822": 21,
    "250796615": 3,
    "10449481": 26,
    "238295626": 15,
    "180337079": 26,
    "213234255": 0,
    "12632657": 12,
    "117226066": 32,
    "43743827": 2,
    "176519767": 28,
    "179589721": 1,
    "137998955": 10,
    "80618096": 1,
    "139258483": 9,
    "175329911": 3,
    "215793770": 28,
    "135877397": 12,
    "76395137": 18,
    "81302149": 2,
    "14033544": 4,
    "175626889": 27,
    "182311562": 8,
    "46390039": 22,
    "48505493": 7,
    "109746969": 27,
    "16124571": 14,
    "110733987": 2,
    "83333798": 2,
    "172399273": 26,
    "214483628": 10,
    "213015214": 12,
    "82297520": 14,
    "184259252": 1,
    "250839734": 7,
    "135345609": 2,
    "182241978": 7,
    "250325693": 31,
    "68430526": 30,
    "138390211": 2,
    "49932996": 12,
    "13146230": 8,
    "82455241": 22,
    "76165239": 9,
    "174152396": 1,
    "82678482": 30,
    "206038819": 21,
    "68369110": 2,
    "212450010": 6,
    "1559259": 1,
    "41288415": 2,
    "170326753": 19,
    "178924258": 26,
    "202552036": 10,
    "6847208": 22,
    "34611947": 12,
    "136643369": 24,
    "10187512": 10,
    "175213305": 31,
    "148302600": 0,
    "15938314": 25,
    "209619725": 29,
    "82168594": 4,
    "244398869": 4,
    "180783894": 7,
    "5282583": 21,
    "77132569": 9,
    "35672858": 17,
    "248546080": 7,
    "79356705": 12,
    "112067362": 22,
    "202091300": 30,
    "177820457": 9,
    "115688241": 29,
    "143594290": 10,
    "135957309": 25,
    "11197247": 2,
    "176397127": 8,
    "73896776": 12,
    "68633418": 2,
    "210053963": 14,
    "79938701": 4,
    "10306391": 22,
    "208008024": 22,
    "102800868": 19,
    "38959969": 22,
    "103019362": 7,
    "10255205": 22,
    "216824681": 21,
    "70360551": 0,
    "174347121": 10,
    "82031478": 18,
    "77128569": 25,
    "16097088": 24,
    "2610050": 3,
    "67439493": 17,
    "207068039": 18,
    "70353800": 14,
    "69391242": 10,
    "72528782": 7,
    "217584110": 4,
    "73477019": 2,
    "105479068": 32,
    "107297699": 1,
    "172270502": 28,
    "34306988": 22,
    "115139503": 7,
    "176020296": 15,
    "150180786": 17,
    "47167987": 19,
    "176530365": 25,
    "33711382": 26,
    "7807945": 7,
    "116659362": 20,
    "72078288": 10,
    "67728341": 10,
    "246531034": 14,
    "143891423": 9,
    "2507450": 28,
    "181441516": 25,
    "79135737": 11,
    "107021311": 7,
    "167838721": 7,
    "142128134": 25,
    "238867463": 22,
    "34419720": 29,
    "184548363": 12,
    "148945932": 28,
    "106564622": 10,
    "217877520": 2,
    "242177046": 13,
    "46150684": 20,
    "169886749": 26,
    "116300832": 7,
    "101317666": 14,
    "181326884": 2,
    "77620261": 9,
    "77270055": 15,
    "141409324": 22,
    "72942642": 21,
    "236248120": 4,
    "3611707": 22,
    "178408508": 8,
    "75496485": 30,
    "251423806": 9,
    "244993088": 1,
    "137237570": 8,
    "177097802": 20,
    "4420692": 10,
    "116851797": 10,
    "68394075": 2,
    "4420704": 10,
    "13341883": 4,
    "40572007": 7,
    "77038698": 22,
    "104436843": 16,
    "68922492": 24,
    "108166271": 22,
    "45180042": 2,
    "145077389": 10,
    "1272977": 19,
    "110486676": 22,
    "235035799": 9,
    "76838040": 3,
    "182942878": 30,
    "214273183": 1,
    "243014817": 28,
    "168803490": 15,
    "104101027": 10,
    "140911473": 20,
    "145077419": 10,
    "134425774": 27,
    "173395129": 19,
    "824506": 32,
    "108346555": 10,
    "75275453": 10,
    "201628862": 15,
    "108647286": 19,
    "145321163": 16,
    "108131539": 2,
    "209380567": 17,
    "143983833": 22,
    "179422426": 25,
    "150893787": 9,
    "247051484": 11,
    "10487005": 7,
    "43050207": 28,
    "235392226": 3,
    "250785659": 2,
    "243610853": 29,
    "67796202": 9,
    "174054636": 7,
    "113126638": 27,
    "242806421": 31,
    "175162610": 14,
    "80350451": 19,
    "46849271": 3,
    "81788157": 15,
    "34098432": 15,
    "213749002": 17,
    "113005841": 28,
    "101561620": 2,
    "48401686": 19,
    "146674977": 29,
    "45896996": 29,
    "247678248": 14,
    "243426604": 8,
    "173385005": 12,
    "179931553": 5,
    "146591026": 10,
    "214283571": 12,
    "2235705": 7,
    "181511483": 10,
    "139775297": 30,
    "181443910": 2,
    "201542991": 8,
    "141303120": 28,
    "176727387": 7,
    "41956702": 8,
    "4754786": 30,
    "178513252": 19,
    "208168294": 25,
    "178679149": 26,
    "9911662": 7,
    "251563377": 22,
    "205624895": 28,
    "237331838": 8,
    "206445951": 20,
    "246148485": 8,
    "145321353": 22,
    "73584014": 23,
    "116389265": 14,
    "40742297": 8,
    "240477594": 24,
    "115617180": 23,
    "4951454": 1,
    "206374303": 8,
    "13245860": 3,
    "107001757": 27,
    "138818993": 20,
    "211844339": 22,
    "9448884": 14,
    "115406264": 21,
    "7368136": 19,
    "74554825": 14,
    "208448988": 7,
    "79644128": 0,
    "109078823": 25,
    "170821091": 11,
    "83695076": 2,
    "107423206": 22,
    "181158481": 13,
    "82906365": 22,
    "234913264": 15,
    "41926130": 9,
    "4124147": 2,
    "109837814": 8,
    "179412481": 10,
    "79955458": 30,
    "12721671": 19,
    "183672330": 12,
    "215107086": 7,
    "38141457": 26,
    "34719260": 25,
    "147680797": 10,
    "246205982": 8,
    "1115679": 4,
    "102520352": 7,
    "11558433": 13,
    "102731302": 10,
    "106079786": 22,
    "82211079": 25,
    "33713714": 26,
    "246656566": 19,
    "171169335": 22,
    "15955512": 7,
    "147680826": 10,
    "178830910": 7,
    "4605877": 19,
    "107935298": 2,
    "178069070": 31,
    "11181650": 12,
    "109131350": 18,
    "108914269": 30,
    "917086": 25,
    "69643874": 15,
    "134848102": 0,
    "137875052": 23,
    "216819310": 28,
    "144553583": 10,
    "206534259": 30,
    "44598901": 29,
    "3049081": 21,
    "242476668": 2,
    "6385279": 8,
    "77881963": 12,
    "102750486": 25,
    "210773641": 12,
    "79705747": 22,
    "236009109": 9,
    "247246490": 14,
    "209659552": 28,
    "38897314": 25,
    "239992485": 10,
    "215830183": 7,
    "239271593": 7,
    "46202545": 10,
    "83496626": 6,
    "47236791": 10,
    "205958842": 6,
    "14206657": 30,
    "171275971": 5,
    "175656644": 10,
    "213692341": 30,
    "216999626": 25,
    "207449806": 19,
    "114699986": 14,
    "81428180": 10,
    "147680984": 10,
    "104408794": 9,
    "45422300": 4,
    "113940191": 2,
    "79224546": 10,
    "40945387": 12,
    "71481070": 24,
    "102881008": 25,
    "8517361": 10,
    "37189366": 0,
    "68142840": 19,
    "79416277": 22,
    "81983245": 1,
    "139734808": 9,
    "72840985": 14,
    "115033050": 7,
    "46692997": 30,
    "105629473": 7,
    "179222307": 5,
    "173879080": 22,
    "178605868": 7,
    "208023343": 6,
    "169693832": 22,
    "202614067": 15,
    "70330168": 28,
    "83257145": 24,
    "44003136": 10,
    "204140359": 19,
    "4364109": 29,
    "144885587": 24,
    "2053972": 23,
    "174329685": 9,
    "68452182": 18,
    "70078307": 17,
    "134524774": 29,
    "82767847": 14,
    "136619887": 4,
    "68470643": 11,
    "168912756": 10,
    "147181429": 25,
    "8722296": 22,
    "147476347": 19,
    "102230427": 28,
    "204562301": 9,
    "213454718": 1,
    "116991871": 8,
    "205946754": 30,
    "102465411": 12,
    "136531844": 2,
    "179316616": 22,
    "69408649": 15,
    "37457809": 28,
    "202389398": 31,
    "235777944": 24,
    "150800285": 21,
    "148055966": 2,
    "141281184": 23,
    "2507419": 28,
    "183449515": 12,
    "212547509": 15,
    "174256055": 26,
    "7700408": 13,
    "214005692": 2,
    "205938621": 29,
    "248977342": 0,
    "109477536": 31,
    "169828293": 7,
    "116797396": 30,
    "82053079": 6,
    "247478235": 8,
    "208218079": 2,
    "167868391": 14,
    "210628587": 5,
    "116567539": 26,
    "171171497": 10,
    "5933049": 25,
    "5470203": 6,
    "82079740": 21,
    "103442429": 25,
    "147949566": 25,
    "47491071": 10
}

function profile(url){
  var u = CliqzUtils.getDetailsFromUrl(url), tests = {};
  tests[u.host] = true;
  tests[u.domain] = true;
  //we can add more tests, eg - with path

  for(var k in tests){
      var c = DATA[CliqzUtils.hash(k)];
      if(c){
          var t = JSON.parse(CliqzUtils.getPref('profile', '{}'))
          t[c] = t[c] || { v:0, d:0 };
          if(t[c].d + 1000 < Date.now()){ //only update if the last update was more than 1 second ago
              t[c].v++;
              t[c].d = Date.now();
              CliqzUtils.setPref('profile', JSON.stringify(t))
          }

          CliqzUtils.log(JSON.stringify(t), 'PROFILE');
      }
  }
}

var CliqzHistory = {
  prefExpire: (60 * 60 * 24 * 1000), // 24 hours
  tabData: [],
  listener: {
    QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

    onLocationChange: function(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
      profile(aBrowser.currentURI.spec);

      var url = aBrowser.currentURI.spec;
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      // Skip if already saved or on any about: pages
      if (url.substring(0, 6) == "about:" || CliqzHistory.getTabData(panel, "url") == url) {
        return;
      }

      if (!CliqzHistory.getTabData(panel, "type")) {
        CliqzHistory.setTabData(panel, "type", "link");
      }
      if (!CliqzHistory.getTabData(panel, "query")) {
        CliqzHistory.setTabData(panel, "query", url);
        CliqzHistory.setTabData(panel, "queryDate", new Date().getTime());
        CliqzHistory.setTabData(panel, "type", "bookmark");
      }
      CliqzHistory.setTabData(panel, 'url', url);
      CliqzHistory.addHistoryEntry(aBrowser);
      CliqzHistory.setTabData(panel, 'type', "link");
    },
    onStateChange: function(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
      var url = aBrowser.currentURI.spec;
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      var title = aBrowser.contentDocument.title || "";
      // Reset tab data if on a new tab
      // Problem: This event is called several times, which clears the data and prevents saving the correct data
      if (url == "about:newtab" && CliqzHistory.getTabData(panel, "newTab") !== true) {
        //CliqzHistory.setTabData(panel, 'query', null);
        //CliqzHistory.setTabData(panel, 'queryDate', null);
        //CliqzHistory.setTabData(panel, 'newTab', true);
      } else if (title != CliqzHistory.getTabData(panel, "title")) {
        CliqzHistory.setTitle(url, title);
        CliqzHistory.setTabData(panel, 'title', title);
      }
    },
    onStatusChange: function(aBrowser, aWebProgress, aRequest, aStatus, aMessage) {
      //CliqzHistory.listener.onStateChange(aBrowser, aWebProgress, aRequest, null, aStatus);
    }
  },
  addHistoryEntry: function(browser, customPanel) {
    Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
    if (!PrivateBrowsingUtils.isWindowPrivate(CliqzUtils.getWindow()) && browser) {
      var tab = CliqzHistory.getTabForContentWindow(browser.contentWindow);
      var panel = tab.linkedPanel;
      var title = browser.contentDocument.title || "";
      var url = CliqzHistory.getTabData(panel, 'url');
      var type = CliqzHistory.getTabData(panel, 'type');
      var query = CliqzHistory.getTabData(panel, 'query');
      var queryDate = CliqzHistory.getTabData(panel, 'queryDate');
      var now = new Date().getTime();

      if (!url ||
        (type != "typed" && type != "link" && type != "result" && type != "autocomplete" && type != "google" && type != "bookmark")) {
        return;
      }

      if (!query) {
        query = "";
      }
      if (!queryDate) {
        queryDate = now;
      }
      CliqzHistory.setTitle(url, title);
      if (type == "typed") {
        if (query.indexOf('://') == -1) {
          query = "http://" + query;
        }
        CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ")\
                    VALUES (:query, :now, :query, :queryDate, 1)",
                    null, null, {
                      query: CliqzHistory.escapeSQL(query),
                      now: now,
                      queryDate: queryDate
                    });
        type = "link";
        now += 1;
      }

      // Insert history entry
      CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ")\
              VALUES (:url, :now, :query, :queryDate, 1)",
              null, null, {
                url: CliqzHistory.escapeSQL(url),
                query: CliqzHistory.escapeSQL(query),
                now: now,
                queryDate: queryDate
              });
    } else if (!PrivateBrowsingUtils.isWindowPrivate(CliqzUtils.getWindow()) && customPanel) {
      var url = CliqzHistory.getTabData(customPanel, 'url');
      var type = "link";
      var query = CliqzHistory.getTabData(customPanel, 'query');
      var queryDate = CliqzHistory.getTabData(customPanel, 'queryDate');
      var now = new Date().getTime();
      CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ")\
              VALUES (:url, :now, :query, :queryDate, 1)",
              null, null, {
                url: CliqzHistory.escapeSQL(url),
                query: CliqzHistory.escapeSQL(query),
                now: now,
                queryDate: queryDate
              });
    }
  },
  setTitle: function(url, title) {
    CliqzHistory.SQL("SELECT * FROM urltitles WHERE url = :url", null, function(res) {
      if(!CliqzHistory) return;
      if (res === 0) {
        CliqzHistory.SQL("INSERT INTO urltitles (url, title)\
                  VALUES (:url,:title)", null, null, {
                    url: CliqzHistory.escapeSQL(url),
                    title: CliqzHistory.escapeSQL(title)
                  });
      } else {
        CliqzHistory.SQL("UPDATE urltitles SET title=:title WHERE url=:url", null, null, {
                    url: CliqzHistory.escapeSQL(url),
                    title: CliqzHistory.escapeSQL(title)
                  });
      }
    }, {
      url: CliqzHistory.escapeSQL(url)
    });
  },
  getTabData: function(panel, attr) {
    if (!CliqzHistory.tabData[panel]) {
      return undefined;
    } else {
      return CliqzHistory.tabData[panel][attr];
    }
  },
  setTabData: function(panel, attr, val) {
    if (!CliqzHistory.tabData[panel]) {
      CliqzHistory.tabData[panel] = [];
    }
    CliqzHistory.tabData[panel][attr] = val;
  },
  updateQuery: function(query) {
    var date = new Date().getTime();
    var panel = CliqzUtils.getWindow().gBrowser.selectedTab.linkedPanel;
    var last = CliqzHistory.getTabData(panel, 'query');
    if (last != query) {
      CliqzHistory.setTabData(panel, 'query', query);
      CliqzHistory.setTabData(panel, 'queryDate', date);
    }
  },
  SQL: function(sql, onRow, callback, parameters) {
    let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
    var dbConn = Services.storage.openDatabase(file);
    var statement = dbConn.createStatement(sql);
    for(var key in parameters) {
      statement.params[key] = parameters[key];
    }
    CliqzHistory._SQL(dbConn, statement, onRow, callback);
  },
  _SQL: function(dbConn, statement, onRow, callback) {

    //var statement = dbConn.createStatement(sql);

    statement.executeAsync({
      onRow: onRow,
      callback: callback,
      handleResult: function(aResultSet) {
        var resultCount = 0;
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          resultCount++;
          if (this.onRow) {
            this.onRow(statement.row);
          }
        }
        if (this.callback) {
          this.callback(resultCount);
        }
      },

      handleError: function(aError) {
        if (this.callback) {
          this.callback(0);
        }
      },
      handleCompletion: function(aReason) {
        if (this.callback) {
          this.callback(0);
        }
      }
    });
  },
  initDB: function() {
    if (FileUtils.getFile("ProfD", ["cliqz.db"]).exists()) {
      return;
    }
    var visits = "create table visits(\
            id INTEGER PRIMARY KEY NOT NULL,\
            url VARCHAR(255) NOT NULL,\
            visit_date DATE,\
            last_query VARCHAR(255),\
            last_query_date DATE,\
            typed BOOLEAN DEFAULT 0,\
            link BOOLEAN DEFAULT 0,\
            result BOOLEAN DEFAULT 0,\
            autocomplete BOOLEAN DEFAULT 0,\
            google BOOLEAN DEFAULT 0,\
            bookmark BOOLEAN DEFAULT 0\
            )";
    var titles = "create table urltitles(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            title VARCHAR(255)\
        )";
    CliqzHistory.SQL(visits);
    CliqzHistory.SQL(titles);
  },
  deleteVisit: function(url) {
    CliqzHistory.SQL("delete from visits where url = :url", null, null, {
      url: CliqzHistory.escapeSQL(url)
    });
    CliqzHistory.SQL("delete from urltitles where url = :url", null, null, {
      url: CliqzHistory.escapeSQL(url)
    });
  },
  deleteTimeFrame: function() {
    CliqzHistoryPattern.historyTimeFrame(function(min, max) {
      CliqzHistory.SQL("delete from visits where visit_date < :min", null, null, {
        min: min
      });
      CliqzHistory.SQL("delete from visits where visit_date > :max", null, null, {
        max: max
      });
    });
  },
  clearHistory: function() {
    CliqzHistory.SQL("delete from visits");
    CliqzHistory.SQL("delete from urltitles");
  },
  historyObserver: {
    onBeginUpdateBatch: function() {},
    onEndUpdateBatch: function() {
      CliqzHistory.deleteTimeFrame();
    },
    onVisit: function(aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) {},
    onTitleChanged: function(aURI, aPageTitle) {},
    onBeforeDeleteURI: function(aURI) {},
    onDeleteURI: function(aURI) {
      CliqzHistory.deleteVisit(aURI.spec);
    },
    onClearHistory: function() {
      CliqzHistory.clearHistory();
    },
    onPageChanged: function(aURI, aWhat, aValue) {},
    onDeleteVisits: function() {},
    QueryInterface: XPCOMUtils.generateQI([Ci.nsINavHistoryObserver])
  },
  getTabForContentWindow: function(window) {
    let browser;
    try {
      browser = window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShell)
        .chromeEventHandler;
    } catch (e) {}

    if (!browser) {
      return null;
    }

    let chromeWindow = browser.ownerDocument.defaultView;

    if ('gBrowser' in chromeWindow && chromeWindow.gBrowser &&
      'browsers' in chromeWindow.gBrowser) {
      let browsers = chromeWindow.gBrowser.browsers;
      let i = browsers.indexOf(browser);
      if (i !== -1)
        return chromeWindow.gBrowser.tabs[i];
      return null;
    } else if ('BrowserApp' in chromeWindow) {
      return getTabForWindow(window);
    }
    return null;
  },
  getURI: function(tab) {
    if (tab.browser)
      return tab.browser.currentURI.spec;
    return tab.linkedBrowser.currentURI.spec;
  },
  escapeSQL: function(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
      switch (char) {
        case "'":
          return "''";
        default:
          return char;
          /*case "\0":
              return "\\0";
          case "\x08":
              return "\\b";
          case "\x09":
              return "\\t";
          case "\x1a":
              return "\\z";
          case "\n":
              return "\\n";
          case "\r":
              return "\\r";
          case "\"":
          case "'":
          case "\\":
          case "%":
              return "\\"+char; */
      }
    });
  }
}
