{{#with data}}
	<div class='cliqz-history-results'>
        {{#each urls}}
            <div class='cliqz-pattern-element overflow'
                 style='padding-left: 0px;'
                 url='{{href}}' shortUrl='{{link}}'
                 extra='{{extra}}'
                 domain='{{domain}}'
                 arrow="false">
                <div class='cliqz-pattern-element-title' selectable=''>{{ title }}</div>
                <div class='cliqz-pattern-element-link'>{{ link }}</div>
            </div>
        {{/each}}
    </div>
{{/with}}
