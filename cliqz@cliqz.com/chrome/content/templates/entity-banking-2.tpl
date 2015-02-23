<div class='cqz-result-h2 cqz-result-padding'>
    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    {{#with data}}
        <div class="cqz-ez-title cqz-ez-banking-title" selectable=''>
          {{name}}
        </div>
        <div class="cqz-ez-banking-elems">
            <div class="cqz-ez-banking-box">
                {{#each buttons }}
                    <div
                        class="cqz-ez-btn"
                        style="background-color: {{color}}"
                        url="{{url}}"
                        arrow="false"
                        selectable=''
                        extra='action-{{ @index }}'
                        >{{title}}</div>
                {{/each}}
            </div>
            {{#each links }}
                <div class="cqz-ez-banking-box cqz-ez-banking-opt"
                     url="{{ url }}"
                     extra="link-{{ @index }}"
                     style="background-image: url({{ icon }});">
                    {{ title }}
                </div>
            {{/each}}
        </div>
    {{/with}}

    {{> logo}}
    {{>feedback}}
</div>