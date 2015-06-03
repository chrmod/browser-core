<div class='onboarding-callout' style="padding: 0px;">
	<div class="msg-container">
		{{ message }}
	</div>
	
	<div class="btn-container-extended">
		{{#each options}}
			<span class="cqz-btn cqz-btn-{{ state }}" cliqz-action="{{ action }}">{{ label }}</span>	
		{{/each}}
	</div>
	<div>
		<img class="cliqz-logo" src="{{cliqz_logo}}" />
	</div>
</div>