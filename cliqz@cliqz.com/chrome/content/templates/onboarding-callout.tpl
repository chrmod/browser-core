<div class='onboarding-callout' style="padding: 0px;">
	{{ message }}
	<div class="btn-container">
		{{#each options}}
			<span class="cqz-btn cqz-btn-{{ state }}" cliqz-action="{{ action }}">{{ label }}</span>		
		{{/each}}
	</div>
</div>