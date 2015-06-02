<div class="cqz-message-bar">
  <div class="cqz-message {{type}}">
   
      {{local 'spell_correction'}}
      <b>
        {{message}}

        {{#each messages}}
          {{#if this.correctBack}}
            <i>{{this.correctBack}}</i>
         {{else}}
           {{this.correct}}  
         {{/if}}
        {{/each}}
      </b>
  </div>
  <div style="float:right" cliqz-action="footer-message-action" cliqz-telemetry="{{telemetry}}">
  	{{#each options}}
    	<span data-cliqz="{{../data }}" class="cqz-btn cqz-btn-{{ state }}" state="{{ action }}" {{#if pref }} pref="{{../pref}}" {{/if}}  {{#if prefVal }} prefVal="{{prefVal}}" {{/if}} >{{ text }}</span>
    {{/each}}
  </div>
</div>
