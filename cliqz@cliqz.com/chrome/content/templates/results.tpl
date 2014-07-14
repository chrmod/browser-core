{{#each results}}
	<div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		idx='{{ @index }}'
		>
		{{vertical partial}}
	</div>
{{/each}}