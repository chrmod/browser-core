<div class='cqz-generic cqz-result-h3'>
	{{#if debug}}
		<span class='cqz-result-debug'>
			<span>{{ debug }}</span>
		</span>
	{{/if}}
	{{#if image.src}}
		<div class="cqz-image" style="
					background-image: url({{ image.src }});
					{{#if image.height }}
						background-size: {{ image.backgroundSize }}px;
						width: {{ image.width }}px;
						height: {{ image.height }}px;
					{{/if}}
				"
		>
		{{#if image.text }}
			<p class='cqz-video-arrow'>{{ image.text }}</p>
		{{/if}}
		</div>
	{{/if}}
	<div class='cqz-result-center cqz-vert-center'>
		<div class='cqz-result-title overflow'>
			{{ title }}
		</div>
		<div class='cqz-result-url overflow
					{{#if urlDetails.ssl }}
		 				 cqz-result-url-ssl
					{{/if}}
		'>
			{{ urlDetails.host }}<span class='cqz-result-path'>{{ urlDetails.path }}</span>
		</div>
		{{#unless image.src}}
			<div class='cqz-result-desc overflow'>
				{{ data.description }}
			</div>
		{{/unless}}
	</div>
	{{#with logo}}
		<div class='cqz-result-logo'
		     style='background-color: {{ color }};
		     {{#if img }}
		     	    background-image: {{ img }};'>
		     {{ else }}
		     '>{{ text }}
		     {{/if }}
	     </div>
	{{/with}}
</div>