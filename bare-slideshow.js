/*

    BARE SLIDESHOW
    v0.2.2

*/

window.BareSlideshow = (function($) {
  var __bind = function(fn, me) {
    return function() { return fn.apply(me, arguments); };
  };

  //
  //  Default settings
  //
  BS.prototype.settings = {
    slide_klass: "slide",
    slides_wrapper_klass: "slides",
    slide_navigation_klass: "navigation",

    direction: "horizontal",
    transition: "slide",
    transition_system: "two-step",
    animation_duration: 350,
    set_images_as_background: false,
    fit_images: true,
    start_in_the_middle: false,
    start_slide: 1,
    versions: {},
    version_element: "{{slideshow_element}}"
  };



  //
  //  Constructor
  //  -> and main setup
  //
  function BS(element, settings) {
    this.bind_necessary_methods_to_self();

    this.set_main_element(element);
    this.set_initial_state_object();
    this.set_initial_settings_object(settings);
    this.set_versions_array_in_state();
    this.set_current_version(this.determine_version());

    this.setup();
  }


  BS.prototype.setup = function() {
    this.set_$children();
    this.reset_height();
    this.set_necessary_css_properties();
    this.bind_events();

    this.state.first_slide_element = this.$slides.eq(this.settings.start_slide - 1).get(0);
    this.state.current_slide_number = this.settings.start_slide;
  };


  BS.prototype.reprocess = function() {
    this.state.ready = false;
    this.$slides_wrapper.html(this.state.slides_collection.clone());
    this.$slideshow.removeClass("loaded-first loading");
    this.$slides_wrapper.css({ textIndent: "0", marginTop: "0" });

    this.settings.start_slide = this.state.current_slide_number;
    this.setup();
    this.load();
  };



  //
  //  Events
  //
  BS.prototype.bind_events = function() {
    if (this.state.events_bounded_boolean) return;
    $(window).on("resize.bareslideshow", this.window_resize_handler);
    this.$slideshow.on("mousedown", "img", this.prevent_default_event_handler);
    this.state.events_bounded_boolean = true;
  };


  BS.prototype.unbind_events = function() {
    $(window).off("resize.bareslideshow", this.window_resize_handler);
    this.$slideshow.off("mousedown", "img", this.prevent_default_event_handler);
    this.state.events_bounded_boolean = false;
  };


  BS.prototype.window_resize_handler = function(e) {
    if (!this.state.ready) return;

    var new_version = this.determine_version();
    var current_version = this.state.current_version;

    if (new_version !== current_version) {
      this.set_current_version(new_version);
      this.reprocess();

    } else {
      this.go_to_slide(this.state.current_slide_number, { direct: true });
      if (this.state.has_variable_height) this.set_slideshow_height_equal_to_image_height();
      this.refit_all_images();

    }
  };


  BS.prototype.prevent_default_event_handler = function(e) {
    e.preventDefault();
  };



  //
  //  Loading
  //  {1} -> {main}
  //
  BS.prototype.load = function() {
    this.$slideshow.addClass("loading");

    return this.serial_queue([
      this.load_first,
      this.load_the_rest,
      this.load_completed
    ]);
  };


  BS.prototype.load_first = function() {
    var _this = this;
    var dfd = $.Deferred();
    var add_to_dom = true;
    var $first_slide = $(this.state.first_slide_element);

    this.serial_queue([
      function() { return _this.load_slides($first_slide, add_to_dom); },
      function() { _this.after_load_first(dfd); }
    ]);

    return dfd.promise();
  };


  BS.prototype.load_the_rest = function() {
    var _this = this;
    var add_to_dom = (this.settings.transition_system == "all");
    var $slides = this.$slides.not(this.state.first_slide_element);

    return this.serial_queue([
      function() { return _this.load_slides($slides, add_to_dom); },
      function() { _this.after_load_the_rest(); }
    ]);
  };


  BS.prototype.load_completed = function() {
    this.$slideshow.removeClass("loading");
    this.state.ready = true;
  };



  //
  //  Loading
  //  {2} -> {main_after}
  //
  BS.prototype.after_load_first = function(dfd) {
    var $first_slide = $(this.state.first_slide_element);

    // add class to main element
    this.$slideshow.addClass("loaded-first");

    // go to first slide
    if (this.settings.transition_system == "two-step") {
      this.$slides.not($first_slide).hide(0);
      $first_slide.addClass("active");
    } else {
      this.go_to_slide(this.settings.start_slide, { direct: true, bypass: true });
    }

    // and then show it
    $.when(this.show_slides($first_slide))
     .then(dfd.resolve);
  };


  BS.prototype.after_load_the_rest = function() {
    var $slides = this.$slides.not(this.state.first_slide_element);
    this.show_slides($slides);
    this.refit_all_images();
  };



  //
  //  Loading
  //  {3} -> {slides}
  //
  BS.prototype.load_slides = function($slides, add_to_dom) {
    var _this = this;
    var dfd = $.Deferred();
    var queue;

    // queue
    queue = $.map($slides, function(slide, idx) {
      var $slide = $(slide);
      var type = $slide.data("type") || "images";
      var method = _this["load_slides_with_" + type];

      if (method) return method($slide, add_to_dom);
      else console.error("slide type not implemented");
    });

    // process queue
    $.when.apply(this, queue).then(function() {
      if (!add_to_dom) {
        $slides.remove();
        _this.set_$slides();
      }

      dfd.resolve();
    });

    // promise
    return dfd.promise();
  };



  //
  //  [TYPE] -> IMAGES
  //
  BS.prototype.load_slides_with_images = function($slides, add_to_dom) {
    var _this = this;
    var $images = $slides.find("img");

    if (add_to_dom) add_to_dom = "parent";

    return this.serial_queue([
      function() { return _this.load_images($images, add_to_dom); },
      function() { if (add_to_dom) _this.after_load_slides_with_images($slides); }
    ]);
  };


  BS.prototype.after_load_slides_with_images = function($slides) {
    var _this = this;

    // set images as background or fit images
    // can be different for each slide
    if (this.settings.set_images_as_background) {
      this.set_images_as_background($slides);
    } else {
      $slides.each(function() {
        var $slide = $(this),
            d = $slide.data("as-background");

        if (d == "1" || d == "true" || d === true) {
          _this.set_images_as_background($slide);
        } else if (_this.settings.fit_images) {
          $slide.find("img[src]").each(function() {
            var $image = $(this);
            _this.fit_image($image, $slide);
          });
        }
      });
    }
  };


  BS.prototype.load_image = function(src, $append_to, extra_attributes) {
    var dfd = $.Deferred();
    var $img = $(new window.Image());
    var attributes;

    // encode
    src = encodeURI(src);

    // load up
    $img.css("opacity", 0.0001)
        .on("load", dfd.resolve)
        .on("error", dfd.resolve);

    // set attributes
    attributes = extra_attributes || {};
    attributes.src = src;
    $img.attr(attributes);

    // append
    if ($append_to) $append_to.append($img);

    // promise
    return dfd.promise();
  };


  BS.prototype.load_images = function($images, append_to) {
    var dfd = $.Deferred();
    var self = { instance: this, append_to: append_to };
    var queue = $.map($images, __bind(this.load_images_queue_handler, self));

    $.when.apply(this, queue).then(dfd.resolve);

    return dfd.promise();
  };


  BS.prototype.load_images_queue_handler = function(image, idx) {
    var data_attr, src, attributes, attr,
        $image, $append_to;

    // set elements
    $image = $(image);

    switch (this.append_to) {
      case "slide":
        $append_to = this.get_closest_$slide($image);
        break;
      case "parent":
        $append_to = $image.parent();
        break;
    }

    // set
    data_attr = this.instance.get_attribute_name_for_image_src($image);
    src = $image.attr(data_attr);

    // copy attributes
    attr = {};
    attributes = ["alt", "title", "height", "width"];

    for (var i=0,j=attributes.length; i<j; ++i) {
      var attribute_name = attributes[i];
      var attribute_value = $image.attr(attribute_name);
      if (attribute_value) attr[attribute_name] = attribute_value;
    }

    // remove image
    $image.remove();

    // load image and return dfd
    return this.instance.load_image(src, $append_to, attr);
  };


  BS.prototype.set_images_as_background = function($slides) {
    var _this = this;

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

      if (_this.settings.fit_images) {
        $slide.css("background-size", "cover");
      }

      // remove img
      $img.remove();
    });
  };


  BS.prototype.fit_image = function($image, $wrapper) {
    var ratio_image, ratio_wrapper, ratio_slides_wrapper,
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



  //
  //  Actions
  //  {1} -> {show_slides}
  //
  BS.prototype.show_slides = function($slides, options) {
    var _this, dfd, animation_duration, fade_to, $objects_to_show;

    // set
    _this = this;
    dfd = $.Deferred();

    options = options || {};
    if (options.animation_duration == null) animation_duration = this.settings.animation_duration;
    else animation_duration = options.animation_duration;

    fade_to = (this.settings.set_images_as_background ? 0.9999 : 1);
    $objects_to_show = (this.settings.set_images_as_background ? $slides : $slides.find("img[src]"));

    // show all objects
    $objects_to_show.each(function(idx) {
      var __this = this;
      setTimeout(function() {
        _this.animate(__this, "opacity", 1, animation_duration);
      }, (animation_duration / 2) * (idx + 1));
    });

    // resolve when everything is shown
    setTimeout(dfd.resolve, ((animation_duration / 2) * $objects_to_show.length) + animation_duration);

    // promise
    return dfd.promise();
  };



  //
  //  Actions
  //  {2} -> {go_to_slides}
  //
  BS.prototype.go_to_slide = function(slide_number, options) {
    var ts, check_1, check_2, $next_slide;

    options = options || {};
    check_1 = !this.state.ready || this.state.current_slide_number === slide_number;
    check_2 = !options.bypass;

    // check
    if (check_1 && check_2) return;

    // animation stuff
    options.animation_duration = (options.direct ? 0 : this.settings.animation_duration);

    // next method
    ts = this.settings.transition_system.replace("-", "_");
    $next_slide = this["transition_type_" + ts].call(this, slide_number, options);

    // active slide
    this.$slides.removeClass("active");
    $next_slide.addClass("active");

    // current slide number
    this.state.current_slide_number = slide_number;
  };


  BS.prototype.transition_type_two_step = function(slide_number, options) {
    var _this, add_method, is_vertical, method, css_value_to_animate,
        offset, set_offset, fade, after_load, after_animation,
        $previous_slide, $next_slide;

    // set
    _this = this;

    // transition settings
    is_vertical = this.settings.direction == "vertical";
    method = is_vertical ? "height" : "width";
    css_value_to_animate = is_vertical ? "margin-top" : "text-indent";
    fade = this.settings.transition == "fade";

    if (this.state.current_slide_number < slide_number || fade) {
      add_method = "after";
    } else {
      add_method = "before";
    }

    // elements
    $previous_slide = $(this.$slides.toArray().sort(function(a, b) {
      var av = $(a).data("timestamp") || 0,
          bv = $(b).data("timestamp") || 0;

      return (av < bv ? -1 : (av > bv ? 1 : 0));
    }).reverse()[0]);

    $next_slide = $(this.state.slides_collection[slide_number - 1]).clone();

    // timestamp
    $next_slide.data("timestamp", new Date().getTime());

    // offset
    set_offset = function() {
      offset = -($previous_slide[method]());

      if (add_method == "before" && !fade) {
        _this.$slides_wrapper.css(css_value_to_animate, offset);
        offset = 0;
      }
    };

    set_offset();

    // after load
    after_load = function() {
      set_offset();

      _this.show_slides($next_slide, { animation_duration: 0 });

      if (fade) {
        after_animation = function() {
          $previous_slide.remove();
          _this.set_$slides();
        };

        $previous_slide.css({
          left: 0,
          position: "absolute",
          top: 0,
          zIndex: 8
        });

        _this.animate($previous_slide[0], "opacity", 0, options.animation_duration, after_animation);

      } else {
        after_animation = function() {
          $previous_slide.remove();
          _this.set_$slides();
          _this.$slides_wrapper.css(css_value_to_animate, "0px");
        };

        _this.animate_wrapper(css_value_to_animate, offset, options.animation_duration, after_animation);

      }
    };

    // add slide + css
    $previous_slide[add_method]($next_slide);
    this.set_$slides();
    this.set_necessary_css_properties();

    // load slide
    $.when(this.load_slides($next_slide, true))
     .then(after_load);

    // return
    return $next_slide;
  };


  BS.prototype.transition_type_all = function(slide_number, options) {
    var is_vertical, method, method_outer,
        css_value_to_animate, offset, slide_margin,
        $previous_slide, $next_slide, $slice;

    // set
    is_vertical = this.settings.direction == "vertical";
    method = is_vertical ? "height" : "width";
    method_outer = "outer" + method.charAt(0).toUpperCase() + method.slice(1);
    css_value_to_animate = is_vertical ? "margin-top" : "text-indent";

    // set elements
    $previous_slide = this.$slides.eq(this.state.current_slide_number - 1);
    $next_slide = this.$slides.eq(slide_number - 1);

    // offset
    offset = 0;

    if (this.$slides.eq(1).length) {
      if (is_vertical) {
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
    this.animate_wrapper(css_value_to_animate, -offset, options.animation_duration);

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



  //
  //  Setters
  //  {1} -> {one_timers}
  //
  BS.prototype.set_main_element = function(element) {
    this.$slideshow = (function() {
      if (element instanceof $) {
        return element.first();
      } else if ($.isArray(element)) {
        return $(element[0]);
      } else {
        return $(element);
      }
    }());

    this.slideshow_element = this.$slideshow.get(0);
  };


  BS.prototype.set_initial_state_object = function() {
    this.state = {};
    this.state.css_transition_key = this.get_vendor_property_name("transition");
  };


  BS.prototype.set_initial_settings_object = function(settings) {
    this.settings = $.extend({}, this.settings, settings || {});
    this.set_conditional_settings();

    // fake eval
    for (var key in this.settings) {
      var has_own = this.settings.hasOwnProperty(key);
      var value = this.settings[key];

      if (has_own && (typeof value === "string") && value.indexOf("{{") === 0) {
        this.settings[key] = this[value.substr(2, value.length - 4)];
      }
    }
  };



  //
  //  Setters
  //  {2} -> {elements}
  //
  BS.prototype.set_$children = function() {
    this.$slide_navigation = this.get_$slide_navigation();
    this.$slides_wrapper = this.get_$slides_wrapper();
    this.set_$slides();
  };


  BS.prototype.set_$slides = function() {
    this.$slides = this.get_$slides();
    if (!this.state.slides_collection) {
      this.state.slides_collection = this.$slides.clone();
    }
  };



  //
  //  Setters
  //  {3} -> {css}
  //
  BS.prototype.set_necessary_css_properties = function() {
    this["set_css_for_" + this.settings.direction + "_type"]();
  };


  BS.prototype.set_css_for_horizontal_type = function() {
    var wrapper_properties = {
      fontSize: 0,
      lineHeight: 0,
      overflow: "hidden",
      position: "relative",
      whiteSpace: "nowrap"
    };

    var slide_properties = {
      overflow: "hidden",
      position: "relative",
      verticalAlign: "top"
    };

    // slide properties for IE7
    if (window.attachEvent && !window.addEventListener) {
      $.extend(slide_properties, {
        display: "inline",
        zoom: 1
      });

    // slide properties for other browsers
    } else {
      $.extend(slide_properties, {
        display: "inline-block",
        textIndent: "0"
      });

    }

    // set properties
    this.$slides_wrapper.css(wrapper_properties);
    this.$slides.css(slide_properties);
  };


  BS.prototype.set_css_for_vertical_type = function() {
    this.$slides_wrapper.css({
      position: "relative"
    });

    this.$slides.css({
      display: "block",
      overflow: "hidden",
      position: "relative"
    });
  };


  BS.prototype.set_slideshow_height_equal_to_image_height = function() {
    var height = this.$slides.first().children("img").height();

    this.$slideshow
      .add(this.$slides_wrapper)
      .add(this.$slides)
      .height(height);
  };



  //
  //  Setters
  //  {4} -> {settings}
  //
  BS.prototype.set_conditional_settings = function() {
    // transition
    if (this.settings.transition == "fade") {
      this.settings.transition_system = "two-step";
    }

    // start slide
    if (this.settings.start_in_the_middle) {
      this.settings.start_slide = Math.round(this.get_$slides().length / 2);
    }
  };



  //
  //  Setters
  //  {5} -> {versions}
  //
  BS.prototype.set_versions_array_in_state = function() {
    this.state.versions_array = this.get_versions_in_order();
  };


  BS.prototype.set_current_version = function(version) {
    this.state.current_version = version;
  };



  //
  //  Getters
  //  {1} -> {elements}
  //
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



  //
  //  Getters
  //  {2} -> {versions}
  //
  BS.prototype.get_versions_in_order = function() {
    var versions = this.settings.versions;
    var array = [];

    for (var v in versions) {
      if (versions.hasOwnProperty(v)) {
        array.push([v, parseInt(versions[v], 10)]);
      }
    }

    return array.sort(function(a, b) {
      return a[1] > b[1] ? 1 : -1;
    });
  };


  BS.prototype.determine_version = function() {
    var width = $(this.settings.version_element).width(),
        version = false;

    for (var i=0,j=this.state.versions_array.length; i<j; ++i) {
      var v = this.state.versions_array[i];
      if (width <= v[1]) {
        version = v[0];
        break;
      }
    }

    return version;
  };


  BS.prototype.get_attribute_name_for_image_src = function($images) {
    var attr, has_images;

    if (this.state.current_version) {
      attr = "data-" + this.state.current_version + "-src";

      if ($images) {
        var width = $(this.settings.version_element).width();

        for (var i=0,j=this.state.versions_array.length; i<=j; ++i) {
          var version = this.state.versions_array[i];
          has_images = !($images.filter("[" + attr + "]").length === 0);

          if (has_images) {
            break;
          } else if (version && width <= version[1]) {
            attr = "data-" + version[0] + "-src";
          } else {
            attr = "data-src";
          }
        }
      }

    } else {
      attr = "data-src";
    }

    return attr;
  };



  //
  //  Getters
  //  {3} -> {other}
  //
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



  //
  //  Helpers
  //  {1} -> {method_binding}
  //
  BS.prototype.bind = function(array, _this, method_object) {
    _this = _this || this;

    // where to the method lives
    method_object = method_object || _this;

    // loop
    $.each(array, function(idx, method_name) {
      method_object[method_name] = __bind(method_object[method_name], _this);
    });
  };


  BS.prototype.bind_to_self = function(array) {
    this.bind(array);
  };


  BS.prototype.bind_necessary_methods_to_self = function() {
    this.bind_to_self([
      "load_first", "load_the_rest", "load_completed",
      "load_slides", "load_slides_with_images",

      "after_load_first", "after_load_the_rest", "after_load_slides_with_images",
      "window_resize_handler", "go_to_previous_slide", "go_to_next_slide"
    ]);
  };



  //
  //  Helpers
  //  {2} -> {animating}
  //
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



  //
  //  Helpers
  //  {3} -> {other}
  //
  BS.prototype.count_slides = function() {
    return this.state.slides_collection.length;
  };


  BS.prototype.reset_height = function() {
    this.$slides_wrapper.css("height", "");
    this.$slideshow.css("height", "");
    this.state.has_variable_height = false;
  };


  BS.prototype.refit_all_images = function() {
    if (this.settings.fit_images && !this.settings.set_images_as_background) {
      var _this = this;
      this.$slides.each(function() {
        var $slide = $(this),
            type = $slide.data("type") || "images",
            $img = (type == "images" ? $slide.find("img") : false);
        if ($img) _this.fit_image($img, $slide);
      });
    }
  };


  BS.prototype.serial_queue = function(methods_array) {
    var dfd = $.Deferred(),
        i = 0;

    var load = function(method) {
      $.when(method()).then(function() {
        i = i + 1;
        if (methods_array[i]) load(methods_array[i]);
        else dfd.resolve();
      });
    };

    load(methods_array[i]);

    return dfd.promise();
  };



  //
  //  Return
  //
  return BS;

})(jQuery);
