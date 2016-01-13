<!-- results.tpl -->
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
				id='ez-{{ @index }}'
				hasimage='{{ hasimage image }}'
				>
					{{partial vertical}}
				</div>
				<br />
				<br />
				<div class="share">
					Teilen
				</div>
		</div>
	{{/unless}}
{{/each}}

{{#if googleThis }}
	{{#with googleThis }}
		{{#if show }}
			<div id="defaultEngine" url="{{searchEngineUrl}}{{searchString}}" class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
			  <div class="ez">
			    <div id="googleThisAnim">
				    <br>
				    <img src="skin/img/icon-google.svg"><br><br>
			        <div>{{ title }}</div><br><br>
          			<div>{{ action }}</div>
			    </div>
			  </div>
			</div>
		{{/if}}
	{{/with}}
{{/if}}

<div class='cqz-result-selected transition'></div>
<!-- end results.tpl -->
