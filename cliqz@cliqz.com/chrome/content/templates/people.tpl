{{#if data.richData.full_name}}
<div class='cliqz-inline-box-children cliqz-result-generic'
     style="padding-bottom: 5px;"
	>
	<div class='cliqz-result-left-box'>
		<div class='cliqz-result-type' ></div>
	</div>
	{{#if image.src}}
    {{#if (is_twitter url)}}
      <div class='cliqz-people-image-box '>
        <div class="cliqz-people-image cliqz-people-image-twitter"
           style="background-image: url(chrome://cliqzres/content/skin/twitter_user_{{twitter_image_id data.richData.full_name}}.png);"
        ></div>
        <div class="cliqz-people-source"
          style="background-image: url(chrome://cliqzres/content/skin/twitter_logo.png);"></div>
      </div>
    {{else}}
      {{#if (is_facebook url)}}
        <div class='cliqz-people-image-box'>
          <div class="cliqz-people-image cliqz-people-image-facebook"
             style="background-image: url(chrome://cliqzres/content/skin/facebook_user.jpeg);"
          ></div>
          <div class="cliqz-people-source"
            style="background-image: url(chrome://cliqzres/content/skin/facebook_logo.png);"></div>
        </div>
      {{else}}
        {{#if (is_xing url)}}
          <div class='cliqz-people-image-box'>
            <div class="cliqz-people-image"
               style="background-image: url({{ image.src }});"
            >
            </div>
            <div class="cliqz-people-source {{ logo }}"></div>
          </div>
        {{else}}
          <div class='cliqz-people-image-box'>
              <div class="cliqz-people-image cliqz-people-image-linkedin"
                 style="background-image: url(chrome://cliqzres/content/skin/linkedin_user.png);"
              ></div>
              <div class="cliqz-people-source"
                style="background-image: url(chrome://cliqzres/content/skin/linkedin_logo.png);"></div>
          </div>
        {{/if}}
      {{/if}}
    {{/if}}
	{{/if}}
	<div class='cliqz-result-mid-box people-box' style="width:{{ width }}px;">
		{{#with data.richData}}
			<div class='overflow' style="padding-bottom: 3px;">
				<span class='cliqz-people-name'>
					{{full_name}}
				</span>
			</div>
			<div class='cliqz-result-url-box overflow'
				 style="padding-bottom: 3px;">
				<span class='cliqz-people-jobtitle'>
					{{current_job_title}}
				</span>
				{{local 'peoplePositionAt'}}
				<span class='cliqz-people-company'>
					{{current_company}}
				</span>
				{{#if since}}
					<span class='cliqz-people-agoline'>
						{{local 'peoplePositionSince'}} {{since}}
					</span>
				{{/if}}
			</div>
			<div class='cliqz-result-url-box cliqz-people-branch overflow'>
				{{current_branch}}
			</div>
		{{/with}}
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'
	     newtab='true'>
	</div>
</div>

{{else}}
<div class='cliqz-inline-box-children cliqz-result-generic'>
  <div class='cliqz-result-left-box'>
    <div class='cliqz-result-type' ></div>
  </div>
  {{#if image.src}}
    <div class='cliqz-people-image-box'>
      <div class="cliqz-people-image"
         style="background-image: url({{ image.src }});"
      >
      </div>
      <div class="cliqz-people-source {{ logo }}"></div>
    </div>
  {{else}}
    {{#if (is_twitter url)}}
      <div class='cliqz-people-image-box '>
        <div class="cliqz-people-image cliqz-people-image-twitter"
           style="background-image: url(chrome://cliqzres/content/skin/twitter_user_{{twitter_image_id title}}.png);"
        ></div>
        <div class="cliqz-people-source"
          style="background-image: url(chrome://cliqzres/content/skin/twitter_logo.png);"></div>
      </div>
    {{else}}
      {{#if (is_facebook url)}}
        <div class='cliqz-people-image-box'>
          <div class="cliqz-people-image cliqz-people-image-facebook"
             style="background-image: url(chrome://cliqzres/content/skin/facebook_user.jpeg);"
          ></div>
          <div class="cliqz-people-source"
            style="background-image: url(chrome://cliqzres/content/skin/facebook_logo.png);"></div>
        </div>
      {{else}}
        <div class='cliqz-people-image-box'>
            <div class="cliqz-people-image cliqz-people-image-linkedin"
               style="background-image: url(chrome://cliqzres/content/skin/linkedin_user.png);"
            ></div>
            <div class="cliqz-people-source"
              style="background-image: url(chrome://cliqzres/content/skin/linkedin_logo.png);"></div>
          </div>
        {{/if}}
    {{/if}}
  {{/if}}
  <div class='cliqz-result-mid-box' style="width:{{reduce_width width 75}}px">
    <div class='cliqz-result-title-box overflow'>
      {{ emphasis title text 2 false}}
    </div>
    {{> url this}}
    <div class='cliqz-result-description'>
      {{ emphasis data.description text 2 true }}
    </div>
    {{#if debug}}
    <span class='cliqz-result-debug overflow'>
      <span>{{ debug }}</span>
    </span>
    {{/if}}
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}'
       newtab='true'>
  </div>
</div>
{{/if}}
