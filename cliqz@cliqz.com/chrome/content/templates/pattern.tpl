<div class='cliqz-pattern cqz-result-{{data.height}} cqz-result-box'>
  <div class='cqz-result-title overflow cliqz-pattern-title-{{data.height}}' style='color: rgba(0,0,0,0.72)'>
    {{ data.title }}
    <div class="cliqz-pattern-document-icon-{{data.height}}"></div>
  </div>

  <br clear='both' class='cliqz-pattern-margin-{{data.height}}' />
  <div class='cliqz-pattern-favicons'>
    {{#each data.urls}}
    <div class='cliqz-pattern-favicon-element-{{height}}' style='background-image: url({{ favicon }}'></div>
    {{/each}}
  </div>
  <div class='cliqz-pattern-results'>
    {{#each data.urls}}
    <div class='cliqz-pattern-element'
         url='{{href}}' shortUrl='{{link}}'
         domain='{{domain}}' height='{{height}}'
         selectable='' arrow="false">
        <div class='cliqz-pattern-element-title cliqz-pattern-element-{{height}}'>{{ title }}</div>
        <span class='cliqz-pattern-element-link cliqz-pattern-element-{{height}}'>{{ link }}</span>
    </div>
    {{/each}}
  </div>
  <div class="cliqz-brand-logo cqz-result-logo cqz-vert-center cliqz-pattern-logo"></div>
</div>
