{{#each results}}
	<html:div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		>
		<html:div class='cliqz-result-left-box'>
			<html:div class='cliqz-result-type' ></html:div>
		</html:div>
		<html:div class='cliqz-result-mid-box' style="width:{{ width }}">
			<html:div class='cliqz-result-title-box overflow'>
				{{ title }}
			</html:div>
			<html:div class='cliqz-result-url-box overflow'>

				<html:span class='cliqz-result-url-host
					{{#if urlDetails.ssl }}
					  cliqz-result-url-ssl
					{{/if}}
					'
				>
					{{ urlDetails.host }}
				</html:span>
				<html:span class='cliqz-result-url-path'>
					{{ urlDetails.path }}
				</html:span>
			</html:div>
		</html:div>
		<html:div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
		</html:div>
	</html:div>
{{/each}}