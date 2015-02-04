<div class='cqz-result-h3'>
    {{#if debug}}
        <span class='cqz-result-debug'>{{ debug }}</span>
    {{/if}}
    <div class='cqz-result-center cqz-vert-center'
         {{#if image.src}}
            style="width: calc(60% - 120px)"
         {{/if}}>
        <div class='cqz-result-title overflow' selectable=''>
            {{ emphasis title text 2 true }}
        </div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
            {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.path text 2 true }}
        </div>
        <div class='cqz-result-desc overflow'>
            {{ emphasis data.description text 2 true }}
        </div>
    </div>
    {{> logo}}
</div>
