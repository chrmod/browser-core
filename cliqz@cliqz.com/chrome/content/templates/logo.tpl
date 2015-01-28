{{#with logo}}
    <div class='cqz-result-logo cqz-vert-center'
         style='background-color: {{ color }};'>
         <div
          	{{#if img }}
               style='background-image: {{ img }};'>
          	{{ else }}
           		>{{ text }}
         	{{/if }}
         </div>
     </div>
{{/with}}