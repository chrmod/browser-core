/**
 * Created by thuy@cliqz.com on 27/05/15.
 * This is the library for all charts using for the loyalty program
 */


//-----------------------------------------------------------------------//
//---------------------------- HELPER FUNCTIONS --------------------------//
//-----------------------------------------------------------------------//

if (!String.format) {
  String.format = function (format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  };
}

/**-----------------------------------------------------------------------//
 //---------------------------- BAR CHARTS -------------------------------//
 //-----------------------------------------------------------------------//
 */
function CliqzUseMeterBarChart() {
  var self = this;
  self.x0 = 130;
  self.y0 = 50;
  self.x1 = 0;
  self.bar = {h: 350, w: 40, stl: {"fill": "rgb(252,200,221)", "stroke": "none"},
    align_st: {"stroke": "rgb(49,130,189)", "stroke-width": 1, "stroke-dasharray": "5,5", "fill": "none"}};
  self.axis = {spacing: 3, // spacing between elements, e..g the tick - text - icon
    x0_left: 5, w: 10, stl: {"fill": "none", "stroke": "#f8458f", "stroke-width": 1},
    txtl_stl: {"fill": "#f8458f", "text-anchor": "end"}, // text left style , "font-size": '12px'
    icon: {w: 22, h: 22}  // the icon on the left of the y-axis text (if any icon)
  };
  self.bname = {  y0: 55,
    st: {"fill": "#333333", "text-anchor": "middle"},
    cl: "chart_name"
  };
  self.val_bar = {
    x0: 20,
    ar: {w: 7, h: 14}, // arrow
    al_st: {"stroke": "#f8458f", "stroke-width": 1}, // align bar style  , "stroke-linecap":"round"
    txt_stl: {"fill": "#f8458f", "text-anchor": "start", "font-weight": 700},
    area_stl: {"fill": "#f8458f"}
  }
}

CliqzUseMeterBarChart.prototype.draw = function (svg, data) {
  var self = this;
  var user = data["user"];
  var metric = data["metric"], total = Math.max(metric[metric.length - 1]["val"], user["val"]);
  var bar_name = data["name"];
  // ------------ prepare data
  metric.forEach(function (d) {
    d["y"] = Math.round(self.y0 + self.bar.h - d["val"] * self.bar.h / total);
  });
  user["height"] = Math.round(user["val"] * self.bar.h / total);
  user["y"] = Math.round(self.y0 + self.bar.h - user["height"]); // todo: check the out of bound case!!

  // ------------ draw the bar
  svg.append("svg:rect").attr("x", self.x0 + self.x1).attr("y", self.y0).attr("width", self.bar.w).attr("height", self.bar.h).style(self.bar.stl);

  //   the y-grid line
//    svg.selectAll(".barAlign").data(metric).enter().append("svg:path").attr("class","barAlign")
//        .attr("d", function(d){
//            return String.format("M{0} {1} H{2}", ''+(self.x0+self.x1), ''+d["y"], ''+(self.x0+self.x1+self.bar.w));
//        })
//        .style(self.bar.align_st);

  // ----------- draw the y axis
//    svg.append("svg:path").attr("d", function(){return String.format("M{0} {1} V{2}", ''+self.x0, ''+self.y0, ''+(self.y0+self.bar.h));}).style(self.axis.stl);
  var ticks = svg.selectAll(".yTick").data(metric).enter().append("svg:g");
  ticks.append("svg:path").attr("d", function (d) {
    return String.format("M{0} {1} H{2}", '' + (self.x0 - self.axis.w - self.axis.x0_left), '' + d["y"], '' + (self.x0 - self.axis.x0_left))
  })
    .style(self.axis.stl);

  ticks.append("svg:text")
    .text(function (d, i) {
      return d["name"] + (i === metric.length - 1 ? ":" : "");
    })
    .attr("x", self.x0 - self.axis.w - self.axis.x0_left - self.axis.spacing)
    .attr("y", function (d) {
      return d["y"];
    })
    .attr("dy", "0.2em")
    .style(self.axis.txtl_stl)
    .each(function (d) {  // draw the image - icon next to the text
      if (d["img"]) {
        ticks.append("svg:image").attr("xlink:href", d["img"])
          .attr("width", self.axis.icon.w).attr("height", self.axis.icon.h)
          .attr("x", self.x0 - self.axis.w - self.axis.x0_left - self.axis.spacing - this.getBBox().width - self.axis.icon.w - self.axis.spacing)
          .attr("y", d["y"] - 5);
      }
    });

  // 2nd line text for the top record
  ticks.append("svg:text")
    .text(metric[metric.length - 1]["val"])
    .attr("x", self.x0 - self.axis.w - self.axis.x0_left - self.axis.spacing)
    .attr("y", metric[metric.length - 1]["y"])
    .attr("dy", "1.5em")
    .attr("dx", "-5px")
    .style(self.axis.txtl_stl);

  // ---------- draw the bar_name
//    svg.append("text").text(bar_name.toUpperCase()).attr("x", self.x0 + self.x1 + self.bar.w/2).attr("y", self.bname.y0)
//        .attr("class", self.bname.cl).style(self.bname.st);

  // ---------- draw user's data
  var user_g = svg.append("svg:g");
  var x = self.x0 + self.x1 + self.bar.w;

  // the area bar
  user_g.append("svg:rect").attr("x", self.x0 + self.x1).attr("y", user["y"])
    .attr("width", self.bar.w).attr("height", user["height"])
    .style(self.val_bar.area_stl);
  // align line
  user_g.append("svg:line").attr("x1", self.x0 + self.x1).attr("x2", x).attr("y1", user["y"]).attr("y2", user["y"])
    .style(self.val_bar.al_st);
  // the arrow
  var x_arrow = x + 5;
  user_g.append("svg:path").attr("d", String.format("M{0} {1} L{2} {3} V{4} R", x_arrow, user.y, x_arrow + self.val_bar.ar.w, user.y - self.val_bar.ar.h / 2, user.y + self.val_bar.ar.h / 2))
    .style({"fill": "#f8458f"});
  // value text
  user_g.append("svg:text").text(String.format("Du: {0}", user.val))
    .attr("x", x + self.val_bar.x0).attr("y", user["y"]).attr("dy", "0.3em")
    .style(self.val_bar.txt_stl);
};


