<div class='cliqz-celeb'>
	{{#with data}}
        <div class='cliqz-celeb-picture'
        	 style="background-image: url({{image}});">
	    </div>

		<div class='cliqz-celeb-info'>
		 	<div class='cliqz-celeb-name'>{{name}}</div>
		 	<div class='cliqz-celeb-'>{{bday}}</div>
		 	<div class='cliqz-celeb-'></div>
	 	</div>

		<div class='cliqz-celeb-images'>
		    {{#each items}}
		        <div class='cliqz-celeb-image'
		        	 style="background-image: url({{thumb_url}});">
		        </div>
		    {{/each}}
		</div>
	{{/with}}
	<br style="clear:both"/>
</div>
