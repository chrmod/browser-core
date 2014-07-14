{{#each results}}
	<div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		idx='{{ @index }}'
		>
		{{#if partial-weather}}
			{{#with data}}
				{{> weather }}
			{{/with}}
		{{ else }}
			{{#if partial-shopping}}
				{{> shopping}}
			{{ else }}
				{{> generic }}
			{{/if}}
		{{/if}}
	</div>
{{/each}}