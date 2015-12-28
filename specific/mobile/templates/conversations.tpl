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
		 			</div>
		 			<div class="meta">
		 				{{conversationsTime timestamp}}
		 			</div>
		 		</div>
		 		
		 		<!--<div class="link" onclick="osBridge.openLink('{{url}}')">
              		{{title}}
              		<span class="time">{{conversationsTime timestamp}}</span>
              	</div>-->
		 	{{else}}
		 	
		 		<div class="question" onclick="osBridge.notifyQuery('{{query}}');">
		 			<div class="framer">
		 				<p>{{query}}</p>
		 			</div>
		 			<div class="meta">
		 				{{conversationsTime timestamp}}
		 			</div>
		 		</div>
		 		
		 		<!--<div class="queries" onclick="osBridge.notifyQuery('{{query}}');">
              		{{query}}
              		<span class="time">{{conversationsTime timestamp}}</span>
              	</div>-->
            {{/if}}
              
          {{/each}}
    </div>



</div>

<div style="clear:both;height:50px">&nbsp;</div>

<!-- end conversations.tpl -->