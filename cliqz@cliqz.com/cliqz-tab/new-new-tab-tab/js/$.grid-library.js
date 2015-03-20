(function($){
    
    Array.prototype.move = function(from,to) {
        this.splice(to,0,this.splice(from,1)[0])
        
        return this
    }
    
    Array.prototype.shuffle = function(){
        var currentIndex = this.length, temporaryValue, randomIndex

        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            temporaryValue = this[currentIndex];
            this[currentIndex] = this[randomIndex];
            this[randomIndex] = temporaryValue;
        }

        return this;
    }

    function Grid(container,elements,onmove){
        var _this = this
        
        this.currentdrag = null
        this.eheight = 74
        this.gap = 10
        this.resizedelay = 100
        
        this.lastresize = false
        
        this.columnsSettings = function(width){
            if (width < 600) return 2
            if (width < 1200) return 3
            return 4
        }
        
        this.elements = []
        
        this.init = function(){
            for (var i=0;i<elements.length;i++) this.add(elements[i],true)
            
            $(window).resize(function(){
                _this.lastresize = new Date().getTime()
                
                setTimeout(function(){
                    if (_this.lastresize <= new Date().getTime() - _this.resizedelay) {
                        _this.lastresize = false
                        _this.arrange()
                    }
                },_this.resizedelay)
            })
            
            this.arrange()
        }
        
        this.arrange = function(){
            var cwidth = container.innerWidth(),
                columns = this.columnsSettings(cwidth),
                ewidth = Math.floor((cwidth - (columns - 1) * this.gap) / columns),
                matrix = [],
                maxcelly = 0,
                find = function(){
                    var ml = matrix.length
                    
                    for (var i=0;i<ml;i++) {
                        var row = matrix[i]
                        
                        for (var j=0,jmax=row.length;j<jmax;j++) {
                            if (!row[j]) return { x: j, y: i }
                        }
                    }
                    
                    matrix[ml] = new Array(columns)
                    
                    return { x: 0, y: ml }
                },
                set = function(element,position){
                    matrix[position.y][position.x] = true
                    
                    maxcelly = Math.max(maxcelly,position.y)
                    
                    var height = parseInt(element.data("height"))
                    
                    for (var i=0;i<height-1;i++) {
                        var newrow = position.y + i + 1
                        
                        if (!matrix[newrow]) matrix[newrow] = new Array(columns)
                        
                        matrix[newrow][position.x] = true
                        
                        maxcelly = Math.max(maxcelly,newrow)
                    }
                    
                    element.css({
                        width: ewidth + "px",
                        top: position.y * (_this.eheight + _this.gap) + "px",
                        left: position.x * (ewidth + _this.gap) + "px"
                    })
                }
            
            for (var i=0;i<_this.elements.length;i++) set($(_this.elements[i].element),find())
            
            container.css("height",maxcelly * this.gap + (maxcelly + 1) * _this.eheight + "px")
        }
        
        this.move = function(from,to){
            this.elements.move(from,to)
            this.refreshIndices()
            this.arrange()
            
            if (onmove) onmove()
        }
        
        this.add = function(item,init){
            var height = this.eheight * item.height + this.gap * (item.height - 1),
                index = this.elements.length
            
            this.elements[index] = item
            
            item.element.data({ height: item.height, index: index })
                        .css({ height: height + "px" })
                        .attr({ draggable: "true" })
                        .on("drop",function(e){
                            $(this).removeClass("target")
                            _this.move(_this.currentdrag,$(this).data("index"))
                        })
                        .on("dragover",function(e){ e.preventDefault() })
                        .on("dragenter",function(e){ $(this).addClass("target") })
                        .on("dragleave",function(e){ $(this).removeClass("target") })
                        .on("dragstart",function(e){
                            _this.currentdrag = $(e.target).data("index")

                            e.dataTransfer = e.originalEvent.dataTransfer

                            /* ff fix */
                            e.dataTransfer.setData('Text', this.id);
                        })
                        .appendTo(container)
            
            if (!init) this.arrange()
        }
        
        this.remove = function(index){
            this.elements[index].element.remove()
            this.elements.splice(index,1)
            this.refreshIndices()
            this.arrange()
        }
        
        this.shuffle = function(){
            this.elements.shuffle()
            this.refreshIndices()
            this.arrange()
            
            if (onmove) onmove()
        }
        
        this.refreshIndices = function(){
            for (var i=0;i<this.elements.length;i++) this.elements[i].element.data("index",i)
        }
        
        this.init()
    }

    $.fn.grid = function(){
        var container = this.first()
        
        if (typeof arguments[0] != "string") {
            container[0].grid = new Grid(container,arguments[0],arguments[1])
        }
        else {
            switch(arguments[0]) {
                case "add": container[0].grid.add(arguments[1]); break;
                case "remove": container[0].grid.remove(arguments[1]); break;
                case "shuffle": container[0].grid.shuffle(); break;
                default: console.error("no method \"" + arguments[0] + "\" allowed")
            }
        }
    }
    
})(jQuery);