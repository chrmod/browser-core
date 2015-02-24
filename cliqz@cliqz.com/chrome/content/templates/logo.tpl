{{#with logo}}

		<div
			newtab='true'
			class='cliqz-brand-logo
		            cqz-result-logo
		            cqz-vert-center'
			{{#if add_logo_url}}
				url="{{logo_url}}"
			{{/if}}
			
			style="{{ style }};"> {{ text }}
    </div>


{{/with}}
