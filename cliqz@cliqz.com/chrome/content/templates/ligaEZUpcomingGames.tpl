
<div class="cqz-result-h1 ez-liga cqz-result-padding">
 {{#with data}}
  <div class="cqz-ez-title" selectable=''>{{leagueName}}</div>
  <div class="ez-liga-spieltag-ucg" selectable=''>{{spieltag}}</div>

  {{#each games}}
  <div class="ez-liga-upcominggames" >
              <div class="ez-liga-gameTimeLoc">{{gamedate}}</div>
               {{#each games}}
                    <div class="ez-liga-1upcominggame">
                          <div class="ez-liga-ucg-teamName">{{HOST}}</div>
                          <div class="ez-liga-gameTimeLoc">{{GTIME}}</div>
                          <div class="ez-liga-ucg-teamName">{{GUESS}}</div>
                    </div>
               {{/each}}

  </div>
  {{/each}}

  <div class="cqz-ez-btn ez-liga-button" url="{{url}}">Ganzer Spieltag</div>
  <div class="ez-liga-ucg-timezone"> Alle Zeitangaben: Deutschland Zeit </div>
 {{/with}}


 {{>logo}}

</div>


