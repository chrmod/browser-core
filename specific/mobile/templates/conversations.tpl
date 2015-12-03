<!-- conversations.tpl -->

<div class="main">
		<div class='cqz-result-title overflow' arrow-override=''>
			<h1 class="main__headline">
				<!-- <a extra="title">THE PAST</a> -->
			</h1>
		</div>

    <p class="main__content">
		 {{#each data}}
		 	{{#if url}}
		 		<div class="link" onclick="jsBridge.openLink('{{url}}')">
              		{{title}}
              		<span class="time">{{conversationsTime timestamp}}</span>
              	</div>
		 	{{else}}
		 		<div class="queries" onclick="search_mobile('{{query}}');osBridge.notifyQuery('{{query}}');">
              		{{query}}
              		<span class="time">{{conversationsTime timestamp}}</span>
              	</div>
            {{/if}}
              
          {{/each}}
    </p>



</div>

<div style="clear:both;height:50px">&nbsp;</div>

<!-- end conversations.tpl -->