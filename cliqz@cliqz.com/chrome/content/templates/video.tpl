<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-left-box'>
    <div class='cliqz-result-type' ></div>
  </div>
  {{#if image.src}}
    <div class="cliqz-image" style="
          background-image: url({{ image.src }});
          {{#if image.height }}
            background-size: {{ image.backgroundSize }}px;
            width: {{ image.width }}px;
            height: {{ image.height }}px;
          {{/if}}
        "
    >
    </div>
  {{/if}}
  <div class='cliqz-result-mid-box' style="width:{{ width }}px">
    <div class='cliqz-result-title-box overflow'>
      {{ title }}
      {{#if (video_views data.richData.views)}}
      <img class="cliqz-result-video-views"
           src="chrome://cliqzres/content/skin/{{ video_views data.richData.views }}.png" />
      {{/if}}
    </div>
    <div class='cliqz-result-video-provider'>
        {{ video_provider urlDetails.host }}
    </div>
    <div class='cliqz-result-video-author'>
      {{#if data.richData.poster}}
        by <strong style='margin-right:5px;'>{{ data.richData.poster }}</strong>
      {{/if}}
      {{#if data.richData.date}}
        {{ date data.richData.date }}
      {{/if}}
    </div>
    {{#if data.image.duration }}
      <span class="cliqz-result-video-duration">
        {{ data.image.duration }}
      </span>
    {{/if}}
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
  </div>
</div>
