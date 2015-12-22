import MapCache from 'antitracking/fixed-size-cache';

var md5Cache = new MapCache(CliqzHumanWeb._md5, 1000);

export default function(s) {
    return md5Cache.get(s);
}
