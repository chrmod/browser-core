'use strict';

var EXPORTED_SYMBOLS = ['CliqzCategories'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'NewTabUtils',
  'resource://gre/modules/NewTabUtils.jsm');

var initialized = false,
	ONE_DAY = 24 * 60 * 60 * 1000,
	ONE_MONTH = 30 * ONE_DAY,
	SEND_INTERVAL = 20 * 60 * 1000, //20 minutes
	t0, tH, tD, tHist,// timers
	DATA = { "171317248": 30, "42311681": 27, "77498370": 8, "217888772": 11, "70324236": 13, "214478866": 27, "178778135": 9, "143673372": 1, "69471268": 15, "74905638": 3, "41599028": 24, "244467766": 11, "135839081": 23, "206276680": 32, "13480631": 27, "241031245": 7, "136925262": 14, "101412944": 32, "80171090": 10, "176351323": 5, "77725789": 5, "243320926": 30, "210145381": 32, "243681383": 27, "77723754": 3, "177054055": 26, "47503472": 15, "81551720": 22, "79061110": 3, "173635703": 8, "48466040": 19, "134721659": 7, "75518079": 16, "250134663": 20, "205047831": 28, "50067599": 32, "148506773": 10, "242110616": 26, "79224516": 11, "7346339": 20, "168546473": 22, "235503788": 30, "74498223": 2, "44017850": 32, "82412576": 27, "247575243": 13, "11092165": 32, "69818566": 26, "76165319": 20, "248502474": 22, "34642295": 33, "71809228": 20, "79703758": 26, "1847512": 20, "170003492": 11, "144101595": 9, "238803166": 3, "108882143": 8, "735457": 24, "101568745": 32, "216836333": 20, "970991": 8, "49961201": 21, "148697330": 23, "49643764": 11, "172477822": 23, "104696056": 8, "8880381": 32, "149207295": 1, "179192068": 30, "11043201": 5, "150522121": 13, "73740558": 31, "180371732": 24, "139907350": 25, "103446807": 25, "214090014": 2, "169689378": 1, "170742053": 19, "103502119": 9, "206369066": 13, "107979973": 31, "76998968": 30, "244238656": 30, "40802625": 8, "247095618": 16, "102928715": 28, "138432848": 26, "207305048": 7, "48435545": 26, "174902229": 31, "45085023": 3, "209539425": 21, "103901538": 11, "135332198": 10, "142164327": 11, "113570152": 9, "67178857": 27, "6248810": 26, "35490194": 7, "205889902": 1, "75131249": 25, "41521523": 28, "203923831": 11, "111946108": 28, "136995198": 30, "67953728": 11, "48687497": 9, "48286095": 23, "100788626": 9, "140059029": 3, "206100886": 27, "239584149": 30, "115532187": 17, "83009951": 27, "171950497": 8, "10230179": 9, "75137450": 22, "237703599": 15, "104698241": 30, "39362995": 14, "115315125": 4, "218102199": 8, "45441465": 26, "147313085": 32, "175022528": 2, "104264131": 32, "211816900": 16, "42670497": 3, "234959304": 13, "36542924": 22, "7184845": 2, "136296912": 8, "13351377": 13, "178108892": 8, "11952609": 10, "140126691": 19, "75270637": 28, "44231150": 11, "47167987": 20, "49717748": 1, "135365109": 28, "205433940": 26, "36325882": 12, "237699581": 15, "45791747": 13, "142584326": 7, "110848519": 13, "47202825": 11, "247133000": 22, "208640532": 5, "176863769": 8, "1155610": 8, "38576671": 22, "16386480": 31, "202840616": 23, "245858857": 10, "76274218": 2, "249494063": 26, "172911152": 23, "105906746": 22, "38286090": 32, "208546369": 24, "16032325": 25, "6154822": 22, "250796615": 4, "10449481": 28, "238295626": 16, "180337079": 28, "213234255": 1, "12632657": 13, "117226066": 34, "43743827": 3, "176519767": 30, "179589721": 2, "137998955": 11, "80618096": 2, "139258483": 10, "215793770": 30, "135877397": 13, "75526784": 23, "76395137": 19, "81302149": 3, "14033544": 5, "175626889": 29, "182311562": 9, "46390039": 24, "48505493": 8, "109746969": 29, "16124571": 15, "110733987": 3, "83333798": 3, "172399273": 28, "214483628": 11, "213015214": 13, "82297520": 15, "184259252": 2, "250839734": 8, "135345609": 3, "182241978": 8, "250325693": 33, "68430526": 32, "141400767": 23, "138390211": 3, "49932996": 13, "13146230": 9, "82455241": 24, "76165239": 10, "182561484": 30, "82678482": 32, "206038819": 22, "68369110": 3, "212450010": 7, "1559259": 2, "41288415": 3, "170326753": 20, "178924258": 28, "202552036": 11, "6847208": 24, "34611947": 13, "136643369": 26, "10187512": 11, "175213305": 33, "9054972": 8, "137708292": 23, "148302600": 1, "15938314": 27, "209619725": 31, "82168594": 5, "244398869": 5, "180783894": 8, "5282583": 22, "77132569": 10, "35672858": 18, "248546080": 8, "79356705": 13, "112067362": 24, "202091300": 32, "177820457": 10, "115688241": 31, "143594290": 11, "135957309": 27, "11197247": 3, "176397127": 9, "176020296": 16, "68633418": 3, "210053963": 15, "79938701": 5, "176214870": 23, "10306391": 24, "208008024": 24, "102800868": 20, "38959969": 24, "103019362": 8, "10255205": 24, "216824681": 22, "70360551": 1, "174347121": 11, "5933049": 27, "108647286": 20, "77128569": 27, "16097088": 26, "2610050": 4, "67439493": 18, "207068039": 19, "70353800": 15, "69391242": 11, "72528782": 8, "217584110": 5, "213420185": 23, "73477019": 3, "105479068": 34, "107297699": 2, "172270502": 30, "34306988": 24, "115139503": 8, "73896776": 13, "150180786": 18, "177717747": 8, "176530365": 27, "33711382": 28, "7807945": 8, "116659362": 21, "72078288": 11, "67728341": 11, "246531034": 15, "143891423": 10, "2507450": 30, "181441516": 27, "83257145": 26, "79135737": 12, "107021311": 8, "238980097": 14, "249713494": 23, "142128134": 27, "238867463": 24, "34419720": 31, "184548363": 13, "148945932": 30, "106564622": 11, "217877520": 3, "242177046": 14, "46150684": 21, "169886749": 28, "116300832": 8, "101317666": 15, "181326884": 3, "77620261": 10, "77270055": 16, "141409324": 24, "72942642": 22, "236248120": 5, "3611707": 24, "178408508": 9, "75496485": 32, "251423806": 10, "244993088": 2, "137237570": 9, "177097802": 21, "41757776": 8, "4420692": 11, "14484565": 20, "68394075": 3, "4420704": 11, "13341883": 5, "182813797": 4, "40572007": 8, "77038698": 24, "104436843": 17, "68922492": 26, "108166271": 24, "45180042": 3, "145077389": 11, "1272977": 20, "110486676": 24, "235035799": 10, "76838040": 4, "182942878": 32, "214273183": 2, "243014817": 30, "168803490": 16, "104101027": 11, "140911473": 21, "145077419": 11, "134425774": 29, "173395129": 20, "824506": 34, "108346555": 11, "75275453": 11, "201628862": 16, "82031478": 19, "145321163": 17, "108131539": 3, "209380567": 18, "143983833": 24, "179422426": 27, "150893787": 10, "247051484": 12, "10487005": 8, "43050207": 30, "235392226": 4, "250785659": 3, "243610853": 31, "67796202": 10, "174054636": 8, "113126638": 29, "242806421": 33, "175162610": 15, "80350451": 20, "46849271": 4, "81788157": 16, "34098432": 16, "114949378": 23, "169407747": 23, "213749002": 18, "113005841": 30, "101561620": 3, "48401686": 20, "146674977": 31, "45896996": 31, "247678248": 15, "243426604": 9, "173385005": 13, "179931553": 6, "146591026": 11, "214283571": 13, "2235705": 8, "181511483": 11, "82787646": 23, "139775297": 32, "181443910": 3, "145077576": 11, "201542991": 9, "141303120": 30, "176727387": 8, "41956702": 9, "4754786": 32, "178513252": 20, "208168294": 27, "108768617": 23, "178679149": 28, "9911662": 8, "251563377": 24, "205624895": 30, "237331838": 9, "206445951": 21, "246148485": 9, "145321353": 24, "73584014": 25, "116389265": 15, "40742297": 9, "240477594": 26, "109492463": 23, "115617180": 25, "4951454": 2, "206374303": 9, "13245860": 4, "107001757": 29, "138818993": 21, "211844339": 24, "9448884": 15, "115406264": 22, "7368136": 20, "74554825": 15, "208448988": 8, "79644128": 1, "109078823": 27, "170821091": 12, "83695076": 3, "181158481": 14, "82906365": 24, "234913264": 16, "41926130": 10, "4124147": 3, "109837814": 9, "179412481": 11, "79955458": 32, "12721671": 20, "183672330": 13, "215107086": 8, "38141457": 28, "175308314": 23, "34719260": 27, "147680797": 11, "246205982": 9, "1115679": 5, "102520352": 8, "11558433": 14, "102731302": 11, "106079786": 24, "82211079": 27, "33713714": 28, "246656566": 20, "171169335": 24, "147680826": 11, "178830910": 8, "4605877": 20, "107935298": 3, "77641292": 23, "178069070": 33, "11181650": 13, "109131350": 19, "108914269": 32, "917086": 27, "69643874": 16, "134848102": 1, "137875052": 25, "216819310": 30, "144553583": 11, "206534259": 32, "217645520": 23, "44598901": 31, "3049081": 22, "39687803": 23, "242476668": 3, "6385279": 9, "77881963": 13, "102750486": 27, "210773641": 13, "79705747": 24, "236009109": 10, "247246490": 15, "249632413": 23, "209659552": 30, "38897314": 27, "239992485": 11, "215830183": 8, "171171497": 11, "105946799": 23, "16053649": 24, "46202545": 11, "83496626": 7, "47236791": 11, "205958842": 7, "14206657": 32, "171275971": 6, "175656644": 11, "207736520": 23, "213692341": 32, "216999626": 27, "207449806": 20, "114699986": 15, "147680984": 11, "104408794": 10, "45422300": 5, "113940191": 3, "79224546": 11, "40945387": 13, "239093484": 0, "71481070": 26, "102881008": 27, "8517361": 11, "37189366": 1, "79416277": 24, "81983245": 2, "139734808": 10, "72840985": 15, "115033050": 8, "46692997": 32, "105629473": 8, "179222307": 6, "173879080": 24, "178605868": 8, "208023343": 7, "169693832": 24, "70330168": 30, "240736057": 23, "44003136": 11, "204140359": 20, "4364109": 31, "144885587": 26, "2053972": 25, "174329685": 10, "68452182": 19, "70078307": 18, "134524774": 31, "82767847": 15, "136619887": 5, "68470643": 12, "168912756": 11, "147181429": 27, "8722296": 24, "147476347": 20, "102230427": 30, "204562301": 10, "213454718": 2, "116991871": 9, "205946754": 32, "102465411": 13, "136531844": 3, "179316616": 24, "69408649": 16, "37457809": 30, "202389398": 33, "235777944": 26, "139911066": 23, "150800285": 22, "148055966": 3, "141281184": 25, "2507419": 30, "183449515": 13, "168072900": 23, "212547509": 16, "174256055": 28, "7700408": 14, "214005692": 3, "205938621": 31, "248977342": 1, "109477536": 33, "169828293": 8, "116797396": 32, "82053079": 7, "247478235": 9, "208218079": 3, "9609211": 23, "167868391": 15, "210628587": 6, "116567539": 28, "134244345": 23, "5470203": 7, "82079740": 22, "103442429": 27, "147949566": 27, "47491071": 11 },
	NEWS_DOMAINS = [241917449, 13719619, 137660610, 11838502, 211123764, 80284518, 178958752, 171044239, 77870507, 75895265, 68105860, 5759018, 67532110, 148293467, 111033825, 138610627, 111313536, 142977877, 217546276, 73050235, 134922038, 75608137, 110712019, 5891625, 112652137, 244002985, 15870603, 174373373, 173900698, 140081125, 72797110, 106867254, 239814667, 169285, 76431864, 217335947, 47271399, 201929555, 77984137, 8128486, 33802677, 108523534, 212983134, 114920944, 113652989, 39472004, 215427259, 136594333, 137888111, 47939151, 108090229, 237890166, 183218837, 104278336, 241917449, 67320133, 100682630, 38094382, 245082466, 143121315, 73640830, 101941303, 143121315, 8128481, 211885633, 213411883, 78449258, 789884, 69620493, 246787745, 115867194, 106215399, 74275360, 172655282, 204752939, 213975916, 45794709, 5357951, 146672137, 172851085, 82377591, 40762155, 80880326, 236124645, 213228851, 180095924, 146509530, 214455477, 11737641, 114601207, 44296786, 80690384, 10276572, 6525262, 241173928, 184043374, 238595002, 9326168, 70630552, 69472735, 44368259, 106180769, 207521902, 10922616, 79921735, 100894383, 207641190, 8639085, 173399207, 102999840, 42941135, 4592036, 251443988, 44971794, 83668076, 109152934, 237622771, 80284488, 4574823, 12235342, 251470487, 235704936, 111921664, 108273611, 12722702, 173483201, 74908258, 168119182, 243524240, 9179572, 115978914, 202544070, 116229637, 34606719, 177387947, 239942081, 114018238, 236458718, 148999872, 216355379, 68212258, 242422332, 45291057, 113298437, 214191499, 106833963, 46924745, 241777713, 112708812, 81471951, 245440575, 201572094, 71790765, 140391363, 6296201, 82065538, 1857910, 113095973, 76678348, 141856929, 81443951, 74350012, 201557843, 16295799, 175305615, 77740743, 217952427, 182576755, 6245576, 143209350, 38054677, 10745505, 111836278, 38686913, 216124125, 73353973, 76821306, 181700849, 140910568, 148890453, 44469468, 211171723, 236692634, 148531919, 181502899, 72705985, 184188793, 145555265, 210663045, 76644610, 37350675, 78534610, 5476076, 147148965, 75085360, 236564074, 143716245, 183456569, 113796197, 70904968, 3780195, 134355940, 43523451, 175373818, 74661948];

