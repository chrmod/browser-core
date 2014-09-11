{{#each results}}
	<div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		idx='{{ @index }}'
		hasimage='{{ hasimage image }}'
		>
		{{partial vertical}}
	</div>
{{/each}}