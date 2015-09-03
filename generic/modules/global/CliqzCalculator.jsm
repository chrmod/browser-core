'use strict';
/*
 * This module handles various calculations
 *
 */

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/Result.jsm');
Components.utils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript('chrome://cliqzmodules/content/extern/math.min.js', this);
var mathLib = math || this.math;

// REF:
//      http://mathjs.org/docs/index.html
//      http://stackoverflow.com/questions/26603795/variable-name-and-restrict-operators-in-math-js
//      http://jsbin.com/duduru/1/edit?html,output

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
    'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzCalculator'];
var BROWSER_LANG = CliqzUtils.getLocalizedString('locale_lang_code');

//var basics = "[\\\(\\)\\+\\/\\*\\%\\^\\-\\.\\s0123456789]",
//    utils = "|km|cm|meter|mm|m|inch|inches|foot|yard|mile|gr|rad|grad|celsius|fahrenheit|kelvin|to",
//    mathExp = "|log|exp|sin|cos|tan|asin|acos|atan|sqrt|log|abs|ceil|floor|round|exp",
//    REG_CALC = new RegExp( "^([" + basics + mathExp + utils +"|\s])*$");

var CliqzCalculator = {
    CALCULATOR_RES: 0,
    UNIT_RES: '',
    IS_UNIT_CONVERTER: false,
    BASE_UNIT_CONVERTER: '',
    FLOAT_DEC: [100000, 100, 1],
    FLOAT_DEC_THRES: [99, 9999],
    ACCEPT_ERROR: 1e-8,

//    UNIT_CONVERT_OPERATORS: ['to', 'in', 'im', 'zu', 'into'], // ref.: http://mathjs.org/docs/expressions/syntax.html
    //       http://mathjs.org/docs/reference/units.html


    UNIT_CONVERSION_DATA: {  // http://en.wikipedia.org/wiki/Conversion_of_units
        // http://www.convert-me.com/en/convert/length/
        'LOCALIZE_KEYS': {'de-DE': 'names_de', 'en-US': 'names_en', 'default': 'names_de'},
        'types': ['length', 'mass'],
        'length': {
            'base': 'm',
            'units': [
//                {'val': 0.0000000001, 'names': ['Å', 'ångström', 'angstrom', 'angstroms']},
                {'val': 4828, 'names': ['lea', 'leuge', 'league', 'leagues']},
//                {'val': 1e-15, 'names': ['fm', 'fermi', 'femtometre', 'femtometres', 'femtometer', 'femtometers']},
                {'val': 0.3048006096012192, 'names': ['ft', 'foot', 'feet']},  // this is US foot, there're IDIAN, CLA, BEN,...
                {'val': 0.0254, 'names': ['in', 'inch', 'inches', 'zoll']},
                {'val': 1000, 'names': ['km', 'kilometer', 'kilometre', 'kilometres', 'kilometers']},
                {'val': 1, 'names': ['m', 'meter', 'metre', 'metres', 'meters']},
                {'val': 0.1, 'names': ['dm', 'decimeter', 'decimetre', 'decimeters', 'decimetres', 'dezimeter']},
                {'val': 0.01, 'names': ['cm', 'centimeter', 'centimetre', 'centimetres', 'centimeters', 'zentimeter']},
                {'val': 0.001, 'names': ['mm', 'millimeter', 'millimetre', 'millimetres', 'millimeters']},
                {'val': 1e-6, 'names': ['micron', 'micrometer', 'micrometre', 'micrometres', 'micrometers', 'mikrometer']},
                {'val': 1e-9, 'names': ['nm', 'nanometre', 'nanometre', 'nanometer', 'nanometers']},
                {'val': 10000, 'names': ['mil']},  // this is Sweden and Norway unit
                {'val': 1609.344,
                    'names': ['mil.', 'mi.', 'mile', 'miles', 'meile', 'meilen'],
                    'names_en': {'s': 'mile', 'p': 'miles'},
                    'names_de': {'s': 'meile', 'p': 'meilen'}},
                {'val': 201.168, 'names': ['furlong', 'furlongs']},
                {'val': 0.9144, 'names': ['yd', 'yard', 'yards']},
                {'val': 2.54 * 1e-5, 'names': ['thou']},
                {'val': 1.8288, 'names': ['fm', 'fathom', 'fathoms', 'faden', 'fäden']},
                {'val': 5.0292, 'names': ['rd', 'rod', 'rods', 'rute', 'ruten']},
                {'val': 0.1016, 'names': ['hand', 'hands', 'handbreit']},
                {'val': 0.2286, 'names': ['span', 'spans', 'spanne', 'spannen']},
                {'val': 5556, 'names': ['naut.leag', 'nautical league', 'naut.leags', 'nautical league']},
                {'val': 1852, 'names': ['naut.mil', 'naut.mils', 'nautical mile', 'nautical miles', 'naut.meile', 'naut.meilen', 'nautische meile', 'nautische meilen']},
                {'val': 1852.216, 'names': ['sm', 'Seemeile']},
                {'val': 185.2, 'names': ['cbl', 'cable length', "cable'slength", 'Kabel', 'Kabellänge']}
            ]
        },
        'mass': {
            "base": 'g',
            'units': [
                {'val': 102, 'names': ['kN', 'kn', 'kilonewton', 'kilonewtons']},
                {'val': 1e9, 'names': ['kt', 'kilotonne', 'kilotonnes', 'kilotonnen']},
                {'val': 1e6, 'names': ['t', 'tonne', 'tonnes', 'tonnen', 'metric ton', 'metric tons']},
                {'val': 1e6, 'names': ['Mg', 'megagram', 'megagrams']},
//                {'val': 100000, 'names': ['Ztr', 'ztr', 'q', 'centner', 'quintal', 'centners', 'quintals', 'zentner', 'zentners']},  // this is the Italien, Austria, .. versino. German version = 50kg
                {'val': 1000, 'names': ['kg', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kilogramm', 'kilogramms']},
                {'val': 100, 'names': ['hg', 'hectogram', 'hectograms', 'hectogramme', 'hectogrammes', 'hectogramm', 'hectogramms']},
                {'val': 10, 'names': ['dag', 'decagram', 'decagrams', 'decagramme', 'decagrammes', 'decagramm', 'decagramms']},
                {'val': 1, 'names': ['g', 'gram', 'grams', 'gramme', 'grammes', 'gramm', 'gramms']},
                {'val': 0.1, 'names': ['dg', 'decigram', 'decigrams', 'decigramme', 'decigrammes', 'decigramm', 'decigramms']},
                {'val': 0.01, 'names': ['cg', 'centigram', 'centigrams', 'centigramme', 'centigrammes', 'centigramm', 'centigramms']},
                {'val': 0.001, 'names': ['mg', 'milligram', 'milligrams', 'milligramme', 'milligrammes', 'milligramm', 'milligramms']},
                {'val': 0.000001, 'names': ['mcg', 'microgram', 'micrograms', 'microgramme', 'microgrammes', 'microgramm', 'microgramms']},
                {'val': 453.59237, 'names': ['lb', 'lbs', 'pound', 'pounds', 'pound-mass', 'pfund']},
                {'val': 28.349523125, 'names': ['oz', 'ozs', 'ounce ', 'ounces', 'unze', 'unzen']},
                {'val': 1.7718452, 'names': ['dr', 'dram', 'drams']},
                {'val': 0.06479891, 'names': ['gr', 'grain', 'grains', 'Gran']}
            ]
        }
    },

    get: function (q) {
        if (this.CALCULATOR_RES == null || this.CALCULATOR_RES == q) {
            return null;
        }
        var expanded_expression = this.IS_UNIT_CONVERTER ? this.BASE_UNIT_CONVERTER : mathLib.parse(q).toString();
        var result_sign = '= ';

        // fix 1feet -> 1foot
        if (this.IS_UNIT_CONVERTER) {
            this.CALCULATOR_RES = ' ' + this.CALCULATOR_RES;
            this.CALCULATOR_RES = this.CALCULATOR_RES.replace(' 1 feet', ' 1 foot');
            this.CALCULATOR_RES = this.CALCULATOR_RES.trim();
        }

        // shorten numbers when needed
        try {
            var num, num1, float_dec = 1;

            num1 = this.CALCULATOR_RES;

            for (var i = 0; i < this.FLOAT_DEC_THRES.length; i++)
                if (Math.abs(num1) < this.FLOAT_DEC_THRES[i]) {
                    float_dec = this.FLOAT_DEC[i];
                    break;
                }
            num = Math.round(num1 * float_dec) / float_dec;
            num = num.toLocaleString(CliqzUtils.getLocalizedString('locale_lang_code'));
            if (Math.abs(num - num1) > this.ACCEPT_ERROR)
                result_sign = '\u2248 ';

            this.CALCULATOR_RES = this.IS_UNIT_CONVERTER ? num + ' ' + this.UNIT_RES : this.CALCULATOR_RES = num + '';
        } catch (err) {
        }

        return Result.cliqzExtra(
            {
                url: "",
                q: q,
                style: "cliqz-extra",
                type: "cliqz-extra",
                subType: JSON.stringify({type: 'calculator'}),
                data: {
                    template: 'calculator', //calculator_bck',
                    expression: expanded_expression,
                    answer: this.CALCULATOR_RES,
                    prefix_answer: result_sign,
                    is_calculus: true,
//                              is_calculus: !this.IS_UNIT_CONVERTER,
                    support_copy_ans: true
                }
            }
        );
    },

    find_unit_in_data: function (unit_) {
        var self = this,
            unit = unit_.toLowerCase(),
            unit_found = null;
//            name_lists = ['names', 'names_en', 'names_de'];

        self.UNIT_CONVERSION_DATA.types.forEach(function (type) {
            self.UNIT_CONVERSION_DATA[type].units.forEach(function (item) {
                if (item['names'].indexOf(unit) > -1 || item['names'].indexOf(unit_) > -1){
                    unit_found = [type, true, item];
                }
            });
        });
        return unit_found || ["", false, null];
    },

    select_unit_terms: function (unit_data, val) {
        /*
         *   + based on the value and the language preference, select unit name in suitable language and form (singular/plural)
         */
        var noun_type = val === 1 ? 's' : 'p',
            name_info = unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS[BROWSER_LANG]]
            || unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS['default']]
            || unit_data['names'],
            name = name_info[noun_type];

        CliqzUtils.log([BROWSER_LANG, name_info], 'THUY BROWSER_LANG & name_info');

        return name || unit_data['names']['0'] || "";
    },

    isConverterSearch: function (q) {
        // --- Process query to recognize a unit-conversion query
        // ACCEPTED query types:
        //    1. a to b, e.g. cm to mm
        var tmp = q.trim(),
            param_list, unit1, unit2, idx, num, unit1_info;
        // Note: don't use regex match in replace function, e.g. tmp.replace(/ zu | in | im /g, ' to ')
        tmp = q.replace(' zu ', ' to ');
        tmp = tmp.replace(' im ', ' to ');
        tmp = tmp.replace(' in ', ' to ');
        tmp = tmp.replace(' into ', ' to ');  // this needs to be at the end
        param_list = tmp.trim().split(' to ');

        if (param_list.length !== 2)
            return false;
        unit2 = this.find_unit_in_data(param_list[1].trim());
        if (unit2[1]) {
            unit1 = param_list[0].replace(' ', '') + ' ';
            idx = 0;
            while (unit1[idx] === ',' || unit1[idx] === '.' || (unit1[idx] >= '0' && unit1[idx] <= '9'))
                idx++;
            if (idx === 0) {
                num = 1
            } else {
//                num = Number(unit1.slice(0, idx).replace('.','').replace(',','.'));  // NOTE: german number style is different from American style. We assume that input is German style
                num = Number(unit1.slice(0, idx));
                if (isNaN(num))
                    return false
            }

            unit1 = unit1.slice(idx, unit1.length).trim();
            unit1_info = this.find_unit_in_data(unit1);
            if (!unit1_info[1] || unit1_info[0] !== unit2[0]) {
                return false
            }  // if not unit of the same type, e.g. 1km to g should not return result

            this.IS_UNIT_CONVERTER = true;
            var cv = parseFloat(unit1_info[2].val / unit2[2].val);
            this.CALCULATOR_RES = num * cv;
            this.UNIT_RES = CliqzCalculator.select_unit_terms(unit2[2], this.CALCULATOR_RES);
            this.BASE_UNIT_CONVERTER = '1 ' + CliqzCalculator.select_unit_terms(unit1_info[2], 1) + ' = '
                + cv.toLocaleString(CliqzUtils.getLocalizedString('locale_lang_code'))
                + ' ' + CliqzCalculator.select_unit_terms(unit2[2], this.CALCULATOR_RES, cv) ;

            return true
        }
        else {
            return false
        }
    },

    isCalculatorSearch: function (q) {
        // thuy@cliqz.com
        // + Feb2015
        // + 10Mar2015: separate unit conversion from the calculation, e.g. build a unit conversion instead of using the math.js package

        // filter out:
        // + too short query (avoid answering e, pi)
        // + automatically convert for queries like '10cm
        var tmp = q.replace(/ /g, '');  // remove all space
        if (tmp.length <= 2 || tmp.length > 150) {
            return false;
        }

        try {
            this.CALCULATOR_RES = mathLib.eval(tmp);

            if (typeof(this.CALCULATOR_RES) === 'number') {
                this.IS_UNIT_CONVERTER = false;
                return true
            }
        }
        catch (err) {
        }

        return this.isConverterSearch(q);
    }
};
