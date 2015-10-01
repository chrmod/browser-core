<div class="cqz-result-h1 cqz-rd cqz-result-padding">
    {{#with data}}
        <div class="cqz-rd-body">
            <div class="cqz-result-title overflow" arrow-override=''><a extra="title" href="{{../url}}">{{name}}</a>
            </div>
            <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>

            <div class="cqz-rd-h2-snippet">
                {{#if image}}
                    <div class="cqz-rd-img_div cqz-image-round">
                        <img src="{{image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
                    </div>
                {{/if}}


                <div>
                    {{#if (logic director '&&' director.title)}}
                        <div class="cqz-rd-info">{{local director.title}}: <a href="{{director.info.url}}"
                                                                              class="cqz-rd-link"
                                                                              extra="director">{{director.info.name}}</a>
                        </div>
                    {{/if}}

                    {{#if (is_not_dummy length)}}
                        <div class="cqz-rd-info-2">{{local 'Movie_Length' length}}</div>
                    {{/if}}

                    {{#if rating}}
                        <div class="cqz-rd-snippet_hspacing">
                            <div>
                                <img src="{{rating.img}}" class="cqz-rd-rateimg"
                                    onerror="this.style.display='none';"/>
                            </div>
                            <div class="cqz-rd-rate">
                                {{localizeNumbers rating.val}}/{{rating.scale}}
                                {{#if rating.nVote}} {{local 'from_lcase'}} {{localizeNumbers rating.nVote}} {{local 'Votes'}}{{/if}}
                            </div>
                        </div>


                    {{/if}}
                    <div class="cqz-multy-lines-ellipses cqz-rd-snippet_hspacing">
                        <p>{{itunes.0.d}}</p>
                    </div>
                </div>
            </div>
        </div>
    {{/with}}
    <div>
        <div style="float: left; margin-right: 10px">
            <span class="cqz-ez-btn cliqz-brands-button-6" url="{{ data.itunes.0.u }}" style="border-radius: 18px">
                Watch on Itunes
            </span>

        </div>
        {{>EZ-category}}
    </div>
    {{> logo}}
</div>
