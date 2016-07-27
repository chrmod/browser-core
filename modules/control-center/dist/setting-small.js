// $(".setting").bind('click', function() {
//     var that = $(this), // caching the current element
//         offsets = that.position(), // edited to use position() instead of offset()
//         top = offsets.top,
//         left = offsets.left,
//         clone = that.clone(),
//         parent = that.parent(), // caching the parent element
//         width = parent.width(),
//         height = parent.height();
//
//     // adding the 'clone' element to the parent, and adding the 'clone' class-name
//     clone.addClass('clone').appendTo(parent).css({
//         // positioning the element at the same coordinates
//         // as the current $(this) element
//         'top': top,
//         'left': left
//     }).animate({
//         // animating to the top-left corner of the parent, and
//         // to the parent's dimensions
//         'top': 0,
//         'left': 0,
//         'width': width,
//         'height': height
//     }, 1000).click( // binding a click-handler to remove the element
//
//     function() {
//         // also fading the sibling elements back to full opacity
//         $(this).fadeOut().siblings().animate({
//             'opacity': 1
//         }, 1000);
//     }).siblings().animate({
//         // fading-out the sibling elements
//         'opacity': 0.1
//     }, 1000);
// });​
