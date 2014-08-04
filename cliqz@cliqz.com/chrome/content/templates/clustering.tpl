<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-mid-box' style="width:{{ width }}px; margin-right: 32px">
    <div style='margin-bottom:10px;'>
      <span class="cliqz-cluster-title-box overflow"
	        style="cursor: pointer">
        {{ data.summary}}
      </span>
      {{#each data.control}}
        <span class="cliqz-cluster-result-control"
              url='{{url}}'
              type='{{../type}}'
              extra='control'
              style="cursor: pointer">
          {{ title }}
        </span>
      {{/each}}
      <br style="clear:both"/>
    </div>
    {{#each data.topics}}
      <div class='overflow cliqz-cluster-result-topic'>
        <span class="cliqz-cluster-topic-label"
              url='{{labelUrl}}'
              type='{{../type}}'
              extra='topic-label'
              style="background-color:{{color}};">
              {{label}}
        </span>
        {{#each urls}}
          <span
              style="color: {{../color}}; cursor: pointer"
              url='{{href}}'
              type='{{../../type}}'
              extra='topic'
              class="cliqz-cluster-topic"
              >
                {{ title }}
          </span>
        {{/each}}
      </div>
    {{/each}}
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
  </div>
</div>
