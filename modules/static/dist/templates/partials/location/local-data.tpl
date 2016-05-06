{{#with data}}
    <div class="cqz-local-top-blk cqz-row">
        {{#if map_img}}
            <div class="cqz-image-round cqz-col-3" extra="map-image">
                <img src="{{map_img}}" url="{{mu}}" class="cqz-rd-img local-data-img"
                     onerror="this.style.display='none';"/>
            </div>
        {{/if}}
        <div class="cqz-local-info cqz-col-9">
            <ul class="cqz-local-info-box cqz-col-6">
                {{#if address}}
                    <li class="cqz-local-address" extra="address" show-status='true' url="{{mu}}">
                        {{address}}
                    </li>
                {{/if}}
                {{#if url_ratingimg}}
                    <li class="cqz-local-rating">
                        <img src="{{url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';"
                             extra="des-rate"/>
                    </li>
                {{/if}}
                {{#if phonenumber}}
                    <li class="cqz-local-phone" extra="phone_num" cliqz-action="copy_val">
                        <span class="clz_copy">{{phonenumber}}</span>
                    </li>
                {{/if}}
                {{#if opening_hours}}
                    <li class="cqz-local-time" extra="open-hour">
                        <div class="cqz-local-time-title" style="color: {{opening_status.color}}">
                            {{opening_status.stt_text}}
                        </div>

                        <div class="cqz-local-time-open-hour">
                            {{opening_status.time_info_til}}: {{opening_status.time_info_str}}
                        </div>
                    </li>
                {{/if}}
            </ul>
        </div>
    </div>
{{/with}}
