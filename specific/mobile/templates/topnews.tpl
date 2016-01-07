<!-- topnews.tpl -->

<div class="heading">
    <!-- <h2>{{local 'freshtab_top_news'}}</h2> -->
    <h2><span>Empfohlene News</span></h2>
</div>
<div class="main" style="margin-bottom: 20px;">
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
                  <a class="topNewsLink" data-index="{{@index}}" onclick="osBridge.openLink('{{url}}')">
                      {{short_title}}
                  </a>
              </h1>
              <div class="meta">
                http://www.spiegel.de
              </div>
          </div>
      {{/each}}
  </ul>
</div>

<!-- end topnews.tpl -->