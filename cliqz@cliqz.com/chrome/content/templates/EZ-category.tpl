<div class='cqz-ez-btns'>
{{#each data.categories}}
    <div
      class="cqz-ez-btn {{ ../logo.buttonsClass }}"
      url="{{ url }}"
      extra="cat-{{ @index }}" arrow="false" arrow-if-visible='true'>
      {{ emphasis title ../text 2 true}}
    </div>
{{/each}}
</div>