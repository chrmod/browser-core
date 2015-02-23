{{#with data}}
<div class="cqz-result-h1 ez-no-result nopadding">
    <div class="h1">{{text_line1}}</div>
    <div class="h2">{{text_line2}}</div>

    <div class="logos" id="EZ-noResult-logos" >
        {{#each search_engines}}
            <div class="cliqz-brand-logo"
                  style="background-color:{{background-color}}; background-image: url({{logo}})"
                  engine="{{name}}"
                  engineCode="{{code}}" 
                  cliqz-action="alternative-search-engine"></div>
        {{/each}}
    </div>
    <a href="https://cliqz.com"><img class="cliqz-logo" src="{{cliqz_logo}}"/></a>
</div>
{{/with}}

