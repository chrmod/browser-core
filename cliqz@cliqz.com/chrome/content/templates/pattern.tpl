<div class='cliqz-pattern cqz-result-{{data.height}}'>
  <div class='cliqz-pattern-logo cliqz-pattern-logo-{{data.height}}'></div>
  <div class='cqz-result-title overflow cliqz-pattern-title-{{data.height}}' style='color: rgba(0,0,0,0.72)'>
    {{ data.title }}
  </div>
  <div class="cliqz-pattern-document-icon-{{data.height}}"></div>
  <br clear='both' class='cliqz-pattern-margin-{{data.height}}' />
  <div style="width:{{ width }}px;">
    <div style="position:relative;overflow:hidden;">
      <div class='.cqz-result-box cliqz-pattern-result-container'>
        <div class='cliqz-pattern-favicons'>
          {{#each data.urls}}
          <div class='cliqz-pattern-favicon-element-{{height}}' style='background-image: url({{ favicon }}'></div>
          {{/each}}
        </div>
        <div class='cliqz-pattern-results'>
          {{#each data.urls}}
          <div class='cliqz-pattern-element' url='{{href}}' shortUrl='{{link}}' domain='{{domain}}' height='{{height}}' type='' extra=''>
              <div class='cliqz-pattern-element-title cliqz-pattern-element-{{height}}'>{{ title }}</div>
              <span class='cliqz-pattern-element-link cliqz-pattern-element-{{height}}'>{{ domain }}</span>
          </div>
          {{/each}}
        </div>
      </div>
    </div>
  </div>
</div>
