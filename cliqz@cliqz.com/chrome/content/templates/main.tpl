<div id='cliqz-suggestion-box'></div>
<div id='cliqz-results'></div>
<div id='cliqz-footer'>
	<span id='cliqz-navigation-message'>-</span>
	<span class='cliqz-footer-engines'>
		<span class='cliqz-engines-text'>{{local 'moreResults'}}</span>
		<span id='cliqz-engines-box'>
			{{#each this}}
				<img class='cliqz-engine'
					 src='{{ icon }}'
					 title='{{ name }} {{ prefix }}'
					 engine='{{ name }}'
	                 engineCode='{{ code }}'
					 />
			{{/each}}
		</span>
	</span>
</div>