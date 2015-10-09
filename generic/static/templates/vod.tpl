<div class="cqz-result-h1 cqz-rd cqz-result-padding">
    {{#with data}}
        <div class="cqz-rd-body">
            <div class="cqz-result-title overflow" arrow-override=''><a extra="title" href="{{../url}}">{{n}}</a>
            </div>
            <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>

            <div class="cqz-rd-h2-snippet">
                {{#if i}}
                    <div class="cqz-rd-img_div cqz-image-round">
                        <img src="{{i}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
                    </div>
                {{/if}}

                <div>
                    <div>
                        {{#if (logic directors '&&' directors.t)}}
                            <div class="cqz-rd-info">{{local directors.t}}:
                                {{#each directors.i}}
                                     <a href="{{u}}" class="cqz-rd-link" extra="director">{{n}}, </a>
                                {{/each}}
                            </div>
                        {{/if}}

                        {{#if (is_not_dummy l)}}
                            <div class="cqz-rd-info-2">{{local 'Movie_Length' l}}</div>
                        {{/if}}

                        {{#if r}}
                            <img src="{{r.img}}" class="cqz-rd-rateimg" onerror="this.style.display='none';"/>
                            <div class="cqz-rd-rate">
                                {{localizeNumbers r.val}}/{{r.scale}}
                                {{#if r.nVote}} {{local 'from_lcase'}} {{localizeNumbers r.nVote}} {{local 'Votes'}}{{/if}}
                            </div>
                        {{/if}}

                        <div class="cqz-multy-lines-ellipses">
                            <p>{{des}}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {{/with}}
    <div>
        <div style="float: left; margin-right: 10px">
            <span class="cqz-ez-btn cliqz-brands-button-6" url="{{ data.itunes.ms.0.u }}" style="border-radius: 18px">
                Watch on Itunes
            </span>
        </div>
        {{>EZ-category}}
    </div>
    {{> logo}}
</div>
