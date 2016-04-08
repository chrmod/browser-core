<!-- results.tpl -->

{{#each results}}
	{{#unless invalid}}
		<div class="frame" {{#if ../frameWidth }} style="width: {{ ../frameWidth }}px; left: {{ left }}px" {{/if}}>
			<div class="card">
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
					{{#if url}}
						<section class="share">
							<p cliqz-action='stop-click-event-propagation'
								onclick="osBridge.shareCard('{{ url }}')"
								>{{local 'mobile_share_card'}}: {{url}}</p>
						</section>
					{{/if}}
				</div>
			</div>
			<br>
		</div>
	{{/unless}}
{{/each}}

{{#if googleThis }}
	{{#ifShowSearch results}}
		{{#with googleThis }}
			<!-- googlethis -->
			<div id="defaultEngine" class="frame" extra="search" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
				<div class="card last-card">
					<div url="{{searchEngineUrl}}{{searchString}}" kind="CL" class="cqz-result-box">
						<div id="googleThisAnim">
							<!-- <img data-src="skin/img/icon-google.svg"><br> -->
							<h3>{{ title }}</h3>
							<div id="moreResults">{{ action }}</div>
						</div>

					{{#with logo}}
						<div class="search_engine_logo"
						 style="{{style}}"
						 show-status=""
						 extra="{{extra}}"
						 url="{{url}}"
						 >
						</div>
					  {{/with}}
					  </div>
				</div>
			</div>
			<!-- end googlethis -->
		{{/with}}
	{{/ifShowSearch}}
{{/if}}

<div class='cqz-result-selected transition'></div>

<!-- end results.tpl -->
