{{#with logo}}
	<div
		newtab='true'
		class='cliqz-brand-logo
	            cqz-result-logo
	            cqz-vert-center
            {{#if force_cliqz}}
                cliqz-pattern-logo'>
            {{else}}
                ' style="{{ style }};">{{ text }}
            {{/if}}
    </div>
{{/with}}