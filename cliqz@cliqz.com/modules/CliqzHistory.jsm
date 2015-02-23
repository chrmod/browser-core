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
    "171317248": 30,
    "42311681": 27,
    "77498370": 8,
    "217888772": 11,
    "70324236": 13,
    "214478866": 27,
    "178778135": 9,
    "143673372": 1,
    "69471268": 15,
    "74905638": 3,
    "41599028": 24,
    "244467766": 11,
    "135839081": 23,
    "206276680": 32,
    "13480631": 27,
    "241031245": 7,
    "136925262": 14,
    "101412944": 32,
    "80171090": 10,
    "176351323": 5,
    "77725789": 5,
    "243320926": 30,
    "210145381": 32,
    "243681383": 27,
    "77723754": 3,
    "177054055": 26,
    "47503472": 15,
    "81551720": 22,
    "79061110": 3,
    "173635703": 8,
    "48466040": 19,
    "134721659": 7,
    "75518079": 16,
    "250134663": 20,
    "205047831": 28,
    "50067599": 32,
    "148506773": 10,
    "242110616": 26,
    "79224516": 11,
    "7346339": 20,
    "168546473": 22,
    "235503788": 30,
    "74498223": 2,
    "44017850": 32,
    "82412576": 27,
    "247575243": 13,
    "11092165": 32,
    "69818566": 26,
    "76165319": 20,
    "248502474": 22,
    "34642295": 33,
    "71809228": 20,
    "79703758": 26,
    "1847512": 20,
    "170003492": 11,
    "144101595": 9,
    "238803166": 3,
    "108882143": 8,
    "735457": 24,
    "101568745": 32,
    "216836333": 20,
    "970991": 8,
    "49961201": 21,
    "148697330": 23,
    "49643764": 11,
    "172477822": 23,
    "104696056": 8,
    "8880381": 32,
    "149207295": 1,
    "179192068": 30,
    "11043201": 5,
    "150522121": 13,
    "73740558": 31,
    "180371732": 24,
    "139907350": 25,
    "103446807": 25,
    "214090014": 2,
    "169689378": 1,
    "170742053": 19,
    "103502119": 9,
    "206369066": 13,
    "107979973": 31,
    "76998968": 30,
    "244238656": 30,
    "40802625": 8,
    "247095618": 16,
    "102928715": 28,
    "138432848": 26,
    "207305048": 7,
    "48435545": 26,
    "174902229": 31,
    "45085023": 3,
    "209539425": 21,
    "103901538": 11,
    "135332198": 10,
    "142164327": 11,
    "113570152": 9,
    "67178857": 27,
    "6248810": 26,
    "35490194": 7,
    "205889902": 1,
    "75131249": 25,
    "41521523": 28,
    "203923831": 11,
    "111946108": 28,
    "136995198": 30,
    "67953728": 11,
    "48687497": 9,
    "48286095": 23,
    "100788626": 9,
    "140059029": 3,
    "206100886": 27,
    "239584149": 30,
    "115532187": 17,
    "83009951": 27,
    "171950497": 8,
    "10230179": 9,
    "75137450": 22,
    "237703599": 15,
    "104698241": 30,
    "39362995": 14,
    "115315125": 4,
    "218102199": 8,
    "45441465": 26,
    "147313085": 32,
    "175022528": 2,
    "104264131": 32,
    "211816900": 16,
    "42670497": 3,
    "234959304": 13,
    "36542924": 22,
    "7184845": 2,
    "136296912": 8,
    "13351377": 13,
    "178108892": 8,
    "11952609": 10,
    "140126691": 19,
    "75270637": 28,
    "44231150": 11,
    "47167987": 20,
    "49717748": 1,
    "135365109": 28,
    "205433940": 26,
    "36325882": 12,
    "237699581": 15,
    "45791747": 13,
    "142584326": 7,
    "110848519": 13,
    "47202825": 11,
    "247133000": 22,
    "208640532": 5,
    "176863769": 8,
    "1155610": 8,
    "38576671": 22,
    "16386480": 31,
    "202840616": 23,
    "245858857": 10,
    "76274218": 2,
    "249494063": 26,
    "172911152": 23,
    "105906746": 22,
    "38286090": 32,
    "208546369": 24,
    "16032325": 25,
    "6154822": 22,
    "250796615": 4,
    "10449481": 28,
    "238295626": 16,
    "180337079": 28,
    "213234255": 1,
    "12632657": 13,
    "117226066": 34,
    "43743827": 3,
    "176519767": 30,
    "179589721": 2,
    "137998955": 11,
    "80618096": 2,
    "139258483": 10,
    "215793770": 30,
    "135877397": 13,
    "75526784": 23,
    "76395137": 19,
    "81302149": 3,
    "14033544": 5,
    "175626889": 29,
    "182311562": 9,
    "46390039": 24,
    "48505493": 8,
    "109746969": 29,
    "16124571": 15,
    "110733987": 3,
    "83333798": 3,
    "172399273": 28,
    "214483628": 11,
    "213015214": 13,
    "82297520": 15,
    "184259252": 2,
    "250839734": 8,
    "135345609": 3,
    "182241978": 8,
    "250325693": 33,
    "68430526": 32,
    "141400767": 23,
    "138390211": 3,
    "49932996": 13,
    "13146230": 9,
    "82455241": 24,
    "76165239": 10,
    "182561484": 30,
    "82678482": 32,
    "206038819": 22,
    "68369110": 3,
    "212450010": 7,
    "1559259": 2,
    "41288415": 3,
    "170326753": 20,
    "178924258": 28,
    "202552036": 11,
    "6847208": 24,
    "34611947": 13,
    "136643369": 26,
    "10187512": 11,
    "175213305": 33,
    "9054972": 8,
    "137708292": 23,
    "148302600": 1,
    "15938314": 27,
    "209619725": 31,
    "82168594": 5,
    "244398869": 5,
    "180783894": 8,
    "5282583": 22,
    "77132569": 10,
    "35672858": 18,
    "248546080": 8,
    "79356705": 13,
    "112067362": 24,
    "202091300": 32,
    "177820457": 10,
    "115688241": 31,
    "143594290": 11,
    "135957309": 27,
    "11197247": 3,
    "176397127": 9,
    "176020296": 16,
    "68633418": 3,
    "210053963": 15,
    "79938701": 5,
    "176214870": 23,
    "10306391": 24,
    "208008024": 24,
    "102800868": 20,
    "38959969": 24,
    "103019362": 8,
    "10255205": 24,
    "216824681": 22,
    "70360551": 1,
    "174347121": 11,
    "5933049": 27,
    "108647286": 20,
    "77128569": 27,
    "16097088": 26,
    "2610050": 4,
    "67439493": 18,
    "207068039": 19,
    "70353800": 15,
    "69391242": 11,
    "72528782": 8,
    "217584110": 5,
    "213420185": 23,
    "73477019": 3,
    "105479068": 34,
    "107297699": 2,
    "172270502": 30,
    "34306988": 24,
    "115139503": 8,
    "73896776": 13,
    "150180786": 18,
    "177717747": 8,
    "176530365": 27,
    "33711382": 28,
    "7807945": 8,
    "116659362": 21,
    "72078288": 11,
    "67728341": 11,
    "246531034": 15,
    "143891423": 10,
    "2507450": 30,
    "181441516": 27,
    "83257145": 26,
    "79135737": 12,
    "107021311": 8,
    "238980097": 14,
    "249713494": 23,
    "142128134": 27,
    "238867463": 24,
    "34419720": 31,
    "184548363": 13,
    "148945932": 30,
    "106564622": 11,
    "217877520": 3,
    "242177046": 14,
    "46150684": 21,
    "169886749": 28,
    "116300832": 8,
    "101317666": 15,
    "181326884": 3,
    "77620261": 10,
    "77270055": 16,
    "141409324": 24,
    "72942642": 22,
    "236248120": 5,
    "3611707": 24,
    "178408508": 9,
    "75496485": 32,
    "251423806": 10,
    "244993088": 2,
    "137237570": 9,
    "177097802": 21,
    "41757776": 8,
    "4420692": 11,
    "14484565": 20,
    "68394075": 3,
    "4420704": 11,
    "13341883": 5,
    "182813797": 4,
    "40572007": 8,
    "77038698": 24,
    "104436843": 17,
    "68922492": 26,
    "108166271": 24,
    "45180042": 3,
    "145077389": 11,
    "1272977": 20,
    "110486676": 24,
    "235035799": 10,
    "76838040": 4,
    "182942878": 32,
    "214273183": 2,
    "243014817": 30,
    "168803490": 16,
    "104101027": 11,
    "140911473": 21,
    "145077419": 11,
    "134425774": 29,
    "173395129": 20,
    "824506": 34,
    "108346555": 11,
    "75275453": 11,
    "201628862": 16,
    "82031478": 19,
    "145321163": 17,
    "108131539": 3,
    "209380567": 18,
    "143983833": 24,
    "179422426": 27,
    "150893787": 10,
    "247051484": 12,
    "10487005": 8,
    "43050207": 30,
    "235392226": 4,
    "250785659": 3,
    "243610853": 31,
    "67796202": 10,
    "174054636": 8,
    "113126638": 29,
    "242806421": 33,
    "175162610": 15,
    "80350451": 20,
    "46849271": 4,
    "81788157": 16,
    "34098432": 16,
    "114949378": 23,
    "169407747": 23,
    "213749002": 18,
    "113005841": 30,
    "101561620": 3,
    "48401686": 20,
    "146674977": 31,
    "45896996": 31,
    "247678248": 15,
    "243426604": 9,
    "173385005": 13,
    "179931553": 6,
    "146591026": 11,
    "214283571": 13,
    "2235705": 8,
    "181511483": 11,
    "82787646": 23,
    "139775297": 32,
    "181443910": 3,
    "145077576": 11,
    "201542991": 9,
    "141303120": 30,
    "176727387": 8,
    "41956702": 9,
    "4754786": 32,
    "178513252": 20,
    "208168294": 27,
    "108768617": 23,
    "178679149": 28,
    "9911662": 8,
    "251563377": 24,
    "205624895": 30,
    "237331838": 9,
    "206445951": 21,
    "246148485": 9,
    "145321353": 24,
    "73584014": 25,
    "116389265": 15,
    "40742297": 9,
    "240477594": 26,
    "109492463": 23,
    "115617180": 25,
    "4951454": 2,
    "206374303": 9,
    "13245860": 4,
    "107001757": 29,
    "138818993": 21,
    "211844339": 24,
    "9448884": 15,
    "115406264": 22,
    "7368136": 20,
    "74554825": 15,
    "208448988": 8,
    "79644128": 1,
    "109078823": 27,
    "170821091": 12,
    "83695076": 3,
    "181158481": 14,
    "82906365": 24,
    "234913264": 16,
    "41926130": 10,
    "4124147": 3,
    "109837814": 9,
    "179412481": 11,
    "79955458": 32,
    "12721671": 20,
    "183672330": 13,
    "215107086": 8,
    "38141457": 28,
    "175308314": 23,
    "34719260": 27,
    "147680797": 11,
    "246205982": 9,
    "1115679": 5,
    "102520352": 8,
    "11558433": 14,
    "102731302": 11,
    "106079786": 24,
    "82211079": 27,
    "33713714": 28,
    "246656566": 20,
    "171169335": 24,
    "147680826": 11,
    "178830910": 8,
    "4605877": 20,
    "107935298": 3,
    "77641292": 23,
    "178069070": 33,
    "11181650": 13,
    "109131350": 19,
    "108914269": 32,
    "917086": 27,
    "69643874": 16,
    "134848102": 1,
    "137875052": 25,
    "216819310": 30,
    "144553583": 11,
    "206534259": 32,
    "217645520": 23,
    "44598901": 31,
    "3049081": 22,
    "39687803": 23,
    "242476668": 3,
    "6385279": 9,
    "77881963": 13,
    "102750486": 27,
    "210773641": 13,
    "79705747": 24,
    "236009109": 10,
    "247246490": 15,
    "249632413": 23,
    "209659552": 30,
    "38897314": 27,
    "239992485": 11,
    "215830183": 8,
    "171171497": 11,
    "105946799": 23,
    "16053649": 24,
    "46202545": 11,
    "83496626": 7,
    "47236791": 11,
    "205958842": 7,
    "14206657": 32,
    "171275971": 6,
    "175656644": 11,
    "207736520": 23,
    "213692341": 32,
    "216999626": 27,
    "207449806": 20,
    "114699986": 15,
    "147680984": 11,
    "104408794": 10,
    "45422300": 5,
    "113940191": 3,
    "79224546": 11,
    "40945387": 13,
    "239093484": 0,
    "71481070": 26,
    "102881008": 27,
    "8517361": 11,
    "37189366": 1,
    "79416277": 24,
    "81983245": 2,
    "139734808": 10,
    "72840985": 15,
    "115033050": 8,
    "46692997": 32,
    "105629473": 8,
    "179222307": 6,
    "173879080": 24,
    "178605868": 8,
    "208023343": 7,
    "169693832": 24,
    "70330168": 30,
    "240736057": 23,
    "44003136": 11,
    "204140359": 20,
    "4364109": 31,
    "144885587": 26,
    "2053972": 25,
    "174329685": 10,
    "68452182": 19,
    "70078307": 18,
    "134524774": 31,
    "82767847": 15,
    "136619887": 5,
    "68470643": 12,
    "168912756": 11,
    "147181429": 27,
    "8722296": 24,
    "147476347": 20,
    "102230427": 30,
    "204562301": 10,
    "213454718": 2,
    "116991871": 9,
    "205946754": 32,
    "102465411": 13,
    "136531844": 3,
    "179316616": 24,
    "69408649": 16,
    "37457809": 30,
    "202389398": 33,
    "235777944": 26,
    "139911066": 23,
    "150800285": 22,
    "148055966": 3,
    "141281184": 25,
    "2507419": 30,
    "183449515": 13,
    "168072900": 23,
    "212547509": 16,
    "174256055": 28,
    "7700408": 14,
    "214005692": 3,
    "205938621": 31,
    "248977342": 1,
    "109477536": 33,
    "169828293": 8,
    "116797396": 32,
    "82053079": 7,
    "247478235": 9,
    "208218079": 3,
    "9609211": 23,
    "167868391": 15,
    "210628587": 6,
    "116567539": 28,
    "134244345": 23,
    "5470203": 7,
    "82079740": 22,
    "103442429": 27,
    "147949566": 27,
    "47491071": 11
}
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryManager',
  'chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

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

function TEST(){
  var start = Date.now(), t = {};
  CliqzHistoryManager.PlacesInterestsStorage._execute('SELECT * FROM moz_places', ['url'],
    function(url){
        var u = CliqzUtils.getDetailsFromUrl(url), tests = {};
        tests[u.host] = true;
        tests[u.domain] = true;
        //we can add more tests, eg - with path

        for(var k in tests){
            var c = DATA[CliqzUtils.hash(k)];
            if(c){
                t[c] = t[c] || 0
                t[c]++;
            }
        }
    }).then(
      function(r){
        CliqzUtils.log(JSON.stringify(t), 'PROFILE');
        CliqzUtils.log(Date.now() - start + 'ms', 'PROFILE');
      }
    )
}

var CliqzHistory = {
  prefExpire: (60 * 60 * 24 * 1000), // 24 hours
  tabData: [],
  TEST: TEST,
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
