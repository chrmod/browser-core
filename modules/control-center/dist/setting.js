// $(".setting").bind('click', function() {
//
//          $(this).animate({width: "100%", height: "100%"}, 800);
//
//     $(".setting").not(this).hide("slow");
//
// });
//
// $('.setting').toggle(function(){
//         $(this).animate({width: "100%", height: "100%"}, 800);
//
//     }, function(){
//         $(this).animate({width: "226px", height: "171px"}, 800);
//         $(".setting").not(this).show("slow");
//
// });


$(".setting").click(function() {
  $(this).toggleClass("active");
  // $(".othersettings").hide("slow");
});
