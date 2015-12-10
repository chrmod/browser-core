<!-- topnews.tpl -->

<div id="topNews">
    <div class="heading">
        <h2>{{local 'freshtab_top_news'}}</h2>
    </div>
    <div class="content">
      <ul>
          {{#each this}}
              <li>
                  <a href="#" class="topNewsLink" data-index="{{@index}}" onclick="osBridge.openLink('{{url}}')">
                      <div class="title">{{short_title}}</div>
                      <div class="url">{{displayUrl}}</div>
                  </a>
              </li>
          {{/each}}
      </ul>
    </div>
</div>

<!-- end topnews.tpl -->