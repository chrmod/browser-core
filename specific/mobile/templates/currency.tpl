<!-- currency.tpl -->

{{debug}}

{{#with logo}}
	<div class="card__logo {{#if backgroundImage}}bg{{/if}}" style="{{#if backgroundImage}}background-image:{{backgroundImage}};{{#if backgroundColor}} background-color:#{{backgroundColor}};{{/if}}{{else}}{{ style }};{{/if}}">{{ text }}</div>
 {{/with}}

<div id="currency-tpl" class='cqz-result-h3 currency' >
    <section class="primary">

      <div class="card__meta">
          {{local 'no_legal_disclaimer'}}
      </div>

      <h1 class="card__title">
         <div class="main__headline">
            {{data.toSymbol}} <i id="toAmount">{{numberFormat data.toAmount.main}}</i> {{data.toCurrency}}
          </div>
      </h1>

      

  </section>

  <section class="secondary">
        <div class="main">
          
            <table style="width:100%" class="currency__table">
              <tr>
                <td class="text-center">
                  {{data.fromCurrency}}
                </td>
                <td>
                </td>
                <td class="text-center">
                  {{data.toCurrency}}
                </td>
              </tr>
              <tr class="currency__swap">
                <td style="width: 40%">
                  <input class="currencyInput" id="fromInput" type"number" step="0.01" onkeyup="updateFromValue({{json data}})" value="{{data.fromAmount}}" />
                </td>
                <td>
                  <button class="currencySwitch" onclick="switchCurrency({{json data}})">Swap</button>
                </td>
                <td style="width: 40%">
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
          <div class="poweredby">
              {{local 'mobile_calc_more'}} <a href="http://www.xe.com">XE.com</a>
          </div>
      
  </section>
</div>