<!-- topnews.tpl -->

<div id="topNews" class="startingpoint">
    <div class="heading">
        <h2>{{local 'freshtab_top_news'}}</h2>
    </div>
    <div class="main">
      <ul>
          {{#each this}}
              <div class="meta__logo transition"
               style="{{style}}"
               show-status=""
               extra="{{extra}}"
               url="{{url}}"
               >{{ text }}
              </div>
              <h1 class="main__headline">
                  <a href="#" class="item" data-index="{{@index}}" onclick="osBridge.openLink('{{url}}')">
                      {{title}}
                  </a>
              </h1>
          {{/each}}
      </ul>
    </div>
</div>

<!-- end topnews.tpl -->