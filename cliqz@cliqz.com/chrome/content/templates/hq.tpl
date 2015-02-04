<div class='cqz-result-h3'>
    {{#if debug}}
        <span class='cqz-result-debug'>{{ debug }}</span>
    {{/if}}
    <div class='cqz-result-center cqz-vert-center'>
        <div class='cqz-result-title overflow' selectable=''>
            {{ emphasis title text 2 true }}
        </div>
        <div class='cqz-result-desc overflow'>
            {{ emphasis data.description text 2 true }}
        </div>
		{{#if data.richData.additional_sources}}
			<div class="cqz-one-line" style="margin-top: 5px;">
			{{#each data.richData.additional_sources}}
				<span url='{{url}}'
					 extra='sources{{ @index }}'
				     class='cqz-link'>
					{{title}}
				</span>
			{{/each}}
			</div>
		{{/if}}
    </div>
    {{> logo}}
</div>

