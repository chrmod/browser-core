<!-- noResult.tpl -->
{{debug}}
  {{#with data}}
    <div  style="background: #245C92;padding: 30px;color: #fff;text-align: center;height:100%" 
          url="{{searchEngineUrl}}{{searchString}}">
        <div>
            <h3>{{ title }}</h3>
            <div id="moreResults"
            style="color: #fff;margin-top: 30px;"

            >{{ action }}</div>
            
        </div>
      {{#with logo}}
        <div class="search_engine_logo"
         style="{{style}}"
         show-status=""
         extra="{{extra}}"
         url="{{url}}"
         >
        </div>
      {{/with}}
      </div>
{{/with}}

<!-- end noResult.tpl -->
