
<div class="meta">
    {{> logo}}
    <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}</h3>
</div>

    {{#if debug}}
        <div class='cqz-result-debug'>{{ debug }}</div>
    {{/if}}
    {{#with data}}
        <div class="main">
          <h1 class="main__headline"><a href="{{../url}}">{{ emphasis name ../text 2 true }}</a></h1>
      </div>
          <!-- <div class="after" style="background-image: url({{icon}})"></div> -->

        <ul class="cta" style="background-color: #1F69AD">
          {{#each actions }}
            <li extra="action-{{ @index }}" extra="action-{{ @index }}"><a href="#">{{ title }}</a></li>
          {{/each}}
      </ul>
            {{!--
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
            --}}
        </div>
    {{/with}}

    {{>EZ-history}}
</div>


