<!-- pattern-h2 -->
<div class="meta">
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
                    <h3>{{ title }}</h3>
                    <span>{{ emphasis link ../query 2 true }}</span>
                </a>
                
            </li>
        {{/each}}
    </ul>
</div>
