<div style='padding:5px 0;
            height: 70px;
            overflow: hidden;'>

<div class='cliqz-weather-left-box'>
      <div class='cliqz-weather-city'>Bitcoin</div>
</div>

<div class='cliqz-bitcoin-logo'>
    <img class='cliqz-bitcoin-logo' src="http://cdn.cliqz.com/extension/EZ/bitcoin/logo.png" />
</div>

{{#each data.results}}
<div>
<div class='cliqz-bitcoin-item'>
  <div class='cliqz-bitcoin-column' style='padding: 3px 5px;'>
      <div class='cliqz-bitcoin-score'>{{currency}}</div>
      <div class='cliqz-bitcoin-score' style='padding: 3px'> </div>
      <div class='cliqz-bitcoin-score'>buy {{buy}}</div>
      <div class='cliqz-bitcoin-score' style='padding: 3px'> </div>
      <div class='cliqz-bitcoin-score'>sell {{sell}}</div>
  </div>
</div>
</div>
{{/each}}

</div>
