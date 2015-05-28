<!--this template is similar to people, youtube, but with rating starts,
used initially for food, movie, game (in 1 height results)-->

<div class="cqz-result-h3 cqz-rd-h3 cqz-result-padding">

 {{#with data}}
        {{#if richData.image}}
            <div class="cqz-rd-h3img cqz-image-round" style="background-image: url({{ richData.image}});"></div>
        {{/if}}

        <div class="cqz-rhh3-snipet-txt">
            <div class="cqz-result-title overflow">{{richData.name}}</div>
            <div class="cqz-result-url overflow">{{richData.url_title}}</div>
            <div>
                <img src="{{richData.url_ratingimg}}" class="cqz-rd-rateimg"/> {{richData.des}}
            </div>
        </div>

 {{/with}}
 {{> logo}}
</div>
