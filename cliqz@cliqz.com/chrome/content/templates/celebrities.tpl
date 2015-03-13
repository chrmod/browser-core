<div class='cliqz-celeb cqz-result-h2'>
	{{#with data}}
	<div class='cqz-celeb-images'>
         {{#each images}}
            <img src='{{this}}' class='cqz-celeb-image' newtab="true" url="{{ get_array_element ../images_meta @index 'ref_url'}}" />
         {{/each}}
    </div>
    <div class='cqz-result-title cqz-ez-title cqz-celeb-who' arrow="false">
    	{{ emphasis name ../text 2 true }} ({{ocupation}})<span> - Wikipedia</span>
    </div>
    <div class='cqz-celeb-desc'>
        {{ emphasis description_wiki ../text 2 true }}
    </div>
	<div class='cqz-celeb-social-box'>
         {{#each social}}
            <img
            	src='{{img}}'
            	url='{{url}}'
                show-status='true'
            	class='cqz-celeb-social'
                extra='social-{{ @index }}' />
         {{/each}}
    </div>
    {{/with}}
</div>
{{>logo}}
{{>feedback}}
