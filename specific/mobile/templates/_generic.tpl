<!-- _generic.tpl -->

{{debug}}

{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

	<section class="primary">

		<h1 class="card__title">
			{{#if data.richData.full_name}}
				{{data.richData.full_name}}
			{{else}}
				{{data.title}}
			{{/if}}
			{{#if data.richData.under_name}}<span>{{data.richData.under_name}}</span>{{/if}}
		</h1>

		<div class="card__meta">
			
			{{#if data.richData.discovery_timestamp}}
				<div class="timestamp">{{ agoline data.richData.discovery_timestamp }}</div>
			{{else}}
				{{urlDetails.friendly_url}}
			{{/if}}
		</div>

		<!-- main images -->
		
		<div class="card__gallery">
		{{#if data.richData.image}}
            <div class="image big" data-style="background-image: url({{ data.richData.image }});">
                Image
            </div>
        {{else}}

			{{#if data.media}}
				<div class="image big" data-style="background-image: url({{ data.media }});">
					Image
				</div>
			{{else}}
				{{#if image.src}}
					<div class="image big" data-style="background-image: url({{ image.src }})">
						Image
					</div>
				{{/if}}
				{{#if data.i}}
					<div class="image big" data-style="background-image: url({{ data.i }})">
						Image
					</div>
				{{/if}}
			{{/if}}

		{{/if}}
		</div>

        <!-- end main images -->

		<!-- for videos -->
		{{#if data.items}}
			<div class="ez-video">
				{{#each data.items}}

					<div class="item">
					  <div class="main__image" data-style="background-image: url({{ thumbnail }})">
						  {{#if (sec_to_duration duration)}}<span> {{ sec_to_duration duration}}</span>{{/if}}
					  </div>
					  <h1 class="main__headline"><a href="{{link}}">{{ title }}</a></h1>
					  <!--<div class="main__meta">{{ views_helper views}}</div>-->
					</div>

				{{/each}}
			</div>
		{{/if}}
		<!--end for videos -->

		<div class="card__gallery">
			{{#each data.richData.images}}
				{{#if (limit_images_shown @index 3)}}
					<div class="image" style="background-image: url({{this}})">Image</div>
				{{/if}}
			{{/each}}
		</div>

		<div class="card__description">

			<div class="main__rating">
				{{#if data.richData.url_ratingimg}}
					<img data-src="{{data.richData.url_ratingimg}}" class="cqz-rd-rateimg"/>
				{{/if}}

				{{#if data.richData.rating.img}}
					<img data-src="{{data.richData.rating.img}}" class="cqz-rd-rateimg"/>
				{{/if}}

				{{#if data.r.img}}
					<img data-src="{{data.r.img}}" class="cqz-rd-rateimg"/> 
					{{numberFormat data.r.val}}/{{data.r.scale}} <!--({{data.r.nVote}} Stimmen)-->
				{{/if}}
			</div>

			{{#with data.richData.director}}
				<div class="main__director">
					<a url="{{info.url}}">{{title}}: {{info.name}}</a>
				</div>
			{{/with}}
							
			{{#if data.des}}
				{{{data.des}}}
			{{else}}
				{{#if data.richData.current_company}}
				{{else}}
					{{{data.description}}}
				{{/if}}
			{{/if}}

			<!-- people data -->
				{{#with data.richData}}
					{{#if current_job_title}}<br />{{current_job_title}}{{/if}}
					{{#if current_company}}<br />{{current_company}}{{/if}}
					{{#if since}}<br />seit {{since}}{{/if}}
				{{/with}}
			<!-- end people data -->
		</div>

	</section>

	<section class="secondary">

		{{#if data.richData.mobi.ingredients}}
			<div class="card__description">
				<ul class="recipe_ingredients">
					{{#each data.richData.mobi.ingredients}}
						<li>{{this}}</li>
					{{/each}}
				</ul>
			</div>
		{{/if}}

		{{#if data.news}}
			{{#each data.news}}
				<div class="cards__item news">

					{{#with logoDetails}}
						<div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}"
							 style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}
						</div>
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

		{{#each data.links}}
            <div class="cards__item links">
                <div class="card__logo__secondary bg" 
                	style="background-image:url({{icon}});background-color:#{{../logo.backgroundColor}}">{{ text }}</div>
                <h2 class="cards__title__secondary">
                    <a href="{{url}}">{{title}}<a>
                </h2>
            </div>
        {{/each}}


		{{#each data.richData.internal_links}}
            <div class="cards__item internal_links">
                
                <h2 class="cards__title__secondary">
                    <a href="{{mobileWikipediaUrls url}}">{{title}}<a>
                </h2>
            </div>
        {{/each}}

        {{#each data.richData.additional_sources}} 
            <div class="cards__item additional_sources">
                {{#with logoDetails}}
                    {{#if backgroundImage}}
                        <div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">WI</div>
                    {{/if}}
                {{/with}}
                <h2 class="cards__title__secondary" url="{{url}}">{{title}}</h2>
            </div>
        {{/each}}    


        {{#each data.external_social}}
            <div class="cards__item external_social">
                <div class="card__logo__secondary bg" style="background-image: url({{img}});background-color:#fff;">{{ domain }}</div>
                <h2 class="cards__title__secondary" url="{{u}}">{{domain}}</h2>
            </div>
         {{/each}}
		
        {{#each data.w}}
            <div class="cards__item data_w">
                <div class="card__logo__secondary" style="background-image: url({{logo}});background-color:#fff;">{{ source }}</div>
                <h2 class="cards__title__secondary" url="{{u}}">{{source}}</h2>
            </div>
         {{/each}}

	</section>

	{{>EZ-category}}

	{{partial '_history'}}


	<section class="share">
		Share this card: <a href="">{{label}}</a>
	</section>
<!-- end _generic.tpl -->