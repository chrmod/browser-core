<!-- recipe.tpl -->

{{#if (recipe_rd_template data.richData)}}
<div class="cqz-result-h1 cqz-rd cqz-result-padding recipe">

  <div class="meta">
      {{> logo}}
      {{#with data}}
      <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{../urlDetails.friendly_url}}</h3>
  </div>

  <div class="main">
    <div class="item">
      {{#if richData.image}}
      <div class="main__image" data-style="background-image: url({{richData.image}});">
          Image
      </div>
      {{/if}}
      <h1 class="main__headline"><a href="{{../url}}" extra="title">{{richData.name}}</a></h1>
      <div class="meta__infos">
        <div class="cqz-rd-info">
          {{#if richData.url_ratingimg}}
              <img data-src="{{richData.url_ratingimg}}" class="cqz-rd-rateimg cqz-rd-snippet_hspacing" onerror="this.style.display='none';"/>
              <div class="cqz-rd-rate">{{richData.total_review}} {{local 'Votes'}}</div>
          {{/if}}
        </div>
        <div class="cqz-rd-info">{{local 'CookTime' richData.cook_time}}&nbsp;&nbsp;·&nbsp;&nbsp;{{local 'Serves'}}: {{richData.numportion}}</div>
        <br>
      </div>
      <div class="main__content">ARSCH
          {{#if richData.mobi}}
            <ul>
              {{#each richData.mobi.ingredients}}
                <li>{{this}}</li>
              {{/each}}
            </ul>
          {{else}}
            <p>{{richData.des}}</p>
          {{/if}}
          
      </div>
    </div>


    </div>
  {{/with}}
  {{>EZ-category}}
</div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}

<!-- end recipe.tpl -->
