<!-- rd-h3-w-rating.tpl -->


<!--this template is similar to people, youtube, but with rating starts,
used initially for food, movie, game (in 1 height results)
IT IS USED AS A PARTIAL template
-->

<div class="meta">
    {{> logo}}
    <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}</h3>
</div>

{{#with data}}

    <div class="main">

        {{#if richData.image}}
            <div class="main__image" data-style="background-image: url({{ richData.image }});">
                Image
            </div>
        {{/if}}
        <h1 class="main__headline"><a href="{{../url}}">{{richData.name}}</a></h1>
        <div class="main__rating">
            {{#if richData.url_ratingimg}}
                <img data-src="{{richData.url_ratingimg}}" class="cqz-rd-rateimg"/>
            {{/if}}

            {{#if richData.rating.img}}
                <img data-src="{{richData.rating.img}}" class="cqz-rd-rateimg"/>
            {{/if}}
        </div>
        <p class="main__content">
            <p>{{description}}</p>
            <br />
            {{#if richData.mobi}}
                <ul class="recipe_ingredients">
                  {{#each richData.mobi.ingredients}}
                    <li>{{this}}</li>
                  {{/each}}
                </ul>

              {{else}}
                <p>{{richData.des}}</p>
              {{/if}}
        </p>

    </div>
{{/with}}
<!-- end rd-h3-w-rating.tpl -->
