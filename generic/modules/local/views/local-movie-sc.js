import localCinemaSC from 'local-cinema-sc';

export default {
  enhanceMovieSC: localCinemaSC.enhanceMovieSC,
  enhanceResults(data) {
    data.ratingStars = data.movie;
    data.emptyColumns = data.cinemas;
    this.enhanceMovieSC(data);
  },
}
