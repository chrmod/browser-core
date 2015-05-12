<!-- Resize to include history -->
<div
  {{#if data.urls}}
    class="cqz-result-h1 cqz-result-padding cqz-ez-generic"
  {{else}}
    class="cqz-result-h2 cqz-result-padding cqz-ez-generic"
  {{/if}}
>
    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    {{#with data}}
        <div class="cqz-ez-title custom-after cqz-ez-generic-title cqz-ez-banking-title">
            {{ emphasis name ../text 2 true }}
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
                     show-status='true'
                     extra="link-{{ @index }}">
                     <div
                        show-status='true'
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


