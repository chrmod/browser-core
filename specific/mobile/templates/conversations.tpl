<!-- conversations.tpl -->

<div class="main">
		<div class='cqz-result-title overflow' arrow-override=''>
			<h1 class="main__headline">
				<!-- <a extra="title">THE PAST</a> -->
			</h1>
		</div>
    <div class="main__content history">
		 {{#each data}}
		 	{{#if url}}
		 		
		 		<div class="answer" onclick="osBridge.openLink('{{url}}')">
		 			<div class="framer">
		 				<p>{{title}}</p>
		 				<p>{{domain}}</p>
		 			</div>
		 			<div class="meta">
		 				{{conversationsTime timestamp}}
		 			</div>
		 		</div>
		 		
		 	{{else}}
		 	
		 		<div class="question" onclick="osBridge.notifyQuery('{{query}}');">
		 			<div class="framer">
		 				<p>{{query}}</p>
		 			</div>
		 			<div class="meta">
		 				{{conversationsTime timestamp}}
		 			</div>
		 		</div>
		 		
            {{/if}}
              
          {{/each}}
    </div>

	

</div>
<div style="clear:both;"></div>
<div id="search" style="display:none">
	<input id="search_input" type="text" placeholder="Filtern nach..." />
</div>

<!-- end conversations.tpl -->