{{#if (cpgame_movie_rd_template data.richData)}}
<div class="cqz-result-h1 cqz-rd cqz-result-padding">
  {{#with data}}
    <div class="cqz-rd-body">
        <div class="cqz-result-title overflow"><a href="{{../url}}">{{richData.name}}</a></div>
        <div class="cqz-result-url overflow">{{../urlDetails.host}}</div>

        <div class="cqz-rd-h2-snippet">
            <div class="cqz-rd-img_div cqz-image-round">
               <img src="{{richData.image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
            </div>
            {{>pcgame_movie_side_snippet}}
        </div>
    </div>
  {{/with}}
  {{>EZ-category}}
  {{> logo}}
</div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}
