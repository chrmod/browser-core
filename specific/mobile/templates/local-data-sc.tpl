<!-- local-data-sc.tpl -->
{{#if data.big_rs_size}}
  <div class="cqz-result-h2 cqz-local cqz-result-padding cqz-local-result">
    <div class="cqz-zone-holder">
      <div class="meta">
          {{> logo}}
          {{#with data}}
          <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{friendly_url}}</h3>
      </div>
      <div class="main local">
        <div class="item">
          <div class="cf local__head">
            {{#if map_img}}
            <div class="main__image"/>
                <img data-src="{{map_img}}" url="{{mu}}" class="cqz-rd-img local-data-img" onerror="this.style.display='none';"/>
            </div>
            {{/if}}
            <h1 class="main__headline"><a url="{{../url}}" extra="title">{{title}}</a></h1>
            <div class="main__meta">
              <div class="cqz-rd-snippet_hspacing">
                <img data-src="{{url_ratingimg}}" class="cqz-rd-rateimg " onerror="this.style.display='none';" extra="des-rate"/>
              </div>
              <div>
                  {{#unless no_location}}
                      {{distance distance}}
                  {{/unless}}
              </div>
            </div>
          </div>



        <div class="cqz-local-des-blk local-sc-data-container">
          {{#unless no_location}}

            <div class="cqz-local-info">
              {{#if phone_address}}
                <div class="cqz-local-info-left cqz-local-info-box" >
                  {{#if address}}
                    <div class="cqz-local-address" extra="address" show-status='true' url="{{mu}}">
                      <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/map-pin.svg)">
                        Icon
                      </div> {{address}}
                    </div>
                  {{/if}}
                  {{#if phonenumber}}
                    <div class="phone_num" cliqz-action="stop-click-event-propagation" onclick="osBridge.browserAction('{{phonenumber}}','phoneNumber')">
                      <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/phone-1.svg)">
                        Icon
                      </div>
                      <span class="clz_copy">{{phonenumber}}</span>
                    </div>
                  {{/if}}
                </div>
              {{/if}}
              {{#if opening_hours}}
                <div class="cqz-local-info-right cqz-local-info-box" extra="open-hour">
                  <div class="cqz-local-time">
                    <div class="icon" data-style="background-image: url(http://cdn.cliqz.com/extension/EZ/local/clock.svg)">
                      Icon
                    </div>
                    <p class="cqz-local-time-title" style="color: {{opening_status.color}}">
                      {{opening_status.stt_text}}
                    </p>
                    <p>
                      {{opening_status.time_info_til}}
                    </p>
                    <p>
                      {{opening_status.time_info_str}}
                    </p>
                  </div>
                </div>
              {{/if}}

            </div>
          {{/unless}}
          <div class="main__content description">{{description}}</div>
        </div>
      {{/with}}
    </div>
  </div>
  </div>
  </div>
{{else}}
  {{>rd-h3-w-rating}}
{{/if}}
<!-- end local-data-sc.tpl -->
