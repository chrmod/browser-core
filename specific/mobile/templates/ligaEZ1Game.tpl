<!-- ligaEZ1Game.tpl-->

{{#with logo}}
    <div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
{{/with}}
 
{{#with data}}


    <section class="primary">

        <h1 class="card__title">
            {{club}}
        </h1>

        <div class="card__meta">

            {{local 'KickerSponsor'}}
            
        </div>

        <div class="card__description">

            {{rank}}

        </div>

        <div class="soccer__result">
           <h5>{{spielTag}}</h5>
           <span class="meta__legend">{{gameTime}} - {{location}}</span>
           <table cellspacing="0" cellpadding="0">
               <tr>
                   <td>{{HOST}}</td>
                   <td class="score">
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

    </section>

{{/with}}


<!-- end ligaEZ1Game.tpl-->