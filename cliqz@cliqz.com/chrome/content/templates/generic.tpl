<div class='cqz-result-h3'>
    <div class='cqz-result-center'>
        <div class='cqz-result-title overflow' selectable=''>
            {{ emphasis title text 2 true }}
        </div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
            {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}
        </div>
        <div class='cqz-result-desc overflow'>
            {{ emphasis data.description text 2 true }}
        </div>
    </div>
    {{> logo}}
</div>
