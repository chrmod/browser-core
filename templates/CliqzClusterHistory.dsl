colors: ["#CC3399", "#27B0CE", "#1777E2"]

localization:
    settings:
        en: Settings
        de: Einstellungen

program:
    Youtube:
        summary: Meine YouTube Seiten
        url: youtube.com
        home: http://youtube.com
        rules:
        -
            type: control
            title: Beliebte auf YouTube
            url: http://www.youtube.com/channel/UCK274iXLZhs8MFGLsncOyZQ
        -
            type: control
            title: Meine Abos
            url: http://www.youtube.com/feed/subscriptions/
            #cond: /feed/subscriptions/
        -
            type: control
            title: Verlauf
            url: http://www.youtube.com/feed/history/
            #cond: /feed/history/
        -
            type: control
            title: Später ansehen
            url: http://www.youtube.com/playlist?list=WL
            #cond: /playlist?list=WL/
        -
            type: topic
            label: Channels
            cond: /user/{item}/
        # TODO: playlists, videos
    Facebook:
        summary: Meine Facebook Seiten
        url: facebook.com
        home: http://www.facebook.com
        rules:
        -
            type: control
            title: Newsfeed
            url: https://www.facebook.com/?sk=nf
        -
            type: control
            title: Nachrichten
            url: https://www.facebook.com/messages
        -
            type: control
            title: Events
            url: https://www.facebook.com/events/upcoming
        -
            type: control
            title: Hilfe
            url: https://www.facebook.com/help
        -
            type: exclude
            cond: (/re:^login/) or (/messages/) or (/events/) or (/help/)
        -
            type: topic
            label: Seiten
            cond: /{item::re:^[^?]+$}//
            # TODO: groups!!!
        -
            type: topic
            label: Gruppen
            title: title
            cond: /groups/
        -
            type: topic
            label: Listen
            title: title
            cond: /lists/
    Amazon:
        summary: Meine Amazon Seiten
        url: amazon.de
        home: http://www.amazon.de
        rules:
        -
            type: control
            title: Mein Amazon
            url: https://www.amazon.de/gp/yourstore/home
        -
            type: control
            title: Mein Konto
            url: https://www.amazon.de/gp/css/homepage.html
        -
            type: control
            title: Wunschzettel
            url: http://www.amazon.de/gp/registry/wishlist
        -
            type: topic
            label: Kategorien
            title: title
            cond: /*/b/
        -
            type: topic
            label: Verkäufer
            title: title
            cond: /gp/aag/re:(seller|merchant)=/
            # TODO: title cleaning with regex
    Ebay:
        summary: Meine Ebay Seiten
        url: ebay.de
        home: http://www.ebay.de
        rules:
        -
            type: control
            title: Mein Ebay
            url: http://my.ebay.de
        -
            type: control
            title: Angebote
            url: http://www.ebay.de/rpp/deals
        -
            type: topic
            label: Shops
            cond: /usr/{item::re:^[^?]+$}/
        # TODO: categories, but it's crazy
    Chefkock:
        summary: Meine Chefkoch Seiten
        url: chefkoch.de
        home: http://www.chefkoch.de
        rules:
        -
            type: control
            title: Magazin
            url: http://www.chefkoch.de/magazin/
        -
            type: control
            title: Rezepte
            url: http://www.chefkoch.de/rezepte/
        -
            type: control
            title: Community
            url: http://www.chefkoch.de/forum/
        -
            type: control
            title: Blog
            url: http://www.chefkoch-blog.de/
        -
            type: topic
            label: Rezepte
            title: title
            labelUrl: 1
            cond: /rezepte/re:[\d]+/
        -
            type: topic
            label: Artikel
            title: title
            labelUrl: 1
            cond: /magazin/artikel/
    Bild:
        summary: Meine Bild Seiten
        url: bild.de
        home: http://www.bild.de
        rules:
        -
            type: control
            title: Bild Shop
            url: http://shop.bild.de
        -
            type: control
            title: Community
            url: http://www.bild.de/ka/p/community
        -
            type: control
            title: Login
            url: https://secure.mypass.de/sso/web-bigp/login?service=https://don.bild.de/www/li/http%253A%252F%252Fwww.bild.de%252F
        -
            type: topic
            label: Themen
            cond: /{item}/startseite/
            # TODO: same as (to handle /news/startseite/news/)
        -
            type: topic
            label: Topics
            title: '"Bundesliga"'
            # TODO: get rid of the '""'
            cond: /bundesliga/1-liga/
    GitHub:
        summary: Github personalized sitemap
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
        summary: BaseCamp personalized sitemap
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
        summary: Twitter personalized sitemap
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
        summary: Klout personalized sitemap
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
        summary: Wikipedia personalized sitemap
        url: wikipedia.org
        home: http://wikipedia.org/
        rules:
        -
            type: topic
            label: People
            icon: cliqz-fa fa-user
            cond: /{item}//
