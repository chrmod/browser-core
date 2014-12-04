<div style='padding:5px 0;
            height: 70px;
            overflow: hidden;
            {{#if data.hide_results_1st}}
                display: none;
            {{/if}}
            '>
<div class='cliqz-weather-left-box'>
      <div class='cliqz-weather-city'>Bundesliga</div>
      <div class='cliqz-weather-status'>aktuell</div>
</div>

{{#each data.results_1st}}
<div>
  <div class='cliqz-bundesliga-match' style='padding: 8px 0; color:grey;'>{{@key}}</div>
  {{#each this}}
  <div class='cliqz-bundesliga-match' style='border: 1px solid
                                             {{#if finished}} red;
                                             {{else}}
                                                {{#if started}} green;
                                                {{else}} #CCC
                                                {{/if}}
                                             {{/if}}
                                             '>
      <div class='cliqz-bundesliga-column'>
              <img class='cliqz-bundesliga-team-logo' src="http://cdn.cliqz.com/extension/bundesliga/{{this.home.short}}.png" />
              <div class='cliqz-bundesliga-team-name'>{{this.home.short}} -</div>
              <img class='cliqz-bundesliga-team-logo' src="http://cdn.cliqz.com/extension/bundesliga/{{this.away.short}}.png" />
              <div class='cliqz-bundesliga-team-name'>{{this.away.short}}</div>
      </div>

      <div class='cliqz-bundesliga-column' style='background-color:
                                                  {{#if finished}} red;
                                                  {{else}}
                                                     {{#if started}} green;
                                                     {{else}} #CCC;
                                                     {{/if}}
                                                  {{/if}}
                                                  padding: 3px 5px;'>
          <div class='cliqz-bundesliga-team-score'>{{this.home.score}}</div>
          <div class='cliqz-bundesliga-team-score'>:</div>
          <div class='cliqz-bundesliga-team-score'>{{this.away.score}}</div>
      </div>
  </div>
  {{/each}}
</div>
{{/each}}

</div>

<div style='padding:5px 0;
            height: 70px;
            overflow: hidden;
            {{#if data.hide_results_2nd}}
                display: none;
            {{else}}
              {{#unless data.hide_results_1st}}
                border-top: 1px solid #CCC;
              {{/unless}}
            {{/if}}
            '>
<div class='cliqz-weather-left-box'>
      <div class='cliqz-weather-city'>2. Bundesliga</div>
      <div class='cliqz-weather-status'>aktuell</div>
</div>

{{#each data.results_2nd}}
<div>
  <div class='cliqz-bundesliga-match' style='color:grey;'>{{@key}}</div>
  {{#each this}}
  <div class='cliqz-bundesliga-match' style='margin-top: 5px;
                                             border: 1px solid
                                             {{#if finished}} red;
                                             {{else}}
                                                {{#if started}} green;
                                                {{else}} #CCC
                                                {{/if}}
                                             {{/if}}
                                             '>
      <div class='cliqz-bundesliga-column'>
              <img class='cliqz-bundesliga-team-logo' src="http://cdn.cliqz.com/extension/bundesliga/{{this.home.short}}.png" />
              <div class='cliqz-bundesliga-team-name'>{{this.home.short}} -</div>
              <img class='cliqz-bundesliga-team-logo' src="http://cdn.cliqz.com/extension/bundesliga/{{this.away.short}}.png" />
              <div class='cliqz-bundesliga-team-name'>{{this.away.short}}</div>
      </div>

      <div class='cliqz-bundesliga-column' style='background-color:
                                                  {{#if finished}} red;
                                                  {{else}}
                                                     {{#if started}} green;
                                                     {{else}} #CCC;
                                                     {{/if}}
                                                  {{/if}}
                                                  padding: 3px 5px;'>
          <div class='cliqz-bundesliga-team-score'>{{this.home.score}}</div>
          <div class='cliqz-bundesliga-team-score'>:</div>
          <div class='cliqz-bundesliga-team-score'>{{this.away.score}}</div>
      </div>
  </div>
  {{/each}}
</div>
{{/each}}

</div>
