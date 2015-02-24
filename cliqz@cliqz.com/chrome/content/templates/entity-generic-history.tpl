<div class='cqz-result-h1 cqz-result-padding cqz-result-pattern'>
    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    {{#with data}}
        <div class="cqz-ez-title custom-after cqz-ez-generic-title cqz-ez-banking-title">
            {{name}}
            <div class="after" style="background-image: url({{icon}})"></div>
        </div>
        
        <div class="cqz-ez-generic-elems">
            <div class="cqz-ez-generic-box">
                {{#each actions }}
                    <div
                        class="cqz-ez-btn overflow"
                        style="background-color: {{ color }}"
                        extra="action-{{ @index }}"
                        url="{{url}}" arrow="false" selectable=''
                        >{{ title }}</div>
                {{/each}}
            </div>
            {{#each links }}
                <div class="cqz-ez-generic-box cqz-ez-generic-opt overflow"
                     url="{{ url }}"
                     extra="link-{{ @index }}">
                     <div style="background-image: url({{ icon }});"></div>
                    {{ title }}
                </div>
            {{/each}}
        </div>

        <div class='cliqz-history-results'>
        {{#each urls}}
            <div class='cliqz-pattern-element overflow'
                 style='padding-left: 0px;'
                 url='{{href}}' shortUrl='{{link}}'
                 extra='{{extra}}'
                 domain='{{domain}}'
                 arrow="false">
                <div class='cliqz-pattern-element-title' selectable=''>{{ title }}</div>
                <div class='cliqz-pattern-element-link'>{{ link }}</div>
            </div>
        {{/each}}
        </div>
    {{/with}}
    {{>logo}}
    {{>feedback}}
</div>