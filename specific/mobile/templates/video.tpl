<div class="meta">
    {{> logo}}
    <h3 class="meta__url"><i class="fa fa-mobile mobile"></i>
        <span>{{ data.news.0.time }}</span>&nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="{{url}}">{{ emphasis data.name text 2 true }}</a></h3>
</div>

<div class='cqz-result-h3'>
    {{#if debug}}
        <span class='cqz-result-debug'>{{ debug }}</span>
    {{/if}}
    {{#if image.src}}
        <div class="cqz-image" style="background-image: url({{ image.src }});">
            {{#if image.text }}<p class='cqz-video-arrow'>{{ image.text }}</p>{{/if}}
        </div>
    {{/if}}
    <div class='cqz-result-center'>
      <div class='cqz-result-title overflow'><a href="{{url}}">{{ emphasis title text 2 true }}</a></div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
            {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}
        </div>
        <div class='cqz-result-desc overflow'>{{ views_helper data.richData.views }}</div>
    </div>
</div>
