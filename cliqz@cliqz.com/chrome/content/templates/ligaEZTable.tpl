<!--<div id="cliqz-results">-->
   <div class="cqz-result-h1 ez-liga cqz-result-padding">
     {{#with data}}
     <div class="cqz-ez-title" selectable=''><a href="{{../url}}">{{leagueName}}</a></div>
      <div class="ez-liga-tableHeader">
          <table>
            <thead>
                {{#each info_list}}
                 <th>{{this}}</th> 
                {{/each}}
            </thead> 
          
            <tbody> 
                {{#ranking}} 
                <tr> 
                    <td>{{rank}}</td>
                    <td>{{club}}</td>
                    <td>{{SP}}</td> 
                    <td>{{S}}</td> 
                    <td>{{U}}</td> 
                    <td>{{N}}</td> 
                    <td>{{T}}</td> 
                    <td>{{GT}}</td> 
                    <td>{{TD}}</td> 
                    <td>{{PKT}}</td> 
                </tr> 
                {{/ranking}} 
            </tbody> 
          </table> 
      </div>


      <div class="cqz-ez-btn ez-liga-button" url="{{url}}">{{local 'GoToTable'}}</div>
      <div class="ez-liga-sponsor">{{local 'KickerSponsor'}}</div>


     {{/with}}
       {{>logo}}
   </div>

<!--</div>-->