<div class="entity-banking-container cf" >
    {{#with data}}
        <div class="entity-banking-call2action cf">
            <div class="item-label cf">
                <h3>Shortcuts</h3>
                {{#each links }}
                    <div class="item green">
                        <span class="item__icon"><img src="{{ icon }}" /></span>
                        <span class="item__title">{{ title }}</span>
                    </div>
                {{/each}}
            </div>
            <div class="item-label small cf">
                <h3>Downloads</h3>
                {{#if iphoneApp}}
                   <div class="item blue">
                       <span class="item__title"
                             url="{{iphoneApp}}"
                             type="{{ type }}"
                             extra="iphone_app">
                             iPhone App
                       </span>
                   </div>
                {{/if}}
                {{#if androidApp}}
                     <div class="item blue">
                       <span class="item__title"
                             url="{{androidApp}}"
                             type="{{ type }}"
                             extra="android_app"
                             >
                            Android App</span>
                     </div>
                {{/if}}
            </div>
        </div>
        <div class="entity-banking-meta cf overflow">
           <strong>{{ name }}</strong> ·
           <b>SWIFT/BIC</b>: <span>{{ swift-bic }}</span> ·
           <b>Support </b>: <span>{{ tel }}</span> ·
           <span class="link"
                 url="mailto:{{ email }}"
                 type="{{ type }}"
                 >{{ email }}</span>
        </div>
    {{/with}}
    <div class="entity-banking-logo cliqz-logo {{ logo }}"></div>
</div>
