const NEW_OBJECT_PLACEHOLDER = "__NEW_OBJECT";
const NEW_ARRAY_PLACEHOLDER = "__NEW_ARRAY";


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


const DEFAULT_STATE = {
  cssTransformKey: "transform",
  cssTransitionKey: "transition",
  currentSlideNumber: null,
  currentVersion: null,
  didPreload: false,
  didSetHeight: false,
  eventsBounded: false,
  setHeightImgRatio: null
};


export default class BareSlideshow {


  constructor(el, settings) {
    this.el = el;
    this.bindToSelf();

    this.setInitialSettings(settings);
    this.setInitialState();
    this.setElementsAndCSS();

    // transition method setup
    let transitionSetupMethod = this[
      "transitionSystem__" +
      this.titleCaseString(this.__settings.transitionSystem) +
      "__Setup"
    ];

    if (transitionSetupMethod) {
      return transitionSetupMethod.call(this);
    } else {
      this.throwError("Transition method not implemented (setup fn)");
    }

    // other stuff
    this.bindEvents();
  }


  destroy() {
    this.unbindEvents();
  }


  bindToSelf() {
    [ "preventDefaultHandler",
      "windowResizeHandler",

      "loadSlideWithImage",

      "goToNextSlide",
      "goToPreviousSlide"

    ].forEach((method) => {
      this[method] = this[method].bind(this);
    });

    this.windowResizeHandler = this.debounce(
      this.windowResizeHandler,
      500
    );
  }



  /// Reprocess
  /// -> Rebuild the slideshow.
  ///    Useful if you need to add new and/or remove old slides.
  ///
  reprocess(slideNumber) {
    slideNumber = slideNumber
      || this.__state.currentSlideNumber
      || this.__settings.startSlide;

    return this.goToSlide(slideNumber, { byPass: true, skipAnimations: true }).then(() => {
      return this.loadAllExceptStartSlide();
    });
  }



  /// Settings & State
  ///
  setInitialSettings(settings={}) {
    let obj = {
      ...DEFAULT_SETTINGS,
      ...settings
    };

    // ensure new non-primitives
    this.ensureNewNonPrimitives(obj);

    // transition overrides
    if (obj.transition === "fade") {
      obj.transitionSystem = "two-step";
    }

    // start in the middle, start slide override
    if (obj.startInTheMiddle) {
      obj.startSlide = Math.round(this.get_$slides().length / 2);
    }

    // set
    this.__settings = obj;
  }


  setInitialState() {
    let obj = {
      ...DEFAULT_STATE,

      cssTransformKey: this.getVendorPropertyName("transform"),
      cssTransitionKey: this.getVendorPropertyName("transition")
    };

    // ensure new non-primitives
    this.ensureNewNonPrimitives(obj);

    // set
    this.__state = obj;

    // versions
    obj.versionElement = (
      this.__settings.versionElementSelector ?
        this.el.querySelector(this.__settings.versionElementSelector) :
        this.el
    );

    obj.versionsArray = this.sortedVersions();
    obj.currentVersion = this.determineVersion();
  }


  ensureNewNonPrimitives(obj) {
    Object.keys(obj).forEach(function(key) {
      let value = obj[key];
      if (value === NEW_OBJECT_PLACEHOLDER) obj[key] = {};
      else if (value === NEW_ARRAY_PLACEHOLDER) obj[key] = [];
    });
  }



  /// DOM & CSS
  ///
  setElementsAndCSS() {
    let shouldRemoveFromDOM = this.shouldEvaluateSlidesOnNavigation();
    let slidesWrapperNode = this.el.querySelector(this.__settings.selectors.slidesWrapper);
    let slideNodes = this.el.querySelectorAll(this.__settings.selectors.slides);
    let slideElements = [];

    // apply css
    this.setCSS(slidesWrapperNode, slideNodes);

    // remove slide elements from DOM and store them only in memory
    [].slice.call(slideNodes)
      .forEach(function(sE, idx) {
      let el = shouldRemoveFromDOM ? sE.parentNode.removeChild(sE) : sE;
      el.setAttribute("bs-idx", idx);
      slideElements.push(el);
    });

    // store
    this.childrenElements = {
      slides: slideElements,
      slidesWrapper: slidesWrapperNode
    };
  }