function log(s){
	//CliqzUtils.log(s, 'CATEGORIES')
}

var CliqzCategories = {
	assess: assess,
	init: function(){
		if(initialized) return;

		sendData();
		//wait 5 minutes to do this operation
		t0 = CliqzUtils.setTimeout(sendHistoricalData, 5 * 60 *1000)

		tHist = CliqzUtils.setTimeout(analizeNewsHistory, 2 * 60 *1000)

		log('init');
	},
	unload: function(){
		sendData();
		CliqzUtils.clearTimeout(t0);
		CliqzUtils.clearTimeout(tH);
		CliqzUtils.clearTimeout(tD);
		CliqzUtils.clearTimeout(tHist);

		log('unloaded');
	},
	assessNewsTopsites: function () {
		log("assessNewsTopsites: populating cache");
		try {
			NewTabUtils.links.populateCache(analyseNewsTopsites);
		} catch (e) {
			log("assessNewsTopsites: error " + e);
		}
	}
}

function sendData(){
	log('send DATA');

	var data = JSON.parse(CliqzUtils.getPref('cat', '{}'));
	if(Object.keys(data).length !== 0){
		var action = {
			type: 'cat',
			data: data
		};
		CliqzUtils.setPref('cat', '{}');

		CliqzUtils.telemetry(action);
	}

	tD = CliqzUtils.setTimeout(sendData, SEND_INTERVAL)
}

