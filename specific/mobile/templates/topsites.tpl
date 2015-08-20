<div class='cqz-result-h1 cqz-result-padding'>
  {{#with data}}
    <div class="cqz-ez-title custom-after cqz-ez-generic-title cqz-ez-banking-title">
        {{ title }}
        <div class="after" style="background-image: url({{icon}})"></div>
    </div>
    <div class="ez-no-result">
      <div class="logos">
          {{#each urls}}
              <div class="items">
                <div class="cliqz-brand-logo transition"
                      style="{{style}}"
                      show-status=""
                      extra="{{extra}}"
                      url="{{url}}"
                      >{{ text }}

                      </div>
                <div class="item-name">{{nameify name}}</div>
              </div>
          {{/each}}
      </div>
      <div class="h2">{{ message }}<br />{{ message1 }}</div>
      {{#if lastQ}}
        <div cliqz-action='lastQ' class='top-sites-lastq' query="{{lastQ}}">
          {{lastQ}}
        </div>
      {{else}}
        <img class="cliqz-logo" src="{{cliqz_logo}}" url="https://cliqz.com" />
      {{/if}}
  </div>
  {{/with}}
</div>