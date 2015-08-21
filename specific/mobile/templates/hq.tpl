    
    <div class="meta">
        {{> logo}}
        <h3 class="meta__url"><i class="fa fa-mobile mobile"></i>{{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}</h3>
    </div>
    
    <div class="main">
        {{#if data.richData.images.length}}
            <div class="main__image many">
              {{#if data.richData.map}}
                <div url="{{data.richData.map.search_url}}" class="main__image__many" 
                    style="background-image: url({{data.richData.map.url}})" alt="{{data.richData.map.alt_text}}">
                </div>
              {{/if}}

              {{#each data.richData.images}}
                {{#if (limit_images_shown @index 5)}}
                    <div class="main__image__many" style="background-image: url({{this}})">
                        Image
                    </div>
                {{/if}}
              {{/each}}
            </div>
        {{/if}}
        
        <h1 class="main__headline"><a href="{{url}}">{{ emphasis title text 2 true }}</a></h1>
        <p class="main__content">{{ emphasis data.description text 2 true }}</p>
    </div>
    
    {{#if (links_or_sources data.richData) }}
        <ul class="cta" style="background-color: #999">
        {{#each (links_or_sources data.richData)}}
            {{#if (limit_images_shown @index 3)}}
                <li><a url='{{url}}' href="{{url}}" extra='sources{{ @index }}'>{{title}}</a></li>
            {{/if}}
        {{/each}}
        </ul>
    {{/if}}
    

