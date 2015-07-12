# Bare Slideshow v0.3-BETA

Basic slideshow plugin written in vanilla js.



## Features

- Flexible / Responsive
- Handles image loading
- Adds css based on settings
- Loads start slide first (to reduce load time)
- Support for handling custom slide types (e.g. video)



## To do

- Add 'fade' transition



## How to use

HTML:

```html
<div class="slideshow">
  <div class="slideshow__slides">
    <div class="slideshow__slide">
      <img bs-src="original.jpg" />
    </div>
  </div>
</div>
```

JS:

```javascript
var instance = new BareSlideshow(element, optional_settings);

instance.el.onclick = instance.goToNextSlide;
```


## Settings

Copied from source code, line 5:

```javascript
const DEFAULT_SETTINGS = {
  selectors: {
    slides: ".slideshow__slide",
    slidesWrapper: ".slideshow__slides"
  },

  activeSlideClass: "is-active",
  direction: "horizontal",
  disableSlideCssTransform: false,
  fadeAnimationDuration: 700,
  fitImages: true,
  hasVariableHeight: false,
  loadedFirstClass: "has-loaded-first",
  loadingClass: "is-loading",
  setImagesAsBackground: false,
  slideAnimationDuration: 400,
  startInTheMiddle: false,
  startSlide: 1,

  transition: "slide",
  // other options: "fade" -> TODO

  transitionSystem: "two-step",
  // other options: "all"

  versions: NEW_OBJECT_PLACEHOLDER,
  versionElementSelector: false
  // if: false, then the element given to the constructor is used
  // if: "string", then -> this.el.querySelector("string");
};
```

### Transition systems

#### Two step (two-step)

Removes the previous slide and brings in the new one.


#### All (all)

Keeps all the slides in the DOM. Use this if you want show multiple slides next to each other.


## Other settings

### Versions

Versions can be used to load smaller assets depending on window width.

```javascript
// usage example
// -> if version_element_width <= version then use_version()
// -> else use_larger_version() || use_standard_src_attribute();

settings = {
  versions = {
    small: 640,
    medium: 1024
  }
};

// ... create new instance ...
```

```html
<div class="slideshow">
  <div class="slideshow__slides">
    <div class="slideshow__slide">
      <img bs-small-src="small.jpg" bs-medium-src="medium.jpg" bs-src="original.jpg" />
    </div>
  </div>
</div>
```

### Custom slide types

A slide can have a type by passing the 'bs-type' attribute to the slide element. When loading the slideshow, the function 'loadSlideWith{{TYPE}}' will be called for each slide. **Make sure this function returns a [Promise](https://github.com/jakearchibald/es6-promise#es6-promise-subset-of-rsvpjs).** Check `bareSlideshowInstance.loadSlideWithImages` for a reference.
