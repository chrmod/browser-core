<div class="cqz-result-h2 ez-liga">
     {{#with data}}
      <div class="cqz-ez-title" extra="title"><a href="{{../url}}">{{club}}</a></div>
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
                        {{#if scored}}
                              <div class="ez-liga-vs">{{scored}}</div>
                        {{else}}
                              <div class="ez-liga-vs">{{local 'vs'}}</div>
                        {{/if}}
             {{/if}}
     </div>
     <div class="ez-liga-teamName">{{GUESS}}</div>
     </div>


      <div class="ez-liga-timezone"> {{local 'LocalTimeGermany'}}</div>
      <div class="ez-liga-sponsor">{{local 'KickerSponsor'}}</div>

     {{/with}}

     {{>logo}}
</div>