var HistoryController = {
    amount: 10,
    nextShownIndex: null,
    
    pin: function(item,link,index){
        NewTabUtils.pinnedLinks.pin(link,index);
        $(item).addClass("pinned")
    },
    isPinned: function(link) {
        return NewTabUtils.pinnedLinks.isPinned(link)
    },
    unpin: function(item,link){
        NewTabUtils.pinnedLinks.unpin(link);
        $(item).removeClass("pinned")
    },
    hide: function(item,link,index){
        this.lastHidden = link
        
        this.unpin(item,link)
        
        NewTabUtils.blockedLinks.block(link)
        
        $(item).remove()
        
        for (var i=this.nextShownIndex,imax=this.links.length;i<imax;i++) {
            if (!NewTabUtils.blockedLinks.isBlocked(this.links[i])) {
                this.animate(this.display(this.links[i]).insertBefore($("#history-lis > *").eq(index)))
                this.nextShownIndex ++
                break
            }
        }
        
        this.popup(true)
    },
    popup: function(show){
        if (show) $("#history-popup").show()
        else $("#history-popup").hide()
    },
    undo: function(all){
        if (all) NewTabUtils.undoAll(function(){ location.reload() });
        else { 
            NewTabUtils.blockedLinks.unblock(this.lastHidden);
            location.reload()
        }
        
        this.popup(false)
    },
    display: function(link,newsitems){
        var template = $("#history-row-template").clone();
                        
        template.attr("href",link.url).removeAttr("id").removeClass("hidden").appendTo($("#history-lis")).css("visibility","hidden");
        template[0].link = link;
        template.find(".history-title").text(link.title);
        
        if (newsitems) {
            var items = template.addClass("news-domain").find(".news-section > .item")
            
            items.each(function(idx){
                console.log(idx,newsitems,newsitems[idx])
                
                if (newsitems[idx]) {
                    $(this).html(newsitems[idx].title)
                }
            })
            
            console.log(newsitems)
        }
                     
                                     
        if (HistoryController.isPinned(link)) template.addClass("pinned");

        (function(link,template){
            template.find(".close").click(function(e){
                var a = $(this).parents("a:first")
                HistoryController.hide(a,link,$("#history-lis > *").index(a));
                e.preventDefault();
                e.stopPropagation();
            });
            
            template.find(".pin").click(function(e){
                var a = $(this).parents("a:first")
                
                e.preventDefault();
                e.stopPropagation();
                
                if (a.filter(".pinned").length) HistoryController.unpin(template,link);
                else HistoryController.pin(template,link,$("#history-lis > *").index(a));
            });
            
            template.find(".unpin").click(function(e){
                HistoryController.unpin(link);
                e.preventDefault();
                e.stopPropagation();
                window.location.reload();
            });
        })(link,template);
        
        var urlinfo = CliqzUtils.getDetailsFromUrl(link.url),
            logoinfo = CliqzUtils.getLogoDetails(urlinfo),
            icon = template.find(".history-icon").text(logoinfo.text).attr("style",logoinfo.style)
        
        template.find(".history-url.blurred").text(urlinfo.host);
        template.find(".history-url.hovered").text(urlinfo.host + urlinfo.extra);
        
        return template
    },
    animate: function(item){
        var element = $(item).css("visibility","visible"),
            effect = "bounceIn";
                
        element.addClass(effect + " animated").one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            $(this).removeClass(effect + " animated");
        });
    },
    init: function(links,news){
        console.log(news)
        
        this.links = links
        this.nextShownIndex = this.amount
                
        var amount = Math.min(links.length,this.amount), array = [], list = $("#history-lis");
    
        for (var i=0;i<amount;i++) {
            array.push(i);
            HistoryController.display(links[i],news[i])
        }

        shuffle(array);

        for (var i=0;i<amount;i++)
            (function(index){ setTimeout(function(){ HistoryController.animate($("#history-lis").children("a").eq(array[index])) },i * 50); })(i);
        /*
        var $container = $('#history-lis').packery({
            columnWidth: 275,
            rowHeight: 70,
            gutter: 15,
            itemSelector: "#history-lis > a, #weather"
        });
*/
        //$container.packery('bindUIDraggableEvents',$container.children("a,#weather").draggable());
        
        $('#history-lis').sortable()
        /*
        Sortable.create($('#history-lis')[0],{
            animation: 150/*,
            onUpdate: function(e){
                for (var i = e.oldIndex;i > e.newIndex;i--) {
                    var owner = list.children().eq(i)[0]

                    if (HistoryController.isPinned(owner.link)) HistoryController.pin(owner,owner.link,i);
                }

                HistoryController.pin(e.item,e.item.link,e.newIndex)
            }
        });*/
    }
};