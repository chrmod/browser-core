function enhanceResults(data) {
  var currency_formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  CliqzUtils.log('===== CUR', currency_formatter.format(123));
  if ( data.toAmount.main ) {
     data.toAmount.main = currency_formatter.format( data.toAmount.main );
  }
}