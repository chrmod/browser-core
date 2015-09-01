<div class="cqz-result-h2">
    <div class="cqz-ez-title cqz-ez-stock-title cqz-ez-black-title">
        <span href="{{url}}">{{data.message.Name}}</span>
    </div>

    <div class="cqz-ez-stock-exchange">
        {{#if data.message.min_ago}}
            <span>{{ data.message.StockExchange }} : {{ data.message.Symbol }}
                - {{ local 'agoXMinutes' data.message.min_ago }}</span>
        {{else}}
            <span>{{ data.message.StockExchange }} : {{ data.message.Symbol }} - {{ local 'agoXMinutes' 20 }}</span>
        {{/if}}
    </div>
    <div class="cqz-ez-stock-trend">
        <span>{{ localize_numbers data.message.LastTradePriceOnly}} {{data.message.Currency}}</span><span class="{{ data.message.Colour }}"><img
            src="https://cdn.cliqz.com/extension/EZ/stocks/EZ-stock-arrow-{{ data.message.Colour }}.svg"
            class="cqz-ez-img-trend"/>{{ localize_numbers data.message.Change }} ({{ localize_numbers  data.message.PercentChange }}%)</span>
    </div>

    <table class="cliqz-stock-price-table">
        <tr>
            <td> {{local 'cliqz_stock_open'}} </td>
            <td class="cliqz-stock-price-td">{{ localize_numbers data.message.Open }}</td>
            <td class="cliqz-stock-price-td"> {{local 'cliqz_stock_market_cap'}} </td>
            <td class="cliqz-stock-price-td">{{ llocalize_numbers data.message.MarketCapitalization }}</td>
        </tr>
        <tr>
            <td> {{local 'cliqz_stock_high'}} </td>
            <td class="cliqz-stock-price-td">{{ localize_numbers data.message.DaysHig }}</td>
            <td class="cliqz-stock-price-td"> {{local 'cliqz_stock_pe_ratio'}}</td>
            <td class="cliqz-stock-price-td">{{ localize_numbers data.message.PERatio}}</td>
        </tr>
        <tr>
            <td> {{local 'cliqz_stock_low'}} </td>
            <td colspan="3" class="cliqz-stock-price-td">{{localize_numbers data.message.DaysLow }}</td>
        </tr>
    </table>

    <div class="cqz-disclaimer cqz-ez-stock-disclaimer">{{ local 'no_legal_disclaimer' }}</div>
    {{> logo}}
</div>
