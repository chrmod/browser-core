<div class="cqz-result-h2">
  
  <div class="meta">
      {{> logo}}
      <h3 class="meta__url no-indent">{{#if data.message.min_ago}}
  <span>{{ data.message.StockExchange }} : {{ data.message.Symbol }} - {{ local 'agoXMinutes' data.message.min_ago }}</span>
{{else}}
  <span>{{ data.message.StockExchange }} : {{ data.message.Symbol }} - {{ local 'agoXMinutes' 20 }}</span>
{{/if}}</h3>
  </div>
  
  <div class="main">
    <div class="main__headline">
      <a href="{{url}}">{{data.message.Name}}</a>
    </div>
    
  </div>
  
  <div class="cqz-ez-stock-trend">
    <span>{{ data.message.LastTradePriceOnly }}</span><span class="{{ data.message.Colour }}"><img src="https://cdn.cliqz.com/extension/EZ/stocks/EZ-stock-arrow-{{ data.message.Colour }}.svg" class="cqz-ez-img-trend"/>{{ data.message.Change }} ({{ data.message.PercentChange }})</span>
  </div>

  <table class="cliqz-stock-price-table">
    <tr>
      <td> {{local 'cliqz_stock_open'}} </td>
      <td class="cliqz-stock-price-td">{{ data.message.Open }}</td><td class="cliqz-stock-price-td"> {{local 'cliqz_stock_market_cap'}} </td>
      <td class="cliqz-stock-price-td">{{ data.message.MarketCapitalization}}</td>
    </tr>
    <tr>
      <td> {{local 'cliqz_stock_high'}} </td><td class="cliqz-stock-price-td">{{ data.message.DaysHigh }}</td>
      <td class="cliqz-stock-price-td"> {{local 'cliqz_stock_pe_ratio'}}</td>
      <td class="cliqz-stock-price-td">{{ data.message.PERatio }}</td>
    </tr>
    <tr>
      <td> {{local 'cliqz_stock_low'}} </td>
      <td colspan="3" class="cliqz-stock-price-td">{{ data.message.DaysLow }}</td>
    </tr>
  </table>

  <div class="cqz-disclaimer cqz-ez-stock-disclaimer">{{ local 'no_legal_disclaimer' }}</div>
</div>
