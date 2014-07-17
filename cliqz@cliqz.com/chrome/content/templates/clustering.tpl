<div>
  <div style="color: green;">
    {{ data.summary}}
  </div>
  <div>
    {{#each data.topics}}
      <div>
        {{ label }}:
        {{#each urls}}
          <span style="color: blue;"><a href="{{href}}">{{ title }}</a></span>
        {{/each}}
      </div>
    {{/each}}
  </div>
</div>
