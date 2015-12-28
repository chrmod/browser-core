<!-- EZ-category -->  
  <ul class="cta">
    <li extra="cat-{{ @index }}">
      <a href="{{url}}" style="background-color: #ff0000">
        Spiegel.de
      </a>
    </li>
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
