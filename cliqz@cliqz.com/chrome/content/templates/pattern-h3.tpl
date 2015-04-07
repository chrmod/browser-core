<div class='cqz-result-h3 cqz-result-padding cqz-result-pattern cqz-3-history-results'>
      <div class='cliqz-pattern'>
        {{#each data.urls}}
        <div class='cliqz-pattern-element overflow'
             url='{{href}}' shortUrl='{{link}}'
             domain='{{domain}}'
             extra='{{extra}}'
             arrow="false">
            <div class='cliqz-pattern-element-title'>{{ emphasis title ../text 2 true }}</div>
            <div class='cliqz-pattern-element-link'>{{ emphasis link ../text 2 true }}</div>
        </div>
        {{/each}}
    </div>
    {{>logo}}
</div>
