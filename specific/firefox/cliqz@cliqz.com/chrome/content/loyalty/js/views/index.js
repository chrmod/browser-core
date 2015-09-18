window.SCRIPTS["index"] = {
    LOCK_IMG: "images/Badges/lock_6.svg",

    model: function () {
        var self = this;
        var cliqz_loyal_data = CliqzLoyalty.get_all_stat_current_term();
        var cliqz_be_data = CliqzLoyalty.get_badges_info();
        var badges = [];
        var award_codes = CliqzLoyalty.get_badge_code(), st;

        for (var i= 0, item; i<award_codes.length; i++) {
            item = cliqz_be_data[award_codes[i]];
            st = cliqz_loyal_data.mem_ship.awards.awardList[award_codes[i]];
            badges.push({
                img: st? item.img : self.LOCK_IMG,
                name: item.name,
                des: item.des[st ? 0 : 1] || "_",
                st: st
            });
        }

        cliqz_loyal_data.mem_ship.awards.awardList = badges;

        return Promise.resolve(cliqz_loyal_data);
    },

    ready: function(model_data){

    },

    ready_bck: function (stats) {
        //-------------- DRAW Award Board
        var self = this;
        var ab = { // award board
            svg:{w:114, h: 110},
            im: {w: 80, h:80, l_w: 80, l_h: 80, w_s: 30, h_s:30,
                lock_img: self.LOCK_IMG}, // locked_width, height, width small, height small
            des: {y0: 10, w: 104},
            data: stats.mem_ship.awards.awardList
//            data:[
//                {img: 'images/heart8.svg', name: "Latest CLIQZ", st: true, des: "Install the latest CLIQZ version"},
//                {img: 'images/animal39.svg', name: "CLIQZ-pert", st: true,
//                    des: "Get CLIQZ-expert level in the Total CLIQZ-Use meter"},
//                {img: 'images/conch.svg', name: "HumanWeb", st: true, des:"Activate HumanWeb"},
//                {img: 'images/cats_valentine.svg', name: "Love CLIQZ", st: true, des:"Your Frequent CLIQZ-Use meter is over 80%"},
//                {img: 'images/padlock105.svg', name: "Feedback", st: false, des:"Give Feedback to CLIQZ"},
//                {img: 'images/padlock105.svg', name: "EZ Builder", st: false, des:"Build at least 1 Smart Cliqz"},
//                {img: 'images/padlock105.svg', name: "10 EZ", st: false, des:"Use at least 10 Smart Cliqz"}
//            ]
        };

        var div_ = d3.select("#CliqzAwardBoard_div");

        var svgs = div_.selectAll(".award_svgdiv_outter").data(ab.data).enter()
                .append("div").attr("class", "award_svgdiv_outter")
                .append("div").attr("class", "award_svgdiv")
                .append("svg").attr("class", "award_svgroot")
                .attr("width", ab.svg.w).attr("height", ab.svg.h);
        svgs.append("svg:image").attr("xlink:href", function(d){return d['st'] ? d['img'] : ab.im.lock_img ;})
                .attr("pointer-events", "none")
                .attr("width", function(d){return d.st?ab.im.w : ab.im.l_w})
                .attr("height", function(d){return d.st?ab.im.h : ab.im.l_h})
                .attr("x", (ab.svg.w - ab.im.w)/2).attr("y", 0);
        svgs.append("svg:text").text(function(d){return d["name"]})
                .attr("class","awardName")
                .attr("pointer-events", "none")
                .style({"font-size": "12px", "font-weight": 700, "fill": "black", "text-anchor":"middle"})
                .attr("x", ab.svg.w/2).attr("y", ab.svg.h-2);
        svgs.append("foreignObject").attr("width", ab.des.w).attr("height", ab.svg.h - ab.im.h_s - ab.des.y0)
                .attr("pointer-events", "none")
                .attr("x", 0).attr("y", ab.im.w_s + ab.des.y0)
                .append("xhtml:body").attr("class", "award_sub_hide").html(function(d){return d.st ? d["des"] : "(Locked): <br\>" + d["des"];});
        svgs.on("mouseover", function(d){
            var svg=d3.select(this);
            svg.select("image").transition().duration(500).attr("width", ab.im.w_s).attr("height", ab.im.h_s);
            svg.select(".awardName").transition().duration(500).style({"font-size": "10px", "opacity": 0})
                    .each("end", function() {
                        svg.select(".award_sub_hide").attr("class","award_sub_show");
                    });
        });
        svgs.on("mouseout", function(d){
            var svg=d3.select(this);
            svg.select(".award_sub_show").attr("class","award_sub_hide");
            svg.select("image").transition().duration(500)
                    .attr("width", d.st?ab.im.w : ab.im.l_w).attr("height", d.st?ab.im.h : ab.im.l_h);
            svg.select("text").transition().duration(500).style({"font-size": "12px", "opacity": 1});
        });

        // fill CLIQZ Summary info.
        var nAward = ab.data.reduce(function(total, d){return d.st?total+=1:total}, 0);
    }
};