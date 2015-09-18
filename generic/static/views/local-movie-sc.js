function enhanceResults(data) {
  var rating = data.movie.rating ? Math.round(data.movie.rating) : 0,
      ratingCss = {
        true: 'on',
        false: 'off'
      };
  data.stars = Array.apply(null,Array(5)).map(function(_, i) {
    return {
      star_class: "cqz-rating-star-" + ratingCss[i<rating]
    };
  });

  data.cinemas.map(function(c, _) {
     c.num_empty_columns = data.table_size - c.showtimes.length;
  });
}
