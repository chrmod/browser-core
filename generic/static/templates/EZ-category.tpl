  <ul class="cta" style="background-color: #1F69AD">
    {{#each (logic data.categories '||' data.richData.categories)}}
      <li extra="cat-{{ @index }}"><a href="{{url}}">
         {{#if title_key}}
          {{ emphasis (local title_key) ../../text 2 true}}
        {{else}}
          {{ emphasis title ../../text 2 true}}
        {{/if}}
      </a></li>
    {{/each}}
  </ul>
