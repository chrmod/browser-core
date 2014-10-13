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
			<p class='cliqz-video-arrow'>{{ image.text }}</p>
		{{/if}}
		</div>
	{{/if}}
	<div class='cliqz-result-mid-box' style="width:{{ width }}px">
		<div>
			<span style='max-width: {{math width '*' '0.72'}}px;'
			  	  class='cliqz-result-title-box overflow'>
				{{ emphasis title text 2 false}}
			</span>
			{{#if tags}}
				<span style='max-width: {{math width '*' '0.20'}}px;'
					  class='cliqz-result-tags overflow'>
				      {{ tags }}
				</span>
			{{/if}}
		</div>
		{{> url this}}
		<div class='cliqz-result-description'>
			{{ emphasis data.description text 2 true }}
		</div>
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'
	     newtab='true'>
	</div>

</div>