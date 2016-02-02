<!-- results.tpl -->
{{#each results}}
	{{#unless invalid}}
		<div class="frame" {{#if ../../frameWidth }} style="width: {{ ../../../frameWidth }}px; left: {{ left }}px" {{/if}}>
			<div class="cqz-result-box"
				type='{{ type }}'
				kind='{{ kind_printer data.kind }}'
				{{#if url}}
					url='{{ url }}'
					{{#unless (logic type 'starts_with' 'cliqz-pattern')}}
						arrow="false"
					{{/unless}}
				{{/if}}
				idx='{{ @index }}'
				id='cqz-result-box-{{ @index }}'
				hasimage='{{ hasimage image }}'
				>
					{{partial vertical}}
				{{#if title}}{{#if url}}
					<p cliqz-action='stop-click-event-propagation' onclick="osBridge.shareCard({{ json this }})" class="share_this_card">share this card </p>
				{{/if}}{{/if}}
			</div>
			
		</div>
	{{/unless}}
{{/each}}

{{#if googleThis }}
	{{#ifShowSearch results}}
		{{#with googleThis }}
			<!-- googlethis -->
			<div id="defaultEngine" url="{{searchEngineUrl}}{{searchString}}" class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
			  <div class="cqz-result-box">
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
