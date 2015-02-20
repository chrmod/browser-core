<div class="cqz-message-bar">
  <div class="cqz-message cqz-message-alert">
    {{local 'adultInfo'}}
  </div>

  <div style="float:right" cliqz-action="adult">
    <span>{{local 'adultAction'}}</span>
    <span class="cqz-btn cqz-btn-default" state="yes">{{local 'yes'}}</span>
    <span class="cqz-btn cqz-btn-default" state="no">{{local 'no' }}</span>
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
</div>
