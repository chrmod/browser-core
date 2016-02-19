<!-- _history.tpl -->

<section class="primary">
    <h1 class="card__title">History results</h1>
</section>

<section class="secondary">
    {{#each data.urls}}
            <div class="cards__item news" url='{{href}}' shortUrl='{{link}}' domain='{{domain}}' extra='{{extra}}' arrow="false">
                {{#with logo}}
                    <div class="card__logo__secondary {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
                {{/with}}		

                <h2 class="cards__title__secondary" url="{{url}}">{{ emphasis title ../text 2 true }}</h2>
                <div class="card__meta__secondary">
                    {{ emphasis link ../text 2 true }}
                </div>
            </div>
    {{/each}}
</section>    


<!--<div class="meta">
    <h3 class="meta__url" style="margin-left: 0; color: #691109">History results</h3>
</div>

<div class='main'>
    <ul class='cta cta__history'>
        {{#each data.urls}}
            <li url='{{href}}' shortUrl='{{link}}' domain='{{domain}}' extra='{{extra}}' arrow="false">
                 <a href="{{href}}">
                     {{#with logo}}
                         <div newtab='true' class='cta__logo'
                             {{#if add_logo_url}}
                                 url="{{logo_url}}"
                             {{/if}}
                             style="{{ style }};"
                         >
                             {{ text }}
                         </div>
                     {{/with}}
                    <h3>{{ emphasis title ../text 2 true }}</h3>
                    <span>{{ emphasis link ../text 2 true }}</span>
                </a>
                
            </li>
        {{/each}}
    </ul>
</div>-->
<!-- end _history.tpl -->