const prefs = Components.classes['@mozilla.org/preferences-service;1']
  .getService(Components.interfaces.nsIPrefService).getBranch('');

function prefixPref(pref, prefix) {
  if ( !(typeof prefix === 'string') ) {
    prefix = 'extensions.cliqz.';
  }
  return prefix + pref;
}

export function getPref(pref, defaultValue, prefix) {
  pref = prefixPref(pref, prefix);
  try {
    switch(prefs.getPrefType(pref)) {
      case 128: return prefs.getBoolPref(pref);
      case 32:  {
        var charVal = prefs.getCharPref(pref);

        // it might be a complex value
        if(charVal === "chrome://global/locale/intl.properties"){
          try {
            charVal = prefs.getComplexValue(pref, Components.interfaces.nsIPrefLocalizedString).data;
          } catch (e) {
            CLIQZEnvironment.log("Error fetching pref: "  + pref);
          }
        }

        return charVal;
      }
      case 64:  return prefs.getIntPref(pref);
      default:  return defaultValue;
    }
  } catch(e) {
    return defaultValue;
  }
}

export function setPref(pref, value, prefix) {
  pref = prefixPref(pref, prefix);

  switch (typeof value) {
    case 'boolean': prefs.setBoolPref(pref, value); break;
    case 'number':  prefs.setIntPref(pref, value); break;
    case 'string':  prefs.setCharPref(pref, value); break;
  }
};

export function hasPref(pref, prefix) {
  pref = prefixPref(pref, prefix);
  return prefs.getPrefType(pref) !== 0;
};

export function clearPref(pref, prefix) {
  pref = prefixPref(pref, prefix);
  prefs.clearUserPref(pref);
};
