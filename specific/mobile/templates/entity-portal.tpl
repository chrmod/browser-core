<!-- entity-portal -->

{{#with logo}}
	<div extra="logo" class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

<section class="primary">

    <h1 extra="title" class="card__title">
       {{data.name}}
    </h1>

    <div extra="url" class="card__meta">
        {{label}}
    </div>

    <div class="card__description">
      <div class="main mulitple">
      {{#each data.news}}
        <div class="item" url="{{ url }}" extra="entry-{{ @index }}" arrow="false">
          <div class="main__image" data-style="background-image: url({{ thumbnail }});">
              Image
          </div>
          <h1 class="main__headline">{{ title }}</h1>
          <span class="main__multiple__time">{{ time }}</span>
        </div>

      {{/each}}
      </div>
    </div>
    {{>EZ-category}}     
  </div>
</section>



