<div class="cliqz-cluster-container">
  <div style="color: green;" class="cliqz-cluster-title-box">
    {{ data.summary}}
  </div>
  <div>
    {{#each data.control}}
    <span class="cliqz-cluster-result-url"
          url='{{url}}'
	  type='cluster-test'
	  style="cursor: pointer">{{ title }}</span>
    {{/each}}
  </div>
  <div class="cliqz-cluster-result-topic">
    {{#each data.topics}}
      <div>
        <span class="cliqz-cluster-topic-label"
	      url='{{labelUrl}}'
	      type='cluster-test'
	      style="cursor: pointer; background-color:{{color}};">{{label}}:</span>
        {{#each urls}}
          <span
              style="color: blue; cursor: pointer"
              url='{{url}}'
              type='cluster-test'
	      class="cliqz-cluster-topic"
              >{{ title }}</span>
        {{/each}}
      </div>
    {{/each}}
  </div>
</div>
