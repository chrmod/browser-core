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
			<span class='cliqz-hq-language'>
				{{ source_language }}
			</span>
			{{/with}}
		</div>
		<div class='cliqz-result-description'>
			{{ data.description }}
		</div>
		{{#if data.richData.additional_sources}}
			<div class='cliqz-hq-links'>
			{{#each data.richData.additional_sources}}
				<div url='{{url}}'
					 idx='{{ @index }}'
					 type='{{ ../type }}'
				     class='cliqz-hq-link'>
					{{title}}
				</div>
			{{/each}}
			</div>
		{{/if}}
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
	</div>
</div>