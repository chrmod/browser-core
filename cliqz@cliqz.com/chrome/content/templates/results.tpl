{{#each results}}
	<div class='cliqz-result-item-box'
		type='{{ type }}'
		url='{{ url }}'
		idx='{{ @index }}'
		>
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
			{{#if image.text }}
				<p>{{ image.text }}</p>
			{{/if}}
			</div>
		{{/if}}
		<div class='cliqz-result-mid-box' style="width:{{ width }}px">
			<div class='cliqz-result-title-box overflow'>
				{{ title }}
			</div>
			<div class='cliqz-result-url-box overflow'>

				<span class='cliqz-result-url-host
					{{#if urlDetails.ssl }}
					  cliqz-result-url-ssl
					{{/if}}
					'
				>
					{{ urlDetails.host }}
				</span>
				<span class='cliqz-result-url-path'>
					{{ urlDetails.path }}
				</span>
			</div>
			<div class='cliqz-result-description'>
				{{ data.description }}
			</div>
		</div>
		<div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
		</div>
	</div>
{{/each}}