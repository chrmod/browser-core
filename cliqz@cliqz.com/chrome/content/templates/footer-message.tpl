<div class="cqz-message-bar cqz-general-msg">
  <div class="cqz-message {{type}}">
      {{ simple_message }}
      <strong>
        {{message}}

        {{#each messages}}
          {{#if this.correctBack}}
            <i>{{this.correctBack}}</i>
         {{else}}
           {{this.correct}}
         {{/if}}
        {{/each}}
      </strong>
  </div>
  <span class="cqz-btn-holder" cliqz-action="footer-message-action" cliqz-telemetry="{{telemetry}}">
  	{{#each options}}
    	<span class="cqz-btn cqz-btn-{{ state }}" state="{{ action }}" {{#if pref }} pref="{{../pref}}" {{/if}}  {{#if prefVal }} prefVal="{{prefVal}}" {{/if}} >
            {{ text }}
        </span>
    {{/each}}
  </span>
</div>
