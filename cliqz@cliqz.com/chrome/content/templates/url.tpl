<div class='cliqz-result-url-box overflow'>
	<span class='cliqz-result-url-host
		{{#if ssl }}
		  cliqz-result-url-ssl
		{{/if}}
		'
	>
		{{ emphasis urlDetails.host text 2 false ~}}
	</span><span class='cliqz-result-url-path'>
		{{~ emphasis urlDetails.path text 2 false }}
	</span>
</div>