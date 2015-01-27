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
    <div class='cqz-result-center cqz-vert-center '>
        <div class='cqz-result-title overflow'>
            {{ title }}
        </div>
        <div class='cqz-result-url overflow
                    {{#if urlDetails.ssl }}
                         cqz-result-url-ssl
                    {{/if}}
        '>
            {{ urlDetails.host }}{{ urlDetails.path }}
        </div>
        {{#unless image.src}}
            <div class='cqz-result-desc overflow'>
                {{ data.description }}
            </div>
        {{/unless}}
    </div>
    {{> logo}}
</div>
