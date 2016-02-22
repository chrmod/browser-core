<!-- hq.tpl-->

{{partial '_generic'}}


<div class="meta">
    {{> logo}}
    <h3 class="meta__url"><i class="fa fa-mobile mobile"></i>{{ emphasis urlDetails.host text 2 true }}{{ emphasis urlDetails.extra text 2 true }}</h3>
</div>

<div class="main">
    {{#if data.richData.images.length}}
        <div class="__main__image __many">
          {{#if data.richData.map}}
            <img url="{{data.richData.map.search_url}}" class="__main__image__many"
                data-src="{{data.richData.map.url}}" />
          {{/if}}

          {{#each data.richData.images}}
            {{#if (limit_images_shown @index 4)}}
                <img class="__main__image__many" data-src="{{this}}"  onerror="this.style.display='none';"/>
            {{/if}}
          {{/each}}
        </div>
    {{/if}}

    <h1 class="main__headline"><a href="{{url}}">{{ emphasis title text 2 true }}</a></h1>
    <p class="main__content">{{{ emphasis data.description text 2 true }}}</p>
</div>

{{#if (links_or_sources data.richData) }}
    <ul class="cta">
    {{#each (links_or_sources data.richData)}}
        {{#if (limit_images_shown @index 100)}}
            <li><a url='{{mobileWikipediaUrls url}}' href="{{mobileWikipediaUrls url}}" extra='sources{{ @index }}'>{{title}}</a></li>
        {{/if}}
    {{/each}}
    </ul>
{{/if}}
<br />&nbsp;
<!-- end hq.tpl -->

