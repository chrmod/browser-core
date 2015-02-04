<div class='cqz-result-h3'>
    {{#if debug}}
        <span class='cqz-result-debug'>{{ debug }}</span>
    {{/if}}
    {{#if image.src}}
        <div class="cqz-image" style="
                    background-image: url({{ image.src }});">
        {{#if image.text }}
            <p class='cqz-video-arrow'>{{ image.text }}</p>
        {{/if}}
        </div>
    {{/if}}
    <div class='cqz-result-center cqz-vert-center'
         {{#if image.src}}
            style="width: calc(85% - 120px)"
         {{/if}}>
        <div class='cqz-result-title overflow' selectable=''>
           {{ emphasis title text 2 true }}
        </div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
            {{ local_number data.richData.views }} {{local 'views'}}
        </div>
        <div class='cqz-result-desc overflow'>
            {{ emphasis data.description text 2 true }}
        </div>
    </div>
    {{> logo}}
</div>
