{{#if (is-cliqz-premium)}}
<div class='cliqz-result-item-box cliqz-premium'
	type='cliqz-results sources-X'
	url='https://beta.cliqz.com/premium'
	extra='premium'
	idx='-2'>
		{{cliqz-premium}}
</div>
{{/if}}
{{#each results}}
	<div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		idx='{{ @index }}'
		extra='{{cliqz-ad @index type text}}'
		hasimage='{{ hasimage image }}'
		>
		{{partial vertical}}
	</div>
{{/each}}