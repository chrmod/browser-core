{{#with logo}}
    <div class='cqz-result-logo cqz-vert-center'
         style='background-color: {{ color }};
         {{#if img }}
                background-image: {{ img }};'>
         {{ else }}
         '>{{ text }}
         {{/if }}
     </div>
{{/with}}