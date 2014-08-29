<div style='padding:5px 0;
            height: 70px;
            overflow: hidden;
            {{#if data.hide}}
                display: none;
            {{/if}}
            '>
  <div class='cliqz-weather-left-box'>
      <div class='cliqz-weather-city'>Bundesliga</div>
      <div class='cliqz-weather-status'>aktuell</div>
  </div>
  {{#each data.results}}
  <div class='cliqz-bundesliga-match'>
      <div class='cliqz-bundesliga-column'>
          <div>
              <img class='cliqz-bundesliga-team-logo' src="chrome://cliqzres/content/skin/bundesliga/{{home.short}}.png" />
          </div>
          <div>
              <img class='cliqz-bundesliga-team-logo' src="chrome://cliqzres/content/skin/bundesliga/{{away.short}}.png" />
          </div>
      </div>
      <div class='cliqz-bundesliga-column'>
          <div class='cliqz-bundesliga-team-name'>
              {{home.short}}
          </div>
          <div style='height: 5px;'></div>
          <div class='cliqz-bundesliga-team-name'>
              {{away.short}}
          </div>
      </div>

      {{#if started}}
          <div class='cliqz-bundesliga-column'>
              <div class='cliqz-bundesliga-team-score'>
                  {{home.score}}
              </div>
              <div style='height: 5px;'></div>
              <div class='cliqz-bundesliga-team-score'>
                  {{away.score}}
              </div>
          </div>
          <div class='cliqz-bundesliga-column'>
              <div class='cliqz-bundesliga-time'>
                  <span style="color: green; font-size: 20px;">•</span>
              </div>
          </div>
      {{else}}
          <div class='cliqz-bundesliga-column'>
              <div class='cliqz-bundesliga-time'>
                  <span style="font-size: 20px;">•</span>
                  {{unix_time_to_hhmm kickoff}}
              </div>
          </div>
      {{/if}}
  </div>
  {{/each}}
  <div class='cliqz-bundesliga-match' style="float:right;">
      <img class='cliqz-bundesliga-logo' src="chrome://cliqzres/content/skin/bundesliga/bundesliga.png" />
  </div>
</div>
