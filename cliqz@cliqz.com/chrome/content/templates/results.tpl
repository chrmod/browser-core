{{#each results}}
	<div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		>
		<div class='cliqz-result-left-box'>
			<div class='cliqz-result-type' ></div>
		</div>
		<div class='cliqz-result-mid-box' style="width:{{ width }}">
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
					{{ urlDetails.host }}
				</span>
				<span class='cliqz-result-url-path'>
					{{ urlDetails.path }}
				</span>
			</div>
		</div>
		<div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
		</div>
	</div>
{{/each}}