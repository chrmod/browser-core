{{#each this}}
	<span class='cliqz-suggestion'
		val="{{this}}"
		idx="{{ @index }}">
		{{this}}
	</span>
{{/each}}