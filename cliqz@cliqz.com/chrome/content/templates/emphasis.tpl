{{#each this}}{{#even @index ~}}
	<em>{{this}}</em>
{{~ else ~}}
	{{this}}
{{~/even}}{{/each}}