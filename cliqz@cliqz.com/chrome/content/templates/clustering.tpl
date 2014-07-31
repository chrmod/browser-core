<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-mid-box' style="width:{{ width }}px;">
    <div>
      <span class="cliqz-cluster-title-box overflow">
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
        <div class="cliqz-cluster-topic-label"
              url='{{labelUrl}}'
              type='cluster-test'
              style="cursor: pointer; color:{{color}};">{{label}}:
        </div>
        <div>
          <span class='cliqz-cluster-items overflow'>
          {{#each urls}}
            <span
                style="color: {{color}}; cursor: pointer"
                url='{{href}}'
                type='cluster-test'
                class="cliqz-cluster-topic {{cls}}"
                >
                  {{ title }}
            </span>
          {{/each}}
          </span>
        </div>
      {{/each}}
    </div>
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
  </div>
</div>
