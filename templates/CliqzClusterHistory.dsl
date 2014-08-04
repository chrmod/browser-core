colors: ["#993300", "#99CC99", "#003366"]

localization:
    settings:
        en: Settings
        de: Einstellungen

program:
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
            title: Search
            url: http://search.twitter.com/
            icon: cliqz-fa fa-search
        -
            type: control
            title: Discover
            url: http://twitter.com/i/discover
            icon: cliqz-fa fa-lightbulb-o
        -
            type: exclude
            cond: (/settings/) or (/i/) or (/re:^search/) 
        -
            type: topic
            label: People
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
