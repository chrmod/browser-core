{{#each results}}
	{{#unless invalid}}
		<div class='cqz-result-box'
			type='{{ type }}'
			kind='{{ data.kind }}'
			{{#if url}}
				url='{{ url }}'
			{{/if}}
			idx='{{ @index }}'
			hasimage='{{ hasimage image }}'
			{{#unless (logic type 'starts_with' 'cliqz-pattern')}}
				arrow="false"
			{{/unless}}
			>
			{{partial vertical}}
		</div>
	{{/unless}}
{{/each}}
{{#if showAdult}}
	{{>adult}}
{{/if}}
<div class='cqz-result-selected'></div>
