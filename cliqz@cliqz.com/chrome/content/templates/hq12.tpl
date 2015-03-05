<div class='cqz-result-h2'>
    <div class='cqz-celeb-images'>
      {{#if data.richData.map}}
        <div url="{{data.richData.map.search_url}}" style="float:left" >
            <img src="{{data.richData.map.url}}" alt="{{data.richData.map.alt_text}}" class='cqz-celeb-image'/>
        </div>
      {{/if}}

      {{#each data.richData.images}}
        {{#if (limit_images_shown @index 5)}}
        <img src='{{this}}' class='cqz-celeb-image' />
        {{/if}}
      {{/each}}
    </div>


    <div class='cqz-result-center' style="padding-top:18px">
        <div class='cqz-result-title cqz-ez-title overflow'>
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

