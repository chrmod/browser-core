<!-- topsites.tpl -->

<div class="heading">
    <h2><span>{{ local 'freshtab_top_sites' }}</span></h2>
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
                      {{ title }}
                  </a>
              </h1>
              <div class="meta">
                {{url}}
              </div>
          </div>
      {{/each}}
  </ul>
</div>
<!-- end topsites.tpl -->