  setCSS(slidesWrapper, slides) {
    this.applyStyles([this.el], {
      "overflow": "hidden",
      "position": "relative"
    });

    let slidesWrapperStyles = {
      "position": "relative"
    };

    let slideStyles = {
      "opacity": "0",
      "overflow": "hidden",
      "position": "relative",
      "width": "100%"
    };

    if (!this.__settings.disableSlideCssTransform) {
      slideStyles[this.__state.cssTransformKey] = "translateZ(0)";
    }

    if (this.__settings.direction === "vertical") {
      slideStyles = {
        ...slideStyles,

        "display": "block"
      };
    } else {
      slidesWrapperStyles = {
        ...slidesWrapperStyles,

        "font-size": "0",
        "line-height": "0",
        "text-indent": "0",
        "white-space": "nowrap"
      };

      slideStyles = {
        ...slideStyles,

        "display": "inline-block",
        "text-indent": "0",
        "vertical-align": "top"
      };
    }

    this.applyStyles([slidesWrapper], slidesWrapperStyles);
    this.applyStyles(slides, slideStyles);
  }


  applyStyles(elements, stylesObj) {
    [].slice.call(elements).forEach(function(el) {
      el.style.cssText += Object.keys(stylesObj).map(function(prop) {
        return `${prop}:${stylesObj[prop]}`;
      }).join(";");
    });
  }



  /// Loading
  ///
  loadSlides(slideElementsArray, options={}) {
    let promises = [];

    this.el.classList.add(this.__settings.loadingClass);

    slideElementsArray.forEach((slideElement) => {
      let slideType = this.titleCaseString(slideElement.getAttribute("bs-type") || "Image");
      let method = this[`loadSlideWith${slideType}`];

      if (method) promises.push(method(slideElement, options));
      else this.log(`Slide type '${slideType}' not implemented`, { warn: true });
    });

    return Promise.all(promises).then(() => {
      this.el.classList.remove(this.__settings.loadingClass);
    });
  }


  loadAllExceptStartSlide(options={}) {
    let startSlide = this.__settings.startSlide;
    let slideElements = this.childrenElements.slides.filter((sE, idx) => (idx + 1) !== startSlide);

    return this.loadSlides(slideElements, options);
  }



  /// {Type} Images
  ///
  loadSlideWithImage(slideElement, options={}) {
    let imgElement = slideElement.querySelector("img");
    let srcAttributeName = this.determineSrcAttributeName(this.__state.currentVersion);
    let src = imgElement ? imgElement.getAttribute(srcAttributeName) : null;
    let promise;

    if (src) {
      promise = this.loadImage({
        ...options,

        slideElement: slideElement,
        imgElement: imgElement,
        imgSrc: src
      });

      if (!options.loadIntoMemory) {
        promise = promise
          .then(::this.setHeightEqualToImageHeightIfNeeded)
          .then(::this.handleImage)
          .then(::this.fitImage);
      }
    }

    return promise;
  }


  loadImage(options={}) {
    return new Promise((resolve) => {
      let tmpImg = new Image();

      tmpImg.onload = () => {
        let newOptions = {
          ...options,

          imgNaturalHeight: tmpImg.naturalHeight,
          imgNaturalWidth: tmpImg.naturalWidth
        };

        this.el.removeChild(tmpImg);

        setTimeout(function() {
          resolve(newOptions);
        }, 25);
      };

      tmpImg.style.opacity = 0.0001;
      tmpImg.style.position = "absolute";
      tmpImg.style.marginLeft = "-1px";
      tmpImg.style.marginTop = "-1px";
      tmpImg.style.left = "100%";
      tmpImg.style.top = "100%";

      this.el.appendChild(tmpImg);

      tmpImg.setAttribute("src", options.imgSrc);
    });
  }


