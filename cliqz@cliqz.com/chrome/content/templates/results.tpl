<div class='cliqz-result-item-box cliqz-premium'
	type='cliqz-results sources-X'
	url='https://beta.cliqz.com/premium'
	idx='-2'>
		{{cliqz-premium}}
</div>
{{#each results}}
	<div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		idx='{{ @index }}'
		ad-ui='{{cliqz-ad @index type text}}'
		hasimage='{{ hasimage image }}'
		>
		{{partial vertical}}
	</div>
{{/each}}