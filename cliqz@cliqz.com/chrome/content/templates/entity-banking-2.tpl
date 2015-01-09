<div class='cqz-result-h3 cqz-type'>
    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    <div class='cqz-result-type'>BANKING</div>

    {{#with data}}
        <div class="cqz-ez-banking-box">
            <div>{{ name}}</div>
            <div
                class="cqz-ez-btn"
                style="background-color: #91D130"
                >Login</div>
        </div>
        {{#each links }}
            <div class="cqz-ez-banking-box cqz-ez-banking-opt"
                 url="{{ url }}"
                 extra="shortcut{{ @index }}"
                 style="background-image: url({{ icon }});">
                {{ title }}
            </div>
        {{/each}}
    {{/with}}

    {{#with logo}}
        <div class='cqz-result-logo'
             style='background-color: {{ color }};
             {{#if img }}
                    background-image: {{ img }};'>
             {{ else }}
             '>{{ text }}
             {{/if }}
         </div>
    {{/with}}
</div>

<!--
<div class="entity-banking-container cf" >
    {{#with data}}
        <div class="entity-banking-call2action cf">
            <div class="item-label cf">
                <h3>Shortcuts</h3>
                {{#each links }}
                    <div class="item green"
                         url="{{ url }}"
                         extra="shortcut{{ @index }}">

                        <span class="item__icon"><img src="{{ icon }}" /></span>
                        <span class="item__title">{{ title }}</span>
                    </div>
                {{/each}}
            </div>
            <div class="item-label small cf">
                {{#if (logic iphoneApp '||' androidApp)}}
                    <h3>Downloads</h3>
                    {{#if iphoneApp}}
                       <div class="item blue"
                            url="{{iphoneApp}}"
                            extra="iphone_app">
                           <span class="item__title">iPhone App</span>
                       </div>
                    {{/if}}
                    {{#if androidApp}}
                         <div class="item blue"
                              url="{{androidApp}}"
                              extra="android_app">
                           <span class="item__title">Android App</span>
                         </div>
                    {{/if}}
                {{/if}}
            </div>
        </div>
        <div class="entity-banking-meta cf overflow">
           <strong>{{ name }}</strong> ·
           {{#if swift-bic }}
             <b>SWIFT/BIC</b>: <span>{{ swift-bic }}</span> ·
           {{/if }}
           <b>Support </b>: <span>{{ tel }}</span> ·
           <span class="link"
                 url="mailto:{{ email }}"
                 extra="email"
                 >{{ email }}</span>
        </div>
    {{/with}}
    <div class="entity-banking-logo cliqz-logo {{ logo }}"></div>
</div>
-->