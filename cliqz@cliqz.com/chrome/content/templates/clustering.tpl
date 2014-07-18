<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-left-box'>
    <div class='cliqz-result-type' ></div>
  </div>
  <div class='cliqz-result-mid-box' style="width:{{ width }}px">
    <div class="cliqz-cluster-title-box overflow">
      <span>
        {{ data.summary}}
      </span>
      {{#each data.control}}
        <span class="cliqz-cluster-result-url"
              url='{{url}}'
              type='cluster-test'
              style="cursor: pointer">
          {{ title }}
        </span>
      {{/each}}
    </div>
    <div class="cliqz-cluster-result-topic">
    {{#each data.topics}}
      <div>
        <span class="cliqz-cluster-topic-label"
              url='{{labelUrl}}'
              type='cluster-test'
              style="cursor: pointer; background-color:{{color}};">{{label}}:
        </span>
        {{#each urls}}
          <span
              style="color: blue; cursor: pointer"
              url='{{href}}'
              type='cluster-test'
              class="cliqz-cluster-topic"
              >
                {{ title }}
          </span>
        {{/each}}
      </div>
    {{/each}}
  </div>
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
  </div>
</div>
