<div class="cqz-result-h2 ez-liga">
     {{#with data}}
     
     <div class="meta">
         {{> logo}}
         <h3 class="meta__url"><i class="fa fa-mobile mobile"></i> {{local 'KickerSponsor'}}</h3>
     </div>
     
     <h1 class="main__headline">
         <a extra="title" href="{{../url}}">{{club}}</a>
     </h1>
     <h3 class="main__subheadline">{{rank}}</h3>
     <div class="main__content">
        <h5><span>{{spielTag}}</span></h5>
        <span class="meta__legend">{{gameTime}} - {{location}}</span>
        <table cellspacing="0" cellpadding="0">
            <tr>
                <td>{{HOST}}</td>
                <td>
                    {{#if score}}
                        <div class="ez-liga-score">{{score}}
                            <div class="ez-liga-live">live</div>
                        </div>
                    {{else}}
                        {{#if scored}}
                            <div class="ez-liga-vs">{{scored}}</div>
                        {{else}}
                            <div class="ez-liga-vs">{{local 'vs'}}</div>
                        {{/if}}
                    {{/if}}
                </td>
                <td>{{GUESS}}</td>
            </tr>
        </table>
     </div>
     
      <!--<div class="cqz-ez-title"><a href="{{../url}}">{{club}}</a></div>
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
      <div class="ez-liga-sponsor">{{local 'KickerSponsor'}}</div>-->

     {{/with}}

</div>