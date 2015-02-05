<div class='cqz-result-{{data.height}}'>
    <div class='cqz-result-center cqz-vert-center'>
        <div class='cliqz-pattern-title-{{data.height}} cqz-result-title overflow' selectable=''>
            {{ data.title }}
        </div>
        <div class='cliqz-pattern-results'>
          {{#each data.urls}}
          <div class='cliqz-pattern-element overflow'
               style='background-image: url({{ favicon }}'
               url='{{href}}' shortUrl='{{link}}'
               domain='{{domain}}' height='{{height}}'
              arrow="false">
              <div class='cliqz-pattern-element-title overflow' selectable=''>{{ title }}</div>
              <div class='cliqz-pattern-element-link overflow'>{{ link }}</div>
          </div>
          {{/each}}
        </div>
    </div>
    <div class="cliqz-brand-logo cqz-result-logo cqz-vert-center cliqz-pattern-logo"></div>
</div>