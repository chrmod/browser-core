<div class="cqz-result-h1 cqz-result-padding">
  <div class="cqz-ez-title cqz-ez-stock-title">
      {{data.message.Name}} <span><img class="cqz-ez-img-stock" src="chrome://cliqzres/content/skin/EZ-stock.svg"/></span>
  </div>

  <div class="cqz-ez-stock-exchange">
    <span>{{ data.message.StockExchange }} : {{ data.message.Symbol }} - 20 minutes ago</span>
  </div>
  <div class="cqz-ez-stock-trend">
    <span>{{ data.message.LastTradePriceOnly }}</span><span class="{{ data.message.Colour }}">
      <img src="chrome://cliqzres/content/skin/EZ-stock-arrow-{{ data.message.Colour }}.svg" class="cqz-ez-img-trend"/>
      {{ data.message.Change }} ({{ data.message.PercentChange }})
    </span>
  </div>

  <table class="cliqz-stock-price-table">
    <tr>
      <td> Eröffnung </td>
      <td class="cliqz-stock-price-td">{{ data.message.Open }}</td><td class="cliqz-stock-price-td"> Marktkapit.</td>
      <td class="cliqz-stock-price-td">{{ data.message.MarketCapitalization}}</td>
    </tr>
    <tr>
      <td> Hoch </td><td class="cliqz-stock-price-td">{{ data.message.DaysHigh }}</td>
      <td class="cliqz-stock-price-td"> P/E ratio(ttm)</td>
      <td class="cliqz-stock-price-td">{{ data.message.PERatio }}</td>
    </tr>
    <tr>
      <td> Tief </td>
      <td colspan="3" class="cliqz-stock-price-td">{{ data.message.DaysLow }}</td>
    </tr>
  </table>

  <div class="cqz-disclaimer cqz-ez-stock-disclaimer">
    <span>
      <a href="http://info.yahoo.com/legal/eu/yahoo/utos/de-de/">Ohne Gewähr</a>
    </span>
  </div>

</div>
