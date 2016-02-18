<!-- video.tpl -->

<div class="meta">
    {{> logo}}
    <h3 class="meta__url"><i class="fa fa-mobile mobile"></i>
        <span>{{ data.news.0.time }}</span>&nbsp;&nbsp;·&nbsp;&nbsp;
        <a href="{{url}}">{{ emphasis urlDetails.host query 2 true }}{{ emphasis urlDetails.extra query 2 true }}</a></h3>
</div>

<div class="cqz-result-h1 cqz-result-padding ez-video main">
        <div class="item">
            {{#if image.src}}
                <div class="main__image video" data-style="background-image: url({{ image.src }});">
                    {{#if (sec_to_duration duration)}}<span> {{ sec_to_duration duration}}</span>{{/if}}
                    <div class="playbutton">
                        <i class="fa fa-play"></i>
                    </div>
                </div>
            {{/if}}
          <h1 class="main__headline"><a href="{{url}}">{{ title }}</a></h1>
          <div class="meta__infos">{{ views_helper data.richData.views }}</div>
        </div>
</div>

<!-- end video.tpl -->
