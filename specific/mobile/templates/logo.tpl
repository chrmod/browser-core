{{#with logo}}
<div newtab='true' class="meta__logo {{#if add_logo_url}}image{{/if}}"
			
		
		style="
		{{#if add_logo_url}}
			background-image:url("{{logo_url}}");
		{{/if}}
		{{ style }};">{{ text }}</div>
{{/with}}
