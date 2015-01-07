    <div id="cliqz-images-results" class='cliqz-images'>
        {{#each data.items}}
        <div class="cliqz-image-item"
             style='width:{{width}}px; height:{{height}}px;'
             type="image" url="{{ ref_url }}">

               <img class="cliqz-image-clear" src="{{thumb_url}}"
                     width="{{width}}"
                     height="{{height}}"
                     />

                <div class="cliqz-image-hilight" style="width:{{width}}px; max-width:{{width}}px;">
                  {{orig_image_width}} &#10008; {{orig_image_height}} {{domain}}
                </div>

        </div>{{/each}}
</div>
