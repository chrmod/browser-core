<div class='cqz-ez-btns'>
{{#each (logic data.categories '||' data.richData.categories)}}
    <div
      class="cqz-ez-btn {{ ../logo.buttonsClass }}"
      url="{{ url }}"
      extra="cat-{{ @index }}" arrow="false" arrow-if-visible='true'>
      {{#if title_key}}
        {{ emphasis (local title_key) ../../text 2 true}}
      {{else}}
        {{ emphasis (local title) ../../text 2 true}}
      {{/if}}
    </div>
{{/each}}
</div>
