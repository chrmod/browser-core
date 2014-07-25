<div class='cliqz-inline-box-children cliqz-result-generic'>
	<div class='cliqz-result-left-box'>
		<div class='cliqz-result-type' ></div>
	</div>
	{{#if image.src}}
		<div class="cliqz-image" style="
					background-image: url({{ image.src }});
					{{#if image.height }}
						background-size: {{ image.backgroundSize }}px;
						width: {{ image.width }}px;
						height: {{ image.height }}px;
					{{/if}}
				"
		>
		</div>
	{{/if}}
	<div class='cliqz-result-mid-box' style="width:{{ width }}px">
		<div class='cliqz-result-title-box overflow'>
			{{ title }}
		</div>
		<div class='cliqz-result-url-box overflow'>
			{{#with data.richData}}
			<span class='cliqz-result-url-host
				{{#if urlDetails.ssl }}
				  cliqz-result-url-ssl
				{{/if}}
				'
			>
				{{ source_name }}
			</span>
			<span class='cliqz-news-ago-line'>
				{{ agoline discovery_timestamp }}
			</span>
			{{/with}}
		</div>
		<div class='cliqz-result-description'>
			{{ data.description }}
		</div>
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'
		 newtab='true'>
	</div>
</div>
{{#if data.richData.additional_sources}}
	<div class='cliqz-news-sources'>
	{{#each data.richData.additional_sources}}
		<div url='{{url}}'
			 idx='{{ @index }}'
			 type='{{ ../type }}'
			 class='cliqz-news-source'>
		     <span class='cliqz-news-source-logo {{generate_logo url}}'
		           newtab='true'>
		     </span>
		     <span class='cliqz-news-source-title'>
				{{title}}
			 </span>
		</div>
	{{/each}}
	</div>
{{/if}}
