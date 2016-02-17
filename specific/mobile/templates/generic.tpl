<!-- generic.tpl -->
<div class="meta">
    {{> logo}}
    <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}</h3>
</div>

<div class="main">
    
		<div class='cqz-result-title overflow' arrow-override=''>
				<h1 class="main__headline">
					<a extra="title" href="{{url}}">{{ emphasis title text 2 true }}</a>
				</h1>
		</div>

    <p class="main__content">{{{ emphasis data.description text 2 true }}}</p>
</div>

<!-- end generic.tpl -->