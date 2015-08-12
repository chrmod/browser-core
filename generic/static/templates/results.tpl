{{#each results}}
	{{#unless invalid}}
		<div class="frame" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
			<div class="ez"
				type='{{ type }}'
				kind='{{ kind_printer data.kind }}'
				{{#if url}}
					url='{{ url }}'
					{{#unless (logic type 'starts_with' 'cliqz-pattern')}}
						arrow="false"
					{{/unless}}
				{{/if}}
				idx='{{ @index }}'
				hasimage='{{ hasimage image }}'
				>
					{{partial vertical}}
				</div>
		</div>
	{{/unless}}
{{/each}}

<div class='cqz-result-selected transition'></div>
