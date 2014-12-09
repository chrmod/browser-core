{{#each results}}
	{{#unless invalid}}
		<div class='cliqz-result-item-box'
			type='{{ type }}'
			kind='{{ data.kind }}'
			url='{{ url }}'
			idx='{{ @index }}'
			hasimage='{{ hasimage image }}'
			>
			{{partial vertical}}
		</div>
	{{/unless}}
{{/each}}