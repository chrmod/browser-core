<div class='cqz-result-h3'>
    <div class='cqz-result-center'>
        <div class='cqz-result-title overflow' selectable=''>
            {{ emphasis title text 2 true }} <span>- {{nameify urlDetails.name}}</span>
        </div>
        <div class='cqz-result-desc
            {{#if data.richData.additional_sources.length }}
                overflow
            {{/if}}
            '
        >
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

