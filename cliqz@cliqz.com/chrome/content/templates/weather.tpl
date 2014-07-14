<div class='cliqz-weather-left-box'>
    <div class='cliqz-weather-city'>{{ city }}</div>
    <div class='cliqz-weather-status'>aktuell</div>
</div>



<div class='cliqz-weather-today-container'>
  <div>
    <img src='{{ todayIcon }}'
         class='cliqz-weather-today-icon'
         />
    <span class="cliqz-weather-today-temp">
        {{ todayTemp }}
    </span>
  </div>
  <div>
    <span class="cliqz-weather-today-date">{{ todayDate }}</span>
    <span class="cliqz-weather-today-max">{{ todayMax }}</span>
    <span class="cliqz-weather-today-min">{{ todayMin }}</span>
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

<div class='cliqz-weather-skew-container cliqz-weather-tomorrow'>
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

<!--

  <xul:vbox class="cliqz-weather-next-container" style="transform: skew(30deg);">
    <xul:hbox pack="end">
      <xul:vbox pack="center">
        <xul:description anonid="cliqz-weather-tomorrowDay" class="cliqz-weather-next-day" />
        <xul:description anonid="cliqz-weather-tomorrowDate" class="cliqz-weather-next-date" />
      </xul:vbox>
      <xul:vbox pack="center">
         <xul:image anonid="cliqz-weather-tomorrowIcon" class="cliqz-weather-next-icon"/>
      </xul:vbox>
      <xul:vbox pack="center">
        <xul:description anonid="cliqz-weather-tomorrowMax" class="cliqz-weather-next-max" />
        <xul:description anonid="cliqz-weather-tomorrowMin" class="cliqz-weather-next-min" />
      </xul:vbox>
    </xul:hbox>
    <xul:hbox>
      <xul:description anonid="cliqz-weather-tomorrowDesc" class="cliqz-weather-next-desc" />
    </xul:hbox>
  </xul:vbox>
</xul:vbox>

<xul:vbox class="cliqz-weather-skew-container cliqz-weather-aTomorrow">
  <xul:vbox class="cliqz-weather-next-container" style="transform: skew(30deg);">
    <xul:hbox pack="end">
      <xul:vbox pack="center">
        <xul:description anonid="cliqz-weather-aTomorrowDay" class="cliqz-weather-next-day" />
        <xul:description anonid="cliqz-weather-aTomorrowDate" class="cliqz-weather-next-date" />
      </xul:vbox>
      <xul:vbox pack="center">
         <xul:image anonid="cliqz-weather-aTomorrowIcon" class="cliqz-weather-next-icon"/>
      </xul:vbox>
      <xul:vbox pack="center">
        <xul:description anonid="cliqz-weather-aTomorrowMax" class="cliqz-weather-next-max" />
        <xul:description anonid="cliqz-weather-aTomorrowMin" class="cliqz-weather-next-min" />
      </xul:vbox>
    </xul:hbox>
    <xul:hbox>
      <xul:description anonid="cliqz-weather-aTomorrowDesc" class="cliqz-weather-next-desc" />
    </xul:hbox>
  </xul:vbox>
</xul:vbox>

<xul:vbox pack="end" style="margin-right: 3px;">
  <xul:description class="cliqz-weather-credits">
    zur Verfügung gestellt von
  </xul:description>
  <xul:description class="cliqz-weather-credits">
    openweathermap.org
  </xul:description>
</xul:vbox>

-->