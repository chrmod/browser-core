<!-- results.tpl -->
{{#each results}}
	{{#unless invalid}}
		<div class="frame" {{#if ../../frameWidth }} style="width: {{ ../../../frameWidth }}px; left: {{ left }}px" {{/if}}>
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
				<!--<div class="share">
					Teilen
				</div>-->
		</div>
	{{/unless}}
{{/each}}

{{#if googleThis }}
	{{#ifShowSearch results}}
		{{#with googleThis }}
			<!-- googlethis -->
			<div id="defaultEngine" url="{{searchEngineUrl}}{{searchString}}" class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
			  <div class="ez">
			    <div id="googleThisAnim">
				    <img src="skin/img/icon-google.svg"><br>
			        <div>{{ title }}</div><br>
          			<div id="moreResults">{{ action }}</div>
			    </div>
			  </div>
			</div>
			<!-- end googlethis -->
		{{/with}}
	{{/ifShowSearch}}
{{/if}}

<div class='cqz-result-selected transition'></div>
<!-- end results.tpl -->
