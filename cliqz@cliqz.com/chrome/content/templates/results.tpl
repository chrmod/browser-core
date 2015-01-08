{{#each results}}
	{{#unless invalid}}
		<div class='cqz-result-box'
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
