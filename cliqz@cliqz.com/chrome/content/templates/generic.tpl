<div class='cqz-result-h3'>
    <div class='cqz-result-center'>
      <div class='cqz-result-title overflow' arrow-override=''><a href="{{url}}">{{ emphasis title text 2 true }}</a></div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
            {{ emphasis data.friendly_url text 2 true}}
        </div>
        <div class='cqz-result-desc overflow'>
            {{ emphasis data.description text 2 true }}
        </div>
    </div>
    {{> logo}}
</div>