<!-- EZ-category -->
<div class="third">
  {{#if data.friendly_url}}
    <div extra="url" url="http://{{#if data.domain}}{{data.domain}}{{else}}{{data.friendly_url}}{{/if}}" class="cards__item ez-category">
        <!-- 
        {{#with logo}}
            {{#if backgroundImage}}
                <div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">WI</div>
            {{/if}}
        {{/with}}
        -->
        <h2 class="cards__title__secondary">
            {{data.friendly_url}}
        </h2>
    </div>
  {{/if}}
  
  {{#each (logic data.categories '||' data.richData.categories)}}
    <div url="{{url}}" extra="cat-{{ @index }}" class="cards__item ez-category">
      <!-- 
        {{#with ../logo}}
          {{#if backgroundImage}}
              <div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" data-style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">WI</div>
          {{/if}}
        {{/with}}
      -->
      <h2 class="cards__title__secondary">
          {{#if title_key}}
            {{ local title_key }}
          {{else}}
            {{ title }}
          {{/if}}
      </h2>
    </div>
  {{/each}}
  <!-- end EZ-category -->  
</div>
