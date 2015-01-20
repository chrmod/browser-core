<div class='cliqz-pattern cqz-result-h2'>
  <div class='cliqz-pattern-logo'></div>
  <div class='cqz-result-title overflow cliqz-pattern-title' style='color: rgba(0,0,0,0.72)'>
    {{ data.title }}
  </div>
  <div class="cliqz-pattern-document-icon"></div>
  <br clear='both' />
  <div style="width:{{ width }}px;">
    <div style="position:relative;overflow:hidden;">
      <div class='.cqz-result-box cliqz-pattern-result-container'>
        <div class='cliqz-pattern-favicons'>
          {{#each data.urls}}
          <div class='cliqz-pattern-favicon-element' style='background-image: url({{ favicon }}'></div>
          {{/each}}
        </div>
        <div class='cliqz-pattern-results'>
          {{#each data.urls}}
          <div class='cliqz-pattern-element' url='{{href}}' shortUrl='{{link}}' domain='{{domain}}' type='' extra=''
            onmouseover="this.children[1].textContent='{{link}}'"
            onmouseout="this.children[1].textContent='{{domain}}'">
              <div class='cliqz-pattern-element-title'>{{ title }}</div>
              <span class='cliqz-pattern-element-link'>{{ domain }}</span>
          </div>
          {{/each}}
        </div>
      </div>
    </div>
  </div>
</div>
