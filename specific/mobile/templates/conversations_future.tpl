<!-- conversations_future.tpl -->

<div class="main">
		<div class='cqz-result-title overflow' arrow-override=''>
			<h1 class="main__headline">
				<a extra="title">THE FUTURE</a>
			</h1>
		</div>

    <p class="main__content" id="conversations_future">
		 {{#each data}}
	 		<div class="future_domain" onclick="openFuture(this)">
          		<h1>{{domain}}</h1>
          		<div class="amount">3</div>
          		<ul>
	          		{{#each news}}
	          			<li>
	          				<a href="{{url}}">{{title}}</a><br />
	          				{{time}}<br />
	          				<img src="{{thumbnail}}" /><br />
	          				{{description}}<br />
	          				<!--{{created_at}}<br />-->
	          				<!--<img src="{{media}}" /><br />-->
	          			</li>
	          			

	          		{{/each}}
          		</ul>
          	</div>             
          {{/each}}
    </p>



</div>

<div style="clear:both;height:50px">&nbsp;</div>

<!-- end conversations_future.tpl -->