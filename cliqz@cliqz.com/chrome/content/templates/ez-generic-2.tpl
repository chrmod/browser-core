<div class='cqz-result-h1 cqz-result-padding cqz-result-center'>
    {{#with data}}

      <div class='cqz-result-title overflow'><a href="{{url}}">{{ emphasis name text 2 true }}</a></div>
        <div class='cqz-result-url overflow'>
            {{ emphasis urlDetails.host text 2 true }}{{ emphasis ../urlDetails.extra text 2 true }}
        </div>
        <div class='cqz-result-desc-3line'>
            {{des}}
        </div>
    {{/with}}

    {{>EZ-category}}
    {{> logo}}
</div>