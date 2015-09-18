window.SCRIPTS["results-usage"] = {
    current_shown_term : null,
//    current_usage_charts_cfg: null,
    stats: null,

    model: function(){
        var cliqz_loyal_data = CliqzLoyalty.get_all_stat();
        // Best-record in Cliqz Usage meter:
        //cliqz_loyal_data.meter_total_use.break_best_record = cliqz_loyal_data.data.resultsCliqz.total > cliqz_loyal_data.meter_total_use.metric[cliqz_loyal_data.meter_total_use.metric.length-1].val; 17Oct2015 - new decision: not to show congrat box, automatically update this record (users don't need to contact us)
        cliqz_loyal_data.meter_total_use.break_best_record = false;

        // prepare additional data for previous quarters
        var pr = cliqz_loyal_data.data.previous;
        var term_list = Object.keys(pr).sort(function(a,b){return (a.length-b.length) || (a-b);});

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

        // the name of the term (e.g. Jan-Mar '15)
        cliqz_loyal_data.data["pre_term_list"] = term_list.map(function(term_idx){
            pr[term_idx]["meta"]["term_name"] = months[pr[term_idx]["meta"]["ms"][0]] + "-" + months[pr[term_idx]["meta"]["ms"][2]] + " '"+pr[term_idx]["meta"]["y"]%100;
            return {
                "meta": pr[term_idx]["meta"],
                "term_idx": term_idx
            };
        });


        CliqzUtils.log(cliqz_loyal_data, 'THUY------ data for result_usage');

        return Promise.resolve(cliqz_loyal_data);
    },

    ready: function (stats){
        var self = window.SCRIPTS["results-usage"];
        var el = document.getElementById("cqz-usage-cur-term");
        self.current_shown_term = el;
        el.style.backgroundColor = "#006567";

        self.draw_charts(stats);
        self.stats = stats;
    },

    //------------ NORMAL (no d3 svg) EVENT HANDLERS ---------------//

    navigate_terms: function (el, term_idx){
        CliqzUtils.log(term_idx,"THUY----- clicking");
        var self = window.SCRIPTS["results-usage"];
        el.style.backgroundColor = "#006567";
        if (self.current_shown_term && self.current_shown_term !==el)
            self.current_shown_term.style.backgroundColor = "#A8D8D1";
        self.current_shown_term = el;

        self.draw_usage_charts(term_idx === null ? self.stats.data : self.stats.data.previous[term_idx] );
    },

    //------------ Chart (d3.js svg) drawing ---------------//

    draw_charts: function(stats){
        var self = window.SCRIPTS["results-usage"];
        self.draw_usage_charts(stats.data);
        self.draw_your_vs_others_charts(stats);
    },

    draw_usage_charts: function(stats_term){
        /*
        This is V2 of pie charts, without animation when hovering over the charts, and each pie is in one div
         */
        var usage = {
            data: [
                {'data': [
                        {'val': stats_term.resultsCliqz.total, 'til': ["Mit", "CLIQZ"]},
                        {'val': stats_term.resultsGoogle, 'til': ["Mit anderen", "Suchmaschinen"]}
                    ],
                    'center_name': ['ABSOLUTE', 'SUCHANFRAGEN'],
                    'name': 'CLIQZ-Nutzung'
                },  // use, not use Cliqz result
                {'data': [
                        {'val': stats_term.resultsCliqz.active, 'til': ["Mit", "Dropdown-Auswahl"]},
                        {'val': stats_term.resultsCliqz.auto, 'til': ["Mit", "Autocomplete"]}
                    ],
                    'center_name': ['CLIQZ', 'SUCHANFRAGEN'],
                    'name': 'CLIQZ-Vorschläge'
                },
                {'data': [
                        {'val': stats_term.resultsCliqz.bigMachine, 'til': ["Mit", "einfachem Ergebnis"]},
                        {'val': stats_term.resultsCliqz.ez, 'til': ["Mit", "SmartCliqz"]},
                        {'val': stats_term.resultsCliqz.history, 'til': ["Mit", "Chronik"]}
                    ],
                    'center_name': ['CLIQZ', 'AUSWAHL'],
                    'name': 'CLIQZ-Ergebnisse'
                }
            ],

            width: 410, height: 310, R: 90, R2: 57,
            x0: null, y0: 80,
//            g: 150,
            pie_CvsG: null, // pie_CvsG = Cliqz vs Gooogle
            svg: null
        };
        usage.x0 = usage.width/2;

        window.SCRIPTS["results-usage"].current_usage_charts_cfg = usage;

        usage.pie_CvsG = new CliqzUsePieChart_V2(usage.R, usage.R2);  // pie_CvsG = Cliqz vs Gooogle

        var div_ = d3.select("#cqz_usage_charts");
        div_.selectAll("*").remove();

        var svgs = div_.selectAll(".svgdiv").data(usage.data).enter()
                .append("div").attr("class", "svgdiv")
                .append("svg").attr("width", usage.width).attr("height", usage.height);

        svgs.append("svg:g")
            .attr("transform", function (d, i) {
                return "translate(" + usage.x0 + "," + (usage.y0 + usage.R) + ")";
            })
            .each(function (d) {
                usage.pie_CvsG.drawPie(d3.select(this), d);
            });
    },

    draw_usage_charts_v1: function(stats_term){
        // ------------- draw pie chart for user's data------------------//
        /*
        This is V1 (1st) of pie charts, with animation when hovering over the charts and subtitle appears
         */
        var usage = {
            data: [
                {'data': [
                        {'val': stats_term.resultsCliqz.total, 'til': "Cliqz Used",
                            'st': "In the past 30 days, you have made {0} searches. <br/>{1} of the time, you used CLIQZ ({2} times).<br/> <i>The 2.chart shows further details of used Cliqz.</i>",
                            'get_st': function () {
                                return String.format(this.st, ('' + this['extra']['total'] || '-'), Math.round(100 * this["val"] / this['extra']['total']) + '%', this.val + '');
                            }
                        },
                        {'val': stats_term.resultsGoogle, 'til': "Not Cliqz",
                            'st': "In the past 7 days, you have made {0} searches. <br/>You did not use CLIQZ for {1} results.",
                            'get_st': function () {
                                return String.format(this.st, ('' + this['extra']['total'] || ''), this.val + '');
                            }
                        }
                    ],
                    'name': 'CLIQZ USAGE'
                },  // use, not use Cliqz result
                {'data': [
                    {'val': stats_term.resultsCliqz.active, 'til': "Active",
                        'st': "Among {0} times you used CLIQZ, {1} times you used the <b>drop-down window results</b>. <br/> <i>The 3.chart shows details about result-types you used.</i>",
                        'get_st': function () {
                            return String.format(this.st, ('' + this['extra']['total'] || ''), this.val + '');
                        }},
                    {'val': stats_term.resultsCliqz.auto, 'til': "Autocomplete",
                        'st': "Among {0} times you used CLIQZ, {1} times you used <b>autocomplete</b>.",
                        'get_st': function () {
                            return String.format(this.st, ('' + this['extra']['total'] || ''), this.val + '');
                        }
                    }
                ],
                    'name': 'INTERACTION TYPES'},
                {'data': [
                    {'val': stats_term.resultsCliqz.bigMachine, 'til': "Basic Result",
                        'st': "Among {0} times you used CLIQZ results in the drop-down window, {1} times you used the <b>Basic Results</b>.",
                        'get_st': function () {
                            return String.format(this.st, ('' + this['extra']['total'] || ''), this.val + '');
                        }},
                    {'val': stats_term.resultsCliqz.ez, 'til': "SmartCliqz",
                        'st': "Among {0} times you used CLIQZ results in the drop-down window, {1} times you used <b>Smart Cliqz</b>.",
                        'get_st': function () {
                            return String.format(this.st, ('' + this['extra']['total'] || ''), this.val + '');
                        }},
                    {'val': stats_term.resultsCliqz.history, 'til': "History",
                        'st': "Among {0} times you used CLIQZ results in the drop-down window, {1} times you used <b>Cliqz History</b>.",
                        'get_st': function () {
                            return String.format(this.st, ('' + this['extra']['total'] || ''), this.val + '');
                        }}
                ],
                    'name': 'RESULT TYPES'}
            ],

            width: 1050, height: 350, R: 90, R2: 57,
            x0: 75, g: 150, y0: 70,
            pie_CvsG: null, // pie_CvsG = Cliqz vs Gooogle
            svg: null
        };

        usage.pie_CvsG = new CliqzUsePieChart(usage.R, usage.R2);  // pie_CvsG = Cliqz vs Gooogle

        usage.svg = d3.select("#rootSVG");
        usage.svg.selectAll("*").remove();
        usage.svg.attr("width", usage.width).attr("height", usage.height)
            .selectAll(".CLQ_USESAGE_gPie").data(usage.data).enter().append("svg:g")
            .attr("class", "CLQ_USESAGE_Pie")
            .attr("transform", function (d, i) {
                return "translate(" + (usage.x0 + i * (usage.g + usage.R + usage.R) + usage.R) + "," + (usage.y0 + usage.R) + ")";
            })
            .each(function (d) {
                usage.pie_CvsG.drawPie(d3.select(this), d);
            });
    },

    draw_your_vs_others_charts: function(stats){
        // ------------- draw bar charts for user's CLIQZ Usage vs top records------------------//
        var mt_CUse = {  // meter Cliqz Usage
            data: {
                user: {'val': stats.data.resultsCliqz.total},
                metric: stats.meter_total_use.metric,
                name: stats.meter_total_use.metric.name  //"Total Cliqz-Use"
            },

            width: 250, height: 450,
            bar_CU: null, // bar chart for Cliqz Usage meter
            svg: null
        };

        mt_CUse.svg = d3.select("#cliqz-use-meter_rootSVG").attr("width", mt_CUse.width).attr("height", mt_CUse.height);
        mt_CUse.bar_CU = new CliqzUseMeterBarChart();
        mt_CUse.bar_CU.draw(mt_CUse.svg, mt_CUse.data);

        // ------------draw pie chart Cliqz Frequent Use ---------------- remove in Aug. 2015//
//        var mt_CT = {  // meter Cliqz Frequent Use
//            data: {
//                name: "Frequent CLIQZ-Use",
//                val: stats.data.resultsCliqz.total,
//                norm: stats.data.resultsCliqz.total + stats.data.resultsGoogle
//            },
//
//            width: 200, height: 240, R: 70, R2: 50,
//            x0: 30, y0: 50,
//            pie_CT: null, // pie chart for Cliqz result Type
//            svg: null
//        };
//        mt_CT.pie_CT = new CliqzMeterPieChart(mt_CT.R, mt_CT.R2);
//        mt_CT.svg = d3.select("#cliqz-use-meter2_rootSVG").attr("width", mt_CT.width).attr("height", mt_CT.height)
//            .append("svg:g").attr("transform", String.format("translate({0}, {1})", mt_CT.x0 + mt_CT.R, mt_CT.y0 + mt_CT.R));
//        mt_CT.pie_CT.drawPie(mt_CT.svg, mt_CT.data);
    }
};

window.navigate_terms = window.SCRIPTS["results-usage"].navigate_terms;

