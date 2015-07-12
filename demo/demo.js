document.addEventListener("DOMContentLoaded", function() {

  var BareSlideshow = window.BareSlideshow;

  var a = new BareSlideshow(document.querySelector(`[demo="1"]`), {
    hasVariableHeight: true
  });

  a.el.onclick = a.goToNextSlide;


  var b = new BareSlideshow(document.querySelector(`[demo="2"]`), {
    hasVariableHeight: true,
    setImagesAsBackground: true
  });

  b.el.onclick = b.goToNextSlide;


  var c = new BareSlideshow(document.querySelector(`[demo="3"]`), {
    direction: "vertical",

    versions: {
      small: 240,
      medium: 640,
      large: 2048
      // original: 5616
    }
  });

  c.el.onclick = c.goToNextSlide;

  var d = new BareSlideshow(document.querySelector(`[demo="4"]`), {
    direction: "horizontal",
    transitionSystem: "all"
  });

  d.el.onclick = d.goToNextSlide;

});
