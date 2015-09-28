function enhanceMovieSC(data) {
  var rating = data.ratingStars.rating ? Math.round(data.ratingStars.rating) : 0,
      ratingCss = {
        true: 'on',
        false: 'off'
      };
  data.stars = Array.apply(null,Array(5)).map(function(_, i) {
    return {
      star_class: "cqz-rating-star-" + ratingCss[i<rating]
    };
  });

  if (data.emptyColumns) {
    data.emptyColumns.map(function(x, _) {
      x.num_empty_columns = data.table_size - x.showtimes.length;
    });
  }
}

function enhanceResults(data) {
  data.ratingStars = data.cinema;
  data.emptyColumns = data.movies;
  enhanceMovieSC(data);
}