function sendHistoricalData(){
	log('send HISTORY');

	var start = Date.now(), t = {};
	//send the signal maximum 1 time per day
	if(parseInt(CliqzUtils.getPref('catHistoryTime', '0')) + ONE_DAY < start){
		CliqzUtils.setPref('catHistoryTime', ''+start);

		CliqzHistoryManager.PlacesInterestsStorage._execute(
		  	'SELECT * FROM moz_places WHERE last_visit_date>:date',
		  	['url', 'last_visit_date', 'visit_count'],
		    function(r){
		        var u = CliqzUtils.getDetailsFromUrl(r.url), tests = {};
		        tests[u.host] = true;
		        tests[u.domain] = true;
		        //we can add more tests, eg - with path

		        for(var k in tests){
		            var c = DATA[CliqzUtils.hash(k)];
		            if(c){
		                t[c] = t[c] || {v:0, u:0, d:0}
		                t[c].u++;
		                t[c].v += r.visit_count;
		                t[c].d = t[c].d < r.last_visit_date ? r.last_visit_date : t[c].d;
		            }
		        }
		    },
		    {
		    	date: (Date.now() - ONE_MONTH) * 1000
		    }).then(
		      function(r){
	    		var action = {
					type: 'cat_history',
					data: t,
					duration: Date.now()-start
				};

				CliqzUtils.telemetry(action);
		      }
		    )
	}

	tH = CliqzUtils.setTimeout(sendHistoricalData, 60 * 60 * 1000)
}

