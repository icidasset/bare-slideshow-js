# Bare Slideshow

Basic slideshow plugin written in js with prototypes for easy customization.


## Dependencies

- jQuery

*There might be support for Zepto in the future*


## How to use

```javascript
var instance = new BareSlideshow(element, optional_settings);
// where element could be either a regular DOM element
// or a jQuery object

instance.load();
```

*note: does not use a template*


## Settings

```javascript
// with defaults
// 1. css classes
slide_klass = "slide";
slides_wrapper_klass = "slides"; // aka slides container
slide_navigation_klass = "navigation";

// 2. options
direction = "horizontal"; // or "vertical"
transition = "slide"; // or "fade"
transition_system = "two-step"; // or "all", which keeps all the slides in the DOM
animation_speed = 350;
set_images_as_background = false; // i.e. img element vs css background on slide element
fit_images = true;
start_in_the_middle = false; // overrides start slide
start_slide = 1;

// 3. versions
versions = {}; // responsive stuff, see below for more information
```


## Other settings

### data-type

A slide can have a type by passing the 'data-type' attribute to the slide element.
When loading the slideshow, the function 'load_slide_with_{{TYPE}}' will be called for each slide.
**Make sure this function returns a deferred object.**
Check `BareSlideshow.prototype.load_slides_with_images` for reference.

### set images as background

*set_images_as_background* is a global option, but can also be set for each slide separately by passing
  `data-as-background="1"` to the slide element. Or one of the following:
  `data-as-background="true"` or `$(slide_element).data('as-background', true)`.

### versions

Versions can be used to load smaller assets depending on window width.

```javascript
// usage example
// -> if window_width <= version then use_version()
// -> else use_larger_version() || use_standard_src_attribute();

settings = {};
settings.versions = {
  small: 640,
  medium: 1024
};

// ... create new instance ...
```

```html
<div class="slideshow">
  <div class="slides">
    <div class="slide">
      <img data-small-src="small.jpg" data-medium-src="medium.jpg" data-src="original.jpg" />
    </div>
  </div>
</div>
```


## To do

- Remove the jQuery dependency (or support both jQuery and Zepto)
  -> Problem here is the deferreds