/**-----------------------------------------------------------------------//
 //---------------------------- PIE CHARTS  --------------------------//
 //-----------------------------------------------------------------------//
 */

function CliqzMeterPieChart(r1, r0) {
  var self = this;
  self.radius = r1;
  if (r0 == null) self.radius0 = self.radius * 0.8; else self.radius0 = r0;
  self.arc = d3.svg.arc().innerRadius(self.radius0).outerRadius(self.radius);
  self.pie = d3.layout.pie().sort(null);
  self.color = ["#f8458f", "#fb91ab"];
//    self.color = ["#f8458f", "rgb(214,214,214)"];

  self.title = {y0: 50,  // g: distance from the top of the pie to the bottom of the title
    stl: {"fill": "#333333", "text-anchor": "middle"},
    cl: "chart_name"
  };

  self.val_stl = {"fill": "#0b8472", "text-anchor": "middle", "font-size": "25px"};
}

CliqzMeterPieChart.prototype.drawPie = function (svg, data) {
  if (data["norm"] === 0) return 0;
  var self = this;
  var data_l = [data["val"], data["norm"] - data["val"]]; // data_list
  var renderarcs = svg.selectAll('.arc_g').data(self.pie(data_l)).enter().append("svg:g").attr('class', 'arc_g');
  renderarcs.append("svg:path").attr("d", self.arc).style("fill", function (d, i) {
    return self.color[i];
  });

  // ------- Pie title
//    svg.append("svg:text").text(data["name"].toUpperCase()).attr("class", self.title.cl).style(self.title.stl)
//        .attr("x", 0).attr("y", -1*(self.radius + self.title.y0));

  // ------- Value text (center of the pie)
  svg.append("svg:text").text(Math.round(100 * data["val"] / data["norm"]) + "%").style(self.val_stl)
    .attr("x", 0).attr("y", 0).attr("dy", "0.4em");
  return renderarcs;
};

