{{debug}}

{{#with logo}}
	{{#if backgroundImage}}
		<div class="card__logo" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}
		</div>
	{{/if}}
 {{/with}}



	<section class="primary">
		<h1 class="card__title">{{data.title}}</h1>
		<div class="card__gallery">
			{{#each data.richData.images}}
				<div class="image" style="background-image: url({{this}})">Image</div>
			{{/each}}
		</div>
		<div class="card__description">
			{{data.description}}
		</div>
		<div class="card__meta">
			{{urlDetails.friendly_url}}
		</div>
	</section>
	<section class="secondary">
		{{#each data.richData.internal_links}}
			<div class="cards__item ext">
				<div class="card__logo__secondary">Logo</div>
				<h2 class="cards__title__secondary">
					<a href="{{url}}">{{title}}<a>
				</h2>
			</div>
		{{/each}}

		{{#each data.richData.additional_sources}} 
			<div class="cards__item ext">
				{{#with logoDetails}}
					{{#if backgroundImage}}
						<div class="card__logo__secondary" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">Logo</div>
					{{/if}}
				{{/with}}	
				<h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
			</div>
		{{/each}}	


		{{#each data.actions}}
			<div class="cards__item">
				<h2 url="{{url}}" class="cards__title__secondary">{{title}}</h2>
			</div>
		{{/each}}	

		{{#each data.external_links}}
			<div class="cards__item ext">
				{{#with logoDetails}}
					{{#if backgroundImage}}
						<div class="card__logo__secondary" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">Logo</div>
					{{/if}}
				{{/with}}	
				<h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
			</div>
		{{/each}}		
		
	</section>
	<section class="share">
		Share this card: <a href="">{{label}}</a>
	</section>