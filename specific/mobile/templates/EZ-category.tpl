<!-- EZ-category -->
  <ul class="cta">

    {{#if data.friendly_url}}
      <li>
        <a  href="http://{{#if data.domain}}{{data.domain}}{{else}}{{data.friendly_url}}{{/if}}" 
            style="background-color:#efefef;color:#000;font-weight:bold">
          {{data.friendly_url}}
        </a>
      </li>
    {{/if}}

    {{#each (logic data.categories '||' data.richData.categories)}}
      <li extra="cat-{{ @index }}"><a href="{{url}}">
         {{#if title_key}}
          {{ local title_key }}
        {{else}}
          {{ title }}
        {{/if}}
      </a></li>
    {{/each}}
  </ul>

<!-- end EZ-category -->  