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
    this.images = Array.prototype.slice.call(document.querySelectorAll(this.selector));
    Array.apply(null, Array(this.BANDWITH)).forEach(this.loadNext.bind(this));
  },

  loadNext: function (query) {
    var img = this.images.shift();
    if (!this.isRunning || !img) { return; }

    img.onload = this.loadNext.bind(this, query);
    img.src = img.dataset.src;
  }
};
