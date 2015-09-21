var EZConfig = {
  'cinema': {
    'ratingStars': 'cinema',
    'emptyColumns': 'movies'
  },
  'movie': {
    'ratingStars': 'movie',
    'emptyColumns': 'cinemas'
  }
};

function enhanceMovieSC(data, which) {
  /** @param which  = 'movie' || 'cinema'
            determines what kind of result this is
  **/
  which = EZConfig[which];
  var rating = data[which.ratingStars].rating ? Math.round(data[which.ratingStars].rating) : 0,
      ratingCss = {
        true: 'on',
        false: 'off'
      };
  data.stars = Array.apply(null,Array(5)).map(function(_, i) {
    return {
      star_class: "cqz-rating-star-" + ratingCss[i<rating]
    };
  });

  data[which.emptyColumns].map(function(x, _) {
     x.num_empty_columns = data.table_size - x.showtimes.length;
  });
}

function enhanceResults(data) {
  enhanceMovieSC(data, 'cinema');
}
