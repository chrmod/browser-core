{{#with data}}
<div class="cqz-result-h2 nopadding">
 <div class="EZ-Cliqz-Header"
        style="background-image: url({{extra.cliqz_logo}})" arrow-override=''>
  {{#each deepResults}}
    {{#if (logic type '===' 'social')}}
      {{#each links}}
        <img  extra="title" url="{{url}}" class="EZ-Cliqz_Header-Contact-icon" src="{{image}}" />
      {{/each}}
    {{/if}}
  {{/each}}
 </div>

 {{#with extra.slogan}}
     <div style="background-color:{{background_color}}; color:{{text_color}};height:77px; padding-left:22px">
                <div class="EZ-Cliqz-Body-H1"> {{local 'cliqz_slogan_H1'}} </div>
                <div class="EZ-Cliqz-Body-H2">{{local 'cliqz_slogan_H2'}}</div>
     </div>
 {{/with}}

  <div class="EZ-Cliqz-Footer">
    {{#each deepResults}}
      {{#if (logic type '===' 'buttons')}}
        {{#each links}}
          {{#if (logic title '===' 'cliqz_common_questions')}}
            <div arrow="false" class="cqz-ez-btn cliqz-brands-button-1" url="{{url}}" extra="common-questions">
              {{local title}}
            </div>
          {{else if (logic title '===' 'cliqz_give_feedback')}}
            <div arrow="false" class="cqz-ez-btn cliqz-brands-button-6" url="{{url}}" extra="common-questions">
              {{local title}}
            </div>
          {{else}}
            <div arrow="false" class="cqz-ez-btn cliqz-brands-button-10" url="{{url}}" extra="common-questions">
              {{local title}}
            </div>
          {{/if}}
        {{/each}}
      {{/if}}
    {{/each}}
  </div>
</div>
{{/with}}
