(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.BareSlideshow = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NEW_OBJECT_PLACEHOLDER = "__NEW_OBJECT";
var NEW_ARRAY_PLACEHOLDER = "__NEW_ARRAY";

var DEFAULT_SETTINGS = {
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

var DEFAULT_STATE = {
  cssTransformKey: "transform",
  cssTransitionKey: "transition",
  currentSlideNumber: null,
  currentVersion: null,
  didPreload: false,
  didSetHeight: false,
  eventsBounded: false,
  setHeightImgRatio: null
};

var BareSlideshow = (function () {
  function BareSlideshow(el, settings) {
    _classCallCheck(this, BareSlideshow);

    this.el = el;
    this.bindToSelf();

    this.setInitialSettings(settings);
    this.setInitialState();
    this.setElementsAndCSS();

    // transition method setup
    var transitionSetupMethod = this["transitionSystem__" + this.titleCaseString(this.__settings.transitionSystem) + "__Setup"];

    if (transitionSetupMethod) {
      return transitionSetupMethod.call(this);
    } else {
      this.throwError("Transition method not implemented (setup fn)");
    }

    // other stuff
    this.bindEvents();
  }

  _createClass(BareSlideshow, [{
    key: "destroy",
    value: function destroy() {
      this.unbindEvents();
    }
  }, {
    key: "bindToSelf",
    value: function bindToSelf() {
      var _this = this;

      ["preventDefaultHandler", "windowResizeHandler", "loadSlideWithImage", "goToNextSlide", "goToPreviousSlide"].forEach(function (method) {
        _this[method] = _this[method].bind(_this);
      });

      this.windowResizeHandler = this.debounce(this.windowResizeHandler, 500);
    }
  }, {
    key: "reprocess",

    /// Reprocess
    /// -> Rebuild the slideshow.
    ///    Useful if you need to add new and/or remove old slides.
    ///
    value: function reprocess(slideNumber) {
      var _this2 = this;

      slideNumber = slideNumber || this.__state.currentSlideNumber || this.__settings.startSlide;

      return this.goToSlide(slideNumber, { byPass: true, skipAnimations: true }).then(function () {
        return _this2.loadAllExceptStartSlide();
      });
    }
  }, {
    key: "setInitialSettings",

    /// Settings & State
    ///
    value: function setInitialSettings() {
      var settings = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var obj = _extends({}, DEFAULT_SETTINGS, settings);

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
  }, {
    key: "setInitialState",
    value: function setInitialState() {
      var obj = _extends({}, DEFAULT_STATE, {

        cssTransformKey: this.getVendorPropertyName("transform"),
        cssTransitionKey: this.getVendorPropertyName("transition")
      });

      // ensure new non-primitives
      this.ensureNewNonPrimitives(obj);

      // set
      this.__state = obj;

      // versions
      obj.versionElement = this.__settings.versionElementSelector ? this.el.querySelector(this.__settings.versionElementSelector) : this.el;

      obj.versionsArray = this.sortedVersions();
      obj.currentVersion = this.determineVersion();
    }
  }, {
    key: "ensureNewNonPrimitives",
    value: function ensureNewNonPrimitives(obj) {
      Object.keys(obj).forEach(function (key) {
        var value = obj[key];
        if (value === NEW_OBJECT_PLACEHOLDER) obj[key] = {};else if (value === NEW_ARRAY_PLACEHOLDER) obj[key] = [];
      });
    }
  }, {
    key: "setElementsAndCSS",

    /// DOM & CSS
    ///
    value: function setElementsAndCSS() {
      var shouldRemoveFromDOM = this.shouldEvaluateSlidesOnNavigation();
      var slidesWrapperNode = this.el.querySelector(this.__settings.selectors.slidesWrapper);
      var slideNodes = this.el.querySelectorAll(this.__settings.selectors.slides);
      var slideElements = [];

      // apply css
      this.setCSS(slidesWrapperNode, slideNodes);

      // remove slide elements from DOM and store them only in memory
      [].slice.call(slideNodes).forEach(function (sE, idx) {
        var el = shouldRemoveFromDOM ? sE.parentNode.removeChild(sE) : sE;
        el.setAttribute("bs-idx", idx);
        slideElements.push(el);
      });

      // store
      this.childrenElements = {
        slides: slideElements,
        slidesWrapper: slidesWrapperNode
      };
    }
  }, {
    key: "setCSS",
    value: function setCSS(slidesWrapper, slides) {
      this.applyStyles([this.el], {
        "overflow": "hidden",
        "position": "relative"
      });

      var slidesWrapperStyles = {
        "position": "relative"
      };

      var slideStyles = {
        "opacity": "0",
        "overflow": "hidden",
        "position": "relative",
        "width": "100%"
      };

      if (!this.__settings.disableSlideCssTransform) {
        slideStyles[this.__state.cssTransformKey] = "translateZ(0)";
      }

      if (this.__settings.direction === "vertical") {
        slideStyles = _extends({}, slideStyles, {

          "display": "block"
        });
      } else {
        slidesWrapperStyles = _extends({}, slidesWrapperStyles, {

          "font-size": "0",
          "line-height": "0",
          "text-indent": "0",
          "white-space": "nowrap"
        });

        slideStyles = _extends({}, slideStyles, {

          "display": "inline-block",
          "text-indent": "0",
          "vertical-align": "top"
        });
      }

      this.applyStyles([slidesWrapper], slidesWrapperStyles);
      this.applyStyles(slides, slideStyles);
    }
  }, {
    key: "applyStyles",
    value: function applyStyles(elements, stylesObj) {
      [].slice.call(elements).forEach(function (el) {
        el.style.cssText += Object.keys(stylesObj).map(function (prop) {
          return prop + ":" + stylesObj[prop];
        }).join(";");
      });
    }
  }, {
    key: "loadSlides",

    /// Loading
    ///
    value: function loadSlides(slideElementsArray) {
      var _this3 = this;

      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var promises = [];

      this.el.classList.add(this.__settings.loadingClass);

      slideElementsArray.forEach(function (slideElement) {
        var slideType = _this3.titleCaseString(slideElement.getAttribute("bs-type") || "Image");
        var method = _this3["loadSlideWith" + slideType];

        if (method) promises.push(method(slideElement, options));else _this3.log("Slide type '" + slideType + "' not implemented", { warn: true });
      });

      return Promise.all(promises).then(function () {
        _this3.el.classList.remove(_this3.__settings.loadingClass);
      });
    }
  }, {
    key: "loadAllExceptStartSlide",
    value: function loadAllExceptStartSlide() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var startSlide = this.__settings.startSlide;
      var slideElements = this.childrenElements.slides.filter(function (sE, idx) {
        return idx + 1 !== startSlide;
      });

      return this.loadSlides(slideElements, options);
    }
  }, {
    key: "loadSlideWithImage",

    /// {Type} Images
    ///
    value: function loadSlideWithImage(slideElement) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var imgElement = slideElement.querySelector("img");
      var srcAttributeName = this.determineSrcAttributeName(this.__state.currentVersion);
      var src = imgElement ? imgElement.getAttribute(srcAttributeName) : null;
      var promise = undefined;

      if (src) {
        promise = this.loadImage(_extends({}, options, {

          slideElement: slideElement,
          imgElement: imgElement,
          imgSrc: src
        }));

        if (!options.loadIntoMemory) {
          promise = promise.then(this.setHeightEqualToImageHeightIfNeeded.bind(this)).then(this.handleImage.bind(this)).then(this.fitImage.bind(this));
        }
      }

      return promise;
    }
  }, {
    key: "loadImage",
    value: function loadImage() {
      var _this4 = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      return new Promise(function (resolve) {
        var tmpImg = new Image();

        tmpImg.onload = function () {
          var newOptions = _extends({}, options, {

            imgNaturalHeight: tmpImg.naturalHeight,
            imgNaturalWidth: tmpImg.naturalWidth
          });

          _this4.el.removeChild(tmpImg);

          setTimeout(function () {
            resolve(newOptions);
          }, 25);
        };

        tmpImg.style.opacity = 0.0001;
        tmpImg.style.position = "absolute";
        tmpImg.style.marginLeft = "-1px";
        tmpImg.style.marginTop = "-1px";
        tmpImg.style.left = "100%";
        tmpImg.style.top = "100%";

        _this4.el.appendChild(tmpImg);

        tmpImg.setAttribute("src", options.imgSrc);
      });
    }
  }, {
    key: "setHeightEqualToImageHeightIfNeeded",
    value: function setHeightEqualToImageHeightIfNeeded() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (options.loadIntoMemory) {
        return options;
      } else if (this.__state.didSetHeight) {
        if (this.__settings.hasVariableHeight) {
          var newHeight = Math.floor(options.slideElement.clientWidth * this.__state.setHeightImgRatio);

          options.slideElement.style.height = newHeight + "px";
        }

        return options;
      } else {
        this.__state.didSetHeight = true;
      }

      if (this.__settings.hasVariableHeight && !this.__state.setHeightImgRatio) {
        var imgRatio = options.imgNaturalHeight / options.imgNaturalWidth;
        this.__state.setHeightImgRatio = imgRatio;
      }

      if (this.__state.setHeightImgRatio) {
        var newHeight = Math.floor(options.slideElement.clientWidth * this.__state.setHeightImgRatio);
        var newHeightStyle = newHeight + "px";

        this.el.style.height = newHeightStyle;
        this.childrenElements.slidesWrapper.style.height = newHeightStyle;
        options.slideElement.style.height = newHeightStyle;
      }

      return options;
    }
  }, {
    key: "handleImage",
    value: function handleImage() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      if (this.__settings.setImagesAsBackground) {
        options.slideElement.style.backgroundImage = "url(" + options.imgSrc + ")";
        options.slideElement.style.backgroundPosition = "center";
        options.slideElement.style.backgroundRepeat = "no-repeat";

        options.imgElement.parentNode.removeChild(options.imgElement);
        options.imgElement = null;
      } else {
        options.imgElement.setAttribute("src", options.imgSrc);
      }

      return options;
    }
  }, {
    key: "fitImage",
    value: function fitImage() {
      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      // <slide> as background
      if (this.__settings.setImagesAsBackground) {
        if (this.__settings.fitImages) {
          options.slideElement.style.backgroundSize = "cover";
        }

        // <img>
      } else if (this.__settings.fitImages) {
        var seRatio = options.slideElement.clientWidth / options.slideElement.clientHeight;
        var imgRatio = options.imgNaturalWidth / options.imgNaturalHeight;

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
  }, {
    key: "sortedVersions",

    /// {Type} Images — Versions
    ///
    value: function sortedVersions() {
      var versions = this.__settings.versions;
      var array = [];

      Object.keys(versions).forEach(function (version) {
        array.push([version, parseInt(versions[version], 10)]);
      });

      return array.sort(function (a, b) {
        return a[1] > b[1] ? 1 : -1;
      });
    }
  }, {
    key: "determineVersion",
    value: function determineVersion() {
      var width = this.__state.versionElement.clientWidth,
          version = false;

      for (var i = 0, j = this.__state.versionsArray.length; i < j; ++i) {
        var v = this.__state.versionsArray[i];

        if (width <= v[1]) {
          version = v[0];
          break;
        }
      }

      return version;
    }
  }, {
    key: "determineSrcAttributeName",
    value: function determineSrcAttributeName(version) {
      return "bs-" + (version ? version + "-" : "") + "src";
    }
  }, {
    key: "animate",

    /// Animations
    ///
    value: function animate(el, property, value, duration) {
      var _this5 = this;

      var options = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

      return new Promise(function (resolve) {
        var ctk = _this5.__state.cssTransitionKey;
        var ccProperty = _this5.camelCaseString(property);
        var delay = options.delay || 0;

        setTimeout(function () {
          el.style[ctk] = property + " " + duration + "ms";

          setTimeout(function () {
            el.style[ccProperty] = value;
          }, 25);
          setTimeout(function () {
            el.style[ctk] = "";resolve();
          }, duration + 50);
        }, delay);
      });
    }
  }, {
    key: "shouldEvaluateSlidesOnNavigation",

    /// Navigation
    ///
    value: function shouldEvaluateSlidesOnNavigation() {
      return this.__settings.transitionSystem === "two-step";
    }
  }, {
    key: "goToNextSlide",
    value: function goToNextSlide() {
      var next = this.__state.currentSlideNumber + 1;

      if (next <= this.childrenElements.slides.length) {
        return this.goToSlide(next);
      } else {
        return this.goToSlide(1);
      }
    }
  }, {
    key: "goToPreviousSlide",
    value: function goToPreviousSlide() {
      var previous = this.__state.currentSlideNumber - 1;

      if (previous > 0) {
        return this.goToSlide(previous);
      } else {
        return this.goToSlide(this.childrenElements.slides.length);
      }
    }
  }, {
    key: "goToSlide",
    value: function goToSlide(number) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      if (this.__state.currentSlideNumber === number && !options.byPass) {
        return Promise.resolve();
      }

      var transitionMethod = this["transitionSystem__" + this.titleCaseString(this.__settings.transitionSystem)];

      if (transitionMethod) {
        return transitionMethod.call(this, number, options);
      } else {
        this.throwError("Transition method not implemented");
      }
    }
  }, {
    key: "transitionSystem__TwoStep__Setup",

    /// Transition systems
    ///
    value: function transitionSystem__TwoStep__Setup() {
      var _this6 = this;

      this.goToSlide(this.__settings.startSlide).then(function () {
        _this6.el.classList.add(_this6.__settings.loadedFirstClass);
        return _this6.loadAllExceptStartSlide({ loadIntoMemory: true });
      });
    }
  }, {
    key: "transitionSystem__TwoStep",
    value: function transitionSystem__TwoStep(slideNumber, options) {
      var _this7 = this;

      var slides = this.childrenElements.slides;
      var slidesWrapper = this.childrenElements.slidesWrapper;
      var settings = this.__settings;
      var state = this.__state;

      // slide numbers
      var oldSlideNumber = state.currentSlideNumber;
      state.currentSlideNumber = slideNumber;

      // previous & next slides
      var hasPreviousSlides = !!slidesWrapper.querySelectorAll(settings.selectors.slides).length;
      var newSlide = slides[slideNumber - 1].cloneNode(true);

      // settings
      var cssProperty = settings.direction === "vertical" ? "margin-top" : "text-indent";
      var spaceProperty = settings.direction === "vertical" ? "Height" : "Width";
      var addPosition = undefined;

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
      var animateFromValue = undefined,
          animateToValue = undefined;

      if (addPosition === "before") {
        animateFromValue = -newSlide["client" + spaceProperty];
        animateToValue = 0;
      } else {
        animateFromValue = 0;
        animateToValue = -newSlide["client" + spaceProperty];
      }

      // animations
      var animation = undefined;

      if (!hasPreviousSlides) {
        animation = function () {
          return _this7.animate(newSlide, "opacity", 1, settings.fadeAnimationDuration);
        };
      } else {
        slidesWrapper.style[this.camelCaseString(cssProperty)] = animateFromValue + "px";

        animation = function () {
          newSlide.style.opacity = 1;

          return _this7.animate(slidesWrapper, cssProperty, animateToValue + "px", settings.slideAnimationDuration, { delay: 25 });
        };
      }

      // callback
      var callback = function callback() {
        var toRemove = _this7.childrenElements.slidesWrapper.querySelectorAll(settings.selectors.slides + ":not(.is-new)");

        [].slice.call(toRemove).forEach(function (n) {
          n.parentNode.removeChild(n);
        });

        _this7.childrenElements.slidesWrapper.style[_this7.camelCaseString(cssProperty)] = "0px";

        newSlide.classList.remove("is-new");

        return slideNumber;
      };

      // load new slide, execute animations and return promise
      var promise = this.loadSlides([newSlide]);

      if (!options.skipAnimations) {
        promise = promise.then(animation);
      } else {
        promise = promise.then(function () {
          newSlide.style.opacity = 1;
        });
      }

      return promise.then(callback);
    }
  }, {
    key: "transitionSystem__All__Setup",
    value: function transitionSystem__All__Setup() {
      var _this8 = this;

      var startIdx = this.__settings.startSlide - 1;
      var startSlide = this.childrenElements.slides[startIdx];

      this.loadSlides([startSlide]).then(function () {
        _this8.animate(startSlide, "opacity", 1, _this8.__settings.fadeAnimationDuration).then(function () {
          _this8.el.classList.add(_this8.__settings.loadedFirstClass);
          return _this8.goToSlide(_this8.__settings.startSlide, { skipAnimations: true });
        }).then(function () {
          return _this8.loadAllExceptStartSlide();
        }).then(function () {
          [].slice.call(_this8.childrenElements.slides).forEach(function (sE, idx) {
            if (idx !== startIdx) {
              _this8.animate(sE, "opacity", 1, _this8.__settings.fadeAnimationDuration, { delay: 25 });
            }
          });
        });
      });
    }
  }, {
    key: "transitionSystem__All",
    value: function transitionSystem__All(slideNumber, options) {
      var _this9 = this;

      var slides = this.childrenElements.slides;
      var slidesWrapper = this.childrenElements.slidesWrapper;
      var settings = this.__settings;
      var state = this.__state;
      var isVertical = settings.direction === "vertical";

      // slide numbers
      state.currentSlideNumber = slideNumber;

      // settings
      var cssProperty = isVertical ? "margin-top" : "text-indent";
      var offProperty = isVertical ? "offsetTop" : "offsetLeft";

      // animations — to
      var slide = slides[slideNumber - 1];
      var animateToValue = slides[0][offProperty] - slide[offProperty];

      // animations
      var animation = function animation() {
        return _this9.animate(slidesWrapper, cssProperty, animateToValue + "px", settings.slideAnimationDuration, { delay: 25 });
      };

      // load new slide, execute animations and return promise
      var promise = undefined;

      if (!options.skipAnimations) {
        promise = animation();
      } else {
        promise = new Promise(function (resolve) {
          slidesWrapper.style[_this9.camelCaseString(cssProperty)] = animateToValue + "px";
          resolve();
        });
      }

      return promise.then(function () {
        return slideNumber;
      });
    }
  }, {
    key: "bindEvents",

    /// Events
    ///
    value: function bindEvents() {
      if (!this.__state.eventsBounded) {
        this.el.addEventListener("mousedown", this.preventDefaultHandler);
        window.addEventListener("resize", this.windowResizeHandler);

        this.__state.eventsBounded = true;
      }
    }
  }, {
    key: "unbindEvents",
    value: function unbindEvents() {
      this.el.removeEventListener("mousedown", this.preventDefaultHandler);
      window.removeEventListener("resize", this.windowResizeHandler);

      this.__state.eventsBounded = false;
    }
  }, {
    key: "windowResizeHandler",
    value: function windowResizeHandler() {
      var newVersion = this.determineVersion();
      var currentVersion = this.__state.currentVersion;

      // reset
      this.__state.didSetHeight = false;

      if (newVersion !== currentVersion) {
        this.__state.currentVersion = newVersion;
        this.reprocess();
      } else {
        this.setHeightEqualToImageHeightIfNeeded({
          slideElement: this.childrenElements.slidesWrapper.querySelector(this.__settings.selectors.slides)
        });
      }
    }
  }, {
    key: "preventDefaultHandler",
    value: function preventDefaultHandler(event) {
      if (event.target.tagName === "IMG") event.preventDefault();
    }
  }, {
    key: "log",

    /// Logging & errors
    ///
    value: function log(message) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      var constructor = undefined;

      if (options.error) constructor = console.error;else if (options.warn) constructor = console.warn;else constructor = console.log;

      constructor("BareSlideshow: " + message);
    }
  }, {
    key: "throwError",
    value: function throwError(message) {
      throw "BareSlideshow: " + message;
    }
  }, {
    key: "camelCaseString",

    /// Helpers
    ///
    value: function camelCaseString() {
      var input = arguments.length <= 0 || arguments[0] === undefined ? "" : arguments[0];

      return input.toLowerCase().replace(/(-|_)(\w)/g, function (match, a, b) {
        return b.toUpperCase();
      });
    }
  }, {
    key: "titleCaseString",
    value: function titleCaseString() {
      var input = arguments.length <= 0 || arguments[0] === undefined ? "" : arguments[0];

      return this.camelCaseString(input).replace(/(^[a-z])/g, function (match, a) {
        return a.toUpperCase();
      });
    }
  }, {
    key: "getVendorPropertyName",
    value: function getVendorPropertyName(prop) {
      var div = document.createElement("div");

      if (prop in div.style) return prop;

      var prefixes = ["Moz", "Webkit", "O", "ms"];
      var prop_ = prop.charAt(0).toUpperCase() + prop.substr(1);

      for (var i = 0, j = prefixes.length; i < j; ++i) {
        var vendorProp = prefixes[i] + prop_;
        if (vendorProp in div.style) return vendorProp;
      }
    }
  }, {
    key: "debounce",
    value: function debounce(func, wait, immediate) {
      var timeout = undefined;
      return function () {
        var context = this,
            args = arguments;
        var later = function later() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    }
  }]);

  return BareSlideshow;
})();

exports["default"] = BareSlideshow;
module.exports = exports["default"];

},{}]},{},[1])(1)
});