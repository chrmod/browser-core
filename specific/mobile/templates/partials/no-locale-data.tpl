<!-- no-locale-data.tpl -->
<div class="location_permission_prompt">
    <p class="loc_permission_prompt_message">
       {{#if (logic display_msg '===' 'location-sorry') }}
            {{local 'location_sorry_msg'}}
       {{/if}}

       {{#if (logic display_msg '===' 'location-no') }}
            {{local 'location_not_share_msg'}}
       {{/if}}

       {{#if (logic display_msg '===' 'location-thank-you') }}
            {{local 'location_thank_you_msg'}}
       {{/if}}

       {{#if (logic display_msg '===' 'location-permission-ask') }}
            {{local 'no_local_data_msg'}}
       {{/if}}
    </p>

   {{#if (logic display_msg '===' 'location-permission-ask') }}
        <ul class="cta loc_permission_prompt_buttons">
            <li class="cqz-btn-default cqz-btn-yes" id="cqz_location_yes_confirm">
                <a>{{local 'yes'}}</a>
            </li>
        </ul>
   {{/if}}
</div>
