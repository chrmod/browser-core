import storage from "platform/storage";

export function getPref(pref, notFound){
  var mypref;
  if(mypref = storage.getItem(pref)) {
    return mypref;
  } else {
    return notFound;
  }
};

export function setPref(pref, val){
  storage.setItem(pref,val);
};
