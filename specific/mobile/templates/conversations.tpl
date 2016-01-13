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
		 		
		 		<table cellspacing="0" cellpadding="0" class="answer" onclick="osBridge.openLink('{{url}}')">
		 			<tr>
		 				<td class="framer">
		 					<p>{{title}}</p>
		 					<p class="url">{{domain}}</p>
		 				</td>
		 				<td class="meta">
		 					<div>{{conversationsTime timestamp}}</div>
		 					<div class="date">19.12.1977</div>
		 				</td>
		 			 </tr>
		 		</table>
		 		
		 	{{else}}
		 	
		 		<table cellspacing="0" cellpadding="0" class="question" onclick="osBridge.notifyQuery('{{query}}');">
			 		<tr>
					 	<td class="meta">
						 	<div>{{conversationsTime timestamp}}</div>
						 	<div class="date">19.12.1977</div>
					 	</td>
					 	<td class="framer">
					 		<p>{{query}}</p>
					 	</td>
					 </tr>
		 		</table>
		 		
            {{/if}}
              
          {{/each}}
    </div>

	

</div>
<div style="clear:both;"></div>
<div id="search" style="display:none">
	<input id="search_input" type="text" placeholder="Filtern nach..." />
</div>

<!-- end conversations.tpl -->