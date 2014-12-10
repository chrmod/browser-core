    <div id="cliqz-images-results" class='cliqz-images'>
        {{#each data.items}}
        <div class='cliqz-image-item'
             style='width:{{width}}px; height:{{height}}px;'
             type="image"> <!-- url="{{ ref_url }}" -->

               <img class="cliqz-image-clear" src="{{thumb_url}}"
                     width="{{width}}"
                     height="{{height}}"
                     />

                <!-- {{#if filter}} -->
                <!-- <img class="cliqz-image-hidden" src="{{thumb_url}}" -->
                <!--      id="{{im_url}}" -->
                <!--      width="{{width}}" -->
                <!--      height="{{height}}" -->
                <!--      /> -->

                <!-- {{else}} -->
                <!-- <img class="cliqz-image-clear" src="{{thumb_url}}" -->
                <!--      id="{{im_url}}" -->
                <!--      width="{{width}}" -->
                <!--      height="{{height}}" -->
                <!--      /> -->
                <!-- {{/if}} -->

                <!-- <div class="cliqz-image-hilight" style='width:{{width}}px; max-width:{{width}}px;'> -->
                <!--   {{orig_image_width}} x {{orig_image_height}}  -->

                <!-- </div> -->

                <div class="cliqz-image-report" style='width:53px;max-width:{{width}}px;'>
                    <img src="chrome://cliqzres/content/skin/small_18.png"
                         width="23px" height="23px"
                         type='icon-image' extra='image-report-adult -- {{im_url}}' url='-' />
                    <img src="chrome://cliqzres/content/skin/small_broken.png"
                         width="23px" height="23px"
                         type='icon-image' extra='image-report-broken -- {{im_url}}' url='-' />
                </div>

        </div>{{/each}}
</div>
