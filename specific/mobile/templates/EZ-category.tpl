<!-- EZ-category -->  
  <ul class="cta">
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
