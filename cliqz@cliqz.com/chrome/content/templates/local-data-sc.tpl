{{#if (local_template data)}}
<div class="cqz-result-h2 cqz-local cqz-result-padding">
    {{#with data}}
    <div class="cqz-local-top-blk">
        {{#if image}}
            <div class="cqz-image-round cqz-rd-h3img-div" >
                <img src="{{image}}" class="cqz-rd-img" onerror="this.style.display='none';"/>
            </div>
        {{/if}}

        <div class="cqz-rhh3-snipet-txt">
            <div class="cqz-result-title overflow" arrow-override=''><a href="{{../url}}" extra="title">{{t}}</a></div>
            <div class="cqz-result-url overflow" extra="url">{{../urlDetails.friendly_url}}</div>
            <div class="cqz-rd-snippet_hspacing">
                {{#if url_ratingimg}}
                    <img src="{{url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';" extra="des-rate"/>
                {{/if}}
            </div>
        </div>
    </div>
    <div class="cqz-result-desc">
        {{desc}}
    </div>
    {{/with}}
  {{> logo}}
</div>
{{else}}
        {{>rd-h3-w-rating}}
{{/if}}