<!--this template is similar to people, youtube, but with rating starts,
used initially for food, movie, game (in 1 height results)
IT IS USED AS A PARTIAL template
-->

<div class="cqz-result-h3 cqz-rd-h3 cqz-result-padding">
  {{#with data}}
        {{#if richData.image}}
            <div class="cqz-image-round cqz-rd-h3img-div" >
                <img src="{{richData.image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
            </div>
        {{/if}}

        <div class="cqz-rhh3-snipet-txt">
            <div class="cqz-result-title overflow"><a href="{{../url}}">{{richData.name}}</a></div>
            <div class="cqz-result-url overflow">{{../urlDetails.host}}</div>
            <div>
                {{#if richData.url_ratingimg}}
                    <img src="{{richData.url_ratingimg}}" class="cqz-rd-rateimg cqrd-snippet_hspacing" onerror="this.style.display='none';"/>
                {{else}}
                    {{#if (logic richData.rating '&&' richData.rating.img)}}
                        <img src="{{richData.rating.img}}" class="cqz-rd-rateimg cqz-rd-snippet_hspacing" onerror="this.style.display='none';"/>
                    {{/if}}
                {{/if}}
                {{richData.des}}
            </div>
        </div>
 {{/with}}
 {{> logo}}
</div>
