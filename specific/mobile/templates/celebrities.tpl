<!-- celebrities.tpl -->

{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
{{/with}}

{{#with data}}
<section class="primary">
		<h1 class="card__title">{{ emphasis name ../text 2 true }} ({{ocupation}})</a><span>Wikipedia</span></h1>
		<div class="card__meta">
			{{urlDetails.friendly_url}}
		</div>
		<div class="card__gallery">
			<!--{{#each data.richData.images}}
				<div class="image" style="background-image: url({{this}})">Image</div>
			{{/each}}-->
			
			{{#each images}}
				{{#if (limit_images_shown @index 3)}}
					<div class="image" style="background-image: url({{this}})">Image</div>
				{{/if}}
			{{/each}}
		</div>
		<div class="card__description">
			{{{ emphasis description_wiki ../text 2 true }}}
		</div>
	</section>

	<section class="secondary">
		
		{{#each social}}
			<!--<img
				data-src='{{img}}'
				url='{{url}}'
				show-status='true'
				class='cqz-celeb-social'
				extra='social-{{ @index }}' />-->
				
				<div class="cards__item news">
					<div class="card__logo__secondary bg" style="background-image: url({{img}});background-color:#fff;">{{ text }}</div>
					<h2 class="cards__title__secondary" url="{{url}}">{{url}}</h2>
				</div>
		 {{/each}}
		
		{{#if data.news}}
			{{#each data.news}}
				<div class="cards__item news">
					{{#with logoDetails}}
					<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
				{{/with}}		

					<h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
					<div class="card__meta__secondary">
						{{url}}
					</div>
				</div>
			{{/each}}
		{{/if}}

		{{#each data.actionsExternalMixed}}
			<div class="cards__item actionsExternalMixed">
				{{#with logoDetails}}
					<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
				{{/with}}	
				<h2 class="cards__title__secondary" url="{{url}}">
					{{title}}
					<span>{{trimNumbers rank}}</span>
				</h2>
			</div>
		{{/each}}	

		{{#each data.richData.internal_links}}
			<div class="cards__item internal_links">

				<h2 class="cards__title__secondary">
					<a href="{{url}}">{{title}}<a>
				</h2>
			</div>
		{{/each}}

		{{#each data.richData.additional_sources}} 
			<div class="cards__item additional_sources">
				<div class="card__logo__secondary">WI</div>
				<!--{{#with logoDetails}}
					{{#if backgroundImage}}
						<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">WI</div>
					{{/if}}
				{{/with}}-->
				<h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
			</div>
		{{/each}}    

	</section>

	{{>EZ-category}}


	<section class="share">
		Share this card: <a href="">{{label}}</a>
	</section>
{{/with}}