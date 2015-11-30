<!-- people.tpl -->
{{#if data.richData.full_name}}
    <div class="meta">
        {{> logo}}
        <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}</h3>
    </div>
    
    <div class="main people">
        
        {{#if image.src}}
            <div class="main__image" style="background-image: url({{ image.src }}); margin-top: 0px">
                Image
            </div>
        {{/if}}
        
        <h1 class="main__headline">
            <a extra="title" href="{{../url}}">{{ data.richData.full_name }}</a>
        </h1>
        {{#with data.richData}}
            <p class="main__content">
                {{#if current_job_title}} {{current_job_title}}<br />{{/if}}
                {{#if current_company}} {{current_company}} {{#if current_branch}}({{current_branch}}){{/if}}<br />{{/if}}
                {{#if current_job_type}} {{current_job_type}}<br />{{/if}}
                {{#if since}} seit {{since}}{{/if}}
            </p>

        {{/with}}
        
    </div>
    
{{else}}
    {{partial 'generic'}}
{{/if}}