  setHeightEqualToImageHeightIfNeeded(options={}) {
    if (options.loadIntoMemory) {
      return options;

    } else if (this.__state.didSetHeight) {
      if (this.__settings.hasVariableHeight) {
        let newHeight = Math.floor(
          options.slideElement.clientWidth * this.__state.setHeightImgRatio
        );

        options.slideElement.style.height = `${newHeight}px`;
      }

      return options;

    } else {
      this.__state.didSetHeight = true;

    }

    if (this.__settings.hasVariableHeight && !this.__state.setHeightImgRatio) {
      let imgRatio = options.imgNaturalHeight / options.imgNaturalWidth;
      this.__state.setHeightImgRatio = imgRatio;
    }

    if (this.__state.setHeightImgRatio) {
      let newHeight = Math.floor(options.slideElement.clientWidth * this.__state.setHeightImgRatio);
      let newHeightStyle = `${newHeight}px`;

      this.el.style.height = newHeightStyle;
      this.childrenElements.slidesWrapper.style.height = newHeightStyle;
      options.slideElement.style.height = newHeightStyle;
    }

    return options;
  }


  handleImage(options={}) {
    if (this.__settings.setImagesAsBackground) {
      options.slideElement.style.backgroundImage = `url(${options.imgSrc})`;
      options.slideElement.style.backgroundPosition = "center";
      options.slideElement.style.backgroundRepeat = "no-repeat";

      options.imgElement.parentNode.removeChild(options.imgElement);
      options.imgElement = null;

    } else {
      options.imgElement.setAttribute("src", options.imgSrc);

    }

    return options;
  }


  fitImage(options={}) {
    // <slide> as background
    if (this.__settings.setImagesAsBackground) {
      if (this.__settings.fitImages) {
        options.slideElement.style.backgroundSize = "cover";
      }

    // <img>
    } else if (this.__settings.fitImages) {
      let seRatio = options.slideElement.clientWidth / options.slideElement.clientHeight;
      let imgRatio = options.imgNaturalWidth / options.imgNaturalHeight;

      if (seRatio < imgRatio) {
        this.applyStyles([options.imgElement], {
          "height": "100%",
          "width": "auto"
        });
      } else {
        this.applyStyles([options.imgElement], {
          "height": "auto",
          "width": "100%"
        });
      }

    }

    return options;
  }



  /// {Type} Images — Versions
  ///
  sortedVersions() {
    let versions = this.__settings.versions;
    let array = [];

    Object.keys(versions).forEach(function(version) {
      array.push([version, parseInt(versions[version], 10)]);
    });

    return array.sort(function(a, b) {
      return a[1] > b[1] ? 1 : -1;
    });
  }


  determineVersion() {
    let width = this.__state.versionElement.clientWidth,
        version = false;

    for (let i = 0, j = this.__state.versionsArray.length; i < j; ++i) {
      let v = this.__state.versionsArray[i];

      if (width <= v[1]) {
        version = v[0];
        break;
      }
    }

    return version;
  }


  determineSrcAttributeName(version) {
    return `bs-${version ? version + "-" : ""}src`;
  }



  /// Animations
  ///
  animate(el, property, value, duration, options={}) {
    return new Promise((resolve) => {
      let ctk = this.__state.cssTransitionKey;
      let ccProperty = this.camelCaseString(property);
      let delay = options.delay || 0;

      setTimeout(function() {
        el.style[ctk] = `${property} ${duration}ms`;

        setTimeout(function() { el.style[ccProperty] = value; }, 25);
        setTimeout(function() { el.style[ctk] = ""; resolve(); }, duration + 50);
      }, delay);
    });
  }



  /// Navigation
  ///
  shouldEvaluateSlidesOnNavigation() {
    return (this.__settings.transitionSystem === "two-step");
  }


  goToNextSlide() {
    let next = this.__state.currentSlideNumber + 1;

    if (next <= this.childrenElements.slides.length) {
      return this.goToSlide(next);
    } else {
      return this.goToSlide(1);
    }
  }


