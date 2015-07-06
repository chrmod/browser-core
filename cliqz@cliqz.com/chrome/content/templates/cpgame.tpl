{{#if (cpgame_rd_template data.richData)}}
<div class="cqz-result-h1 cqz-rd cqz-result-padding">
  {{#with data}}
    <div class="cqz-rd-body">
        <div class="cqz-result-title overflow"><a href="{{../url}}">{{richData.name}}</a></div>
        <div class="cqz-result-url overflow">{{../urlDetails.host}}</div>

        <div class="cqz-rd-h2-snippet">
            <div class="cqz-rd-img_div cqz-image-round">
               <img src="{{richData.image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
            </div>
            <div>
                <div class="cqz-rd-info">{{local 'GameCategory'}}: {{richData.game_cat}}</div>
                {{#if richData.rating}}
                   <img src="{{richData.rating.img}}" class="cqz-rd-rateimg cqz-rd-snippet_hspacing" onerror="this.style.display='none';"/>
                   <div class="cqz-rd-rate">{{localize_numbers richData.rating.val}}/{{richData.rating.scale}}</div>
                {{/if}}
                <div class="cqz-rd-max-lines3 cqz-rd-snippet_hspacing">{{richData.des}}</div>
            </div>
        </div>
    </div>
  {{/with}}
  {{>EZ-category}}
  {{> logo}}
</div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}
