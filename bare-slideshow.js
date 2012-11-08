/*

  + Bare Slideshow


  DOCUMENTATION:

  1) Options
  - a slide can have a type by passing the 'data-type' attribute to the slide element
  - set-images-as-background is a global option, but can be set by passing
    'data-as-background="1"' to the slide element. Or the following:
    'data-as-background="true"' and $(slide_element).data('as-background', true);

*/

var root = window;
root.BareSlideshow = (function($) {
  var __bind = function(fn, me) {
    return function() { return fn.apply(me, arguments); };
  };

  /**************************************
   *  Default settings
   */
  BS.prototype.settings = {
    //// <klasses>
    slide_klass: "slide",
    slides_wrapper_klass: "slides",
    slide_navigation_klass: "navigation",

    //// <options>
    transition: "slide",
    animation_speed: 750,
    set_images_as_background: false,
    start_in_the_middle: false
  };



  /**************************************
   *  Constructor
   */
  function BS(element, settings) {
    var original_settings = this.settings;

    if (settings) {
      this.settings = {};

      _.extend(this.settings, original_settings, settings);
    }

    // bind to self
    this.bind_to_self([
      "load_first", "load_the_rest",
      "load_slides", "load_slides_with_images",

      "after_load_images", "after_load_first_slide", "after_load",
      "window_resize_handler", "go_to_previous_slide", "go_to_next_slide"
    ]);

    // cache jQuery object
    this.$slideshow = (function() {
      if (element instanceof $) {
        return element.first();
      } else if ($.isArray(element)) {
        return $(element[0]);
      } else {
        return $(element);
      }
    }());

    // further setup
    this.setup();
  }



  /**************************************
   *  Setup
   */
  BS.prototype.setup = function() {
    this.set_$children();
    this.set_necessary_css_properties();
    this.bind_events();

    // set "first" slide number
    if (this.settings.start_in_the_middle) {
      this.start_slide = Math.round(this.count_slides() / 2);
    } else {
      this.start_slide = 1;
    }

    // set "first" slide element
    this.$first_slide = this.$slides.eq(this.start_slide - 1);
  };


  BS.prototype.bind_events = function() {
    $(window).on("resize", this.window_resize_handler);
  };



  /**************************************
   *  Load
   */
  BS.prototype.load = function() {
    var dfd, next, complete;

    // deferred
    dfd = $.Deferred();

    // callbacks
    next = __bind(function() {
      $.when(this.load_the_rest())
       .then(complete);
    }, this);

    complete = __bind(function() {
      this.$slideshow.removeClass("loading");
      dfd.resolve();
    }, this);

    // add loading class
    this.$slideshow.addClass("loading");

    // load first and then proceed
    $.when(this.load_first())
     .then(next);

    return dfd.promise();
  };


  BS.prototype.load_first = function() {
    var dfd = $.Deferred(),
        next = __bind(function() {
          this.after_load_first_slide(dfd);
        }, this);

    $.when(this.load_slides(this.$first_slide))
     .then(next);

    return dfd.promise();
  };


  BS.prototype.load_the_rest = function() {
    var dfd = $.Deferred(),
        next = __bind(function() {
          this.after_load(dfd);
        }, this);

    $.when(this.load_slides(this.$slides.not(this.$first_slide)))
     .then(next);

    return dfd.promise();
  };



  /**************************************
   *  Load different types of slides
   */
  BS.prototype.load_slides = function($slides) {
    var self, dfd, queue;

    // set
    self = this;
    dfd = $.Deferred();

    // queue
    queue = _.map($slides, function(slide) {
      var type, method, $slide;

      $slide   = $(slide);
      type     = $slide.data("type") || "images";
      method   = self["load_slides_with_" + type];

      if (method) return method($slide);
      else console.error("slide type not implemented");
    });

    // process queue
    $.when.apply(this, queue)
     .then(dfd.resolve);

    // promise
    return dfd.promise();
  };


  BS.prototype.load_slides_with_images = function($slides) {
    var next, dfd = $.Deferred();

    // set next
    next = __bind(function() {
      this.after_load_images($slides);
      dfd.resolve();
    }, this);

    // load images
    $.when(this.load_images($slides.find("img[data-src]")))
     .then(next);

    return dfd.promise();
  };



  /**************************************
   *  After load
   */
  BS.prototype.after_load_images = function($slides) {
    var self = this;

    if (this.settings.set_images_as_background) {
      self.set_images_as_background($slides);
    } else {
      $slides.each(function() {
        var $slide = $(this),
            d = $slide.data("as-background");

        if (d == "1" || d == "true" || d == true) {
          self.set_images_as_background($slide);
        } else {
          $slide.find("img[src]").each(function() {
            var $image = $(this);
            self.fit_image($image, $slide);
          });
        }
      });
    }
  };


  BS.prototype.after_load_first_slide = function(dfd) {
    this.go_to_slide(this.start_slide, { direct: true });

    // show slide and then load the rest
    $.when(this.show_slides(this.$first_slide))
     .then(dfd.resolve);
  };


  BS.prototype.after_load = function(dfd) {
    this.show_slides(this.$slides.not(this.$first_slide));
    this.ready = true;
    dfd.resolve();
  };



  /**************************************
   *  CSS
   */
  BS.prototype.set_necessary_css_properties = function() {
    // wrapper
    this.$slides_wrapper.css({
      fontSize: 0,
      lineHeight: 0,
      overflow: "hidden",
      whiteSpace: "nowrap"
    });

    // slides
    this.$slides.css({
      display: "inline-block",
      overflow: "hidden",
      position: "relative",
      textIndent: "0"
    });
  };



  /**************************************
   *  Event handlers
   */
  BS.prototype.window_resize_handler = function(e) {
    var self = this;

    // check
    if (!self.ready) return;

    // go to slide
    self.go_to_slide(self.current_slide_number, { direct: true });

    // refit images
    self.$slides.each(function() {
      var $slide = $(this),
          type = $slide.data("type") || "images",
          $img = (type == "images" ? $slide.find("img") : false);
      if ($img) self.fit_image($img, $slide);
    });
  };



  /**************************************
   *  Utility functions
   */
  BS.prototype.bind_to_self = function(array) {
    this.bind(array);
  };


  BS.prototype.bind = function(array, self, method_object) {
    self = self || this;

    // where to the method lives
    method_object = method_object || self;

    // loop
    _.each(array, function(method_name) {
      method_object[method_name] = __bind(method_object[method_name], self);
    });
  };


  BS.prototype.get_$slide_navigation = function() {
    return this.$slideshow.find(
      "." + this.settings.slide_navigation_klass
    );
  };


  BS.prototype.get_$slides_wrapper = function() {
    return this.$slideshow.find(
      "." + this.settings.slides_wrapper_klass
    );
  };


  BS.prototype.get_$slides = function() {
    return this.$slideshow.find(
      "."  + this.settings.slides_wrapper_klass +
      " ." + this.settings.slide_klass
    );
  };


  BS.prototype.get_closest_$slide = function($el) {
    return $el.closest(
      "." + this.settings.slide_klass
    );
  };


  BS.prototype.set_$children = function() {
    this.$slide_navigation = this.get_$slide_navigation();
    this.$slides_wrapper = this.get_$slides_wrapper();
    this.$slides = this.get_$slides();
  };


  BS.prototype.count_slides = function() {
    return this.$slides.length;
  };



  /**************************************
   *  Images
   */
  BS.prototype.load_image = function(src, $append_to) {
    var dfd, $img;

    // set
    dfd = $.Deferred();
    $img = $(new window.Image());
    src = encodeURI(src);

    // load up
    $img.css("opacity", 0)
        .on("load", dfd.resolve);

    // set src
    $img.attr("src", src);

    // append
    $append_to.append($img);

    // onmousedown
    $img.on("mousedown", function(e) {
      e.preventDefault();
    });

    // promise
    return dfd.promise();
  };


  BS.prototype.load_images = function($images) {
    var self, dfd, queue;

    // set
    self = this;
    dfd = $.Deferred();

    // queue
    queue = _.map($images, function(image) {
      var src, $image, $slide;

      //// set elements
      $image = $(image);
      $slide = self.get_closest_$slide($image);

      //// set
      src = $image.data("src");

      //// remove image
      $image.remove();

      //// load image and return dfd
      return self.load_image(src, $slide);
    });

    // process queue
    $.when.apply(this, queue)
     .then(dfd.resolve);

    // promise
    return dfd.promise();
  };


  BS.prototype.set_images_as_background = function($slides) {
    $slides.css("opacity", 0);
    $slides.each(function() {
      var $slide, $img;

      //// set
      $slide = $(this);
      $img = $slide.find("img[src]");

      //// check
      if (!$img.length) return;

      //// background css
      $slide.css("background-image", "url(" + $img.attr("src") + ")")
            .css("background-size", "cover");

      //// remove img
      $img.remove();
    });
  };


  BS.prototype.fit_image = function($image, $wrapper) {
    var ratio_image, ratio_wrapper, image_left, image_top;

    // ratio
    ratio_image = $image.width() / $image.height();
    ratio_wrapper = $wrapper.width() / $wrapper.height();

    // presets
    $image.css({
      display: "block",
      left: "0px",
      position: "absolute",
      top: "0px"
    });

    // full height
    if (ratio_wrapper < ratio_image) {
      $image.css({ height: $wrapper.height(), width: "auto" });

      image_left = -($image.width() / 2 - $wrapper.width() / 2);
      image_left = image_left > 0 ? 0 : image_left;

      $image.css({
        left: image_left.toString() + "px",
        top: "0px"
      });

    // full width
    } else {
      $image.css({ height: "auto", width: "100%" });

      image_top = -($image.height() / 2 - $wrapper.height() / 2);
      image_top = image_top > 0 ? 0 : image_top;

      $image.css({
        left: 0,
        top: image_top.toString() + "px"
      });

    }
  };



  /**************************************
   *  Show slides
   */
  BS.prototype.show_slides = function($slides) {
    var dfd, animation_speed, fade_to, $objects_to_show;

    // dfd
    dfd = $.Deferred();

    // animation speed
    animation_speed = this.settings.animation_speed;

    // fade to
    fade_to = (this.settings.set_images_as_background ?
      0.9999 : 1
    );

    // objects to show
    $objects_to_show = (this.settings.set_images_as_background ?
      $slides : $slides.find("img[src]")
    );

    // if regular img elements, make sure slide is visible
    if (!this.settings.set_images_as_background) {
      $slides.css("opacity", 1);
    }

    // show
    $objects_to_show.each(function(idx) {
      $(this).delay((animation_speed / 2) * (idx + 1))
             .fadeTo(animation_speed, 1);
    });

    // resolve
    setTimeout(dfd.resolve, ((animation_speed / 2) * $objects_to_show.length) + animation_speed);

    // promise
    return dfd.promise();
  };



  /**************************************
   *  Navigation
   */
  BS.prototype.go_to_slide = function(slide_number, options) {
    var fade, index, offset, fake_slide_html,
        $slide, $previous_slide, $fake_slide;

    // options & settings
    options = options || {};
    fade = this.settings.transition == "fade";

    // animation speed
    options.animation_speed = (
      options.direct ? 0 : this.settings.animation_speed
    );

    // index
    index = slide_number - 1;

    // set
    $slide = this.$slides.eq(index);
    $previous_slide = this.$slides.eq(this.current_slide_number - 1);

    // if transition is fade:
    // - insert fake slide
    // - add necessary css to previous slide
    if (fade) {
      if (slide_number > this.current_slide_number) {
        fake_slide_html = "<div class=\"" + this.settings.slide_klass +
                          " fake\" style=\"display: inline-block;\"></div>"
        $fake_slide = $(fake_slide_html);
        $slide.before($fake_slide);
      }

      $previous_slide.css({
        left: 0,
        position: "absolute",
        top: 0,
        zIndex: 8
      });
    }

    // active slide
    this.$slides.removeClass("active");
    $slide.addClass("active");

    // offset
    offset = 0;

    this.$slides.slice(0, index).each(function() {
      offset = offset + $(this).width();
    });

    offset = offset + $slide.width() / 2;
    offset = offset - this.$slideshow.width() / 2;

    // current slide number
    this.current_slide_number = slide_number;

    // animate
    this.$slides_wrapper
        .stop(true, true)
        .animate(
          { textIndent: -offset },
          (fade ? 0 : options.animation_speed)
        );

    // if transition is fade
    // - unmark previous slide as sticky
    if (fade) {
      $previous_slide.stop(true, true).fadeTo(options.animation_speed, 0, function() {
        if ($fake_slide) $fake_slide.remove();
        $previous_slide.css({ opacity: 1, position: "relative", zIndex: "" });
      });
    }
  };


  BS.prototype.go_to_previous_slide = function() {
    var previous_slide_number;

    // check if ready
    if (!this.ready) return;

    // previous slide number
    previous_slide_number = this.current_slide_number - 1;

    // procceed
    if (previous_slide_number > 0) {
      this.go_to_slide(previous_slide_number);
    } else {
      this.go_to_slide(this.count_slides());
    }
  };


  BS.prototype.go_to_next_slide = function() {
    var next_slide_number;

    // check if ready
    if (!this.ready) return;

    // next slide number
    next_slide_number = this.current_slide_number + 1;

    // procceed
    if (next_slide_number <= this.count_slides()) {
      this.go_to_slide(next_slide_number);
    } else {
      this.go_to_slide(1);
    }
  };



  /**************************************
   *  Return
   */
  return BS;

}(jQuery));
