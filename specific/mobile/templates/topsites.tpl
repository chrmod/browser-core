<!-- topsites.tpl -->

<div class="heading">
    <!-- <h2>{{local 'freshtab_top_sites'}}</h2> -->
    <h2><span>Empfohlene Seiten</span></h2>
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
                  <a class="topSitesLink" data-index="{{@index}}" onclick="osBridge.openLink('{{url}}')">
                      {{title}}
                  </a>
              </h1>
              <div class="meta">
                http://www.spiegel.de
              </div>
          </div>
      {{/each}}
  </ul>
</div>
<!-- end topsites.tpl -->