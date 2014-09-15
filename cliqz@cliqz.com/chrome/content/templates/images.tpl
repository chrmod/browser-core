    <div id="cliqz-images-results" class='cliqz-images'>
        {{#each data.results}}
        <div class='cliqz-image-item'
             style='width:{{width}}px; height:{{height}}px;' 
             type="image" url="{{ ref_url }}">


                {{#if filter}}
                <img class="cliqz-image-hidden" src="{{thumb_url}}"
                     id="{{im_url}}"
                     width="{{width}}"
                     height="{{height}}"
                     />
                {{else}}
                <img class="cliqz-image-clear" src="{{thumb_url}}"
                     id="{{im_url}}"
                     width="{{width}}"
                     height="{{height}}"
                     />
                {{/if}}
              
                <div class="cliqz-image-hilight" style='width:{{width}}px; max-width:{{width}}px;'>
                  {{orig_image_width}} x {{orig_image_height}} - {{domain}}
                </div>

              <div class="cliqz-image-report" style='max-width:{{width}}px;'>
                  <img src="chrome://cliqzres/content/skin/small_18.png" width="20" height="20" onclick="report_image({{im_url}})" type='image' extra='adult -- {{im_url}}' url='-' />
                    <img src="chrome://cliqzres/content/skin/broken_small.png" width="20" height="20" onclick="report_image({{im_url}})" type='image' extra='broken -- {{im_url}}' url='-' />
            
                </div>

        </div>{{/each}}</div>

