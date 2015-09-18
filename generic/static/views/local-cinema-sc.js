function enhanceResults(data) {
  var rating = data.cinema.rating ? Math.round(data.cinema.rating) : 0,
      ratingCss = {
        true: 'on',
        false: 'off'
      };
  data.stars = Array.apply(null,Array(5)).map(function(_, i) {
    return {
      star_class: "cqz-rating-star-" + ratingCss[i<rating]
    };
  });

  data.movies.map(function(m, _) {
     m.num_empty_columns = data.table_size - m.showtimes.length;
  });
}
