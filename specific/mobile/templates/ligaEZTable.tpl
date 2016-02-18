<!-- <div id="cliqz-results"> -->
   <div class="cqz-result-h1 ez-liga cqz-result-padding">
     {{#with data}}
     
     <div class="meta">
         <h3 class="meta__url no-indent">
           <span><a href="{{../url}}">{{leagueName}}</a></span>
         </h3>
     </div>
     <br>
      <div class="ez-liga-tableHeader">
          <table>
            <thead>
                 <th></th>
                 <th>Mannschaft</th>
                 <th class="small">SP</th> 
                 <th class="small">TD</th> 
                 <th class="small bold">PKT</th> 
            </thead> 
          
            <tbody> 
                {{#ranking}} 
                <tr> 
                    <td>{{rank}}.</td>
                    <td>{{club}}</td>
                    <td class="small">{{SP}}</td> 
                    <td class="small">{{TD}}</td> 
                    <td class="small bold">{{PKT}}</td> 
                </tr> 
                {{/ranking}} 
            </tbody> 
          </table> 
      </div>


      <div class="poweredby" url="{{url}}">{{local 'GoToTable'}}</div>
    
    <div class="poweredby">
        <a href="http://www.kicker.de">{{local 'KickerSponsor'}}</a>
    </div>

     {{/with}}
       {{>logo}}
   </div>

<!-- </div> -->