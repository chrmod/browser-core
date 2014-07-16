{{#each this.suggestions}}
	<span class='cliqz-suggestion'
		val="{{this}}"
		idx="{{ @index }}">
		{{emphasis this ../q 1}}
	</span>
{{/each}}