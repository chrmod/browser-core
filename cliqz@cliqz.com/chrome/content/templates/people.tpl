{{#if data.richData.full_name}}
<div class='cliqz-inline-box-children cliqz-result-generic'
     style="padding-bottom: 5px;"
	>
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
				bei
				<span class='cliqz-people-company'>
					{{current_company}}
				</span>
				{{#if since}}
					<span class='cliqz-people-agoline'>
						seit {{since}}
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
    <div class="cliqz-image" style="
          background-image: url({{ image.src }});
          {{#if image.height }}
            background-size: {{ image.backgroundSize }}px;
            width: {{ image.width }}px;
            height: {{ image.height }}px;
          {{/if}}
        "
    >
    {{#if image.text }}
      <p class='cliqz-video-arrow'>{{ image.text }}</p>
    {{/if}}
    </div>
  {{else}}
    {{#if (is_twitter url)}}
      <div class="cliqz-image" style="
            background-image: url(chrome://cliqzres/content/skin/twitter_user_dark_green.png);
            background-size: 55px;
            width: 55px;
            height: 55px;">
      </div>
    {{else}}
      <div class="cliqz-image" style="
              background-image: url(chrome://cliqzres/content/skin/linkedin_user.png);
              background-size: 55px;
              width: 55px;
              height: 55px;">
        </div>
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
  </div>
  <div class='cliqz-result-right-box cliqz-logo {{ logo }}'
       newtab='true'>
  </div>
</div>
{{/if}}
