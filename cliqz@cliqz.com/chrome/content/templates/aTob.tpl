<div class="cqz-result-h2 cqz-result-padding cqz-ez-aTob">
    {{#with data}}
    <div class="cqz-ez-title cqz-ez-aTob-title">
        <h2>{{local 'from'}} {{from_city }} {{local 'to'}} {{ to_city }}</h2>
        <span>{{friendly_url}}</span>
    </div>
    <table class="list">
        <tbody>
            <tr>
                <th class="empty"><span></span></th>
                <th class="date">{{local 'today'}}</th>
                <th class="date">{{days.[1]}}</th>
                <th class="itemtype">{{days.[2]}}</th>
            </tr>
            
            {{#each meansOfTrans}}
            <tr>
                <td class="label">
                    <span class="iconContainer">
                       <img class="iconImage {{class}}" src="{{ icon }}" />
                    </span>
                    <span class="iconLabel">{{ local class }}</span>
                </td>
                {{#each prices}}
                <td class="item">
                    {{#if this}}
                        {{toLowerCase 'from' }} {{ this }}
                    {{else}}
                        ---
                    {{/if}}
                </td> 
                {{/each}}
            </tr>
            {{/each}}
        </tbody>
    </table>
    
    {{/with}}
    
    {{>logo}}
</div>
