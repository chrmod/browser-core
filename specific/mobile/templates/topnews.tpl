<!-- topnews.tpl -->

<div id="topNews" class="startingpoint">
    <div class="heading">
        <!-- <h2>{{local 'freshtab_top_news'}}</h2> -->
        <h2>Top News</h2>
    </div>
    <div class="main">
      <ul>
          {{#each this}}
              <div class="item">
                  <div class="meta__logo transition"
                   style="{{style}}"
                   show-status=""
                   extra="{{extra}}"
                   url="{{url}}"
                   >{{ text }}
                  </div>
                  <h1 class="main__headline">
                      <a href="#" class="topNewsLink" data-index="{{@index}}" onclick="osBridge.openLink('{{url}}')">
                          {{short_title}}
                      </a>
                  </h1>
                  <p class="main__content">{{description}}</p>
              </div>
          {{/each}}
      </ul>
    </div>
</div>

<!-- end topnews.tpl -->