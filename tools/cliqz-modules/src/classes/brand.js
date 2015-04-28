CLIQZ.Brand = function(url){
    var urlobj = typeof url == "string"?new CLIQZ.URL(url):url
    
    /* http://cdn.cliqz.com/brands-database/database/1427124611539/data/database.json */
    
    this.init = function() {
        var base = urlobj.host,
            baseCore = base.replace(/[^0-9a-z]/gi,""),
            check = function(host,rule){
              var address = host.lastIndexOf(base), parseddomain = host.substr(0,address) + "$" + host.substr(address + base.length)

              return parseddomain.indexOf(rule) != -1
            },
            domains = CLIQZ.BRANDS.db.domains

        if(base.length == 0) return

        if (base == "IP") {
            this.text = "IP"
            this.backgroundColor = "#ff0"
        }

        else if (domains[base]) {
            for (var i=0,imax=domains[base].length;i<imax;i++) {
                var rule = domains[base][i] // r = rule, b = background-color, l = logo, t = text, c = color

                if (i == imax - 1 || check(urlobj.fulldomain,rule.r)) {
                    this.backgroundColor = rule.b?rule.b:null,
                    this.backgroundImage = rule.l?"url(http://cdn.cliqz.com/brands-database/database/" + CLIQZ.BRANDS.version + "/logos/" + base + "/" + rule.r + ".svg)":"",
                    this.text = rule.t,
                    this.color = rule.c?"":"#fff"

                    break
                }
            }
        }

        this.text = this.text || (baseCore.length > 1 ? ((baseCore[0].toUpperCase() + baseCore[1].toLowerCase())) : "")
        this.backgroundColor = this.backgroundColor || CLIQZ.BRANDS.db.palette[base.split("").reduce(function(a,b){ return a + b.charCodeAt(0) },0) % CLIQZ.BRANDS.db.palette.length]

        var colorID = CLIQZ.BRANDS.db.palette.indexOf(this.backgroundColor),
            buttonClass = CLIQZ.BRANDS.db.buttons && colorID != -1 && CLIQZ.BRANDS.db.buttons[colorID]?CLIQZ.BRANDS.db.buttons[colorID]:10

        this.buttonsClass = "cliqz-brands-button-" + buttonClass
        this.style = "background-color: #" + this.backgroundColor + ";color:" + (this.color || '#fff') + ";"


        if (this.backgroundImage) this.style += "background-image:" + this.backgroundImage + "; text-indent: -10em;"
    }
    
    this.applylogo = function(element){
        element.setAttribute("style",this.style)
        element.innerHTML = this.text
    }
    
    this.init()
    
    console.log(this)
}