function CliqzUsePieChart_V1(r1, r0) {
  // used for Result-usage
  // THIS ONLY DEFINES THE SKIN OF THE CHART.

  var self = this;
  self.radius = r1;
  if (r0 == null) self.radius0 = self.radius * 0.55; else self.radius0 = r0;

  self.arc = d3.svg.arc().innerRadius(self.radius0).outerRadius(self.radius);
  self.arcOver = d3.svg.arc().innerRadius(self.radius0).outerRadius(self.radius + 15);
  self.arc0 = d3.svg.arc().innerRadius(self.radius0).outerRadius(self.radius0 + 2);// this is for zooming animation
  self.pie = d3.layout.pie().padAngle(0).value(function (d) {
    return d["val"];
  }).sort(null);

//    self.color = d3.scale.category20c();
  self.color_PIE_LIST = ["#006567", "#56eac6", "#50b1a2", "#06594d"];
  self.color = function (idx) {
    return self.color_PIE_LIST[idx % self.color_PIE_LIST.length];
  };
  self.legend_ = [
    { 'tx_c': [6, -3], 'tx-a': "start"},  // top right
    { 'tx_c': [6, 12], 'tx-a': "start"},  // bottom right
    { 'tx_c': [-6, 12], 'tx-a': "end"},  // bottom left
    { 'tx_c': [-6, -3], 'tx-a': "end"}  // top left
  ];
  self.story = {h: 80, w: 340};
  self.title = {y0: 50,  // g: distance from the top of the pie to the bottom of the title
    stl: {"fill": "#333333", "text-anchor": "middle"},
    cl: "chart_name"
  };
}

CliqzUsePieChart_V1.prototype.add_story = function (svg, msg) {
  var t = svg.append("foreignObject").attr("width", this.story.w).attr("height", this.story.h);
  var t2 = t.append("xhtml:body").attr("class", "pie_sub_hide").html(msg);
  return [t, t2];
};

CliqzUsePieChart_V1.prototype.drawPie = function (svg, data_) {
  var data = data_.data;
  var total = data.reduce(function (x, y) {
    return x + y["val"]
  }, 0);
  if (total === 0) return 0;
  var self = this;
  var renderarcs = svg.selectAll('.arc_g').data(self.pie(data)).enter().append("svg:g").attr('class', 'arc_g');
  renderarcs.append("svg:path")
    .attr("d", self.arc0).style("fill", "white")
    .transition().duration(1000).delay(100)
    .attr("d", self.arc).style("fill", function (d, i) {
      d['color'] = self.color(i);
      return d['color'];
    })
    .each("end", post_rendering);

  function post_rendering(d, i) {
    d.data['extra'] = {"total": total};
    if (i === data.length - 1) {
      // ---------- pie name
      svg.append('svg:text').text(data_['name']).attr("class", self.title.cl).style(self.title.stl)
        .attr("transform", String.format("translate(0,{0})", "-" + (self.radius + self.title.y0)));

      // ----------- text (% value)
      renderarcs.append("svg:text").attr('transform', function (d) {
        var c = self.arc.centroid(d);
        d['txt'] = this;
        d['centroid'] = c;
        return "translate(" + c[0] + "," + c[1] + ")";
      })
        .text(function (d) {
          return Math.round(100 * d.data["val"] / total) + '%';
        })
        .style({"fill": "white", "text-anchor": "middle", "font-size": '12px'});

      // ----------- legend
      var legends = renderarcs.append("svg:g").attr('transform', function (d) {
        d['legend'] = this;
        var legend = self.legend_[0];
        if (d.centroid[0] >= 0 && d.centroid[1] >= 0) legend = self.legend_[1];
        else if (d.centroid[0] <= 0 && d.centroid[1] >= 0) legend = self.legend_[2];
        else if (d.centroid[0] <= 0 && d.centroid[1] <= 0) legend = self.legend_[3];
        d['legend_'] = legend;
        var r_ = 2 * self.radius / (self.radius + self.radius0), x0 = d.centroid[0] * r_, y0 = d.centroid[1] * r_;
        return "translate(" + x0 + "," + y0 + ")";
      });
//                        legends.append("svg:rect").attr('width', 8).attr('height', 8).attr('x', -4).attr('y', -4)
//                                .style("fill", function(d){return d['color'];});
      legends.append("svg:text").text(function (d) {
        return d.data["til"]
      }).style({"fill": function (d) {
        return d['color'];
      }, "font-size": "12px"})
        .attr("x", function (d) {
          return d["legend_"]["tx_c"][0]
        }).attr("y", function (d) {
          return d["legend_"]["tx_c"][1]
        })
        .attr("text-anchor", function (d) {
          return d["legend_"]["tx-a"];
        });
      // ------------- add msg (story)
      renderarcs.each(function (d) {
        if (d.data.get_st) {
          d['msg'] = self.add_story(svg, d.data.get_st());
          d['msg'][0].attr("transform", String.format("translate({0},{1})", "-" + self.story.w / 2, "" + (self.radius + 35)));
        }
      });

      // ------------- add event listeners
      renderarcs.on("mouseover", function (d) {
        d3.event.stopPropagation();
        if (d['legend']) d3.select(d['legend']).style({"opacity": 0});
        d3.select(this).select("path").transition().duration(500).attr("d", self.arcOver);
        if (d['txt']) d3.select(d['txt']).transition().duration(500)
          .each("end", function (d) {
            if (d['msg']) d['msg'][1].attr("class", "clz_usage_pie_sub");
          });

        // the message box of the charts
        document.getElementById("clz_usage_chart_msg_box").style.display = "none";
      })
        .on("mouseout", function (d) {
          d3.event.stopPropagation();
          d3.select(this).select("path").transition().duration(200).attr("d", self.arc);
          if (d['txt']) d3.select(d['txt']).transition().duration(200)
            .each("end", function (d) {
              if (d['msg']) d['msg'][1].attr("class", "clz_usage_pie_sub_hide");
              if (d['legend']) d3.select(d['legend']).style({"opacity": 1});
            });
        });

      svg.on("mouseout", function () {
        d3.event.stopPropagation();
        var msg_box = document.getElementById("clz_usage_chart_msg_box");
        if (msg_box.hasAttribute("closed") && msg_box.getAttribute("closed") === "0") msg_box.style.display = "";
      });
    }
  }

  return renderarcs;
};