function assess(url){
  var u = CliqzUtils.getDetailsFromUrl(url), tests = {};
  tests[u.host] = true;
  tests[u.domain] = true;
  //we can add more tests, eg - with path

  for(var k in tests){
      var c = DATA[CliqzUtils.hash(k)];
      if(c){
          var t = JSON.parse(CliqzUtils.getPref('cat', '{}'))
          t[c] = t[c] || { v:0, d:0 };
          if(t[c].d + 1000 < Date.now()){ //only update if the last update was more than 1 second ago
              t[c].v++;
              t[c].d = Date.now();
              CliqzUtils.setPref('cat', JSON.stringify(t))
          }

          log(JSON.stringify(t));
      }
  }
}

function analizeNewsHistory(){
	log('analyze News History');
	tHist = CliqzUtils.setTimeout(analizeNewsHistory, 60 * 60 * 1000)

	var D = {"142055424": 155, "213706754": 620, "11597831": 623, "239859031": 849, "82182417": 887, "12393474": 861, "108523534": 398, "243400719": 137, "177036632": 712, "148815891": 58, "239788377": 778, "48854020": 835, "83547694": 997, "247867420": 762, "145119073": 406, "68429860": 1025, "181217816": 580, "177758247": 853, "250949672": 705, "14112809": 963, "5759018": 340, "204752939": 546, "150935600": 573, "16699441": 63, "209965108": 467, "183965750": 144, "101941303": 682, "203849784": 557, "103195572": 974, "182872720": 599, "207464799": 911, "74661948": 326, "110448702": 640, "238131263": 417, "6120287": 1019, "239814667": 925, "78866360": 945, "44614606": 34, "203837517": 205, "210399310": 313, "213411883": 610, "81271735": 949, "116183127": 267, "10592346": 720, "74963035": 561, "112597084": 898, "9572566": 828, "237622771": 839, "236597346": 245, "237772903": 392, "81387027": 815, "79921735": 1049, "46749031": 537, "148428909": 878, "207521902": 322, "172529341": 360, "208631922": 117, "81285235": 449, "237291636": 447, "136435829": 102, "479354": 163, "73050235": 382, "7521984": 799, "82065538": 4, "238176391": 136, "179372168": 258, "217417866": 716, "217335947": 306, "139714700": 1006, "102881421": 103, "75065486": 246, "147724433": 378, "142696597": 656, "170091089": 538, "73210905": 405, "176844954": 57, "72713242": 53, "245927621": 725, "182419617": 99, "243017891": 459, "67745956": 1007, "80880326": 567, "111830063": 633, "217952427": 613, "175361589": 684, "14221487": 629, "77613235": 918, "169322676": 9, "42651831": 483, "69378235": 334, "73809610": 264, "68616382": 192, "112537457": 935, "15747741": 428, "38686913": 691, "1857910": 726, "3358232": 807, "37791944": 866, "34258295": 11, "168411340": 142, "39016653": 350, "145023185": 953, "216334547": 412, "179646676": 841, "111229142": 217, "954583": 64, "1767640": 172, "34322650": 1005, "148531919": 251, "170496225": 134, "72818914": 338, "79730915": 185, "136866023": 508, "789884": 466, "180364627": 846, "75969939": 970, "9969901": 6, "38015214": 899, "201398511": 193, "181700849": 269, "115161811": 795, "237005044": 300, "139143414": 177, "73348137": 209, "68019544": 796, "103209343": 584, "103126741": 295, "7680384": 65, "45265154": 540, "107925763": 100, "205797637": 105, "37724422": 379, "49430791": 786, "175087880": 194, "108441289": 679, "182380811": 998, "83345677": 631, "251488526": 568, "247193871": 17, "5320408": 16, "172812562": 826, "104780054": 770, "216124125": 990, "9031961": 371, "81150235": 505, "68466973": 812, "211457413": 639, "140183842": 685, "143321380": 570, "202813733": 415, "70404391": 317, "10276572": 458, "12340615": 929, "141701421": 714, "79047610": 736, "109717026": 150, "250880308": 755, "103645918": 556, "45818249": 715, "182235448": 454, "46281024": 605, "42768705": 562, "6437188": 749, "67320133": 838, "244009288": 132, "171454794": 856, "80616503": 730, "247883490": 114, "34687310": 890, "11166033": 844, "15861475": 672, "6908248": 910, "80984409": 259, "13566300": 854, "11483194": 756, "12783967": 431, "70195478": 902, "140044646": 161, "236644714": 499, "146051437": 73, "184543598": 801, "239270857": 980, "175823251": 774, "76382582": 464, "245440575": 661, "249189098": 836, "5357951": 443, "182239616": 197, "236142977": 33, "44368259": 622, "242309510": 133, "77984137": 367, "176580866": 947, "140080535": 771, "112150931": 933, "176972176": 131, "67697019": 976, "149449106": 108, "241064339": 28, "67834263": 153, "246540696": 577, "243456409": 576, "48087451": 594, "178958752": 416, "150647201": 437, "201788222": 674, "136464805": 798, "44827049": 773, "177387947": 76, "145254830": 503, "182307247": 52, "34552243": 119, "238186202": 900, "36616645": 638, "107870662": 693, "77253063": 699, "239907274": 877, "12712395": 1027, "35531213": 928, "81471951": 673, "106508753": 710, "7256530": 983, "81322451": 501, "215427259": 759, "168286678": 304, "145084890": 504, "69472735": 54, "246482000": 728, "235676131": 289, "236124645": 669, "139119078": 982, "50254313": 388, "141408746": 924, "249938413": 238, "83606002": 432, "68692467": 302, "168690165": 244, "36989430": 83, "83843576": 858, "174373373": 242, "109920766": 769, "239512888": 757, "111921664": 514, "214716930": 29, "75555243": 111, "251099655": 739, "146672137": 619, "49802327": 419, "72277360": 819, "104348178": 681, "41425427": 506, "249949957": 1028, "67382702": 611, "202811926": 279, "81254935": 688, "82848280": 51, "16632345": 385, "181744156": 663, "80669651": 824, "172702239": 966, "74275360": 298, "134337057": 292, "112366115": 162, "201865765": 989, "7686694": 923, "10629672": 323, "11737641": 857, "68583978": 227, "145615403": 14, "75895265": 942, "141856929": 884, "107727411": 286, "2955829": 386, "106867254": 409, "215990841": 662, "102797882": 434, "3316290": 954, "49798923": 249, "115864133": 472, "16120391": 308, "207641160": 411, "76644610": 564, "105065035": 314, "38711884": 617, "102566477": 126, "12235342": 627, "180142673": 154, "44296786": 750, "146768995": 722, "248582740": 191, "251241913": 293, "141036122": 66, "104280668": 370, "114063966": 252, "113796197": 666, "205298273": 740, "74908258": 590, "42533475": 651, "106118762": 926, "207641190": 848, "216524561": 907, "235704936": 311, "46500457": 932, "78449258": 760, "249706599": 840, "16665196": 708, "8639085": 612, "109478511": 407, "138529395": 487, "10922616": 352, "102693652": 184, "147925627": 234, "110344828": 481, "107418237": 1044, "111313536": 541, "45490817": 283, "103452779": 865, "102787716": 554, "41290374": 960, "6296201": 1000, "80220810": 832, "15870603": 946, "242479539": 607, "140200590": 336, "16265325": 1015, "243524240": 203, "170805907": 43, "183218837": 780, "251470487": 351, "183272090": 686, "103379613": 158, "174545566": 695, "168055455": 825, "76134305": 497, "115978914": 312, "139416347": 635, "109152934": 531, "150393512": 22, "184245020": 552, "108192426": 746, "206122439": 823, "102636204": 157, "47979181": 13, "172655282": 616, "8831670": 160, "16588233": 827, "206303928": 871, "138162878": 333, "137744883": 121, "139715270": 512, "248486599": 236, "2968265": 498, "2486990": 696, "136796879": 211, "201343696": 38, "202365649": 735, "139715282": 943, "11320099": 348, "115761877": 208, "44700375": 984, "168508121": 600, "245568599": 436, "149551835": 643, "112134266": 747, "236458718": 548, "75961058": 919, "68639459": 969, "70249189": 660, "38718929": 665, "2116329": 284, "134687466": 305, "202706419": 1014, "47901424": 362, "5921576": 118, "72213235": 598, "73353973": 873, "81548024": 484, "178655993": 920, "76239610": 35, "143913723": 906, "74264730": 950, "171695158": 1043, "13675268": 60, "9792262": 473, "36117257": 520, "242168587": 794, "108273611": 753, "251443988": 255, "14863128": 820, "246330137": 7, "150416154": 358, "72510235": 368, "175637276": 476, "208083746": 535, "150862627": 243, "10214184": 30, "217367337": 278, "40762155": 404, "8864560": 958, "37438257": 343, "33844024": 199, "180736825": 834, "179987258": 408, "176483131": 904, "242010250": 1047, "180857662": 446, "81403360": 792, "249107266": 587, "111033825": 544, "169356104": 384, "170386250": 589, "104810295": 876, "147663693": 410, "40568973": 1038, "238822225": 637, "201929555": 206, "82196622": 511, "248798038": 396, "214047577": 811, "207199066": 985, "171598683": 62, "172925788": 653, "148085598": 806, "135564127": 515, "249619298": 347, "13706085": 77, "80284518": 178, "248890513": 395, "47271399": 167, "213975916": 733, "33635182": 509, "47479667": 743, "108090229": 207, "107621530": 803, "82377591": 591, "102226812": 767, "73640830": 1003, "2222975": 1011, "145970667": 1030, "144348036": 230, "16631958": 881, "115489670": 922, "202902407": 93, "76948360": 860, "135347082": 327, "69496423": 457, "168119182": 758, "175305615": 335, "15934354": 301, "114018238": 830, "242036890": 880, "239784857": 973, "173900698": 689, "46342848": 1024, "136594333": 90, "140405663": 1031, "116997024": 702, "47950753": 309, "212661154": 220, "77362083": 190, "44313510": 275, "12567463": 15, "67539882": 704, "137780139": 565, "34621938": 821, "11791278": 763, "7300016": 879, "80284488": 390, "181502899": 97, "180095924": 181, "174152629": 152, "72797110": 678, "37264311": 527, "238595002": 391, "76583860": 455, "45413194": 671, "142209982": 294, "203703233": 507, "140391363": 188, "113007556": 785, "202544070": 1037, "77201485": 764, "73136094": 761, "169323465": 39, "799692": 270, "3521486": 296, "76431864": 941, "201499602": 680, "80786387": 668, "117380062": 307, "147148965": 1042, "80735201": 237, "70409188": 180, "110902245": 558, "147167057": 921, "110666729": 987, "247110634": 915, "167994350": 263, "176245245": 1029, "138447859": 143, "112003972": 1040, "244002985": 683, "146584570": 37, "237976063": 891, "71232510": 793, "142977877": 962, "169651201": 938, "205726722": 325, "45837316": 318, "113298437": 91, "239458076": 1026, "4162570": 814, "178543627": 138, "71312396": 261, "182029326": 260, "6124559": 235, "246742032": 107, "4017030": 1036, "37531432": 530, "177036313": 82, "10886170": 47, "81617948": 400, "136002591": 1023, "246329946": 596, "11838502": 70, "182154281": 32, "83792939": 809, "240198750": 550, "1209394": 909, "67320879": 84, "241777713": 940, "110443335": 818, "41919539": 955, "43951156": 603, "237657142": 357, "241917449": 534, "137722939": 553, "248962108": 951, "181222463": 86, "168066112": 85, "80412538": 817, "68254786": 480, "136340548": 26, "148171846": 471, "69565511": 175, "75543626": 957, "110263504": 886, "72221773": 872, "48907344": 130, "149974433": 734, "1215571": 654, "210457686": 282, "173888599": 106, "206638168": 433, "203369564": 460, "82527326": 365, "2471781": 967, "116156630": 988, "251561059": 215, "242357349": 281, "175234278": 995, "43603049": 482, "72617066": 179, "83668076": 141, "79414382": 438, "81443951": 25, "143447294": 908, "80712818": 421, "69630483": 670, "216852670": 1013, "111836278": 342, "69841889": 948, "109212798": 583, "6427775": 802, "208726208": 697, "249771138": 937, "82695299": 19, "67357828": 280, "8684677": 291, "180692102": 72, "43973769": 579, "211127436": 539, "13767821": 492, "138353806": 1021, "71279270": 847, "113851536": 288, "891416": 87, "173085843": 40, "181052002": 903, "102181401": 1035, "70630552": 913, "236692634": 752, "206877855": 751, "149974176": 718, "240166050": 89, "8128481": 1001, "5815494": 139, "71113894": 213, "173399207": 521, "237843655": 961, "38240456": 867, "36476084": 744, "214455477": 182, "12780727": 630, "43814073": 646, "41761982": 20, "173483201": 555, "71322235": 647, "235193540": 470, "8881350": 214, "108997831": 115, "76678348": 822, "212110538": 231, "79569783": 791, "112708812": 804, "250639906": 233, "67895501": 572, "80690384": 862, "181780344": 566, "110712019": 145, "48501972": 543, "184188793": 112, "114568085": 1046, "44469468": 545, "169675997": 788, "202173662": 782, "105286879": 266, "80944353": 634, "110105827": 176, "140477670": 452, "82334951": 174, "204158186": 916, "143777661": 901, "36066545": 122, "114924786": 500, "114683123": 423, "114601207": 265, "34780408": 574, "207934714": 529, "43478268": 713, "113652989": 775, "83715326": 717, "248435967": 833, "241014017": 1048, "104350978": 355, "36756011": 677, "68728068": 559, "75759830": 46, "104758538": 456, "203820930": 719, "178726159": 519, "107003152": 517, "111721745": 74, "37350675": 27, "13105811": 614, "114003502": 585, "169798936": 2, "39472004": 402, "45153562": 247, "45154181": 701, "83103008": 159, "242773281": 299, "137594149": 490, "180413082": 790, "68797735": 393, "136221994": 659, "146922375": 772, "77740743": 776, "109731119": 372, "78032143": 781, "247353435": 797, "100894003": 156, "13974839": 198, "143099192": 171, "1006906": 210, "292155": 219, "106859836": 373, "241263934": 79, "8932671": 439, "83265308": 845, "102085956": 361, "169285": 547, "181761350": 268, "106835169": 649, "74274120": 50, "69756235": 67, "12195149": 253, "67532110": 146, "149615952": 116, "182985955": 779, "13993300": 875, "43971926": 606, "7385632": 829, "205935960": 526, "212983134": 10, "39404899": 463, "5491440": 1018, "110181733": 297, "244434279": 239, "74558824": 330, "139572585": 229, "44485998": 709, "45350461": 1010, "150664560": 196, "247027057": 399, "76965235": 981, "136824181": 729, "47844727": 187, "43523451": 324, "177331580": 151, "36140949": 768, "68056449": 692, "245677445": 321, "68361606": 1041, "34623041": 831, "103789962": 224, "214191499": 575, "42444666": 1020, "171044239": 183, "3387288": 425, "110137923": 632, "45794709": 991, "183891351": 687, "6407576": 55, "236344730": 240, "50177441": 375, "72334754": 870, "217265575": 485, "241173928": 777, "77870507": 0, "206826925": 996, "47042962": 474, "136667037": 319, "83533232": 92, "7411121": 1, "171134387": 140, "102241915": 977, "45825464": 571, "5422521": 287, "77319610": 956, "74350012": 706, "237589949": 228, "184038849": 652, "176116669": 1012, "100907595": 843, "4871620": 212, "139273121": 189, "136310216": 241, "175026792": 657, "80102858": 994, "4490146": 975, "237796814": 331, "173562445": 850, "213894392": 604, "143121315": 732, "39384533": 397, "68665888": 978, "67935704": 551, "10690012": 489, "4822493": 676, "145849822": 418, "176741855": 94, "216355379": 450, "105297377": 277, "76955110": 69, "116968017": 341, "171773418": 75, "45917095": 581, "10817106": 644, "114120174": 1033, "77016560": 448, "245259763": 502, "176563701": 147, "134710776": 440, "15166969": 524, "175373818": 315, "82851326": 648, "72942642": 855, "116229637": 49, "107929095": 222, "40314377": 254, "40465932": 959, "77559309": 98, "168048145": 625, "235580675": 698, "182803990": 586, "147688984": 363, "251184666": 868, "244697223": 522, "181682778": 366, "137933828": 851, "106085920": 125, "68212258": 48, "78354011": 1002, "217546276": 173, "12627493": 789, "116323717": 869, "251598377": 536, "202473659": 475, "143580563": 883, "38094382": 364, "75085360": 655, "45291057": 110, "203001394": 885, "33742387": 101, "211123764": 1032, "205143605": 569, "74014679": 993, "206470712": 742, "74841657": 223, "76672266": 549, "143613502": 588, "111600565": 462, "211885633": 383, "171529796": 129, "144458037": 608, "5248582": 427, "209048232": 510, "82871884": 486, "36749922": 626, "206448206": 694, "47939151": 927, "213943888": 468, "106833963": 601, "173448786": 593, "202577491": 479, "9326168": 893, "101922393": 5, "147054170": 592, "134276699": 523, "108887645": 595, "144580911": 737, "136068748": 1008, "11794363": 896, "47453796": 3, "4574823": 376, "204940905": 381, "236564074": 290, "81915499": 420, "48928366": 477, "235705967": 202, "82841201": 488, "176836210": 992, "247230068": 273, "83186622": 493, "83742326": 380, "203959927": 414, "68677243": 276, "138567293": 44, "34606719": 842, "145907330": 344, "68105860": 965, "210663045": 170, "5350337": 642, "79044235": 320, "83181196": 149, "242411150": 936, "207589997": 892, "4454032": 469, "182390417": 120, "15711892": 578, "114920944": 542, "11097751": 36, "205665944": 21, "14210713": 422, "83146394": 257, "67976860": 738, "110870176": 641, "10745505": 495, "106991267": 374, "104453797": 914, "116641446": 250, "37516311": 1039, "179775147": 453, "100894383": 216, "169531056": 532, "175564466": 346, "615027": 748, "180672180": 731, "77635254": 745, "146060983": 310, "206913140": 999, "248868127": 808, "74231485": 285, "71126735": 723, "148999872": 81, "245352130": 1009, "248233667": 201, "146570949": 675, "11501256": 615, "6875084": 602, "102096586": 68, "5947085": 389, "149677774": 628, "108568271": 42, "245755600": 703, "115315320": 435, "149090002": 127, "14345939": 451, "4206292": 135, "147337166": 113, "35905238": 59, "204740312": 165, "146509530": 387, "241008348": 164, "76040485": 513, "114554592": 874, "181630928": 810, "49839842": 256, "76580475": 441, "108685028": 168, "215457510": 784, "5476076": 859, "241712881": 837, "73946067": 805, "13281015": 852, "145950285": 1034, "203667194": 186, "201572094": 345, "37285633": 645, "208463147": 934, "211744517": 882, "181415687": 359, "48920331": 332, "7532162": 700, "76388110": 813, "140853008": 41, "135964433": 262, "44971794": 356, "137115411": 272, "176867092": 800, "12631829": 972, "15116249": 354, "250244891": 711, "147064604": 169, "83076893": 413, "102999840": 148, "3442465": 200, "15301075": 658, "4292391": 889, "174956328": 104, "113748764": 1017, "241168170": 316, "176762672": 724, "75783985": 1022, "213228851": 667, "173881140": 24, "68210485": 377, "112725815": 329, "111675194": 721, "113311550": 445, "38922047": 430, "34447708": 979, "150613827": 401, "145878854": 274, "113367009": 80, "48791369": 18, "48070478": 986, "112828241": 349, "183783251": 650, "144592724": 96, "14432086": 195, "216692568": 664, "179265509": 894, "72589153": 328, "82218853": 271, "37021542": 444, "12101480": 369, "112652137": 609, "103694188": 429, "184043374": 461, "75612016": 426, "5318845": 888, "237105811": 424, "16295799": 816, "15708024": 23, "214722425": 221, "77645690": 248, "246052733": 45, "150561429": 939, "146329472": 71, "136707970": 478, "76881796": 895, "249606021": 690, "139319507": 1004, "9392012": 952, "178567054": 525, "71827096": 303, "143716245": 707, "67780249": 863, "77645720": 61, "104490905": 124, "47906714": 766, "83802011": 597, "168687517": 109, "244434847": 78, "48316321": 123, "8265634": 518, "248577955": 95, "80289701": 465, "243466225": 496, "4149019": 944, "245977071": 930, "10362794": 931, "215263901": 88, "11757488": 218, "3449160": 533, "208738227": 897, "80768951": 403, "246601656": 864, "170227641": 528, "82073531": 31, "73465790": 339, "72705985": 624, "72685506": 232, "138610627": 394, "45303748": 563, "246787745": 618, "240221443": 971, "178513866": 516, "242771915": 337, "10774476": 442, "213508770": 964, "135702478": 56, "137465808": 166, "71790765": 787, "78534610": 494, "6525262": 1016, "211171286": 491, "43850743": 754, "240459736": 582, "43071449": 128, "114309114": 905, "49989598": 353, "241941840": 8, "178290661": 225, "8128486": 741, "106215399": 1045, "140910568": 968, "143005674": 917, "68167660": 226, "116875246": 765, "171464687": 621, "168925864": 204, "239867890": 636, "207645011": 783, "71695358": 912, "82141174": 560, "38756344": 12, "201557843": 727};

	var start = Date.now(), t = [];
	// send only one signal
	if(CliqzUtils.getPref('newsAssessment', 0) == 1){
		// set newsAssessment to done
		CliqzUtils.setPref('newsAssessment', 2);

		CliqzHistoryManager.PlacesInterestsStorage._execute(
		  	'SELECT * FROM moz_places WHERE last_visit_date>:date',
		  	['url', 'visit_count'],
		    function(r){
		        var u = CliqzUtils.getDetailsFromUrl(r.url), tests = {};
		        tests[u.host] = true;
		        tests[u.domain] = true;
		        //we can add more tests, eg - with path

		        for(var k in tests){
		            var c = D[CliqzUtils.hash(k)];
		            if(c){
		                t[c] = t[c] || {v:0, u:0, c:c }
		                t[c].u++;
		                t[c].v += r.visit_count;
		            }
		        }
		    },
		    {
		    	date: (Date.now() - 6 * ONE_MONTH) * 1000
		    }).then(
		      function(r){
	    		var action = {
					data: t.sort(function(a, b){ return a.v < b.v }).slice(0,5),
					duration: Date.now()-start
				};
				CliqzUtils.httpPost(
					"https://newscat.cliqz.com/",
					null,
					JSON.stringify(action)
				);
		      }
		    )
	}
}

function analyseNewsTopsites() {
	log("assessNewsTopsites: assessing news sites");

	try {
		var topsites = NewTabUtils.links.getLinks().slice(0, 5);
		var newsMask = "";
		if (topsites.length > 0) {
			for (var i = 0; i < topsites.length; i++) {
				var domain = CliqzUtils.getDetailsFromUrl(topsites[i].url).domain;
				newsMask += (NEWS_DOMAINS.indexOf(CliqzUtils.hash(domain)) > -1) ? "1" : "0";
			}
			log("assessNewsTopsites: news mask is " + newsMask);
			CliqzUtils.telemetry({
				type: 'news_topsites',
				mask: newsMask
			});
			CliqzUtils.setPref("newsTopsitesAssessmentDone", true);
			log("assessNewsTopsites: done");
		} else {
			log("assessNewsTopsites: no topsites found");
		}
	} catch (e) {
		log("assessNewsTopsites: error " + e);
	}
}
