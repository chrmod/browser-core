<!-- celebrities.tpl -->

<div class="meta">
	{{#with data}}
	
</div>

<div class="main">
		<div class="__main__image __many">
		  {{#each images}}
			<img url="{{ get_array_element ../images_meta @index 'ref_url'}}" class="__main__image__many" 
				data-src="{{this}}" alt="{{data.richData.map.alt_text}}" />
		  {{/each}}
		</div>

	<h1 class="main__headline"><a href="{{../url}}">{{ emphasis name ../text 2 true }} ({{ocupation}})</a><span> - Wikipedia</span></a></h1>
	
	<h3 class="meta__social">
		<i class="fa fa-mobile mobile"></i>
		<span class='cqz-celeb-social-box'>
			 {{#each social}}
				<img
					data-src='{{img}}'
					url='{{url}}'
					show-status='true'
					class='cqz-celeb-social'
					extra='social-{{ @index }}' />
			 {{/each}}
		</span>
	</h3>
	<p class="main__content">{{{ emphasis description_wiki ../text 2 true }}}</p>
</div>


{{/with}}

<!-- end celebrities.tpl -->