//  CliqzUsePieChart_V2: similar to V1, but no animation on hovering the pie chart, and the pie legend are more complicated (2 lines, auto orientation according to positions...)
function CliqzUsePieChart_V2(r1, r0) {
  // used for Result-usage
  // THIS ONLY DEFINES THE SKIN OF THE CHART.

  var self = this;
  self.radius = r1;
  if (r0 == null) self.radius0 = self.radius * 0.55; else self.radius0 = r0;

  self.arc = d3.svg.arc().innerRadius(self.radius0).outerRadius(self.radius);
  self.arc0 = d3.svg.arc().innerRadius(self.radius0).outerRadius(self.radius0 + 2);// this is for zooming animation
  self.pie = d3.layout.pie().padAngle(0).value(function (d) {
    return d["val"];
  }).sort(null);

  self.color_PIE_LIST = ["#006567", "#56eac6", "#50b1a2", "#06594d"];
  self.color = function (idx) {
    return self.color_PIE_LIST[idx % self.color_PIE_LIST.length];
  };
  self.legend_ = [
    { 'tx_c': [6, -3], 'tx-a': "start", 'dy': ['-2.4em', '-1.2em', 0]},  // top right. dy: [1st line, 2nd line, ...]
    { 'tx_c': [6, 12], 'tx-a': "start", 'dy': ['0', '1.2em', '2.4em']},  // bottom right
    { 'tx_c': [-6, 12], 'tx-a': "end", 'dy': ['0', '1.2em', '2.4em']},  // bottom left
    { 'tx_c': [-6, -3], 'tx-a': "end", 'dy': ['-2.4em', '-1.2em', '0']}  // top left
  ];
  self.title = {y0: 60,  // g: distance from the top of the pie to the bottom of the title
    stl: {"fill": "#333333", "text-anchor": "middle"},
    cl: "chart_name"
  };
}

CliqzUsePieChart_V2.prototype.drawEmptyPie = function (svg, data, pie_name) {
  var self = this,
    renderarcs = svg.selectAll('.arc_g').data(self.pie([
      {"val": 1}
    ])).enter().append("svg:g").attr('class', 'arc_g');
  renderarcs.append("svg:path")
    .attr("d", self.arc0).style("fill", "white")
    .transition().duration(1000).delay(100)
    .attr("d", self.arc).style("fill", "#D9D9D9")
    .each("end", post_rendering);

  function post_rendering(d, i) {
    // ---------- pie name
    svg.append('svg:text').text(pie_name).attr("class", self.title.cl).style(self.title.stl)
      .attr("transform", String.format("translate(0,{0})", "-" + (self.radius + self.title.y0)));

    // ------- Value text (center of the pie)
    svg.append("svg:text").text("0%").style({"fill": "#D9D9D9", "text-anchor": "middle", "font-size": "30px"})
      .attr("x", 0).attr("y", 0).attr("dy", "0.4em");
  }

  return renderarcs;
};

