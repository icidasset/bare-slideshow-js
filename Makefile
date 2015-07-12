.PHONY: build

# variables
BIN=./node_modules/.bin

# tasks
all: build

build:
	@mkdir -p dist
	@$(BIN)/browserify ./src/bare-slideshow.js --outfile ./dist/bare-slideshow.js --standalone BareSlideshow -t [ babelify --optional "es7.objectRestSpread,es7.functionBind" ]
