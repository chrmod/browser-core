<!-- delivery-tracking.tpl --> 
{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

<section class="primary">

    <h1 class="card__title">
       Delivery tracking
    </h1>

    <div class="card__meta">
        <div url="{{url}}" extra="title">{{ data.name }} {{ data.trackid }}</div>
    </div>

</section>

<section class="secondary">
    <div class="cqz-delivery-status-boxes-holder">
        {{#each data.links}}
            <span class="cqz-status-box
                        cqz-status-box-active-{{ this.step_status }}
                        cqz-status-box-name-{{ this.step_name }} "
                  data-style="background-image: url({{ this.icon_url }});"
                  url="{{this.url}}"
                  extra="item-{{ this.logg_as }}"
            >
                {{ this.step_name }}
            </span>
        {{/each}}
    </div>
    <div class="card__description">
        <div class="cqz-delivery-info">
            <b><p>{{ data.status }}</p></b>
            <p>{{ data.date }}</p>
            <p><br />{{ data.message }}</p>
        </div>
    </div>
</section>


