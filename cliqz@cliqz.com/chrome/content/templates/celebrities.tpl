<div class='cliqz-celeb'>
	{{#with data}}
	<div class='cqz-celeb-images'>
         {{#each images}}
            <img src='{{this}}' class='cqz-celeb-image' />
         {{/each}}
    </div>
    <div class='cqz-celeb-who'>
    	{{name}}
    	<span>({{ocupation}})</span>
    </div>
	<div class='cqz-celeb-social-box'>
         {{#each social}}
            <img
            	src='{{img}}'
            	url='{{url}}'
            	class='cqz-celeb-social' />
         {{/each}}
    </div>
    <div>{{local 'age'}}: {{birth_date}}</div>
    <div>{{local 'nationality'}}: {{nationality}}</div>
    {{/with}}
    {{>logo}}
</div>
