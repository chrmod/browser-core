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
		{{#if image.text }}
			<p>{{ image.text }}</p>
		{{/if}}
		</div>
	{{/if}}
	<div class='cliqz-result-mid-box' style="width:{{ width }}px">
		<div class='cliqz-result-title-box overflow'>
			{{ emphasis title text }}
		</div>
		<div class='cliqz-result-url-box overflow'>
			<span class='cliqz-result-url-host
				{{#if urlDetails.ssl }}
				  cliqz-result-url-ssl
				{{/if}}
				'
			>
				{{ emphasis urlDetails.host text }}
			</span>
			<span class='cliqz-result-url-path'>
				{{ emphasis urlDetails.path text }}
			</span>
		</div>
		<div class='cliqz-result-description'>
			{{ emphasis data.description text 2 true }}
		</div>
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
	</div>
</div>