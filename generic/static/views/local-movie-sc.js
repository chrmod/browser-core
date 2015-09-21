Services.scriptloader.loadSubScript('chrome://cliqzres/content/views/local-cinema-sc.js', this);

this.enhanceResults = function(data) {
  data.ratingStars = data.movie;
  data.emptyColumns = data.cinemas;
  enhanceMovieSC(data);
};
