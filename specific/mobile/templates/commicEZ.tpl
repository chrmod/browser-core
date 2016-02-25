<!-- commicEZ.tpl -->

{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

{{#with data}}
    <section class="primary">

        <h1 class="card__title">
           {{local 'publish_date'}}: {{publish_date}}
        </h1>

    </section>

    <section class="secondary">
        <div class="card__description">
            <div style="overflow:hidden">
                 <img style="height: 254px" border="3" data-src="{{commic_url}}"/>
            </div>
        </div>
    </section>
{{/with}}