<!-- ligaEZ1Game.tpl-->
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
     
     {{/with}}

</div>

<!-- end ligaEZ1Game.tpl-->