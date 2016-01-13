'use strict';

function CliqzDelayedImageLoader(selector) {
  this.DELAY = 500;
  this.BANDWITH = 2;

  this.selector = selector;
}

CliqzDelayedImageLoader.prototype = {

  start: function() {
    this.timeout = setTimeout(this.loadFirstBatch.bind(this), this.DELAY);
  },

  stop: function() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.isRunning = false;
  },

  loadFirstBatch: function() {
    this.isRunning = true;
    // TODO: Move loading of images to constructor. But make sure that DOM exists when constructor is called.
    this.elements = Array.prototype.slice.call(document.querySelectorAll(this.selector));
    Array.apply(null, Array(this.BANDWITH)).forEach(this.loadNext.bind(this));
  },

  loadNext: function () {
    var el = this.elements.shift();
    if (!this.isRunning || !el) { return; }

    if (el.dataset.src) {
      // TODO: onerror should show default error img
      el.onload = el.onerror = this.loadNext.bind(this);
      el.src = el.dataset.src;
    } else if (el.dataset.style) {
      var url = this.getBackgroundImageUrlFromStyle(el.dataset.style),
          img = new Image();
      // TODO: onerror should show default error img
      img.onload = img.onerror = function () {
        el.setAttribute('style', el.dataset.style);
        this.loadNext();
      }.bind(this);
      img.src = url;
    }
  },

  getBackgroundImageUrlFromStyle: function (style) {
    var match = style.match(/background-image:\s*url\(([^\)]*)\)/);
    return (match && match.length === 2) ? match[1] : '';
  }
};