  goToPreviousSlide() {
    let previous = this.__state.currentSlideNumber - 1;

    if (previous > 0) {
      return this.goToSlide(previous);
    } else {
      return this.goToSlide(this.childrenElements.slides.length);
    }
  }


  goToSlide(number, options={}) {
    if (this.__state.currentSlideNumber === number && !options.byPass) {
      return Promise.resolve();
    }

    let transitionMethod = this["transitionSystem__" + this.titleCaseString(
      this.__settings.transitionSystem
    )];

    if (transitionMethod) {
      return transitionMethod.call(this, number, options);
    } else {
      this.throwError("Transition method not implemented");
    }
  }



  /// Transition systems
  ///
  transitionSystem__TwoStep__Setup() {
    this.goToSlide(this.__settings.startSlide).then(() => {
      this.el.classList.add(this.__settings.loadedFirstClass);
      return this.loadAllExceptStartSlide({ loadIntoMemory: true });
    });
  }


  transitionSystem__TwoStep(slideNumber, options) {
    let slides = this.childrenElements.slides;
    let slidesWrapper = this.childrenElements.slidesWrapper;
    let settings = this.__settings;
    let state = this.__state;

    // slide numbers
    let oldSlideNumber = state.currentSlideNumber;
    state.currentSlideNumber = slideNumber;

    // previous & next slides
    let hasPreviousSlides   = !!slidesWrapper.querySelectorAll(settings.selectors.slides).length;
    let newSlide            = slides[slideNumber - 1].cloneNode(true);

    // settings
    let cssProperty     = (settings.direction === "vertical" ? "margin-top" : "text-indent");
    let spaceProperty   = (settings.direction === "vertical" ? "Height" : "Width");
    let addPosition;

    if (!hasPreviousSlides || slideNumber > oldSlideNumber) {
      addPosition = "after";
    } else {
      addPosition = "before";
    }

    // insert new slide
    newSlide.classList.add(settings.activeSlideClass);
    newSlide.classList.add("is-new");

    if (addPosition === "before") {
      slidesWrapper.insertBefore(newSlide, slidesWrapper.firstChild);
    } else {
      slidesWrapper.appendChild(newSlide);
    }

    // animations — from & to
    let animateFromValue, animateToValue;

    if (addPosition === "before") {
      animateFromValue  = -newSlide[`client${spaceProperty}`];
      animateToValue    = 0;
    } else {
      animateFromValue  = 0;
      animateToValue    = -newSlide[`client${spaceProperty}`];
    }

    // animations
    let animation;

    if (!hasPreviousSlides) {
      animation = () => {
        return this.animate(newSlide, "opacity", 1, settings.fadeAnimationDuration);
      };

    } else {
      slidesWrapper.style[this.camelCaseString(cssProperty)] = `${animateFromValue}px`;

      animation = () => {
        newSlide.style.opacity = 1;

        return this.animate(
          slidesWrapper,
          cssProperty,
          `${animateToValue}px`,
          settings.slideAnimationDuration,
          { delay: 25 }
        );
      };

    }

    // callback
    let callback = () => {
      let toRemove = this.childrenElements.slidesWrapper.querySelectorAll(
        `${settings.selectors.slides}:not(.is-new)`
      );

      [].slice.call(toRemove).forEach(function(n) {
        n.parentNode.removeChild(n);
      });

      this.childrenElements.slidesWrapper.style[
        this.camelCaseString(cssProperty)
      ] = "0px";

      newSlide.classList.remove("is-new");

      return slideNumber;
    };

    // load new slide, execute animations and return promise
    let promise = this.loadSlides([newSlide]);

    if (!options.skipAnimations) {
      promise = promise.then(animation);
    } else {
      promise = promise.then(function() {
        newSlide.style.opacity = 1;
      });
    }

    return promise.then(callback);
  }


