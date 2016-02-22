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
		</h1>

		<div class="card__meta">
			{{urlDetails.friendly_url}}
		</div>

		<!-- main images -->

		{{#if data.richData.image}}
            <div class="main__image" data-style="background-image: url({{ data.richData.image }});">
                Image
            </div>
        {{/if}}

        {{#if data.media}}
            <div class="main__image" data-style="background-image: url({{ data.media }});">
                Image
            </div>
        {{/if}}

        {{#if image.src}}
            <div class="main__image" data-style="background-image: url({{ image.src }})">
                Image
            </div>
        {{/if}}

        <!-- end main images -->

		<!-- for videos -->
		{{#if data.items}}
			<div class="cqz-result-h1 cqz-result-padding ez-video main mulitple">
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
				<div class="image" style="background-image: url({{this}})">Image</div>
			{{/each}}
		</div>

		<div class="main__rating">
            {{#if data.richData.url_ratingimg}}
                <img data-src="{{data.richData.url_ratingimg}}" class="cqz-rd-rateimg"/>
            {{/if}}

            {{#if data.richData.rating.img}}
                <img data-src="{{data.richData.rating.img}}" class="cqz-rd-rateimg"/>
            {{/if}}
        </div>

		<div class="card__description">
			{{#if data.richData.discovery_timestamp}}
				<div class="i_am_greislig" style="color:pink;font-weight:bold">{{ agoline data.richData.discovery_timestamp }}</div>
			{{/if}}

			{{{data.description}}}

			<!-- people data -->
				{{#with data.richData}}
					{{#if current_company}}<br />{{current_company}} {{#if current_branch}}({{current_branch}}){{/if}}{{/if}}
					{{#if current_job_type}}<br />{{current_job_type}}{{/if}}
					{{#if since}}<br />seit {{since}}{{/if}}
				{{/with}}
			<!-- end people data -->
		</div>

		{{#if data.richData.mobi.ingredients}}
			<ul class="recipe_ingredients">
				{{#each data.richData.mobi.ingredients}}
					<li>{{this}}</li>
				{{/each}}
			</ul>
		{{/if}}


	</section>

	<section class="secondary">

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

	{{partial '_history'}}


	<section class="share">
		Share this card: <a href="">{{label}}</a>
	</section>
<!-- end _generic.tpl -->