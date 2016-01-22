
var probHashLogM = null;
var probHashThreshold = 0.0165;
var probHashChars = {' ': 38, '-': 37, '.': 36, '1': 26, '0': 35, '3': 28, '2': 27, '5': 30, '4': 29, '7': 32, '6': 31, '9': 34, '8': 33, 'a': 0, 'c': 2, 'b': 1, 'e': 4, 'd': 3, 'g': 6, 'f': 5, 'i': 8, 'h': 7, 'k': 10, 'j': 9, 'm': 12, 'l': 11, 'o': 14, 'n': 13, 'q': 16, 'p': 15, 's': 18, 'r': 17, 'u': 20, 't': 19, 'w': 22, 'v': 21, 'y': 24, 'x': 23, 'z': 25};

function isHashProb(str) {
    var log_prob = 0.0;
    var trans_c = 0;
    str = str.toLowerCase().replace(/[^a-z0-9\.\- ]/g,'');
    for(var i=0;i<str.length-1;i++) {
        var pos1 = probHashChars[str[i]];
        var pos2 = probHashChars[str[i+1]];

        log_prob += probHashLogM[pos1][pos2];
        trans_c += 1;
    }
    if (trans_c > 0) return Math.exp(log_prob/trans_c);
    else return Math.exp(log_prob);
};

export function init () {
  CliqzUtils.httpGet('chrome://cliqz/content/antitracking/prob.json', function success (req) {
    probHashLogM = JSON.parse(req.response);
  });
}

export function isHash(str) {
    var p = isHashProb(str);
    return (p < probHashThreshold);
};
