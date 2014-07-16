<div class='cliqz-inline-box-children cliqz-result-generic'>
	<div class='cliqz-result-left-box'>
		<div class='cliqz-result-type' ></div>
	</div>
	<div class='cliqz-result-mid-box' style="width:{{ width }}px">
		<div class='cliqz-result-title-box overflow'>
			{{ title }}
		</div>
		<div class='cliqz-result-url-box overflow'>
			<span class='cliqz-result-url-host
				{{#if urlDetails.ssl }}
				  cliqz-result-url-ssl
				{{/if}}
				'
			>
				{{ emphasis urlDetails.host text }}
			</span>
			<span class='cliqz-result-url-path'>
				{{ emphasis urlDetails.path text }}
			</span>
		</div>
		{{#with data.richData}}
		<div class='overflow' style="font-size: 10pt; color:#ccc">
			<span class='cliqz-qaa-answer'>ANTWORTEN:</span>
			<span class='cliqz-qaa-answer-value'>{{answers}}</span>
			|
			{{#if accepted}}
				<span class='cliqz-qaa-accepted'>Hilfreichste Antwort</span>
				|
			{{else}}
				<!--<span class='cliqz-qaa-declined'>Scheisse Antwort</span>-->
			{{/if}}
			<span class='cliqz-qaa-posted'>geposted am</span>
			<span class='cliqz-qaa-posted-value'>{{posted_at}}</span>
		</div>
		{{/with}}
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
	</div>
</div>
{{#if data.richData.additional_sources}}
	<div class='cliqz-qaa-sources'>
		<div class='cliqz-qaa-sources-headline'>ÄHNLICHE FRAGEN</div>
	{{#each data.richData.additional_sources}}
		<div url='{{url}}'
			 idx='{{ @index }}'
			 type='{{ ../type }}'
		     class='cliqz-qaa-source-title-with-logo {{generate_logo url}}'>
			{{title}}
		</div>
	{{/each}}
	</div>
{{/if}}
