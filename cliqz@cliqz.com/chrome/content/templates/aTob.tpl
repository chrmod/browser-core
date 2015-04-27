
<div class="cqz-result-h2 cqz-result-padding cqz-ez-generic">
    {{#with data}}
    <div class="cqz-ez-title custom-after cqz-ez-generic-title">
        <b>From {{ fromCity }} to {{ toCity }}</b>  - {{ currentDate }}
    </div>
    <!--<div style= "margin-top: -12px; margin-bottom: 4px"> 21 April </div>-->

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
        {{#each meansOfTrans }}
            <div class="cqz-ez-generic-box cqz-ez-generic-opt overflow"
                 url="{{ url }}"
                 show-status='true'>
                 <div
                    show-status='true'
                    style="background-image: url({{ icon }});"
                    class="transition {{ class }}"
                 >
                 </div>
                {{ price }}
            </div>
        {{/each}}
    </div>

    {{/with}}
    
    {{>logo}}
</div>