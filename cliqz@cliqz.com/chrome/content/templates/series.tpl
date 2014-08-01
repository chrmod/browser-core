<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-mid-box' style="width:{{ width }}px; margin-right: 32px">
    <div>
      <span class="cliqz-cluster-title-box overflow">
        {{ data.summary}}
      </span>
    </div>
    <div class="cliqz-series-result-topic">
      {{#each data.topics}}
        <div class="cliqz-series-topic-label"
              style="color:{{color}};">{{label}}:
        </div>
        <div>
          <span class='cliqz-series-items overflow'>
          {{#each urls}}
            <span
                style="color: {{color}}; cursor: pointer"
                url='{{href}}'
                type='{{../../type}}'
                {{#if guessed}}
                  extra='guessed'
                {{else}}
                  extra='topic'
                {{/if}}
                class="cliqz-series-topic {{cls}}"
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
