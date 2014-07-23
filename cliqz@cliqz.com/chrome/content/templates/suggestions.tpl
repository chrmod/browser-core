{{#each this.suggestions}}
	<span class='cliqz-suggestion'
		val="{{this}}"
		idx="{{ @index }}">
		{{ suggestionEmphasis this ../q }}
	</span>
{{/each}}