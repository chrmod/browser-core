<style>
    #ramadan {
    font-family: Lato, "Helvetica Neue", Arial, Helvetica, sans-serif;
    position: relative; }
    #ramadan .left {
      padding-right: 104px; }
    #ramadan .right {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 90px; }
      #ramadan .right .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-size: 62%;
      background-position: center;
      background-repeat: no-repeat;
      text-indent: -9999px;
      position: absolute;
      top: 50%;
      -webkit-transform: translateY(-50%);
      -moz-transform: translateY(-50%);
      -ms-transform: translateY(-50%);
      -o-transform: translateY(-50%);
      transform: translateY(-50%); }
    #ramadan h1 {
      font-size: 18px;
      margin: 0;
      padding: 0 0 10px;
      color: #1F69AF;
      font-weight: 500; }
    #ramadan h3 {
      font-size: 14px;
      margin: 0;
      padding: 0 0 20px;
      color: #999;
      font-weight: 400; }
    #ramadan p {
      font-size: 14px;
      color: #333;
      padding: 0 0 20px;
      margin: 0; }
    #ramadan .progressbar {
      height: 2px;
      background-color: #999;
      position: relative; }
      #ramadan .progressbar .progressbar-content {
      height: 2px;
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 20%;
      background-color: #69E4C7;
      text-indent: -9999px; }
    #ramadan .meta {
      padding-top: 10px; }
      #ramadan .meta .meta__header {
      font-size: 14px; }
      #ramadan .meta .meta__header .meta__header__left {
        width: 50%;
        float: left;
        color: #ccc; }
        #ramadan .meta .meta__header .meta__header__left b {
        color: #333;
        font-weight: 400; }
      #ramadan .meta .meta__header .meta__header__right {
        width: 50%;
        float: right;
        text-align: right;
        color: #ccc; }
    #ramadan table {
      padding: 20px 0; }
      #ramadan table .icon {
      height: 14px;
      width: 21px;
      background-size: cover;
      background-repeat: no-repeat;
      text-indent: -9999px;
      margin: 0 0 10px; }
      #ramadan table .icon.turkishflag {
        background-image: url("http://cdn.cliqz.com/extension/EZ/EntityRamadan/turkish-flag.svg"); }
      #ramadan table .icon.sunup {
        background-image: url("http://cdn.cliqz.com/extension/EZ/EntityRamadan/sunrise.svg");
        width: 29px; }
      #ramadan table .icon.sundown {
        background-image: url("http://cdn.cliqz.com/extension/EZ/EntityRamadan/sunset.svg");
        width: 29px; }
      #ramadan table td {
      padding: 0 20px;
      line-height: 25px;
      border-bottom: 1px #f5f5f5 solid;
      font-size: 14px;
      color: #333; }
      #ramadan table td.name {
        color: #1F69AF; }
    #ramadan .actions a {
      display: inline-block;
      line-height: 30px;
      padding: 0 10px;
      background-color: #999;
      text-decoration: none;
      color: #fff;
      border-radius: 5px;
      font-size: 14px; }
</style>


  <div id="ramadan"class="cqz-result-h1 cqz-result-padding" >

    {{#with data}}

    <div class="left">
      <h1 class="headline">Ramadan</h1>
      <h3 class="subheadline">wikipedia.org/ramadan</h3>
      <p class="description">Der Ramadan ist der Fastenmonat der Muslime und der neunte Monat des islamischen Mondkalenders.</p>
      <div class="progressbar">
        <div class="progressbar-content" style="width: {{daysoverPercent}}%;">
          Real Progress
        </div>
      </div>
      <div class="meta">
        <div class="meta__header">
          <div class="meta__header__left">
            <b>Heute</b> {{currentDate}} 
          </div>
          <div class="meta__header__right">
            Noch {{daysleft}} Tage bis zum 17. September
          </div>
        </div>
        
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td><div class="turkishflag icon">Icon</div></td>
            <td><div class="sunup icon">Icon</div></td>
            <td><div class="sundown icon">Icon</div></td>
          </tr>
          {{#each cityDataTurkey}}
            <tr>
              <td class="name">{{city}}</td>
              <td>{{Imsak}}</td>
              <td>{{Yatsi}}</td>
            </tr>
          {{/each }}
        </table>
      </div>

      {{/with}}
      <div class="actions">
        <a href="#">Kompletter Türkischer Kalender</a>
        <a href="#">Islamische Weltliga</a>
      </div>
    </div>
    <div class="right">
        {{> logo}}
    </div>
  </div>


