<div class="cqz-result-h2 ez-liga">
     {{#with data}}
      <div class="cqz-ez-title">{{club}}</div>
      <div class="ez-liga-rank">{{rank}}</div>
      <div class="ez-liga-spieltag">{{spielTag}}</div>
      <div class="ez-liga-gameTimeLoc">{{gameTime}}</div>
      <div class="ez-liga-gameTimeLoc">{{location}}</div>

     <div class="ez-liga-oneGameScore">
     <div class="ez-liga-teamName">{{HOST}}</div>
     <div class="ez-liga-connector">
             {{#if score}}<div class="ez-liga-score">{{score}}
                               <div class="ez-liga-live">live</div>
             </div>{{else}}
                              <div class="ez-liga-vs">gegen</div>
             {{/if}}
     </div>
     <div class="ez-liga-teamName">{{GUESS}}</div>
     </div>


      <div class="ez-liga-timezone"> Alle Zeitangaben: Deutschland Zeit </div>
     {{/with}}

     {{>logo}}
</div>