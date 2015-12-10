<!-- topsites.tpl -->

<div id="topSites">
    <div class="heading">
        <h2>{{local 'freshtab_top_sites'}}</h2>
    </div>
    <div class="content">
      <ul>
          {{#each this}}
              <li>
                  <a href="#" class="topSitesLink" data-index="{{@index}}" onclick="osBridge.openLink('{{url}}')">
                      <div class="title">{{title}}</div>
                  </a>
              </li>
          {{/each}}
      </ul>
    </div>
</div>

<!-- end topsites.tpl -->