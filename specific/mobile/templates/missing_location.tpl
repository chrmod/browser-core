<!-- missing-location.tpl -->
<div class="location_permission_prompt">
  <div class="loc_permission_prompt_message">
    {{local 'location_permission_prompt'}}
  </div>
  <ul class="cta loc_permission_prompt_buttons">
    <li class="cqz-btn-default" id="cqz_location_yes" bm_url='{{friendly_url}}'>
      <a>{{local 'yes'}}</a>
    </li>
    <li class="cqz-btn-error" id="cqz_location_once" bm_url='{{friendly_url}}'>
      <a>{{local 'location_just_once'}}</a>
    </li>
    <li class="cqz-btn-error" id="cqz_location_no" location_confirm_no_msg='{{confirm_no_msg}}' bm_url='{{friendly_url}}'>
      <a>{{local 'location_never'}}</a>
    </li>
  </ul>
</div>
