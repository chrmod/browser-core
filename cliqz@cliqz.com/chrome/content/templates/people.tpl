{{#if data.richData.full_name}}
  <div class='cqz-result-h3'>
    {{#if debug}}
        <span class='cqz-result-debug'>{{ debug }}</span>
    {{/if}}
    {{#if image.src}}
        <div class="cqz-image cqz-image-round" style="
                    position:relative;
                    background-image: url({{ image.src }});
                    width: 54px;">
        </div>
    {{/if}}
    <div>
        <div class='cqz-result-title overflow' arrow-override=''>
          <a href="{{../url}}">{{ data.richData.full_name }}</a>
        </div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
        {{ emphasis urlDetails.friendly_url text 2 true }}

        </div>
        {{#with data.richData}}
            <div class='cqz-result-desc overflow'>
            {{#if current_job_type }}
                {{ current_job_type }},
            {{/if}}
                {{ current_company }}
            </div>
        {{/with}}
    </div>
    {{> logo}}
  </div>
{{else}}
  {{partial 'generic'}}
{{/if}}
