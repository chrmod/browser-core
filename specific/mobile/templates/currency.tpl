<div class='cqz-result-h3 currency' >
  <div class="meta">
      {{> logo}}
      <h3 class="meta__url">{{local 'no_legal_disclaimer'}}</h3>
  </div>
  
  <div class="main">
    <div class="main__headline">
      {{data.toSymbol}}{{data.toAmount.main}} {{data.toCurrency}}
    </div>
    <p>{{data.multiplyer}} {{data.fromCurrency}} = {{data.mConversionRate}} {{data.toCurrency}}</p>
  </div>
</div>
