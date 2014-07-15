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
		{{#if data.richData.full_name}}
			{{#with data.richData}}
				<div class='overflow'>
					<span class='cliqz-people-name'>
						{{full_name}}
					</span>
				</div>
				<div class='overflow'>
					<span class='cliqz-people-jobtitle'>
						{{current_job_title}}
					</span>
					bei
					<span class='cliqz-people-company'>
						{{current_company}}
					</span>
					<span class='cliqz-people-agoline'>
						seit {{since}}
					</span>
				</div>
				<div class='cliqz-people-branch overflow'>
					{{current_branch}}
				</div>
			{{/with}}
		{{ else }}
			<div class='overflow'>
				<span class='cliqz-people-name'>
					{{title}}
				</span>
			</div>
			<div class='overflow' style='padding-bottom: 5px;'>
				<span class='cliqz-people-jobtitle'>
					{{ urlDetails.host }}
				</span>
			</div>
		{{/if}}
	</div>
	<div class='cliqz-result-right-box cliqz-logo {{ logo }}'>
	</div>
</div>
