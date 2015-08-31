{{#if (bm_rd_template data.richData)}}
<div class="cqz-result-h1 cqz-rd cqz-result-padding">
  {{#with data}}
    <div class="cqz-rd-body">
        <div class="cqz-result-title overflow"><a href="{{../url}}">{{richData.name}}</a></div>
        <div class="cqz-result-url overflow">{{../urlDetails.host}}</div>
        <div class="cqz-rd-recipe-snippet">
               <div class="cqz-rd-recipe_img cqz-image-round" style="background-image: url({{richData.image}});"></div>
               <div>
                          <div class="cqz-rd-info">{{local 'CookTime' richData.cook_time}}</div>
                          <div class="cqz-rd-info">{{local 'Serves'}}: {{richData.numportion}}</div>
                          {{#if richData.url_ratingimg}}
                              <img src="{{richData.url_ratingimg}}" class="cqz-rd-rateimg"/>
                              <div class="cqz-rd-rate">{{richData.total_review}} {{local 'Reviews'}}</div>
                          {{/if}}
               </div>
        </div>
        <div class="cqz-rd-max-lines">{{richData.des}}</div>
    </div>
  {{/with}}
  <!--{{>EZ-category}}-->
  {{> logo}}
</div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}
