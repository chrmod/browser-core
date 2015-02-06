{{#each results}}
	{{#unless invalid}}
		<div class='cqz-result-box'
			type='{{ type }}'
			kind='{{ data.kind }}'
			{{#if url}}
				url='{{ url }}'
				{{#unless (logic type 'starts_with' 'cliqz-pattern')}}
					arrow="false"
				{{/unless}}
			{{/if}}
			idx='{{ @index }}'
			style="width:{{../width}}px"
			hasimage='{{ hasimage image }}'
			>
			{{partial vertical}}
		</div>
	{{/unless}}
{{/each}}
{{#if showAdult}}
	{{>adult}}
{{/if}}
<div class='cqz-result-selected'></div>
