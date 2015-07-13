<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding cqz-result-center"
  {{else}}
    class="cqz-result-h2 cqz-result-padding cqz-result-center"
  {{/if}}
>
    {{#with data}}

    <div class='cqz-result-title overflow' arrow-override=''><a href="{{../url}}"  extra="title">{{ emphasis name text 2 true }}</a></div>
    <div class='cqz-result-url overflow'  extra="url">
      {{ emphasis ../urlDetails.friendly_url text 2 true }}
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
    {{>EZ-category}}
    {{> logo}}
</div>