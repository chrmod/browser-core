colors: ["#CC3399", "#27B0CE", "#1777E2"]

program:
    Youtube:
        summary: Sitemap_Summary
        url: youtube.com
        home: http://youtube.com
        rules:
        -
            type: control
            title: Sitemap_Youtube_Popular
            url: http://www.youtube.com/channel/UCK274iXLZhs8MFGLsncOyZQ
        -
            type: control
            title: Sitemap_Youtube_Subscriptions
            url: http://www.youtube.com/feed/subscriptions/
            #cond: /feed/subscriptions/
        -
            type: control
            title: Sitemap_Youtube_History
            url: http://www.youtube.com/feed/history/
            #cond: /feed/history/
        -
            type: control
            title: Sitemap_Youtube_WatchLater
            url: http://www.youtube.com/playlist?list=WL
            #cond: /playlist?list=wl/
        -
            type: exclude
            cond: /re:playlist\?list=wl/
        -
            type: topic
            label: Sitemap_Youtube_Channels
            title: title::re:(.+)(?:\s+\S\s+[Yy]ou[Tt]ube\s*)
            cond: /user/{item}/
        -
            type: topic
            label: Sitemap_Youtube_Playlists
            title: title::re:(.+)(?:\s+\S\s+[Yy]ou[Tt]ube\s*)
            cond: /re:playlist\?list=[A-Za-z0-9]+/
        # TODO: videos
    Facebook:
        summary: Sitemap_Summary
        url: facebook.com
        home: http://www.facebook.com
        rules:
        -
            type: control
            title: Sitemap_Facebook_Newsfeed
            url: https://www.facebook.com/?sk=nf
        -
            type: control
            title: Sitemap_Facebook_Messages
            url: https://www.facebook.com/messages
        -
            type: control
            title: Sitemap_Facebook_Events
            url: https://www.facebook.com/events/upcoming
        -
            type: control
            title: Sitemap_Facebook_Help
            url: https://www.facebook.com/help
        -
            type: exclude
            cond: (/re:^login/) or (/re:^messages/) or (/re:^events/) or (/re:^help/) or (/re:^settings/) or (/re:^robots[.]txt/)
        -
            type: exclude
            cond: /re:.+[.]php/
        -
            type: topic
            label: Sitemap_Facebook_Pages
            title: title::re:(?:[(].*[)]\s*)?(.+)
            cond: /{item::re:^([^?]+)}//
        -
            type: topic
            label: Sitemap_Facebook_Groups
            title: title
            cond: /groups/
        -
            type: topic
            label: Sitemap_Facebook_Lists
            title: title
            cond: /lists/
    Amazon:
        summary: Sitemap_Summary
        url: amazon.de
        home: http://www.amazon.de
        rules:
        -
            type: control
            title: Sitemap_Amazon_MyAmazon
            url: https://www.amazon.de/gp/yourstore/home
        -
            type: control
            title: Sitemap_Amazon_MyAccount
            url: https://www.amazon.de/gp/css/homepage.html
        -
            type: control
            title: Sitemap_Amazon_Wishlist
            url: http://www.amazon.de/gp/registry/wishlist
        -
            type: topic
            label: Sitemap_Amazon_Categories
            title: title::re:(?:^[Aa]mazon.de.*?:\s*)?(.+)
            cond: /*/b/
        -
            type: topic
            label: Sitemap_Amazon_Shops
            title: title::re:(?:^[Aa]mazon.de.*?:\s*)?(.+)
            cond: /gp/aag/re:(seller|merchant)=/
    Ebay:
        summary: Sitemap_Summary
        url: ebay.de
        home: http://www.ebay.de
        rules:
        -
            type: control
            title: Sitemap_Ebay_MyEbay
            url: http://my.ebay.de
        -
            type: control
            title: Sitemap_Ebay_Deals
            url: http://www.ebay.de/rpp/deals
        -
            type: topic
            label: Sitemap_Ebay_Shops
            cond: /usr/{item::re:^([^?]+)}//
        # TODO: categories, but it's crazy
    Chefkoch:
        summary: Sitemap_Summary
        url: chefkoch.de
        home: http://www.chefkoch.de
        rules:
        -
            type: control
            title: Sitemap_Chefkoch_Magazin
            url: http://www.chefkoch.de/magazin/
        -
            type: control
            title: Sitemap_Chefkoch_Rezepte
            url: http://www.chefkoch.de/rezepte/
        -
            type: control
            title: Sitemap_Chefkoch_Community
            url: http://www.chefkoch.de/forum/
        -
            type: control
            title: Sitemap_Chefkoch_Blog
            url: http://www.chefkoch-blog.de/
        -
            type: topic
            label: Sitemap_Chefkoch_Rezepte
            title: title::re:(.+?)(?:\s*von.*?)?(?:\s*\|\s*Chefkoch[.]de.*)
            labelUrl: 1
            cond: /rezepte/re:[\d]+/
        -
            type: topic
            label: Sitemap_Chefkoch_Articles
            title: title::re:(.+?)(?:\s*\|\s*Chefkoch[.]de.*)
            labelUrl: 1
            cond: /magazin/artikel/
    Bild:
        summary: Sitemap_Summary
        url: bild.de
        home: http://www.bild.de
        rules:
        -
            type: control
            title: Sitemap_Bild_Shop
            url: http://shop.bild.de
        -
            type: control
            title: Sitemap_Bild_Community
            url: http://www.bild.de/ka/p/community
        -
            type: control
            title: Sitemap_Bild_Login
            url: https://secure.mypass.de/sso/web-bigp/login?service=https://don.bild.de/www/li/http%253A%252F%252Fwww.bild.de%252F
        -
            type: topic
            label: Sitemap_Bild_Topics
            cond: /{item}/startseite/=1/
        -
            type: topic
            label: Sitemap_Bild_Topics
            title: Sitemap_Bild_Bundesliga
            cond: /bundesliga/1-liga/
    GitHub:
        summary: Sitemap_Summary
        url: github.com
        home: http://github.com/
        rules:
        -
            type: control
            title: Settings
            url: http://github.com/settings/
            icon: cliqz-fa fa-bars
        -
            type: exclude
            cond: /settings/
        -
            type: topic
            icon: cliqz-fa fa-database
            labelUrl: 1
            cond: /{label}/{item}//
    BaseCamp:
        summary: Sitemap_Summary
        url: basecamp.com
        rules:
        -
            type: exclude
            cond: /settings/
        -
            type: control
            icon: cliqz-fa fa-database
            cond: /{item::re:^\d+$}//
        -
            type: topic
            label: Projects
            icon: cliqz-fa fa-folder
            labelUrl: 1
            cond: /{item}/projects/*//
            title: title
        -
            type: topic
            label: People
            icon: cliqz-fa fa-user
            labelUrl: 2
            cond: /{item}/people/*//
            title: title
    Twitter:
        summary: Sitemap_Summary
        url: twitter.com
        home: http://twitter.com/
        rules:
        -
            type: control
            title: Suchen
            url: http://search.twitter.com/
            icon: cliqz-fa fa-search
        -
            type: control
            title: Entdecken
            url: http://twitter.com/i/discover
            icon: cliqz-fa fa-lightbulb-o
        -
            type: exclude
            cond: (/settings/) or (/i/) or (/re:^search/)
        -
            type: topic
            label: Leute
            icon: cliqz-fa fa-user
            cond: /{item}//
    Klout:
        summary: Sitemap_Summary
        url: klout.com
        home: http://klout.com/
        rules:
        -
            type: exclude
            cond: (/settings/) or (/i/) or (/search/) or (/register/) or (/dashboard/)
        -
            type: topic
            label: People
            icon: cliqz-fa fa-user
            cond: /{item}//
    Wikipedia:
        summary: Sitemap_Summary
        url: de.wikipedia.org
        home: http://de.wikipedia.org/
        rules:
        -
            type: exclude
            cond: (/wiki/) and ((/*/wikipedia:hauptseite/) or (/*/re:^spezial:/) or (/*/re:^portal:/) or (/*/re:^kategorie:/) or (/*/re:^hilfe:/))
        -
            type: topic
            label: Artikel
            cond: /wiki/{item}//
            title: title::re:(.+?)(?:\s+\S\s+Wikipedia.*)
