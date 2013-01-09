(function() {
  var el, opts, bs;

  // slideshow element & options
  el = document.getElementById("slideshow");
  opts = {};

  // setup & load slideshow
  bs = new BareSlideshow(el, opts);
  bs.load();

  // some example events
  el.onclick = bs.go_to_next_slide;
  document.onkeyup = function(e) {
    switch (e.keyCode) {
      case 37: bs.go_to_previous_slide(); break;
      case 38: bs.go_to_slide(1); break;
      case 39: bs.go_to_next_slide(); break;
    }
  };

  // globalize
  window.slideshow_instance = bs;
}());
