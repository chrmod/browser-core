<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class='cqz-result-h1 cqz-result-padding cqz-result-pattern'
  {{else}}
    class='cqz-result-h2 cqz-result-padding cqz-result-pattern'
  {{/if}}
>
    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    {{#with data}}
        <div class="cqz-ez-title cqz-ez-banking-title">
          {{name}}
        </div>
        <div class="cqz-ez-banking-elems">
            <div class="cqz-ez-banking-box">
                {{#each buttons }}
                    <div
                        class="cqz-ez-btn {{ ../../logo.buttonsClass }}"
                        url="{{url}}"
                        arrow="false"
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

    {{>EZ-history}}
    {{>logo}}
    {{>feedback}}
</div>