  transitionSystem__All__Setup() {
    let startIdx = this.__settings.startSlide - 1;
    let startSlide = this.childrenElements.slides[startIdx];

    this.loadSlides([startSlide]).then(() => {
      this.animate(startSlide, "opacity", 1, this.__settings.fadeAnimationDuration)
          .then(() => {
            this.el.classList.add(this.__settings.loadedFirstClass);
            return this.goToSlide(this.__settings.startSlide, { skipAnimations: true });
          })
          .then(() => {
            return this.loadAllExceptStartSlide();
          })
          .then(() => {
            [].slice.call(this.childrenElements.slides).forEach((sE, idx) => {
              if (idx !== startIdx) {
                this.animate(
                  sE,
                  "opacity",
                  1,
                  this.__settings.fadeAnimationDuration,
                  { delay: 25 }
                );
              }
            });
          });
    });
  }


  transitionSystem__All(slideNumber, options) {
    let slides = this.childrenElements.slides;
    let slidesWrapper = this.childrenElements.slidesWrapper;
    let settings = this.__settings;
    let state = this.__state;
    let isVertical = settings.direction === "vertical";

    // slide numbers
    state.currentSlideNumber = slideNumber;

    // settings
    let cssProperty     = (isVertical ? "margin-top" : "text-indent");
    let offProperty     = (isVertical ? "offsetTop" : "offsetLeft");

    // animations — to
    let slide           = slides[slideNumber - 1];
    let animateToValue  = slides[0][offProperty] - slide[offProperty];

    // animations
    let animation = () => {
      return this.animate(
        slidesWrapper,
        cssProperty,
        `${animateToValue}px`,
        settings.slideAnimationDuration,
        { delay: 25 }
      );
    };

    // load new slide, execute animations and return promise
    let promise;

    if (!options.skipAnimations) {
      promise = animation();
    } else {
      promise = new Promise((resolve) => {
        slidesWrapper.style[this.camelCaseString(cssProperty)] = `${animateToValue}px`;
        resolve();
      });
    }

    return promise.then(() => slideNumber);
  }



  /// Events
  ///
  bindEvents() {
    if (!this.__state.eventsBounded) {
      this.el.addEventListener("mousedown", this.preventDefaultHandler);
      window.addEventListener("resize", this.windowResizeHandler);

      this.__state.eventsBounded = true;
    }
  }


  unbindEvents() {
    this.el.removeEventListener("mousedown", this.preventDefaultHandler);
    window.removeEventListener("resize", this.windowResizeHandler);

    this.__state.eventsBounded = false;
  }


  windowResizeHandler() {
    let newVersion = this.determineVersion();
    let currentVersion = this.__state.currentVersion;

    // reset
    this.__state.didSetHeight = false;

    if (newVersion !== currentVersion) {
      this.__state.currentVersion = newVersion;
      this.reprocess();
    } else {
      this.setHeightEqualToImageHeightIfNeeded({
        slideElement: this.childrenElements.slidesWrapper.querySelector(
          this.__settings.selectors.slides
        )
      });
    }
  }


  preventDefaultHandler(event) {
    if (event.target.tagName === "IMG") event.preventDefault();
  }



  /// Logging & errors
  ///
  log(message, options={}) {
    let constructor;

    if (options.error) constructor = console.error;
    else if (options.warn) constructor = console.warn;
    else constructor = console.log;

    constructor(`BareSlideshow: ${message}`);
  }


  throwError(message) {
    throw `BareSlideshow: ${message}`;
  }



  /// Helpers
  ///
  camelCaseString(input="") {
    return input.toLowerCase().replace(/(-|_)(\w)/g, function(match, a, b) {
      return b.toUpperCase();
    });
  }


  titleCaseString(input="") {
    return this.camelCaseString(input).replace(/(^[a-z])/g, function(match, a) {
      return a.toUpperCase();
    });
  }


  getVendorPropertyName(prop) {
    let div = document.createElement("div");

    if (prop in div.style) return prop;

    let prefixes = ["Moz", "Webkit", "O", "ms"];
    let prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

    for (let i = 0, j = prefixes.length; i < j; ++i) {
      let vendorProp = prefixes[i] + prop_;
      if (vendorProp in div.style) return vendorProp;
    }
  }


  debounce(func, wait, immediate) {
    let timeout;
    return function() {
      let context = this, args = arguments;
      let later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      let callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

}
