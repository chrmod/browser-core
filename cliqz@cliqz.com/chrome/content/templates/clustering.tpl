<div>
  <div style="color: green;">
    {{ data.summary}}
  </div>
  <div>
    {{#each data.control}}
    <span>{{ title }}</span>
    {{/each}}
  </div>
  <div>
    {{#each data.topics}}
      <div>
        {{ label }}:
        {{#each urls}}
          <span
              style="color: blue; cursor: pointer"
              url='{{url}}'
              type='cluster-test'
              >{{ title }}</span>
        {{/each}}
      </div>
    {{/each}}
  </div>
</div>
