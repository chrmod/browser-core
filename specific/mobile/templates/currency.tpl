<!-- currency.tpl -->
<div id="currency-tpl" class='cqz-result-h3 currency' >
  <div class="meta">
      {{> logo}}
      <h3 class="meta__url">{{local 'no_legal_disclaimer'}}</h3>
  </div>
  <div class="main">
  <!--
    <div class="sub__headline">
      {{data.formSymbol}} {{data.fromAmount}} {{data.fromCurrency}} <span> equals </span>
    </div>
    -->
    <div class="main__headline">
      {{data.toSymbol}} <span id="toAmount">{{numberFormat data.toAmount.main}}</span> {{data.toCurrency}}
    </div>
      <table style="width:100%" class="currency__table">
        <tr>
          <td>
            {{data.fromCurrency}}
          </td>
          <td>
          </td>
          <td>
            {{data.toCurrency}}
          </td>
        </tr>
        <tr class="currency__swap">
          <td>
            <input class="currencyInput" id="fromInput" type"number" step="0.01" onkeyup="updateFromValue({{json data}})" value="{{data.fromAmount}}" />
          </td>
          <td>
            <button class="currencySwitch" onclick="switchCurrency({{json data}})">Swap</button>
          </td>
          <td>
            <input class="currencyInput" id="toInput" type"number" step="0.01" onkeyup="updateToValue({{json data}})" value="{{data.toAmount.main}}" />
          </td>
        </tr>
        <tr class="currency__legend first">
          <td>{{numberFormat data.multiplyer}} {{data.fromCurrency}}</td>
          <td style="text-align: center">=</td>
          <td>{{numberFormat data.mConversionRate}} {{data.toCurrency}}</td>
        </tr>
        <tr class="currency__legend">
          <td>{{numberFormat (math data.multiplyer '*' 10)}} {{data.fromCurrency}}</td>
          <td style="text-align: center">=</td>
          <td>{{numberFormat (math data.mConversionRate '*' 10)}} {{data.toCurrency}}</td>
        </tr>
        <tr class="currency__legend">
          <td>{{numberFormat (math data.multiplyer '*' 50)}} {{data.fromCurrency}}</td>
          <td style="text-align: center">=</td>
          <td>{{numberFormat (math data.mConversionRate '*' 50)}} {{data.toCurrency}}</td>
        </tr>
        <tr class="currency__legend">
          <td>{{numberFormat (math data.multiplyer '*' 100)}} {{data.fromCurrency}}</td>
          <td style="text-align: center">=</td>
          <td>{{numberFormat (math data.mConversionRate '*' 100)}} {{data.toCurrency}}</td>
        </tr>
        <tr class="currency__legend">
          <td>{{numberFormat (math data.multiplyer '*' 200)}} {{data.fromCurrency}}</td>
          <td style="text-align: center">=</td>
          <td>{{numberFormat (math data.mConversionRate '*' 200)}} {{data.toCurrency}}</td>
        </tr>
        <tr class="currency__legend">
          <td>{{numberFormat (math data.multiplyer '*' 500)}} {{data.fromCurrency}}</td>
          <td style="text-align: center">=</td>
          <td>{{numberFormat (math data.mConversionRate '*' 500)}} {{data.toCurrency}}</td>
        </tr>
        <tr class="currency__legend">
          <td>{{numberFormat (math data.multiplyer '*' 1000)}} {{data.fromCurrency}}</td>
          <td style="text-align: center">=</td>
          <td>{{numberFormat (math data.mConversionRate '*' 1000)}} {{data.toCurrency}}</td>
        </tr>
      </table>
     <!-- <br>
    <p>{{numberFormat data.multiplyer}} {{data.fromCurrency}} = {{numberFormat data.mConversionRate}} {{data.toCurrency}}</p>
    <p>{{numberFormat (math data.multiplyer '*' 10)}} {{data.fromCurrency}} = {{numberFormat (math data.mConversionRate '*' 10)}} {{data.toCurrency}}</p>
    <p>{{numberFormat (math data.multiplyer '*' 50)}} {{data.fromCurrency}} = {{numberFormat (math data.mConversionRate '*' 50)}} {{data.toCurrency}}</p>
    <p>{{numberFormat (math data.multiplyer '*' 100)}} {{data.fromCurrency}} = {{numberFormat (math data.mConversionRate '*' 100)}} {{data.toCurrency}}</p>
    <p>{{numberFormat (math data.multiplyer '*' 200)}} {{data.fromCurrency}} = {{numberFormat (math data.mConversionRate '*' 200)}} {{data.toCurrency}}</p>
    <p>{{numberFormat (math data.multiplyer '*' 500)}} {{data.fromCurrency}} = {{numberFormat (math data.mConversionRate '*' 500)}} {{data.toCurrency}}</p>
    <p>{{numberFormat (math data.multiplyer '*' 1000)}} {{data.fromCurrency}} = {{numberFormat (math data.mConversionRate '*' 10)}} {{data.toCurrency}}</p>-->
    </div>
  </div>
<div class="poweredby">
    Mehr auf <a href="http://www.xe.com">XE.com</a>
</div>
