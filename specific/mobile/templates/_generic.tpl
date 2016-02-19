<!-- _generic.tpl -->

{{debug}}

{{#with logo}}
	{{#if backgroundImage}}
		<div class="card__logo" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}
		</div>
	{{else}}
		<div class="card__logo" style="{{#if backgroundColor}} background-color:#{{backgroundColor}};{{else}}{{ style }};{{/if}}">{{ text }}
		</div>
	{{/if}}
 {{/with}}

	<section class="primary">
		<h1 class="card__title">{{data.title}}</h1>
		<div class="card__meta">
			{{urlDetails.friendly_url}}
		</div>
		<div class="card__gallery">
			{{#each data.richData.images}}
				<div class="image" style="background-image: url({{this}})">Image</div>
			{{/each}}
		</div>
		<div class="card__description">
			{{{data.description}}}
		</div>
	</section>
	<section class="secondary">
		{{#if data.news}}
			{{#each data.news}}
				<div class="cards__item news">
					{{#with logoDetails}}
						{{#if backgroundImage}}
							<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">WI</div>
						{{/if}}
					{{/with}}	

					<h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
					<div class="card__meta__secondary">
						{{url}}
					</div>
				</div>
			{{/each}}
		{{/if}}

	
		{{#each data.actionsExternalMixed}}
			<div class="cards__item external_links">
				{{#with logoDetails}}
					{{#if backgroundImage}}
						<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">WI</div>
					{{/if}}
				{{/with}}	
				<h2 class="cards__title__secondary" url="{{url}}">
					{{title}}
					<span>{{numberFormat rank}}</span>
				</h2>
			</div>
		{{/each}}	

		
	</section>
	<section class="share">
		Share this card: <a href="">{{label}}</a>
	</section>
<!-- end _generic.tpl -->