<div class='cqz-ez-btns'>
{{#each data.categories}}
    <div
      class="cqz-ez-btn"
      style="background-color: #EFEFEF; color: black"
      url="{{ this.url }}"
      extra="cat-{{ @index }}" arrow="false" selectable=''>
      {{ this.title }}
    </div>
{{/each}}
</div>