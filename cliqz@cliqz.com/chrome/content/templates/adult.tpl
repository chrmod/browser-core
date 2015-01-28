<div class="cqz-adult-bar">
  <div class="cqz-adult-alert">
    Some adult content has been hidden.
  </div>

  <div style="float:right" cliqz-action="adult">
    <span> Show unfiltered results?</span>
    <span class="cqz-adult-btn" state="yes">Yes</span>
    <span class="cqz-adult-btn" state="no">No</span>
    <span class="cqz-adult-btn cqz-adult-options-btn" state="options">
          <div class='cqz-adult-options'>
              {{#each adultConfig}}
                  <div state='{{@key}}' selected='{{selected}}'>
                    {{name}}
                  </div>
              {{/each}}
          </div>
          Options
    </span>

  </div>
</div>
