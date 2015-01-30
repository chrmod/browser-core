<div class='cliqz-images'>
    {{#each data.items}}
        <div class='cliqz-image-item'
             style='width:{{width}}px; height:{{height}}px;'
             type="image">
               <img class="cliqz-image-clear" src="{{thumb_url}}"
                     width="{{width}}"
                     height="{{height}}"
                     />
        </div>
    {{/each}}
</div>
