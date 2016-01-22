<!-- EZ-category -->  

  <ul class="cta">
    <li>
      <a  href="http://{{data.domain}}" 
          style="background-color:#efefef;color:#000;font-weight:bold">
        {{data.friendly_url}}
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
