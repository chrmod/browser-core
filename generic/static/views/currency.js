function enhanceResults(data) {
  if (typeof Intl != "undefined" && Intl.NumberFormat) {
    data.CurrencyFormatSuport = true;

    //First param is the Locale: en-US....
    currency_formatter = new Intl.NumberFormat(CliqzUtils.PREFERRED_LANGUAGE, {
      style: 'currency',
      currency: data.toCurrency,
      minimumFractionDigits: 2,
    });

    if (data.toAmount.main) {
      data.toAmount.main = currency_formatter.format(data.toAmount.main);
    }
  } else {
    data.CurrencyFormatSuport = false;
  }
}