CliqzUsePieChart_V2.prototype.drawPie = function (svg, data_) {
  var self = this,
    data = data_.data.filter(function (item) {
      return item["val"] > 0;
    }),
    total = data.reduce(function (x, y) {
      return x + y["val"]
    }, 0);
  if (total === 0) return self.drawEmptyPie(svg, data, data_["name"]);

  if (data.length > 2) {
    data = data.sort(function (a, b) {
      return a["val"] - b["val"];
    });
    var tmp = data.splice(0, 1);
    data = data.concat(tmp);
  }

  var renderarcs = svg.selectAll('.arc_g').data(self.pie(data)).enter().append("svg:g").attr('class', 'arc_g');

  renderarcs.append("svg:path")
    .attr("d", self.arc0).style("fill", "white")
    .transition().duration(1000).delay(100)
    .attr("d", self.arc).style("fill", function (d, i) {
      d['color'] = self.color(i);
      return d['color'];
    })
    .each("end", post_rendering);

  function post_rendering(d, i) {
    d.data['extra'] = {"total": total};
    if (i === data.length - 1) {
      // ---------- pie name
      svg.append('svg:text').text(data_['name']).attr("class", self.title.cl).style(self.title.stl)
        .attr("transform", String.format("translate(0,{0})", "-" + (self.radius + self.title.y0)));

      // ----------- text (% value)
      renderarcs.append("svg:text")
        .attr('transform', function (d) {
          var c = self.arc.centroid(d);
          d['txt'] = this;
          d['centroid'] = c;
          return "translate(" + c[0] + "," + c[1] + ")";
        })
        .text(function (d) {
          var val = Math.round(100 * d.data["val"] / total);
          return val < 5 ? "" : val + '%';
        })
        .attr("dy", "0.3em")
        .style({"fill": "white", "text-anchor": "middle", "font-size": '12px'});

      // ------- Value text (center of the pie)
      var size_ = 2 * self.radius0;
      var center_txt = String.format("<div class='pie_center_txt' style='width: {0}px; height: {1}px;'>" +
        "<div class='info_block'>" +
        "<div>{2}</div><div>{3}</div><div class='value'>{4}</div>" +
        "</div>" +
        "</div>", size_, size_, data_["center_name"][0], data_["center_name"][1], total);
//            var center_txt = String.format("<div class='pie_center_txt' style='width: {0}px; height: {1}px;'>" +
//                                                "<div class='info_block'>" +
//                                                    "<div>TOTAL</div><div class='value'>{2}</div><div>SEARCHES</div>" +
//                                                "</div>" +
//                                             "</div>", size_, size_, total);

      svg.append("foreignObject").attr("width", size_).attr("height", size_)
        .attr("transform", String.format("translate(-{0},-{1})", size_ / 2, size_ / 2))
        .append("xhtml:body").html(center_txt);

      // ----------- legend
      var legends = renderarcs.append("svg:g").attr('transform', function (d) {
        d['legend'] = this;
        var legend = self.legend_[0];
        if (d.centroid[0] >= 0 && d.centroid[1] >= 0) legend = self.legend_[1];
        else if (d.centroid[0] <= 0 && d.centroid[1] >= 0) legend = self.legend_[2];
        else if (d.centroid[0] <= 0 && d.centroid[1] <= 0) legend = self.legend_[3];
        d['legend_'] = legend;
        var r_ = 2 * self.radius / (self.radius + self.radius0), x0 = d.centroid[0] * r_, y0 = d.centroid[1] * r_;
        return "translate(" + x0 + "," + y0 + ")";
      });

      // write 2 lines of test for legend
      var nLine = 2;
      [0, nLine - 1].forEach(function (i) {
        legends.append("svg:text").text(function (d) {
          return d.data["val"] ? d.data["til"][i] : "";
        })
          .style({"fill": function (d) {
            return d['color'];
          }, "font-size": "12px", "font-weight": "bold"})
          .attr("x", function (d) {
            return d["legend_"]["tx_c"][0]
          })
          .attr("y", function (d) {
            return d["legend_"]["tx_c"][1]
          })
          .attr("dy", function (d) {
            return d["legend_"]["dy"][i];
          })
          .attr("text-anchor", function (d) {
            return d["legend_"]["tx-a"];
          });
      });

      // 3nd line
      legends.append("svg:text").text(function (d) {
        return d.data["val"] ? d.data["val"] + (d.data["val"] === 1 ? " Abfrage" : " Abfragen") : "";
      })
        .style({"fill": function (d) {
          return d['color'];
        }, "font-size": "12px"})
        .attr("x", function (d) {
          return d["legend_"]["tx_c"][0]
        })
        .attr("y", function (d) {
          return d["legend_"]["tx_c"][1]
        })
        .attr("dy", function (d) {
          return d["legend_"]["dy"][nLine];
        })
        .attr("text-anchor", function (d) {
          return d["legend_"]["tx-a"];
        });

    }
  }

  return renderarcs;
};

