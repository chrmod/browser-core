<div class="cqz-message-bar">
  <div class="cqz-message cqz-message-alert">
    {{local 'adultInfo'}}
  </div>
  
    <div class="cqz-message-yes-no">
        <span class="message">{{local 'adultAction'}}</span>
        <span class="cqz-btn cqz-btn-default" state="yes">{{local 'yes'}}</span>
        <span class="cqz-btn cqz-btn-default" state="no">{{local 'no' }}</span>
    </div>
    
  <div class="cqz-dropdown-container" cliqz-action="adult">
    <span class="cqz-btn cqz-adult-options-btn" state="options">
          <div class='cqz-adult-options'>
              {{#each adultConfig}}
                  <div state='{{@key}}' selected='{{selected}}'>
                    {{name}}
                  </div>
              {{/each}}
          </div>
          {{local 'options' }}
    </span>

  </div>
    
    <div class="cqz-dummy-100percent"></div>
</div>
