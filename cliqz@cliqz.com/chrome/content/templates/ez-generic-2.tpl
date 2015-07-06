<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding cqz-result-center"
  {{else}}
    class="cqz-result-h2 cqz-result-padding cqz-result-center"
  {{/if}}
>
    {{#with data}}

    <div class='cqz-result-title overflow' arrow-override=''><a href="{{../url}}">{{ emphasis name text 2 true }}</a></div>
    <div class='cqz-result-url overflow'>
      {{ emphasis ../urlDetails.domain text 2 true }}{{ emphasis ../urlDetails.extra text 2 true }}
    </div>
    <div class='cqz-result-content'> 
      <div class='multi-ellipsis'>
        <p>
          {{description}}
        </p>
      </div>
    {{/with}}

      {{>EZ-history}}
    </div>
    {{>EZ-actions}}
    {{> logo}}
</div>