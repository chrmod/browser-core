<div class='cqz-result-{{data.height}} cqz-result-pattern'>
      <div class='cliqz-pattern-title-{{data.height}} cqz-result-title overflow'>
          {{ data.title }}
      </div>
      <div class='cliqz-pattern-results'>
        {{#each data.urls}}
        <div class='cliqz-pattern-element overflow'
             style='background-image: url({{ favicon }}'
             url='{{href}}' shortUrl='{{link}}'
             domain='{{domain}}' height='{{height}}'
            arrow="false">
            <div class='cliqz-pattern-element-title' selectable=''>{{ title }}</div>
            <div class='cliqz-pattern-element-link'>{{ link }}</div>
        </div>
        {{/each}}
    </div>
    <div class="cliqz-brand-logo cqz-result-logo cqz-vert-center cliqz-pattern-logo">
    </div>
</div>