<div class='cqz-result-h3'>
    {{#if debug}}
        <span class='cqz-result-debug'>{{ debug }}</span>
    {{/if}}
    {{#if image.src}}
        <div class="cqz-image cqz-image-round " style="
                    background-image: url({{ image.src }});">
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
            {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.path text 2 true }}
        </div>
        <div class='cqz-result-desc overflow'>
        	{{#if data.richData.discovery_timestamp}}
        	    <span style="color: #d7011d; padding-right:5px; ">
            	{{ agoline data.richData.discovery_timestamp }}
            	</span>
            {{/if}}
            {{ emphasis data.description text 2 true }}
        </div>
    </div>
    {{> logo}}
</div>