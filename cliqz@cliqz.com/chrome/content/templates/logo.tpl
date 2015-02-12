{{#with logo}}
	{{#if force_cliqz}}
	    <div class="cliqz-brand-logo cqz-result-logo cqz-vert-center cliqz-pattern-logo"></div>
	{{else}}
	    <div class="cliqz-brand-logo cqz-result-logo cqz-vert-center" style="{{ style }};">{{ text }}</div>
	{{/if}}
{{/with}}