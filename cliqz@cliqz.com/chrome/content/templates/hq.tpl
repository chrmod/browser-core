<div class='{{wikiEZ_height data.richData}}'>
    {{#if data.richData.images }}
    {{#if data.richData.images.length}}
        <!--don't change to padding-bottom: images jump to 2nd line when overflow-->
        <div class='cqz-celeb-images' style="margin-bottom: 18px">
          {{#if data.richData.map}}
            <div url="{{data.richData.map.search_url}}" style="float:left" >
                <img src="{{data.richData.map.url}}" alt="{{data.richData.map.alt_text}}" class='cqz-celeb-image'/>
            </div>
          {{/if}}
          {{#each data.richData.images}}
            {{#if (limit_images_shown @index 5)}}
            <img src='{{this}}' class='cqz-celeb-image'/>
            {{/if}}
          {{/each}}
        </div>
    {{/if}}
    {{/if}}
    
    <div class='cqz-result-center' style="{{#if (logic (wikiEZ_height data.richData) 'is' 'cqz-result-h2') }}margin-top: -5px{{/if}}">
        <div class='cqz-result-title overflow'>{{ emphasis title text 2 true }}</div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
            {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}
        </div>
        <div class='cqz-result-desc overflow'>{{ emphasis data.description text 2 true }}</div>
        
        <!--<div class='cqz-result-desc
            {{#if data.richData.additional_sources.length }}
                overflow
            {{/if}}
            '
        >
            {{ emphasis data.description text 2 true }}
        </div>-->
		{{#if data.richData.additional_sources}}
			<div class="cqz-one-line" style="margin-top: 5px;{{#if (logic (wikiEZ_height data.richData) 'is' 'cqz-result-h3') }}display: none;{{/if}}">
			{{#each data.richData.additional_sources}}
				<span url='{{url}}' show-status='true'
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

