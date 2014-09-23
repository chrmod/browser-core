{{#with data}}
<div style='padding:5px 0'>
  <div class='cliqz-weather-left-box'>
      <div class='cliqz-weather-city'>{{ city }}</div>
      <div class='cliqz-weather-status'>{{local 'weatherCurrent'}}</div>
  </div>

  <div class='cliqz-weather-today-container'>
    <div class='cliqz-weather-today-date'
         style="background-image:url({{ todayIcon }})">
          {{ todayDate }}
    </div>
    <div class='cliqz-weather-today-temp'>
      <span class="cliqz-weather-now">{{ todayTemp }}</span>
      <br />
      <span class="cliqz-weather-today-max">{{ todayMax }}</span>
      <span class="cliqz-weather-today-min">{{ todayMin }}</span>
    </div>
    <br style="clear:both"/>
  </div>


  <div class='cliqz-weather-credits'>
    {{{local 'weatherCredits'}}}
  </div>

  <div class='cliqz-weather-skew-container cliqz-weather-aTomorrow'>
      <div class="cliqz-weather-next-container"
           style="transform: skew(30deg);">
          <div class='cliqz-inline-box-children'>
              <div>
                  <div class="cliqz-weather-next-day">
                      {{ aTomorrowDay }}
                  </div>
                  <div class="cliqz-weather-next-date">
                      {{ aTomorrowDate }}
                  </div>
              </div>
              <img src='{{ aTomorrowIcon }}'
                   class='cliqz-weather-next-icon'
                   />
              <div>
                  <div class="cliqz-weather-next-max">
                      {{ aTomorrowMax }}
                  </div>
                  <div class="cliqz-weather-next-min">
                      {{ aTomorrowMin }}
                  </div>
              </div>
          </div>
          <div class='cliqz-weather-next-desc'>
              {{ aTomorrowDesc }}
          </div>
      </div>
  </div>

  <div class='cliqz-weather-skew-container cliqz-weather-tomorrow'>
      <div class="cliqz-weather-next-container"
           style="transform: skew(30deg);">
          <div class='cliqz-inline-box-children'>
              <div>
                  <div class="cliqz-weather-next-day">
                      {{ tomorrowDay }}
                  </div>
                  <div class="cliqz-weather-next-date">
                      {{ tomorrowDate }}
                  </div>
              </div>
              <img src='{{ tomorrowIcon }}'
                   class='cliqz-weather-next-icon'
                   />
              <div>
                  <div class="cliqz-weather-next-max">
                      {{ tomorrowMax }}
                  </div>
                  <div class="cliqz-weather-next-min">
                      {{ tomorrowMin }}
                  </div>
              </div>
          </div>
          <div class='cliqz-weather-next-desc'>
              {{ tomorrowDesc }}
          </div>
      </div>
  </div>
  <br style="clear:both"/>
</div>
{{/with}}