<!-- results.tpl -->

	<div class="frame" style="width: {{ frameWidth }}px; left: 0px">
       <div id="conversations" class="ez" type="cliqz-results sources-m" arrow="false" idx="0" hasimage="">
         
          <div class="main">
             <h1 class="main__headline"></h1>
             <p class="main__content">
                <div id="recent"></div>
             </p>
          </div>
       </div>
    </div>
{{#each results}} 
	{{#unless invalid}}
		<div class="frame" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
			<div class="ez" 
				type='{{ type }}'
				kind='{{ kind_printer data.kind }}'
				{{#if url}}
					url='{{ url }}'
					{{#unless (logic type 'starts_with' 'cliqz-pattern')}}
						arrow="false"
					{{/unless}}
				{{/if}}
				idx='{{ @index }}'
				id='ez-{{ @index }}'
				hasimage='{{ hasimage image }}'
				>
					{{partial vertical}}
				</div>
				<br />
				<br />
		</div>
	{{/unless}}
{{/each}}

{{#if googleThis }}
	{{#with googleThis }}
		{{#if show }}
			<div url="http://www.google.com/#q={{searchString}}" class="frame" {{#if frameWidth }} style="width: {{ frameWidth }}px; left: {{ left }}px" {{/if}}>
			  <div class="ez">
			    <div id="googleThisAnim">
			      <ul class="cta">
			        <li>
			          <a href="" style="text-align: center; line-height: 1.25; padding: 6px 12px 12px"><i class="fa fa-search" style="font-size: 24px; margin: 6px 0"></i><br>Einfach hier tappen <br>für Google-Suche</a>
			        </li>
			    </div>
			  </div>
			</div>
		{{/if}}
	{{/with}}
{{/if}}

<div class='cqz-result-selected transition'></div>
<!-- end results.tpl -->