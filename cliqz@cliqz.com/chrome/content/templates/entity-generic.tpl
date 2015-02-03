<div class='cqz-result-h2 cqz-result-padding'>
    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    {{#with data}}
        <div class="cqz-ez-title cqz-ez-generic-title cqz-ez-banking-title"
             style="background-image: url({{icon}})">
          {{name}}
        </div>
        <div class="cqz-ez-generic-elems">
            <div class="cqz-ez-generic-box">
                {{#each actions }}
                    <div
                        class="cqz-ez-btn overflow"
                        style="background-color: {{ color }}"
                        url="{{url}}"
                        >{{ title }}</div>
                {{/each}}
            </div>
            {{#each links }}
                <div class="cqz-ez-generic-box cqz-ez-generic-opt overflow"
                     url="{{ url }}"
                     extra="shortcut{{ @index }}">
                     <div style="background-image: url({{ icon }});"></div>
                    {{ title }}
                </div>
            {{/each}}
        </div>
    {{/with}}

    {{> logo}}
</div>