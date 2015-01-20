<div class='cliqz-pattern cqz-result-h2'>
  <div class='cliqz-pattern-logo'></div>
  <div class='cqz-result-title overflow cliqz-pattern-title' style='color: #2f2f2f;'>
    {{ data.title }}
  </div>
  <div style="width:{{ width }}px;">
    <div style="position:relative;overflow:hidden;">
      <div class='.cqz-result-box cliqz-pattern-entries'>
        <div class='cliqz-pattern-entry-favicons'>
          {{#each data.urls}}
          <div class='cliqz-pattern-favicon' style='background-image: url({{ favicon }}'></div>
          {{/each}}
        </div>
        <div class='cliqz-pattern-entry-title' style="margin-left: 5px">
          {{#each data.urls}}
          <div class='cliqz-pattern-element' url='{{href}}' type='' extra=''>
            <span style='cursor: pointer;color: #800080;'
                  onmouseover="this.children[0].innerHTML='{{link}}'"
                  onmouseout="this.children[0].innerHTML='{{domain}}'">{{ title }}
              <span class='cliqz-pattern-entry-link'>{{ domain }}</span>
              </span>
            </div>
          {{/each}}
        </div>
      </div>
    </div>
  </div>
</div>
