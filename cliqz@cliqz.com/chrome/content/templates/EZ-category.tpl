<div class='cqz-ez-btns'>
{{#each data.categories}}
    <div
      class="cqz-ez-btn {{ ../logo.buttonsClass }}"
      url="{{ this.url }}"
      extra="cat-{{ @index }}" arrow="false">
      {{ this.title }}
    </div>
{{/each}}
</div>