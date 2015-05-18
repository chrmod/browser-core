<div class="cqz-message-bar">
  <div class="cqz-message {{type}}">
    {{emphasis message searchTerm true}}
  </div>
  <div style="float:right" cliqz-action="footer-message-action" cliqz-telemetry="{{telemetry}}">
  	{{#each options}}
    	<span class="cqz-btn cqz-btn-{{ state }}" state="{{ action }}">{{ text }}</span>
    {{/each}}
  </div>
</div>