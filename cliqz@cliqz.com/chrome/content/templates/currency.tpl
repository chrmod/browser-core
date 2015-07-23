<div class='cqz-result-h3'>
    <div>
        <div class="EZ-currency EZ-currency-result">
            <span class="cqz-currency-symbol">{{data.toSymbol}}</span><span class="cqz-amount">{{data.toAmount.main}}</span> <span class="cqz-currency-code">{{data.toCurrency}}</span>
        </div>
        <div class="EZ-currency EZ-currency-rate">
            <span>
                {{data.multiplyer}} {{data.fromCurrency}}  =
                <span class='cqz-conv-rate'>
                    {{ data.toAmount.main }}<span class='cqz-rate-last-digits'>{{ data.toAmount.extra }}</span>
                </span> {{data.toCurrency}}
            </span>
            <span class="cqz-disclaimer EZ-currency-disclaimer">{{local 'no_legal_disclaimer'}}</span>
        </div>
    </div>
    {{>logo}}
</div>
