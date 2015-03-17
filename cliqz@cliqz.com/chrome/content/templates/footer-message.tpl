<div class="cqz-message-bar">
  <div class="cqz-message {{type}}">
    {{message}}
  </div>
  <div style="float:right" cliqz-action="footer-message-action">
  	{{#each options}}
    	<span class="cqz-btn cqz-btn-{{ state }}" state="{{ action }}">{{ text }}</span>
    {{/each}}
  </div>
</div>