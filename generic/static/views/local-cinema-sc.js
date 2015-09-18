function enhanceResults(data) {
  var rating = Math.round(data.cinema.rating),
      ratingCss = {
        true: 'on',
        false: 'off'
      };
  data.stars = Array.apply(null,Array(5)).map(function(_, i) {
    return {
      star_class: "cqz-rating-star-" + ratingCss[i<rating]
    };
  });
}
