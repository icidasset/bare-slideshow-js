/*

    BARE SLIDESHOW
    v0.1.4

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
    direction: "horizontal",
    transition: "slide",
    transition_system: "two-step",
    animation_speed: 350,
    set_images_as_background: false,
    fit_images: true,
    start_in_the_middle: false,
    start_slide: 1
  };



  /**************************************
   *  Constructor
   */
  function BS(element, settings) {
    this.state = {};
    this.settings = $.extend({}, this.settings, settings || {});

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

    // vendor specifics
    this.state.css_transition_key = this.get_vendor_property_name("transition");

    // further setup
    this.setup();
  }



  /**************************************
   *  Setup
   */
  BS.prototype.setup = function() {
    this.set_$children();

    // reset + css
    this.$slides_wrapper.css("height", "");
    this.$slideshow.css("height", "");
    this.state.has_variable_height = false;
    this.set_necessary_css_properties();

    // conditions -> transition
    if (this.settings.transition == "fade") {
      this.settings.transition_system = "two-step";
    }

    // conditions -> start slide
    if (this.settings.start_in_the_middle) {
      this.start_slide = Math.round(this.count_slides() / 2);
    } else {
      this.start_slide = this.settings.start_slide;
    }

    // conditions -> events
    if (!this.state.events_bounded_boolean) {
      this.bind_events();
    }

    // first and current slide
    this.$first_slide = this.$slides.eq(this.start_slide - 1);
    this.state.current_slide_number = this.settings.start_slide;
  };


  BS.prototype.bind_events = function() {
    $(window).on("resize.bareslideshow", this.window_resize_handler);
    this.state.events_bounded_boolean = true;
  };


  BS.prototype.unbind_events = function() {
    $(window).off("resize.bareslideshow", this.window_resize_handler);
    this.state.events_bounded_boolean = false;
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

    var add_to_dom = true;
    $.when(this.load_slides(this.$first_slide, add_to_dom))
     .then(next);

    return dfd.promise();
  };


  BS.prototype.load_the_rest = function() {
    var dfd = $.Deferred(),
        next = __bind(function() {
          this.after_load(dfd);
        }, this);

    var add_to_dom = this.settings.transition_system == "all";
    $.when(this.load_slides(this.$slides.not(this.$first_slide), add_to_dom))
     .then(next);

    return dfd.promise();
  };



  /**************************************
   *  Load different types of slides
   */
  BS.prototype.load_slides = function($slides, add_to_dom) {
    var self, dfd, queue;

    // set
    self = this;
    dfd = $.Deferred();

    // queue
    queue = $.map($slides, function(slide, idx) {
      var type, method, $slide;

      $slide = $(slide);
      type   = $slide.data("type") || "images";
      method = self["load_slides_with_" + type];

      if (method) return method($slide, add_to_dom);
      else console.error("slide type not implemented");
    });

    // process queue
    $.when.apply(this, queue)
     .then(function() {
        if (!add_to_dom) {
          $slides.remove();
          self.set_$slides();
        }

        dfd.resolve();
    });

    // promise
    return dfd.promise();
  };


  BS.prototype.load_slides_with_images = function($slides, add_to_dom) {
    var next, dfd = $.Deferred(),
        $images = $slides.find("img[data-src]");

    // should add to dom
    if (add_to_dom) add_to_dom = "parent";

    // set next
    next = __bind(function() {
      if (add_to_dom) this.after_load_images($slides);
      dfd.resolve();
    }, this);

    // load images
    $.when(this.load_images($images, add_to_dom))
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

        if (d == "1" || d == "true" || d === true) {
          self.set_images_as_background($slide);
        } else if (self.settings.fit_images) {
          $slide.find("img[src]").each(function() {
            var $image = $(this);
            self.fit_image($image, $slide);
          });
        }
      });
    }
  };


  BS.prototype.after_load_first_slide = function(dfd) {
    this.$slideshow.addClass("loaded-first");

    if (this.settings.transition_system == "all") {
      this.go_to_slide(this.start_slide, { direct: true });
    } else {
      this.$slides.not(this.$first_slide).hide(0);
      this.$first_slide.addClass("active");
    }

    $.when(this.show_slides(this.$first_slide))
     .then(dfd.resolve);
  };


  BS.prototype.after_load = function(dfd) {
    this.show_slides(this.$slides.not(this.$first_slide));
    this.ready = true;
    this.window_resize_handler();
    dfd.resolve();
  };



  /**************************************
   *  Event handlers
   */
  BS.prototype.window_resize_handler = function(e) {
    var self = this;

    // check
    if (!self.ready) return;

    // go to slide
    self.go_to_slide(self.state.current_slide_number, { direct: true });

    // variable height?
    if (self.state.has_variable_height) {
      this.$slideshow
        .add(this.$slides_wrapper)
        .add(this.$slides)
        .height(self.$slides.first().children("img").height());
    }

    // refit images
    if (self.settings.fit_images) {
      self.$slides.each(function() {
        var $slide = $(this),
            type = $slide.data("type") || "images",
            $img = (type == "images" ? $slide.find("img") : false);
        if ($img) self.fit_image($img, $slide);
      });
    }
  };



  /**************************************
   *  CSS
   */
  BS.prototype.set_necessary_css_properties = function() {
    this["_sncp_" + this.settings.direction]();
  };


  BS.prototype._sncp_horizontal = function() {
    this.$slides_wrapper.css({
      fontSize: 0,
      lineHeight: 0,
      overflow: "hidden",
      position: "relative",
      whiteSpace: "nowrap"
    });

    this.$slides.css({
      overflow: "hidden",
      position: "relative",
      verticalAlign: "top"
    });

    if (window.attachEvent && !window.addEventListener) { // IE7
      this.$slides.css({
        display: "inline",
        zoom: 1
      });
    } else {
      this.$slides.css({
        display: "inline-block",
        textIndent: "0"
      });
    }
  };


  BS.prototype._sncp_vertical = function() {
    this.$slides_wrapper.css({
      position: "relative"
    });

    this.$slides.css({
      display: "block",
      overflow: "hidden",
      position: "relative"
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
    $.each(array, function(idx, method_name) {
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
    this.set_$slides(true);
  };


  BS.prototype.set_$slides = function(set_collection) {
    this.$slides = this.get_$slides();
    if (set_collection) this.state.slides_collection = this.$slides.clone();
  };


  BS.prototype.count_slides = function() {
    return this.state.slides_collection.length;
  };


  BS.prototype.get_vendor_property_name = function(prop) {
    var div = document.createElement('div');

    if (prop in div.style) return prop;

    var prefixes = ['Moz', 'Webkit', 'O', 'ms'];
    var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

    for (var i=0, j=prefixes.length; i<j; ++i) {
      var vendorProp = prefixes[i] + prop_;
      if (vendorProp in div.style) return vendorProp;
    }
  };


  BS.prototype.animate = function(el, key, value, duration, after_func) {
    var animate_opts, ctk, $el = $(el);
    after_func = after_func || (function() {});

    if (this.state.css_transition_key) {
      ctk = this.state.css_transition_key;

      $el.css(ctk, key + " " + duration + "ms");
      setTimeout(function() { $el.css(key, value); }, 0);
      setTimeout(function() { $el.css(ctk, ""); after_func(); }, duration);

    } else {
      animate_opts = {};
      animate_opts[key] = value;

      $el.stop(true, true).animate(animate_opts, duration, after_func);
    }
  };


  BS.prototype.animate_wrapper = function(key, value, duration, after_func) {
    this.animate(this.$slides_wrapper, key, value, duration, after_func);
  };



  /**************************************
   *  Images
   */
  BS.prototype.load_image = function(src, $append_to, extra_attributes) {
    var dfd, attributes, $img;

    // set
    dfd = $.Deferred();
    src = encodeURI(src);
    $img = $(new window.Image());

    // load up
    $img.css("opacity", 0)
        .on("load", dfd.resolve)
        .on("error", dfd.resolve);

    // set attributes
    attributes = extra_attributes || {};
    attributes.src = src;
    $img.attr(attributes);

    // append
    if ($append_to) $append_to.append($img);

    // prevent image drag
    $img.on("mousedown", function(e) {
      e.preventDefault();
    });

    // promise
    return dfd.promise();
  };


  BS.prototype.load_images = function($images, append_to) {
    var self, dfd, queue;

    // set
    self = this;
    dfd = $.Deferred();

    // queue
    queue = $.map($images, function(image, idx) {
      var src, attr, $image, $append_to;

      //// set elements
      $image = $(image);

      switch (append_to) {
        case "slide":
          $append_to = self.get_closest_$slide($image);
          break;
        case "parent":
          $append_to = $image.parent();
          break;
      }

      //// set
      src = $image.data("src");

      attr = {};
      attr.alt = $image.attr("alt");
      attr.title = $image.attr("title");
      attr.height = $image.attr("height");
      attr.width = $image.attr("width");

      //// remove image
      $image.remove();

      //// load image and return dfd
      return self.load_image(src, $append_to, attr);
    });

    // process queue
    $.when.apply(this, queue)
     .then(dfd.resolve);

    // promise
    return dfd.promise();
  };


  BS.prototype.set_images_as_background = function($slides) {
    var self = this;

    $slides.css("opacity", 0);
    $slides.each(function() {
      var $slide, $img;

      // set
      $slide = $(this);
      $img = $slide.find("img[src]");

      // check
      if (!$img.length) return;

      // background css
      $slide.css("background-image", "url(" + $img.attr("src") + ")")
            .css("background-position", "center")
            .css("background-repeat", "no-repeat");

      if (self.settings.fit_images) {
        $slide.css("background-size", "cover");
      }

      // remove img
      $img.remove();
    });
  };


  BS.prototype.fit_image = function($image, $wrapper) {
    var ratio_image, ratio_slideshow, ratio_wrapper,
        full_height_condition_a, full_height_condition_b,
        new_image_height, image_left, image_top;

    // presets
    $image.css({
      display: "block",
      left: "0px",
      position: "absolute",
      top: "0px"
    });

    // ratio
    ratio_image = $image.width() / $image.height();
    ratio_wrapper = $wrapper.width() / $wrapper.height();
    ratio_slides_wrapper = this.$slides_wrapper.width() / this.$slides_wrapper.height();

    // full height
    full_height_condition_a = isFinite(ratio_wrapper) && ratio_wrapper < ratio_image;
    full_height_condition_b = isFinite(ratio_slides_wrapper) && !isFinite(ratio_wrapper) && ratio_slides_wrapper < ratio_image;

    if (full_height_condition_a || full_height_condition_b) {
      if (full_height_condition_a) new_image_height = $wrapper.height();
      else new_image_height = this.$slides_wrapper.height();

      if (full_height_condition_b) $wrapper.height(new_image_height);
      $image.css({ height: new_image_height, width: "auto" });

      image_left = -($image.width() / 2 - $wrapper.width() / 2);
      image_left = image_left > 0 ? 0 : image_left;

      $image.css({
        left: image_left.toString() + "px",
        top: "0px"
      });

    // full width
    } else {
      $image.css({ height: "auto", width: "100%" });

      if (!isFinite(ratio_slides_wrapper)) {
        this.$slideshow
          .add(this.$slides_wrapper)
          .add(this.$slides)
          .height($image.height());

        this.state.has_variable_height = true;
      } else if (!isFinite(ratio_wrapper)) {
        $wrapper.height(this.$slides_wrapper.height());
      }

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
  BS.prototype.show_slides = function($slides, options) {
    var dfd, self, animation_speed, fade_to, $objects_to_show;

    dfd = $.Deferred();
    self = this;

    options = options || {};
    if (options.animation_speed == null) animation_speed = this.settings.animation_speed;
    else animation_speed = options.animation_speed;

    fade_to = (this.settings.set_images_as_background ? 0.9999 : 1);
    $objects_to_show = (this.settings.set_images_as_background ? $slides : $slides.find("img[src]"));

    $objects_to_show.each(function(idx) {
      var _this = this;
      setTimeout(function() {
        self.animate(_this, "opacity", 1, animation_speed);
      }, (animation_speed / 2) * (idx + 1));
    });

    setTimeout(dfd.resolve, ((animation_speed / 2) * $objects_to_show.length) + animation_speed);

    return dfd.promise();
  };



  /**************************************
   *  Navigation
   */
  BS.prototype.go_to_slide = function(slide_number, options) {
    var ts, $next_slide;

    // check
    if (!this.ready || this.state.current_slide_number === slide_number) return;

    // options
    options = options || {};

    // animation stuff
    options.animation_speed = (options.direct ? 0 : this.settings.animation_speed);

    // next method
    ts = this.settings.transition_system.replace("-", "_");
    $next_slide = this["go_to_slide__ts_" + ts].call(this, slide_number, options);

    // active slide
    this.$slides.removeClass("active");
    $next_slide.addClass("active");

    // current slide number
    this.state.current_slide_number = slide_number;
  };


  BS.prototype.go_to_slide__ts_two_step = function(slide_number, options) {
    var self, add_method, vertical, method, css_value_to_animate,
        offset, fade, after_load, after_animation,
        $previous_slide, $next_slide;

    // add method
    if (this.state.current_slide_number < slide_number || fade) {
      add_method = "after";
    } else {
      add_method = "before";
    }

    // set
    self = this;
    vertical = this.settings.direction == "vertical";
    method = vertical ? "height" : "width";
    css_value_to_animate = vertical ? "margin-top" : "text-indent";

    $previous_slide = $(this.$slides.toArray().sort(function(a, b) {
      var av = $(a).data("timestamp") || 0,
          bv = $(b).data("timestamp") || 0;

      return (av < bv ? -1 : (av > bv ? 1 : 0));
    }).reverse()[0]);

    $next_slide = $(this.state.slides_collection[slide_number - 1]).clone();

    offset = -($previous_slide[method]());
    fade = this.settings.transition == "fade";

    // timestamp
    $next_slide.data("timestamp", new Date().getTime());

    // if add_method is 'before'
    if (add_method == "before" && !fade) {
      this.$slides_wrapper.css(css_value_to_animate, offset);
      offset = 0;
    }

    // after load
    after_load = function() {
      self.show_slides($next_slide, { animation_speed: 0 });

      if (fade) {
        after_animation = function() {
          $previous_slide.remove();
          self.set_$slides();
        };

        $previous_slide.css({
          left: 0,
          position: "absolute",
          top: 0,
          zIndex: 8
        });

        self.animate($previous_slide[0], "opacity", 0, options.animation_speed, after_animation);

      } else {
        after_animation = function() {
          $previous_slide.remove();
          self.set_$slides();
          self.$slides_wrapper.css(css_value_to_animate, "0px");
        };

        self.animate_wrapper(css_value_to_animate, offset, options.animation_speed, after_animation);

      }
    };

    // add slide + css
    $previous_slide[add_method]($next_slide);
    self.set_$slides();
    self.set_necessary_css_properties();

    // load slide
    $.when(this.load_slides($next_slide, true))
     .then(after_load);

    // return
    return $next_slide;
  };


  BS.prototype.go_to_slide__ts_all = function(slide_number, options) {
    var self, vertical, method, method_outer,
        css_value_to_animate, offset, slide_margin,
        $previous_slide, $next_slide, $slice;

    // set
    self = this;
    vertical = this.settings.direction == "vertical";
    method = vertical ? "height" : "width";
    method_outer = "outer" + method.charAt(0).toUpperCase() + method.slice(1);
    css_value_to_animate = vertical ? "margin-top" : "text-indent";

    // set elements
    $previous_slide = this.$slides.eq(this.state.current_slide_number - 1);
    $next_slide = this.$slides.eq(slide_number - 1);

    // offset
    offset = 0;

    if (this.$slides.eq(1).length) {
      if (vertical) {
        slide_margin = Math.round(this.$slides.eq(1).offset().top -
                       this.$slides.eq(0).offset().top - $next_slide.height());
      } else {
        slide_margin = Math.round(this.$slides.eq(1).offset().left -
                       this.$slides.eq(0).offset().left - $next_slide.width());
      }
    } else {
      slide_margin = 0;
    }

    $slice = this.$slides;
    $slice = $slice.slice(0, slide_number - 1);
    $slice.each(function() {
      offset = offset + $(this)[method_outer]() + slide_margin;
    });

    offset = offset + $next_slide[method]() / 2;
    offset = offset - this.$slides_wrapper[method]() / 2;

    // animate
    this.animate_wrapper(css_value_to_animate, -offset, options.animation_speed);

    // return
    return $next_slide;
  };


  BS.prototype.go_to_previous_slide = function() {
    var previous_slide_number = this.state.current_slide_number - 1;

    // proceed
    if (previous_slide_number > 0) {
      this.go_to_slide(previous_slide_number);
    } else {
      this.go_to_slide(this.count_slides());
    }
  };


  BS.prototype.go_to_next_slide = function() {
    var next_slide_number = this.state.current_slide_number + 1;

    // proceed
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
