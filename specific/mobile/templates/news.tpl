    
    <div class="meta">
        {{> logo}}
        <h3 class="meta__url"><i class="fa fa-mobile mobile"></i>
            {{#if data.richData.discovery_timestamp}}
                <span>{{ agoline data.richData.discovery_timestamp }}</span>&nbsp;&nbsp;·&nbsp;&nbsp;
            {{/if}}
            {{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}</h3>
    </div>
    
    <div class="main">
        {{#if image.src}}
            <div class="main__image" style="background-image: url({{ image.src }});">
                Image
            </div>
        {{/if}}
        <h1 class="main__headline"><a href="{{url}}">{{ emphasis title text 2 true }}</a></h1>
        <p class="main__content">{{ emphasis data.description text 2 true }}</p>
    </div>
