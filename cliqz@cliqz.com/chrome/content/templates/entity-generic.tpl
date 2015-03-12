<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding"
  {{else}}
    class="cqz-result-h2 cqz-result-padding"
  {{/if}}
>
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
                        class="cqz-ez-btn {{ ../../logo.buttonsClass }}"
                        extra="action-{{ @index }}"
                        url="{{url}}" arrow="false"
                        >{{ title }}</div>
                {{/each}}
            </div>
            {{#each links }}
                <div class="cqz-ez-generic-box cqz-ez-generic-opt overflow"
                     url="{{ url }}"
                     extra="link-{{ @index }}">
                     <div
                        style="background-image: url({{ icon }});"
                        class="transition"
                     >
                     </div>
                    {{ title }}
                </div>
            {{/each}}
        </div>
    {{/with}}

    {{>EZ-history}}
    {{>logo}}
    {{>feedback}}
</div>