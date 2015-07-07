/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software" ),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Base class for widgets that need the following features:
//
// I. HTML prototype loading
//
// This class provides HTML prototype loading for widgets. That is, the widget implementation specifies its HTML portions
// in one continuous HTML snippet, and it optionally provides an object containing selectors into the various parts of the
// HTML snippet. This widget loads the HTML snippet into a jQuery object, and optionally assigns jQuery objects to each of
// the selectors in the optionally provided object.
//
// To use this functionality you can either derive from this class, or you can call its prototype's gtype method.
//
// 1. Widgets deriving from this class should define _htmlProto as part of their prototype declaration. _htmlProto looks like
// this:
//
// _htmlProto: {
//     source: string|jQuery object (optional) default: string - The name of the widget
//     ui: {
//         uiElement1: "#ui-element-1-selector",
//         uiElement2: "#ui-element-2-selector",
//         ...
//         subElement: {
//             subElement1: "#sub-element-1-selector",
//             subElement2: "#sub-element-2-selector",
//             ...
//         }
//         ...
//     }
// }
//
// If neither 'source' nor 'ui' are defined, you must still include an empty _htmlProto key (_htmlProto: {}) to indicate
// that you wish to make use of this feature. This will cause a prototype HTML file named after your widget to be loaded.
// The loaded prototype will be placed into your widget's prototype's _protoHtml.source key.
//
// If 'source' is defined as a string, it is the name of the widget (including namespace). This is the default. If your
// widget's HTML prototype is loaded via AJAX and the name of the AJAX file is different from the name of your widget
// (that is, it is not "<widgetName>.prototype.html", then you should explicitly define 'source' as:
//
// If you wish to load HTML prototypes via AJAX, modify the getProtoPath() function defined below to reflect the directory
// structure holding your widget HTML prototypes.
//
// source: "alternateWidgetName"
//
// If AJAX loading fails, source is set to a jQuery object containing a div with an error message. You can check whether
// loading failed via the jQuery object's jqmData( "tizen.widgetex.ajax.fail" ) data item. If false, then the jQuery object
// is the actual prototype loaded via AJAX or present inline. Otherwise, the jQuery object is the error message div.
//
// If 'source' is defined as a jQuery object, it is considered already loaded.
//
// if 'ui' is defined inside _htmlProto, It is assumed to be an object such that every one of its keys is either a string,
// or another object with the same properties as itself.
//
// When a widget is instantiated, the HTML prototype is loaded if not already present in the prototype. If 'ui' is present
// inside _htmlProto, the prototype is cloned. Then, a new structure is created based on 'ui' with each selector replaced
// by a jQuery object containing the results of performing .find() on the prototype's clone with the filter set to the
// value of the string. In the special case where the selector starts with a '#', the ID is removed from the element after
// it is assigned into the structure being created. This structure is then made accessible from the widget instance via
// the '_ui' key (i.e., this._ui).
//
// 2. Use the loadPrototype method when your widget does not derive from $.tizen.widgetex:
// Add _htmlProto to your widget's prototype as described above. Then, in your widget's _create() method, call
// loadPrototype in the following manner:
//
// $.tizen.widgetex.loadPrototype.call(this, "namespace.widgetName" );
//
// Thereafter, you may use the HTML prototype from your widget's prototype or, if you have specified a 'ui' key in your
// _htmlProto key, you may use this._ui from your widget instance.
//
// II. realize method
//
// When a widget is created, some of its properties cannot be set immediately, because they depend on the widths/heights
// of its constituent elements. They can only be calculated when the page containing the widget is made visible via the
// "pageshow" event, because widths/heights always evaluate to 0 when retrieved from a widget that is not visible. When
// you inherit from widgetex, you can add a "_realize" function to your prototype. This function will be called once right
// after _create() if the element that anchors your widget is on a visible page. Otherwise, it will be called when the
// page to which the widget belongs emits the "pageshow" event.
//
// NB: If your widget is inside a container which is itself not visible, such as an expandable or a collapsible, your
// widget will remain hidden even though "pageshow" is fired and therefore _realize is called. In this case, widths and
// heights will be unreliable even during _realize.
//
// III. systematic option handling
//
// If a widget has lots of options, the _setOption function can become a long switch for setting each recognized option.
// It is also tempting to allow options to determine the way a widget is created, by basing decisions on various options
// during _create(). Often, the actions based on option values in _create() are the same as those in _setOption. To avoid
// such code duplication, this class calls _setOption once for each option after _create() has completed.
//
// Furthermore, to avoid writing long switches in a widget's _setOption method, this class implements _setOption in such
// a way that, for any given option (e.g. "myOption" ), _setOption looks for a method _setMyOption in the widget's
// implementation, and if found, calls the method with the value of the option.
//
// If your widget does not inherit from widgetex, you can still use widgetex' systematic option handling:
// 1. define the _setOption method for your widget as follows:
//      _setOption: $.tizen.widgetex.prototype._setOption
// 2. Call this._setOptions(this.options) from your widget's _create() function.
// 3. As with widgetex-derived widgets, implement a corresponding _setMyOptionName function for each option myOptionName
// you wish to handle.
//
// IV. systematic value handling for input elements
//
// If your widget happens to be constructed from an <input> element, you have to handle the "value" attribute specially,
// and you have to emit the "change" signal whenever it changes, in addition to your widget's normal signals and option
// changes. With widgetex, you can assign one of your widget's "data-*" properties to be synchronized to the "value"
// property whenever your widget is constructed onto an <input> element. To do this, define, in your prototype:
//
// _value: {
//      attr: "data-my-attribute",
//      signal: "signal-to-emit"
// }
//
// Then, call this._setValue(newValue) whenever you wish to set the value for your widget. This will set the data-*
// attribute, emit the custom signal (if set) with the new value as its parameter, and, if the widget is based on an
// <input> element, it will also set the "value" attribute and emit the "change" signal.
//
// "attr" is required if you choose to define "_value", and identifies the data-attribute to set in addition to "value",
// if your widget's element is an input.
// "signal" is optional, and will be emitted when setting the data-attribute via this._setValue(newValue).
//
// If your widget does not derive from widgetex, you can still define "_value" as described above and call
// $.tizen.widgetex.setValue(widget, newValue).
//
// V. Systematic enabled/disabled handling for input elements
//
// widgetex implements _setDisabled which will disable the input associated with this widget, if any. Thus, if you derive
// from widgetex and you plan on implementing the disabled state, you should chain up to
// $.tizen.widgetex.prototype._setDisabled(value), rather than $.Widget.prototype._setOption( "disabled", value).

(function ($, undefined) {

// Framework-specific HTML prototype path for AJAX loads
	function getProtoPath() {
		var theScriptTag = $( "script[data-framework-version][data-framework-root][data-framework-theme]" );

		return (theScriptTag.attr( "data-framework-root" ) + "/" +
				theScriptTag.attr( "data-framework-version" ) + "/themes/" +
				theScriptTag.attr( "data-framework-theme" ) + "/proto-html" );
	}

	$.widget( "tizen.widgetex", $.mobile.widget, {
		_createWidget: function () {
			$.tizen.widgetex.loadPrototype.call( this, this.namespace + "." + this.widgetName );
			$.mobile.widget.prototype._createWidget.apply( this, arguments );
		},

		_init: function () {
			// TODO THIS IS TEMPORARY PATCH TO AVOID CTXPOPUP PAGE CRASH
			if ( this.element === undefined ) {
				return;
			}

			var page = this.element.closest( ".ui-page" ),
				self = this,
				myOptions = {};

			if ( page.is( ":visible" ) ) {
				this._realize();
			} else {
				page.bind( "pageshow", function () { self._realize(); } );
			}

			$.extend( myOptions, this.options );

			this.options = {};

			this._setOptions( myOptions );
		},

		_getCreateOptions: function () {
			// if we're dealing with an <input> element, value takes precedence over corresponding data-* attribute, if a
			// mapping has been established via this._value. So, assign the value to the data-* attribute, so that it may
			// then be assigned to this.options in the superclass' _getCreateOptions

			if (this.element.is( "input" ) && this._value !== undefined) {
				var theValue =
					( ( this.element.attr( "type" ) === "checkbox" || this.element.attr( "type" ) === "radio" )
							? this.element.is( ":checked" )
									: this.element.is( "[value]" )
									? this.element.attr( "value" )
											: undefined);

				if ( theValue != undefined ) {
					this.element.attr( this._value.attr, theValue );
				}
			}

			return $.mobile.widget.prototype._getCreateOptions.apply( this, arguments );
		},

		_setOption: function ( key, value ) {
			var setter = "_set" + key.replace(/^[a-z]/, function (c) { return c.toUpperCase(); } );

			if ( this[setter] !== undefined ) {
				this[setter]( value );
			} else {
				$.mobile.widget.prototype._setOption.apply( this, arguments );
			}
		},

		_setDisabled: function ( value ) {
			$.Widget.prototype._setOption.call( this, "disabled", value );
			if ( this.element.is( "input" ) ) {
				this.element.attr( "disabled", value );
			}
		},

		_setValue: function ( newValue ) {
			$.tizen.widgetex.setValue( this, newValue );
		},

		_realize: function () {}
	} );

	$.tizen.widgetex.setValue = function ( widget, newValue ) {
		if ( widget._value !== undefined ) {
			var valueString = ( widget._value.makeString ? widget._value.makeString(newValue) : newValue ),
				inputType;

			widget.element.attr( widget._value.attr, valueString );
			if ( widget._value.signal !== undefined ) {
				widget.element.triggerHandler( widget._value.signal, newValue );
			}

			if ( widget.element.is( "input" ) ) {
				inputType = widget.element.attr( "type" );

				// Special handling for checkboxes and radio buttons, where the presence of the "checked" attribute is really
				// the value
				if ( inputType === "checkbox" || inputType === "radio" ) {
					if ( newValue ) {
						widget.element.attr( "checked", true );
					} else {
						widget.element.removeAttr( "checked" );
					}
				} else {
					widget.element.attr( "value", valueString );
				}

				widget.element.trigger( "change" );
			}
		}
	};

	$.tizen.widgetex.assignElements = function (proto, obj) {
		var ret = {},
			key;

		for ( key in obj ) {
			if ( ( typeof obj[key] ) === "string" ) {
				ret[key] = proto.find( obj[key] );
				if ( obj[key].match(/^#/) ) {
					ret[key].removeAttr( "id" );
				}
			} else {
				if ( (typeof obj[key]) === "object" ) {
					ret[key] = $.tizen.widgetex.assignElements( proto, obj[key] );
				}
			}
		}

		return ret;
	};

	$.tizen.widgetex.loadPrototype = function ( widget, ui ) {
		var ar = widget.split( "." ),
			namespace,
			widgetName,
			source,
			noSource = false,
			htmlProto,
			protoPath;

		if ( ar.length == 2 ) {
			namespace = ar[0];
			widgetName = ar[1];

			// If htmlProto is defined
			if ( $[namespace][widgetName].prototype._htmlProto !== undefined ) {
				// If no source is defined, use the widget name
				source = $[namespace][widgetName].prototype._htmlProto.source;
				if ( source === undefined ) {
					source = widgetName;
					noSource = true;
				}

				// Load the HTML prototype via AJAX if not defined inline
				if ( typeof source === "string" ) {
					if ( noSource ) {	// use external htmlproto file
						// Establish the path for the proto file
						widget = source;
						protoPath = getProtoPath();

						// Make the AJAX call
						$.ajax( {
							url: protoPath + "/" + widget + ".prototype.html",
							async: false,
							dataType: "html"
						}).success( function (data, textStatus, jqXHR ) {
							source = $( "<div></div>" ).html(data).jqmData( "tizen.widgetex.ajax.fail", false );
						} );

						// Assign the HTML proto to the widget prototype
						source  = $( "<div></div>" )
							.text( "Failed to load proto for widget " + namespace + "." + widgetName + "!" )
							.css( {background: "red", color: "blue", border: "1px solid black"} )
							.jqmData( "tizen.widgetex.ajax.fail", true );

					} else {
						// inline definition (string)
						source = $( source ).jqmData( "tizen.widgetex.ajax.fail", false );
					}

				} else {
					// inline definition (object)
					// AJAX loading has trivially succeeded, since there was no AJAX loading at all
					source.jqmData( "tizen.widgetex.ajax.fail", false );
				}
				htmlProto = source;
				$[namespace][widgetName].prototype._htmlProto.source = source;

				// If there's a "ui" portion in the HTML proto, copy it over to this instance, and
				// replace the selectors with the selected elements from a copy of the HTML prototype
				if ( $[namespace][widgetName].prototype._htmlProto.ui !== undefined ) {
					// Assign the relevant parts of the proto
					$.extend( this, {
						_ui: $.tizen.widgetex.assignElements( htmlProto.clone(), $[namespace][widgetName].prototype._htmlProto.ui )
					});
				}
			}
		}
	};

}( jQuery ) );
/**
	@class Button
	The button widget shows a control on the screen that you can use to generate an action event when it is pressed and released. This widget is coded with standard HTML anchor and input elements and then enhanced by jQueryMobile to make it more attractive and usable on a mobile device. Buttons can be used in Tizen as described in the jQueryMobile documentation for buttons.

	To add a button widget to the application, use the following code

		<div data-role="button" data-inline="true">Text Button Test</div>
		<div data-role="button" data-inline="true" data-icon="plus" data-style="circle"></div>
		<div data-role="button" data-inline="true" data-icon="plus" data-style="nobg"></div>

	The button can define callbacks for events as described in the jQueryMobile documentation for button events.<br/>
	You can use methods with the button as described in the jQueryMobile documentation for button methods.
*/

/**
	@property {String} data-style
	Defines the button style. <br/> The default value is box. If the value is set to circle, a circle-shaped button is created. If the value is set to nobg, a button is created without a background.

*/
/**
	@property {String} data-icon
	Defines an icon for a button. Tizen supports 12 icon styles: reveal, closed, opened, info, rename, call, warning, plus, minus, cancel, send, and favorite.

*/
/**
	@class Checkbox
	The check box widget shows a list of options on the screen where one or more can be selected. Check boxes can be used in Tizen as described in the jQueryMobile documentation for check boxes.<br/> To add a check box widget to the application, use the following code:

		<input type="checkbox" name="mycheck" id="check-test" class="favorite" />
		<label for="check-test">Favorite</label>
		<input type="checkbox" name="check-favorite" id="check-test2" checked="checked" disabled="disabled" class="favorite" />
		<label for="check-test2">Favorite Checked, Disabled</label>

	The check box can define callbacks for events as described in the jQueryMobile documentation for check box events.
	You can use methods with the check box as described in the jQueryMobile documentation for check box methods.

*/
/**
	@property {String} class
	Defines the check box style. <br/> The default value is check. If the value is set to favorite, a star-shaped check box is created.
*/
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software" ),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// most of following codes are derived from jquery.mobile.scrollview.js
(function ( $, window, document, undefined ) {

	function circularNum( num, total ) {
		var n = num % total;
		if ( n < 0 ) {
			n = total + n;
		}
		return n;
	}

	function setElementTransform( $ele, x, y ) {
		var v = "translate3d( " + x + "," + y + ", 0px)";
		$ele.css({
			"-ms-transform": v,
			"-o-transform": v,
			"-moz-transform": v,
			"-webkit-transform": v,
			"transform": v
		} );
	}

	function MomentumTracker( options ) {
		this.options = $.extend( {}, options );
		this.easing = "easeOutQuad";
		this.reset();
	}

	var tstates = {
		scrolling : 0,
		done : 1
	};

	function getCurrentTime() {
		return Date.now();
	}

	$.extend( MomentumTracker.prototype, {
		start: function ( pos, speed, duration ) {
			this.state = ( speed != 0 ) ? tstates.scrolling : tstates.done;
			this.pos = pos;
			this.speed = speed;
			this.duration = duration;

			this.fromPos = 0;
			this.toPos = 0;

			this.startTime = getCurrentTime();
		},

		reset: function () {
			this.state = tstates.done;
			this.pos = 0;
			this.speed = 0;
			this.duration = 0;
		},

		update: function () {
			var state = this.state,
				duration,
				elapsed,
				dx,
				x;

			if ( state == tstates.done ) {
				return this.pos;
			}

			duration = this.duration;
			elapsed = getCurrentTime() - this.startTime;
			elapsed = elapsed > duration ? duration : elapsed;

			dx = this.speed * ( 1 - $.easing[this.easing](elapsed / duration, elapsed, 0, 1, duration ) );

			x = this.pos + dx;
			this.pos = x;

			if ( elapsed >= duration ) {
				this.state = tstates.done;
			}

			return this.pos;
		},

		done: function () {
			return this.state == tstates.done;
		},

		getPosition: function () {
			return this.pos;
		}
	} );

	jQuery.widget( "mobile.circularview", jQuery.mobile.widget, {
		options: {
			fps:				60,

			scrollDuration:		2000,

			moveThreshold:		10,
			moveIntervalThreshold:	150,

			startEventName:		"scrollstart",
			updateEventName:	"scrollupdate",
			stopEventName:		"scrollstop",

			eventType:			$.support.touch	? "touch" : "mouse",

			delayedClickSelector: "a, .ui-btn",
			delayedClickEnabled: false
		},

		_makePositioned: function ( $ele ) {
			if ( $ele.css( 'position' ) == 'static' ) {
				$ele.css( 'position', 'relative' );
			}
		},

		_create: function () {
			var self = this;

			this._items = $( this.element ).jqmData('list');
			this._$clip = $( this.element ).addClass( "ui-scrollview-clip" );
			this._$clip.wrapInner( '<div class="ui-scrollview-view"></div>' );
			this._$view = $('.ui-scrollview-view', this._$clip );
			this._$list = $( 'ul', this._$clip );

			this._$clip.css( "overflow", "hidden" );
			this._makePositioned( this._$clip );

			this._$view.css( "overflow", "hidden" );
			this._tracker = new MomentumTracker( this.options );

			this._timerInterval = 1000 / this.options.fps;
			this._timerID = 0;

			this._timerCB = function () { self._handleMomentumScroll(); };

			this.refresh();

			this._addBehaviors();
		},

		reflow: function () {
			var xy = this.getScrollPosition();
			this.refresh();
			this.scrollTo( xy.x, xy.y );
		},

		refresh: function () {
			var itemsPerView;

			this._$clip.width( $(window).width() );
			this._clipWidth = this._$clip.width();
			this._$list.empty();
			this._$list.append(this._items[0]);
			this._itemWidth = $(this._items[0]).outerWidth();
			$(this._items[0]).detach();

			itemsPerView = this._clipWidth / this._itemWidth;
			itemsPerView = Math.ceil( itemsPerView * 10 ) / 10;
			this._itemsPerView = parseInt( itemsPerView, 10 );
			while ( this._itemsPerView + 1 > this._items.length ) {
				$.merge( this._items, $(this._items).clone() );
			}
			this._rx = -this._itemWidth;
			this._sx = -this._itemWidth;
			this._setItems();
		},

		_startMScroll: function ( speedX, speedY ) {
			this._stopMScroll();

			var keepGoing = false,
				duration = this.options.scrollDuration,
				t = this._tracker,
				c = this._clipWidth,
				v = this._viewWidth;

			this._$clip.trigger( this.options.startEventName);

			t.start( this._rx, speedX, duration, (v > c ) ? -(v - c) : 0, 0 );
			keepGoing = !t.done();

			if ( keepGoing ) {
				this._timerID = setTimeout( this._timerCB, this._timerInterval );
			} else {
				this._stopMScroll();
			}
			//console.log( "startmscroll" + this._rx + "," + this._sx );
		},

		_stopMScroll: function () {
			if ( this._timerID ) {
				this._$clip.trigger( this.options.stopEventName );
				clearTimeout( this._timerID );
			}

			this._timerID = 0;

			if ( this._tracker ) {
				this._tracker.reset();
			}
			//console.log( "stopmscroll" + this._rx + "," + this._sx );
		},

		_handleMomentumScroll: function () {
			var keepGoing = false,
				v = this._$view,
				x = 0,
				y = 0,
				t = this._tracker;

			if ( t ) {
				t.update();
				x = t.getPosition();

				keepGoing = !t.done();

			}

			this._setScrollPosition( x, y );
			this._rx = x;

			this._$clip.trigger( this.options.updateEventName, [ { x: x, y: y } ] );

			if ( keepGoing ) {
				this._timerID = setTimeout( this._timerCB, this._timerInterval );
			} else {
				this._stopMScroll();
			}
		},

		_setItems: function () {
			var i,
				$item;

			for ( i = -1; i < this._itemsPerView + 1; i++ ) {
				$item = this._items[ circularNum( i, this._items.length ) ];
				this._$list.append( $item );
			}
			setElementTransform( this._$view, this._sx + "px", 0 );
			this._$view.width( this._itemWidth * ( this._itemsPerView + 2 ) );
			this._viewWidth = this._$view.width();
		},

		_setScrollPosition: function ( x, y ) {
			var sx = this._sx,
				dx = x - sx,
				di = parseInt( dx / this._itemWidth, 10 ),
				i,
				idx,
				$item;

			if ( di > 0 ) {
				for ( i = 0; i < di; i++ ) {
					this._$list.children().last().detach();
					idx = -parseInt( ( sx / this._itemWidth ) + i + 3, 10 );
					$item = this._items[ circularNum( idx, this._items.length ) ];
					this._$list.prepend( $item );
					//console.log( "di > 0 : " + idx );
				}
			} else if ( di < 0 ) {
				for ( i = 0; i > di; i-- ) {
					this._$list.children().first().detach();
					idx = this._itemsPerView - parseInt( ( sx / this._itemWidth ) + i, 10 );
					$item = this._items[ circularNum( idx, this._items.length ) ];
					this._$list.append( $item );
					//console.log( "di < 0 : " + idx );
				}
			}

			this._sx += di * this._itemWidth;

			setElementTransform( this._$view, ( x - this._sx - this._itemWidth ) + "px", 0 );

			//console.log( "rx " + this._rx + "sx " + this._sx );
		},

		_enableTracking: function () {
			$(document).bind( this._dragMoveEvt, this._dragMoveCB );
			$(document).bind( this._dragStopEvt, this._dragStopCB );
		},

		_disableTracking: function () {
			$(document).unbind( this._dragMoveEvt, this._dragMoveCB );
			$(document).unbind( this._dragStopEvt, this._dragStopCB );
		},

		_getScrollHierarchy: function () {
			var svh = [],
				d;
			this._$clip.parents( '.ui-scrollview-clip' ).each( function () {
				d = $( this ).jqmData( 'circulaview' );
				if ( d ) {
					svh.unshift( d );
				}
			} );
			return svh;
		},

		centerTo: function ( selector, duration ) {
			var i,
				newX;

			for ( i = 0; i < this._items.length; i++ ) {
				if ( $( this._items[i]).is( selector ) ) {
					newX = -( i * this._itemWidth - this._clipWidth / 2 + this._itemWidth * 1.5 );
					this.scrollTo( newX + this._itemWidth, 0 );
					this.scrollTo( newX, 0, duration );
					return;
				}
			}
		},

		scrollTo: function ( x, y, duration ) {
			this._stopMScroll();
			if ( !duration ) {
				this._setScrollPosition( x, y );
				this._rx = x;
				return;
			}

			var self = this,
				start = getCurrentTime(),
				efunc = $.easing.easeOutQuad,
				sx = this._rx,
				sy = 0,
				dx = x - sx,
				dy = 0,
				tfunc,
				elapsed,
				ec;

			this._rx = x;

			tfunc = function () {
				elapsed = getCurrentTime() - start;
				if ( elapsed >= duration ) {
					self._timerID = 0;
					self._setScrollPosition( x, y );
					self._$clip.trigger("scrollend");
				} else {
					ec = efunc( elapsed / duration, elapsed, 0, 1, duration );
					self._setScrollPosition( sx + ( dx * ec ), sy + ( dy * ec ) );
					self._timerID = setTimeout( tfunc, self._timerInterval );
				}
			};

			this._timerID = setTimeout( tfunc, this._timerInterval );
		},

		getScrollPosition: function () {
			return { x: -this._rx, y: 0 };
		},

		_handleDragStart: function ( e, ex, ey ) {
			$.each( this._getScrollHierarchy(), function ( i, sv ) {
				sv._stopMScroll();
			} );

			this._stopMScroll();

			if ( this.options.delayedClickEnabled ) {
				this._$clickEle = $( e.target ).closest( this.options.delayedClickSelector );
			}
			this._lastX = ex;
			this._lastY = ey;
			this._speedX = 0;
			this._speedY = 0;
			this._didDrag = false;

			this._lastMove = 0;
			this._enableTracking();

			this._ox = ex;
			this._nx = this._rx;

			if ( this.options.eventType == "mouse" || this.options.delayedClickEnabled ) {
				e.preventDefault();
			}
			//console.log( "scrollstart" + this._rx + "," + this._sx );
			e.stopPropagation();
		},

		_handleDragMove: function ( e, ex, ey ) {
			this._lastMove = getCurrentTime();

			var dx = ex - this._lastX,
				dy = ey - this._lastY;

			this._speedX = dx;
			this._speedY = 0;

			this._didDrag = true;

			this._lastX = ex;
			this._lastY = ey;

			this._mx = ex - this._ox;

			this._setScrollPosition( this._nx + this._mx, 0 );

			//console.log( "scrollmove" + this._rx + "," + this._sx );
			return false;
		},

		_handleDragStop: function ( e ) {
			var l = this._lastMove,
				t = getCurrentTime(),
				doScroll = l && ( t - l ) <= this.options.moveIntervalThreshold,
				sx = ( this._tracker && this._speedX && doScroll ) ? this._speedX : 0,
				sy = 0;

			this._rx = this._mx ? this._nx + this._mx : this._rx;

			if ( sx ) {
				this._startMScroll( sx, sy );
			}

			//console.log( "scrollstop" + this._rx + "," + this._sx );

			this._disableTracking();

			if ( !this._didDrag && this.options.delayedClickEnabled && this._$clickEle.length ) {
				this._$clickEle
					.trigger( "mousedown" )
					.trigger( "mouseup" )
					.trigger( "click" );
			}

			if ( this._didDrag ) {
				e.preventDefault();
				e.stopPropagation();
			}

			return this._didDrag ? false : undefined;
		},

		_addBehaviors: function () {
			var self = this;

			if ( this.options.eventType === "mouse" ) {
				this._dragStartEvt = "mousedown";
				this._dragStartCB = function ( e ) {
					return self._handleDragStart( e, e.clientX, e.clientY );
				};

				this._dragMoveEvt = "mousemove";
				this._dragMoveCB = function ( e ) {
					return self._handleDragMove( e, e.clientX, e.clientY );
				};

				this._dragStopEvt = "mouseup";
				this._dragStopCB = function ( e ) {
					return self._handleDragStop( e );
				};

				this._$view.bind( "vclick", function (e) {
					return !self._didDrag;
				} );

			} else { //touch
				this._dragStartEvt = "touchstart";
				this._dragStartCB = function ( e ) {
					var t = e.originalEvent.targetTouches[0];
					return self._handleDragStart(e, t.pageX, t.pageY );
				};

				this._dragMoveEvt = "touchmove";
				this._dragMoveCB = function ( e ) {
					var t = e.originalEvent.targetTouches[0];
					return self._handleDragMove(e, t.pageX, t.pageY );
				};

				this._dragStopEvt = "touchend";
				this._dragStopCB = function ( e ) {
					return self._handleDragStop( e );
				};
			}
			this._$view.bind( this._dragStartEvt, this._dragStartCB );
		}
	} );

	$( document ).bind( "pagecreate create", function ( e ) {
		$( $.mobile.circularview.prototype.options.initSelector, e.target ).circularview();
	} );

}( jQuery, window, document ) ); // End Component
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Ensure that the given namespace is defined. If not, define it to be an empty object.
// This is kinda like the mkdir -p command.

function ensureNS(ns) {
    var nsAr = ns.split("."),
    nsSoFar = "";

    for (var Nix in nsAr) {
        nsSoFar = nsSoFar + (Nix > 0 ? "." : "") + nsAr[Nix];
        eval (nsSoFar + " = " + nsSoFar + " || {};");
    }
}
/*
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

// Add markup for labels

(function($, undefined) {

$(document).bind("pagecreate create", function(e) {
    $(":jqmData(role='label')", e.target).not(":jqmData(role='none'), :jqmData(role='nojs')").each(function() {
        $(this).addClass("jquery-mobile-ui-label")
               .html($("<span>", {"class": "jquery-mobile-ui-label-text"}).text($(this).text()));
    });
});

})(jQuery);
ensureNS("jQuery.mobile.tizen.clrlib");

jQuery.extend( jQuery.mobile.tizen.clrlib, 
{
    nearestInt: function(val) { 
        var theFloor = Math.floor(val);

        return (((val - theFloor) > 0.5) ? (theFloor + 1) : theFloor);
    },

    /*
     * Converts html color string to rgb array.
     *
     * Input: string clr_str, where
     * clr_str is of the form "#aabbcc"
     *
     * Returns: [ r, g, b ], where
     * r is in [0, 1]
     * g is in [0, 1]
     * b is in [0, 1]
     */
    HTMLToRGB: function(clr_str) {
        clr_str = (('#' == clr_str.charAt(0)) ? clr_str.substring(1) : clr_str);

        return ([
            clr_str.substring(0, 2),
            clr_str.substring(2, 4),
            clr_str.substring(4, 6)
            ].map(function(val) {
                return parseInt(val, 16) / 255.0;
            }));
    },

    /*
     * Converts rgb array to html color string.
     *
     * Input: [ r, g, b ], where
     * r is in [0, 1]
     * g is in [0, 1]
     * b is in [0, 1]
     *
     * Returns: string of the form "#aabbcc"
     */
    RGBToHTML: function(rgb) {
        return ("#" + 
            rgb.map(function(val) {
                      var ret = val * 255,
                          theFloor = Math.floor(ret);

                      ret = ((ret - theFloor > 0.5) ? (theFloor + 1) : theFloor);
                      ret = (((ret < 16) ? "0" : "") + (ret & 0xff).toString(16));
                      return ret;
                  })
               .join(""));
    },

    /*
     * Converts hsl to rgb.
     *
     * From http://130.113.54.154/~monger/hsl-rgb.html
     *
     * Input: [ h, s, l ], where
     * h is in [0, 360]
     * s is in [0,   1]
     * l is in [0,   1]
     *
     * Returns: [ r, g, b ], where
     * r is in [0, 1]
     * g is in [0, 1]
     * b is in [0, 1]
     */
    HSLToRGB: function(hsl) {
        var h = hsl[0] / 360.0, s = hsl[1], l = hsl[2];

        if (0 === s)
            return [ l, l, l ];

        var temp2 = ((l < 0.5)
                ? l * (1.0 + s)
                : l + s - l * s),
            temp1 = 2.0 * l - temp2,
            temp3 = {
                r: h + 1.0 / 3.0,
                g: h,
                b: h - 1.0 / 3.0
            };

        temp3.r = ((temp3.r < 0) ? (temp3.r + 1.0) : ((temp3.r > 1) ? (temp3.r - 1.0) : temp3.r));
        temp3.g = ((temp3.g < 0) ? (temp3.g + 1.0) : ((temp3.g > 1) ? (temp3.g - 1.0) : temp3.g));
        temp3.b = ((temp3.b < 0) ? (temp3.b + 1.0) : ((temp3.b > 1) ? (temp3.b - 1.0) : temp3.b));

        ret = [
            (((6.0 * temp3.r) < 1) ? (temp1 + (temp2 - temp1) * 6.0 * temp3.r) :
            (((2.0 * temp3.r) < 1) ? temp2 :
            (((3.0 * temp3.r) < 2) ? (temp1 + (temp2 - temp1) * ((2.0 / 3.0) - temp3.r) * 6.0) :
             temp1))),
            (((6.0 * temp3.g) < 1) ? (temp1 + (temp2 - temp1) * 6.0 * temp3.g) :
            (((2.0 * temp3.g) < 1) ? temp2 :
            (((3.0 * temp3.g) < 2) ? (temp1 + (temp2 - temp1) * ((2.0 / 3.0) - temp3.g) * 6.0) :
             temp1))),
            (((6.0 * temp3.b) < 1) ? (temp1 + (temp2 - temp1) * 6.0 * temp3.b) :
            (((2.0 * temp3.b) < 1) ? temp2 :
            (((3.0 * temp3.b) < 2) ? (temp1 + (temp2 - temp1) * ((2.0 / 3.0) - temp3.b) * 6.0) :
             temp1)))]; 

        return ret;
    },

    /*
     * Converts hsv to rgb.
     *
     * Input: [ h, s, v ], where
     * h is in [0, 360]
     * s is in [0,   1]
     * v is in [0,   1]
     *
     * Returns: [ r, g, b ], where
     * r is in [0, 1]
     * g is in [0, 1]
     * b is in [0, 1]
     */
    HSVToRGB: function(hsv) {
        return $.mobile.tizen.clrlib.HSLToRGB($.mobile.tizen.clrlib.HSVToHSL(hsv));
    },

    /*
     * Converts rgb to hsv.
     *
     * from http://coecsl.ece.illinois.edu/ge423/spring05/group8/FinalProject/HSV_writeup.pdf
     *
     * Input: [ r, g, b ], where
     * r is in [0,   1]
     * g is in [0,   1]
     * b is in [0,   1]
     *
     * Returns: [ h, s, v ], where
     * h is in [0, 360]
     * s is in [0,   1]
     * v is in [0,   1]
     */
    RGBToHSV: function(rgb) {
        var min, max, delta, h, s, v, r = rgb[0], g = rgb[1], b = rgb[2];

        min = Math.min(r, Math.min(g, b));
        max = Math.max(r, Math.max(g, b));
        delta = max - min;

        h = 0;
        s = 0;
        v = max;

        if (delta > 0.00001) {
            s = delta / max;

            if (r === max)
                h = (g - b) / delta ;
            else
            if (g === max)
                h = 2 + (b - r) / delta ;
            else
                h = 4 + (r - g) / delta ;

            h *= 60 ;

            if (h < 0)
                h += 360 ;
        }

        return [h, s, v];
    },

    /*
     * Converts hsv to hsl.
     *
     * Input: [ h, s, v ], where
     * h is in [0, 360]
     * s is in [0,   1]
     * v is in [0,   1]
     *
     * Returns: [ h, s, l ], where
     * h is in [0, 360]
     * s is in [0,   1]
     * l is in [0,   1]
     */
    HSVToHSL: function(hsv) {
        var max = hsv[2],
            delta = hsv[1] * max,
            min = max - delta,
            sum = max + min,
            half_sum = sum / 2,
            s_divisor = ((half_sum < 0.5) ? sum : (2 - max - min));

        return [ hsv[0], ((0 == s_divisor) ? 0 : (delta / s_divisor)), half_sum ];
    },

    /*
     * Converts rgb to hsl
     *
     * Input: [ r, g, b ], where
     * r is in [0,   1]
     * g is in [0,   1]
     * b is in [0,   1]
     *
     * Returns: [ h, s, l ], where
     * h is in [0, 360]
     * s is in [0,   1]
     * l is in [0,   1]
     */
    RGBToHSL: function(rgb) {
        return $.mobile.tizen.clrlib.HSVToHSL($.mobile.tizen.clrlib.RGBToHSV(rgb));
    }
});
/*
 * set TIZEN specific configures
 */

( function( $, window, undefined ) {

	/* set default transition */
	$.mobile.defaultPageTransition = "none";

	/* depth transition */
	$.mobile.transitionHandlers.depth = $.mobile.transitionHandlers.simultaneous;
	$.mobile.transitionFallbacks.depth = "fade";

	/* Button data-corners default value */
	$.fn.buttonMarkup.defaults.corners = false;

	/* button hover delay */
	$.mobile.buttonMarkup.hoverDelay = 0;

})( jQuery, this );
/*
 * jQuery Mobile Widget @VERSION
 *
 * TODO: remove unnecessary codes....
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 * 
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Kalyan Kondapally <kalyan.kondapally@intel.com>
 */

ensureNS("jQuery.mobile.tizen");

(function () {
jQuery.extend(jQuery.mobile.tizen, {
    disableSelection: function (element) {
	var self = this;
	$(element).find('*').each( function() {
		if( ( $(this).get(0).tagName !== 'INPUT' &&
			$(this).attr("type") !== 'text' ) &&
			$(this).get(0).tagName !== 'TEXTAREA' ) {
			self.enableSelection( this, 'none' );
		}
	} );
	return true;
    },

    enableSelection: function (element, value) {
        return $(element).each( function () {
		switch( value ) {
			case 'text' :
			case 'auto' :
			case 'none' :
				val = value;
			break;

			default :
				val = 'auto';
			break;
		}
            $(this).css( {
			'user-select': val,
			'-moz-user-select': val,
			'-webkit-user-select': val,
			'-o-user-select': val,
			'-ms-transform': val
			} );
        } );
    },

    disableContextMenu: function(element) {
	var self = this;
	$(element).find('*').each( function() {
		if( ( $(this).get(0).tagName !== 'INPUT' &&
			$(this).attr("type") !== 'text' ) &&
			$(this).get(0).tagName !== 'TEXTAREA' ) {
			self._disableContextMenu( this );
		}
	} );
    },

    _disableContextMenu: function(element) {

	$(element).each( function() {
		$(this).bind("contextmenu", function( event ) {
			return false;
		} );
	} );
    },

    enableContextMenu: function(element) {
	$(element).each( function() {
		$(this).unbind( "contextmenu" );
	} );
    },

    // Get document-relative mouse coordinates from a given event
    // From: http://www.quirksmode.org/js/events_properties.html#position
    documentRelativeCoordsFromEvent: function(ev) {
        var e = ev ? ev : window.event,
            client = { x: e.clientX, y: e.clientY },
            page   = { x: e.pageX,   y: e.pageY   },
            posx = 0,
            posy = 0;

        // Grab useful coordinates from touch events
        if (e.type.match(/^touch/)) {
            page = {
                x: e.originalEvent.targetTouches[0].pageX,
                y: e.originalEvent.targetTouches[0].pageY
            };
            client = {
                x: e.originalEvent.targetTouches[0].clientX,
                y: e.originalEvent.targetTouches[0].clientY
            };
        }

        if (page.x || page.y) {
            posx = page.x;
            posy = page.y;
        }
        else
        if (client.x || client.y) {
            posx = client.x + document.body.scrollLeft + document.documentElement.scrollLeft;
            posy = client.y + document.body.scrollTop  + document.documentElement.scrollTop;
        }

        return { x: posx, y: posy };
    },

	// TODO : offsetX, offsetY. touch events don't have offsetX and offsetY. support for touch devices.
    // check algorithm...
    targetRelativeCoordsFromEvent: function(e) {
        var coords = { x: e.offsetX, y: e.offsetY };

        if (coords.x === undefined || isNaN(coords.x) ||
            coords.y === undefined || isNaN(coords.y)) {
            var offset = $(e.target).offset();
            //coords = documentRelativeCoordsFromEvent(e);	// Old code. Must be checked again.
            coords = $.mobile.tizen.documentRelativeCoordsFromEvent(e);
            coords.x -= offset.left;
            coords.y -= offset.top;
        }

        return coords;
    }
});

})();
(function($, undefined) {

ensureNS("jQuery.mobile.tizen");

jQuery.extend( jQuery.mobile.tizen,
{
    _widgetPrototypes: {},

    /*
     * load the prototype for a widget.
     *
     * If @widget is a string, the function looks for @widget.prototype.html in the proto-html/ subdirectory of the
     * framework's current theme and loads the file via AJAX into a string. Note that the file will only be loaded via
     * AJAX once. If two widget instances based on the same @widget value are to be constructed, the second will be
     * constructed from the cached copy of the prototype of the first instance.
     *
     * If @widget is not a string, it is assumed to be a hash containing at least one key, "proto", the value of which is
     * the string to be used for the widget prototype. if another key named "key" is also provided, it will serve as the
     * key under which to cache the prototype, so it need not be rendered again in the future.
     *
     * Given the string for the widget prototype, the following patterns occurring in the string are replaced:
     *
     *   "${FRAMEWORK_ROOT}" - replaced with the path to the root of the framework
     *
     * The function then creates a jQuery $("<div>") object containing the prototype from the string.
     *
     * If @ui is not provided, the jQuery object containing the prototype is returned.
     *
     * If @ui is provided, it is assumed to be a (possibly multi-level) hash containing CSS selectors. For every level of
     * the hash and for each string-valued key at that level, the CSS selector specified as the value is sought in the
     * prototype jQuery object and, if found, the value of the key is replaced with the jQuery object resulting from the
     * search. Additionally, if the CSS selector is of the form "#widgetid", the "id" attribute will be removed from the
     * elements contained within the resulting jQuery object. The resulting hash is returned.
     *
     * Examples:
     *
     * 1.
     * $.mobile.tizen.loadPrototype("mywidget") => Returns a <div> containing the structure from the file
     * mywidget.prototype.html located in the current theme folder of the current framework.
     *
     * 2. $.mobile.tizen.loadPrototype("mywidget", ui):
     * where ui is a hash that looks like this:
     * ui = {
     *   element1: "<css selector 1>",
     *   element2: "<css selector 2>",
     *   group1: {
     *     group1element1: "<css selector 3>",
     *     group1element1: "<css selector 4>"
     *   }
     *  ...
     * }
     *
     * In this case, after loading the prototype as in Example 1, loadPrototype will traverse @ui and replace the CSS
     * selector strings with the result of the search for the selector string upon the prototype. If any of the CSS
     * selectors are of the form "#elementid" then the "id" attribute will be stripped from the elements selected. This
     * means that they will no longer be accessible via the selector used initially. @ui is then returned thus modified.
     */

    loadPrototype: function(widget, ui) {
        var ret = undefined,
            theScriptTag = $("script[data-framework-version][data-framework-root][data-framework-theme]"),
            frameworkRootPath = theScriptTag.attr("data-framework-root")    + "/" +
                                theScriptTag.attr("data-framework-version") + "/";

        function replaceVariables(s) {
            return s.replace(/\$\{FRAMEWORK_ROOT\}/g, frameworkRootPath);
        }

        function fillObj(obj, uiProto) {
            var selector;

            for (var key in obj) {
                if (typeof obj[key] === "string") {
                    selector = obj[key];
                    obj[key] = uiProto.find(obj[key]);
                    if (selector.substring(0, 1) === "#")
                        obj[key].removeAttr("id");
                }
                else
                if (typeof obj[key] === "object")
                    obj[key] = fillObj(obj[key], uiProto);
            }
            return obj;
        }

        /* If @widget is a string ... */
        if (typeof widget === "string") {
            /* ... try to use it as a key into the cached prototype hash ... */
            ret = $.mobile.tizen._widgetPrototypes[widget];
            if (ret === undefined) {
                /* ... and if the proto was not found, try to load its definition ... */
                var protoPath = frameworkRootPath + "proto-html" + "/" +
                                theScriptTag.attr("data-framework-theme");
                $.ajax({
                    url: protoPath + "/" + widget + ".prototype.html",
                    async: false,
                    dataType: "html"
                })
                 .success(function(data, textStatus, jqXHR) {
                    /* ... and if loading succeeds, cache it and use a copy of it ... */
                    $.mobile.tizen._widgetPrototypes[widget] = $("<div>").html(replaceVariables(data));
                    ret = $.mobile.tizen._widgetPrototypes[widget].clone();
                });
            }
        }
        /* Otherwise ... */
        else {
            /* ... if a key was provided ... */
            if (widget.key !== undefined)
                /* ... try to use it as a key into the cached prototype hash ... */
                ret = $.mobile.tizen._widgetPrototypes[widget.key];

            /* ... and if the proto was not found in the cache ... */
            if (ret === undefined) {
                /* ... and a proto definition string was provided ... */
                if (widget.proto !== undefined) {
                    /* ... create a new proto from the definition ... */
                    ret = $("<div>").html(replaceVariables(widget.proto));
                    /* ... and if a key was provided ... */
                    if (widget.key !== undefined)
                        /* ... cache a copy of the proto under that key */
                        $.mobile.tizen._widgetPrototypes[widget.key] = ret.clone();
                }
            }
            else
                /* otherwise, if the proto /was/ found in the cache, return a copy of it */
                ret = ret.clone();
        }

        /* If the prototype was found/created successfully ... */
        if (ret != undefined)
            /* ... and @ui was provided */
            if (ui != undefined)
                /* ... return @ui, but replace the CSS selectors it contains with the elements they select */
                ret = fillObj(ui, ret);

        return ret;
    }
});
})(jQuery);
/*
* jQuery Mobile Framework : scrollview plugin
* Copyright (c) 2010 Adobe Systems Incorporated - Kin Blas (jblas@adobe.com)
* Dual licensed under the MIT (MIT-LICENSE.txt) and GPL (GPL-LICENSE.txt) licenses.
* Note: Code is in draft form and is subject to change
* Modified by Koeun Choi <koeun.choi@samsung.com>
* Modified by Minkyu Kang <mk7.kang@samsung.com>
*/

(function ( $, window, document, undefined ) {

	function resizePageContentHeight( page ) {
		var $page = $( page ),
			$content = $page.children(".ui-content"),
			hh = $page.children(".ui-header").outerHeight() || 0,
			fh = $page.children(".ui-footer").outerHeight() || 0,
			pt = parseFloat( $content.css("padding-top") ),
			pb = parseFloat( $content.css("padding-bottom") ),
			wh = $( window ).height();

		$content.height( wh - (hh + fh) - (pt + pb) );
	}

	function MomentumTracker( options ) {
		this.options = $.extend( {}, options );
		this.easing = "easeOutQuad";
		this.reset();
	}

	var tstates = {
		scrolling: 0,
		overshot:  1,
		snapback:  2,
		done:      3
	};

	function getCurrentTime() {
		return Date.now();
	}

	jQuery.widget( "tizen.scrollview", jQuery.mobile.widget, {
		options: {
			direction:         null,  // "x", "y", or null for both.

			timerInterval:     10,
			scrollDuration:    1000,  // Duration of the scrolling animation in msecs.
			overshootDuration: 250,   // Duration of the overshoot animation in msecs.
			snapbackDuration:  500,   // Duration of the snapback animation in msecs.

			moveThreshold:     30,   // User must move this many pixels in any direction to trigger a scroll.
			moveIntervalThreshold:     150,   // Time between mousemoves must not exceed this threshold.

			scrollMethod:      "translate",  // "translate", "position"
			startEventName:    "scrollstart",
			updateEventName:   "scrollupdate",
			stopEventName:     "scrollstop",

			eventType:         $.support.touch ? "touch" : "mouse",

			showScrollBars:    true,
			overshootEnable:   false,
			outerScrollEnable: true,
			overflowEnable:    true,
			scrollJump:        false,
		},

		_getViewHeight: function () {
			return this._$view.height();
		},

		_makePositioned: function ( $ele ) {
			if ( $ele.css("position") === "static" ) {
				$ele.css( "position", "relative" );
			}
		},

		_create: function () {
			var direction,
				self = this;

			this._$clip = $( this.element ).addClass("ui-scrollview-clip");

			if ( this._$clip.children(".ui-scrollview-view").length ) {
				this._$view = this._$clip.children(".ui-scrollview-view");
			} else {
				this._$view = this._$clip.wrapInner("<div></div>").children()
							.addClass("ui-scrollview-view");
			}

			if ( this.options.scrollMethod === "translate" ) {
				if ( this._$view.css("transform") === undefined ) {
					this.options.scrollMethod = "position";
				}
			}

			this._$clip.css( "overflow", "hidden" );
			this._makePositioned( this._$clip );

			this._makePositioned( this._$view );
			this._$view.css( { left: 0, top: 0 } );

			this._view_height = this._getViewHeight();

			this._sx = 0;
			this._sy = 0;

			direction = this.options.direction;

			this._hTracker = ( direction !== "y" ) ?
					new MomentumTracker( this.options ) : null;
			this._vTracker = ( direction !== "x" ) ?
					new MomentumTracker( this.options ) : null;

			this._timerInterval = this.options.timerInterval;
			this._timerID = 0;

			this._timerCB = function () {
				self._handleMomentumScroll();
			};

			this._add_event();
			this._add_scrollbar();
			this._add_scroll_jump();
			this._add_overflow_indicator();
		},

		_startMScroll: function ( speedX, speedY ) {
			var keepGoing = false,
				duration = this.options.scrollDuration,
				ht = this._hTracker,
				vt = this._vTracker,
				c,
				v;

			this._$clip.trigger( this.options.startEventName );

			if ( ht ) {
				c = this._$clip.width();
				v = this._$view.width();

				if ( (( this._sx === 0 && speedX > 0 ) ||
					( this._sx === -(v - c) && speedX < 0 )) &&
						v > c ) {
					return;
				}

				ht.start( this._sx, speedX,
					duration, (v > c) ? -(v - c) : 0, 0 );
				keepGoing = !ht.done();
			}

			if ( vt ) {
				c = this._$clip.height();
				v = this._getViewHeight();

				if ( (( this._sy === 0 && speedY > 0 ) ||
					( this._sy === -(v - c) && speedY < 0 )) &&
						v > c ) {
					return;
				}

				vt.start( this._sy, speedY,
					duration, (v > c) ? -(v - c) : 0, 0 );
				keepGoing = keepGoing || !vt.done();
			}

			if ( keepGoing ) {
				this._timerID = setTimeout( this._timerCB, this._timerInterval );
			} else {
				this._stopMScroll();
			}
		},

		_stopMScroll: function () {
			if ( this._timerID ) {
				this._$clip.trigger( this.options.stopEventName );
				clearTimeout( this._timerID );
			}
			this._timerID = 0;

			if ( this._vTracker ) {
				this._vTracker.reset();
			}

			if ( this._hTracker ) {
				this._hTracker.reset();
			}

			this._hideScrollBars();
			this._hideOverflowIndicator();
		},

		_handleMomentumScroll: function () {
			var keepGoing = false,
				x = 0,
				y = 0,
				scroll_height = 0,
				self = this,
				end_effect = function ( dir ) {
					setTimeout( function () {
						self._effect_dir = dir;
						self._setEndEffect( "in" );
					}, 100 );

					setTimeout( function () {
						self._setEndEffect( "out" );
					}, 350 );
				},
				vt = this._vTracker,
				ht = this._hTracker;

			if ( this._outerScrolling ) {
				return;
			}

			if ( vt ) {
				vt.update( this.options.overshootEnable );
				y = vt.getPosition();
				keepGoing = !vt.done();

				if ( vt.getRemained() > this.options.overshootDuration ) {
					scroll_height = this._getViewHeight() - this._$clip.height();

					if ( !vt.isAvail() ) {
						if ( this._speedY > 0 ) {
							this._outerScroll( vt.getRemained() / 3, scroll_height );
						} else {
							this._outerScroll( y - vt.getRemained() / 3, scroll_height );
						}
					} else if ( vt.isMin() ) {
						this._outerScroll( y - vt.getRemained() / 3, scroll_height );

						if ( scroll_height > 0 ) {
							end_effect( 1 );
						}
					} else if ( vt.isMax() ) {
						this._outerScroll( vt.getRemained() / 3, scroll_height );

						if ( scroll_height > 0 ) {
							end_effect( 0 );
						}
					}
				}
			}

			if ( ht ) {
				ht.update( this.options.overshootEnable );
				x = ht.getPosition();
				keepGoing = keepGoing || !ht.done();
			}

			this._setScrollPosition( x, y );
			this._$clip.trigger( this.options.updateEventName,
					[ { x: x, y: y } ] );

			if ( keepGoing ) {
				this._timerID = setTimeout( this._timerCB, this._timerInterval );
			} else {
				this._stopMScroll();
			}
		},

		_setElementTransform: function ( $ele, x, y, duration ) {
			var translate,
				transition;

			if ( !duration || duration === undefined ) {
				transition = "none";
			} else {
				transition =  "-webkit-transform " + duration / 1000 + "s ease-out";
			}

			if ( $.support.cssTransform3d ) {
				translate = "translate3d(" + x + "," + y + ", 0px)";
			} else {
				translate = "translate(" + x + "," + y + ")";
			}

			$ele.css({
				"-moz-transform": translate,
				"-webkit-transform": translate,
				"-ms-transform": translate,
				"-o-transform": translate,
				"transform": translate,
				"-webkit-transition": transition
			});
		},

		_setEndEffect: function ( dir ) {
			var scroll_height = this._getViewHeight() - this._$clip.height();

			if ( this._softkeyboard ) {
				if ( this._effect_dir ) {
					this._outerScroll( -scroll_height - this._softkeyboardHeight,
							scroll_height );
				} else {
					this._outerScroll( this._softkeyboardHeight, scroll_height );
				}
				return;
			}

			if ( dir === "in" ) {
				if ( this._endEffect ) {
					return;
				}

				this._endEffect = true;
				this._setOverflowIndicator( this._effect_dir );
				this._showOverflowIndicator();
			} else if ( dir === "out" ) {
				if ( !this._endEffect ) {
					return;
				}

				this._endEffect = false;
			} else {
				this._endEffect = false;
				this._setOverflowIndicator();
				this._showOverflowIndicator();
			}
		},

		_setCalibration: function ( x, y ) {
			if ( this.options.overshootEnable ) {
				this._sx = x;
				this._sy = y;
				return;
			}

			var $v = this._$view,
				$c = this._$clip,
				dirLock = this._directionLock,
				scroll_height = 0,
				scroll_width = 0;

			if ( dirLock !== "y" && this._hTracker ) {
				scroll_width = $v.width() - $c.width();

				if ( x >= 0 ) {
					this._sx = 0;
				} else if ( x < -scroll_width ) {
					this._sx = -scroll_width;
				} else {
					this._sx = x;
				}

				if ( scroll_width < 0 ) {
					this._sx = 0;
				}
			}

			if ( dirLock !== "x" && this._vTracker ) {
				scroll_height = this._getViewHeight() - $c.height();

				if ( y > 0 ) {
					this._sy = 0;

					if ( this._didDrag && scroll_height > 0 ) {
						this._effect_dir = 0;
						this._setEndEffect( "in" );
					}
				} else if ( y < -scroll_height ) {
					this._sy = -scroll_height;

					if ( this._didDrag && scroll_height > 0 ) {
						this._effect_dir = 1;
						this._setEndEffect( "in" );
					}
				} else {
					if ( this._endEffect && this._sy !== y ) {
						this._setEndEffect();
					}

					this._sy = y;
				}

				if ( scroll_height < 0 ) {
					this._sy = 0;
				}
			}
		},

		_setScrollPosition: function ( x, y, duration ) {
			var $v = this._$view,
				sm = this.options.scrollMethod,
				$vsb = this._$vScrollBar,
				$hsb = this._$hScrollBar,
				$sbt;

			this._setCalibration( x, y );

			x = this._sx;
			y = this._sy;

			if ( sm === "translate" ) {
				this._setElementTransform( $v, x + "px", y + "px", duration );
			} else {
				$v.css( {left: x + "px", top: y + "px"} );
			}

			if ( $vsb ) {
				$sbt = $vsb.find(".ui-scrollbar-thumb");

				if ( sm === "translate" ) {
					this._setElementTransform( $sbt, "0px",
						-y / this._getViewHeight() * $sbt.parent().height() + "px",
						duration );
				} else {
					$sbt.css( "top", -y / this._getViewHeight() * 100 + "%" );
				}
			}

			if ( $hsb ) {
				$sbt = $hsb.find(".ui-scrollbar-thumb");

				if ( sm === "translate" ) {
					this._setElementTransform( $sbt,
						-x / $v.width() * $sbt.parent().width() + "px", "0px",
						duration);
				} else {
					$sbt.css("left", -x / $v.width() * 100 + "%");
				}
			}
		},

		_outerScroll: function ( y, scroll_height ) {
			var self = this,
				top = $( window ).scrollTop() - window.screenTop,
				sy = 0,
				duration = this.options.snapbackDuration,
				start = getCurrentTime(),
				tfunc;

			if ( !this.options.outerScrollEnable ) {
				return;
			}

			if ( this._$clip.jqmData("scroll") !== "y" ) {
				return;
			}

			if ( this._outerScrolling ) {
				return;
			}

			if ( y > 0 ) {
				sy = ( window.screenTop ? window.screenTop : -y );
			} else if ( y < -scroll_height ) {
				sy = -y - scroll_height;
			} else {
				return;
			}

			tfunc = function () {
				var elapsed = getCurrentTime() - start;

				if ( elapsed >= duration ) {
					window.scrollTo( 0, top + sy );
					self._outerScrolling = undefined;

					self._stopMScroll();
				} else {
					ec = $.easing.easeOutQuad( elapsed / duration,
							elapsed, 0, 1, duration );

					window.scrollTo( 0, top + ( sy * ec ) );
					self._outerScrolling = setTimeout( tfunc, self._timerInterval );
				}
			};
			this._outerScrolling = setTimeout( tfunc, self._timerInterval );
		},

		_scrollTo: function ( x, y, duration ) {
			var self = this,
				start = getCurrentTime(),
				efunc = $.easing.easeOutQuad,
				sx = this._sx,
				sy = this._sy,
				dx = x - sx,
				dy = y - sy,
				tfunc;

			x = -x;
			y = -y;

			tfunc = function () {
				var elapsed = getCurrentTime() - start,
				    ec;

				if ( elapsed >= duration ) {
					self._timerID = 0;
					self._setScrollPosition( x, y );
				} else {
					ec = efunc( elapsed / duration, elapsed, 0, 1, duration );

					self._setScrollPosition( sx + ( dx * ec ), sy + ( dy * ec ) );
					self._timerID = setTimeout( tfunc, self._timerInterval );
				}
			};

			this._timerID = setTimeout( tfunc, this._timerInterval );
		},

		scrollTo: function ( x, y, duration ) {
			this._stopMScroll();

			if ( !duration || this.options.scrollMethod === "translate" ) {
				this._setScrollPosition( x, y, duration );
			} else {
				this._scrollTo( x, y, duration );
			}
		},

		getScrollPosition: function () {
			return { x: -this._sx, y: -this._sy };
		},

		_getScrollHierarchy: function () {
			var svh = [],
				d;

			this._$clip.parents( ".ui-scrollview-clip").each( function () {
				d = $( this ).jqmData("scrollview");
				if ( d ) {
					svh.unshift( d );
				}
			} );
			return svh;
		},

		_getAncestorByDirection: function ( dir ) {
			var svh = this._getScrollHierarchy(),
				n = svh.length,
				sv,
				svdir;

			while ( 0 < n-- ) {
				sv = svh[n];
				svdir = sv.options.direction;

				if (!svdir || svdir === dir) {
					return sv;
				}
			}
			return null;
		},

		_handleDragStart: function ( e, ex, ey ) {
			this._stopMScroll();

			this._didDrag = false;
			this._skip_dragging = false;

			var target = $( e.target ),
				self = this,
				$c = this._$clip,
				svdir = this.options.direction;

			/* should prevent the default behavior when click the button */
			this._is_button = target.is( '.ui-btn' ) ||
					target.is( '.ui-btn-text' ) ||
					target.is( '.ui-btn-inner' ) ||
					target.is( '.ui-btn-inner .ui-icon' );

			/* should prevent the default behavior when click the slider */
			if ( target.parents('.ui-slider').length || target.is('.ui-slider') ) {
				this._skip_dragging = true;
				return;
			}

			/*
			 * We need to prevent the default behavior to
			 * suppress accidental selection of text, etc.
			 */
			this._is_inputbox = target.is(':input') ||
					target.parents(':input').length > 0;

			if ( this._is_inputbox ) {
				target.one( "resize.scrollview", function () {
					if ( ey > $c.height() ) {
						self.scrollTo( -ex, self._sy - ey + $c.height(),
							self.options.snapbackDuration );
					}
				});
			}

			if ( this.options.eventType === "mouse" && !this._is_inputbox && !this._is_button ) {
				e.preventDefault();
			}

			this._lastX = ex;
			this._lastY = ey;
			this._startY = ey;
			this._doSnapBackX = false;
			this._doSnapBackY = false;
			this._speedX = 0;
			this._speedY = 0;
			this._directionLock = "";

			this._lastMove = 0;
			this._enableTracking();

			this._set_scrollbar_size();
		},

		_propagateDragMove: function ( sv, e, ex, ey, dir ) {
			this._hideScrollBars();
			this._hideOverflowIndicator();
			this._disableTracking();
			sv._handleDragStart( e, ex, ey );
			sv._directionLock = dir;
			sv._didDrag = this._didDrag;
		},

		_handleDragMove: function ( e, ex, ey ) {
			if ( this._skip_dragging ) {
				return;
			}

			if ( !this._dragging ) {
				return;
			}

			if ( !this._is_inputbox && !this._is_button ) {
				e.preventDefault();
			}

			var mt = this.options.moveThreshold,
				dx = ex - this._lastX,
				dy = ey - this._lastY,
				svdir = this.options.direction,
				dir = null,
				x,
				y,
				sv,
				scope,
				newX,
				newY,
				dirLock;

			this._lastMove = getCurrentTime();

			if ( !this._directionLock ) {
				x = Math.abs( dx );
				y = Math.abs( dy );

				if ( x < mt && y < mt ) {
					return false;
				}

				if ( x < y && (x / y) < 0.5 ) {
					dir = "y";
				} else if ( x > y && (y / x) < 0.5 ) {
					dir = "x";
				}

				if ( svdir && dir && svdir !== dir ) {
					/*
					 * This scrollview can't handle the direction the user
					 * is attempting to scroll. Find an ancestor scrollview
					 * that can handle the request.
					 */

					sv = this._getAncestorByDirection( dir );
					if ( sv ) {
						this._propagateDragMove( sv, e, ex, ey, dir );
						return false;
					}
				}

				this._directionLock = svdir || (dir || "none");
			}

			newX = this._sx;
			newY = this._sy;
			dirLock = this._directionLock;

			if ( dirLock !== "y" && this._hTracker ) {
				x = this._sx;
				this._speedX = dx;
				newX = x + dx;

				this._doSnapBackX = false;

				scope = ( newX > 0 || newX < this._maxX );

				if ( scope && dirLock === "x" ) {
					sv = this._getAncestorByDirection("x");
					if ( sv ) {
						this._setScrollPosition( newX > 0 ?
								0 : this._maxX, newY );
						this._propagateDragMove( sv, e, ex, ey, dir );
						return false;
					}

					newX = x + ( dx / 2 );
					this._doSnapBackX = true;
				}
			}

			if ( dirLock !== "x" && this._vTracker ) {
				if ( Math.abs( this._startY - ey ) < mt && dirLock !== "xy" ) {
					return;
				}

				y = this._sy;
				this._speedY = dy;
				newY = y + dy;

				this._doSnapBackY = false;

				scope = ( newY > 0 || newY < this._maxY );

				if ( scope && dirLock === "y" ) {
					sv = this._getAncestorByDirection("y");
					if ( sv ) {
						this._setScrollPosition( newX,
								newY > 0 ? 0 : this._maxY );
						this._propagateDragMove( sv, e, ex, ey, dir );
						return false;
					}

					newY = y + ( dy / 2 );
					this._doSnapBackY = true;
				}
			}

			if ( this.options.overshootEnable === false ) {
				this._doSnapBackX = false;
				this._doSnapBackY = false;
			}

			this._lastX = ex;
			this._lastY = ey;

			this._setScrollPosition( newX, newY );

			if ( this._didDrag === false ) {
				this._didDrag = true;
				this._showScrollBars();
				this._showOverflowIndicator();
			}
		},

		_handleDragStop: function ( e ) {
			var self = this;

			if ( this._skip_dragging ) {
				return;
			}

			var l = this._lastMove,
				t = getCurrentTime(),
				doScroll = (l && (t - l) <= this.options.moveIntervalThreshold),
				sx = ( this._hTracker && this._speedX && doScroll ) ?
						this._speedX : ( this._doSnapBackX ? 1 : 0 ),
				sy = ( this._vTracker && this._speedY && doScroll ) ?
						this._speedY : ( this._doSnapBackY ? 1 : 0 ),
				svdir = this.options.direction,
				x,
				y;

			if ( sx || sy ) {
				if ( !this._setGestureScroll( sx, sy ) ) {
					this._startMScroll( sx, sy );
				}
			} else {
				this._hideScrollBars();
				this._hideOverflowIndicator();
			}

			this._disableTracking();

			if ( this._endEffect ) {
				setTimeout( function () {
					self._setEndEffect( "out" );
					self._hideScrollBars();
					self._hideOverflowIndicator();
				}, 300 );
			}

			return !this._didDrag;
		},

		_setGestureScroll: function ( sx, sy ) {
			var self = this,
				reset = function () {
					clearTimeout( self._gesture_timer );
					self._gesture_dir = 0;
					self._gesture_count = 0;
					self._gesture_timer = undefined;
				};

			if ( !sy ) {
				return false;
			}

			dir = sy > 0 ? 1 : -1;

			if ( !this._gesture_timer ) {
				this._gesture_count = 1;
				this._gesture_dir = dir;

				this._gesture_timer = setTimeout( function () {
					reset();
				}, 1000 );

				return false;
			}

			if ( this._gesture_dir !== dir ) {
				reset();
				return false;
			}

			this._gesture_count++;

			if ( this._gesture_count === 3 ) {
				if ( dir > 0 ) {
					this.scrollTo( 0, 0, this.options.overshootDuration );
				} else {
					this.scrollTo( 0, -( this._getViewHeight() - this._$clip.height() ),
							this.options.overshootDuration );
				}
				reset();

				return true;
			}

			return false;
		},

		_enableTracking: function () {
			this._dragging = true;
		},

		_disableTracking: function () {
			this._dragging = false;
		},

		_showScrollBars: function ( interval ) {
			var vclass = "ui-scrollbar-visible",
				self = this;

			if ( !this.options.showScrollBars ) {
				return;
			}
			if ( this._scrollbar_showed ) {
				return;
			}

			if ( this._$vScrollBar ) {
				this._$vScrollBar.addClass( vclass );
			}
			if ( this._$hScrollBar ) {
				this._$hScrollBar.addClass( vclass );
			}

			this._scrollbar_showed = true;

			if ( interval ) {
				setTimeout( function () {
					self._hideScrollBars();
				}, interval );
			}
		},

		_hideScrollBars: function () {
			var vclass = "ui-scrollbar-visible";

			if ( !this.options.showScrollBars ) {
				return;
			}
			if ( !this._scrollbar_showed ) {
				return;
			}

			if ( this._$vScrollBar ) {
				this._$vScrollBar.removeClass( vclass );
			}
			if ( this._$hScrollBar ) {
				this._$hScrollBar.removeClass( vclass );
			}

			this._scrollbar_showed = false;
		},

		_setOverflowIndicator: function ( dir ) {
			if ( dir === 1 ) {
				this._opacity_top = "0";
				this._opacity_bottom = "0.8";
			} else if ( dir === 0 ) {
				this._opacity_top = "0.8";
				this._opacity_bottom = "0";
			} else {
				this._opacity_top = "0.5";
				this._opacity_bottom = "0.5";
			}
		},

		_showOverflowIndicator: function () {
			if ( !this.options.overflowEnable || !this._overflowAvail || this._softkeyboard ) {
				return;
			}

			this._overflow_top.animate( { opacity: this._opacity_top }, 300 );
			this._overflow_bottom.animate( { opacity: this._opacity_bottom }, 300 );

			this._overflow_showed = true;
		},

		_hideOverflowIndicator: function () {
			if ( !this.options.overflowEnable || !this._overflowAvail || this._softkeyboard ) {
				return;
			}

			if ( this._overflow_showed === false ) {
				return;
			}

			this._overflow_top.animate( { opacity: 0 }, 300 );
			this._overflow_bottom.animate( { opacity: 0 }, 300 );

			this._overflow_showed = false;
			this._setOverflowIndicator();
		},

		_add_event: function () {
			var self = this,
				$c = this._$clip,
				$v = this._$view;

			if ( this.options.eventType === "mouse" ) {
				this._dragEvt = "mousedown mousemove mouseup click mousewheel";

				this._dragCB = function ( e ) {
					switch ( e.type ) {
					case "mousedown":
						return self._handleDragStart( e,
								e.clientX, e.clientY );

					case "mousemove":
						return self._handleDragMove( e,
								e.clientX, e.clientY );

					case "mouseup":
						return self._handleDragStop( e );

					case "click":
						return !self._didDrag;

					case "mousewheel":
						var old = self.getScrollPosition();
						self.scrollTo( -old.x,
							-(old.y - e.originalEvent.wheelDelta) );
						break;
					}
				};
			} else {
				this._dragEvt = "touchstart touchmove touchend click";

				this._dragCB = function ( e ) {
					var touches = e.originalEvent.touches;

					switch ( e.type ) {
					case "touchstart":
						if ( touches.length != 1) {
							return;
						}

						return self._handleDragStart( e,
								touches[0].pageX, touches[0].pageY );

					case "touchmove":
						if ( touches.length != 1) {
							return;
						}

						return self._handleDragMove( e,
								touches[0].pageX, touches[0].pageY );

					case "touchend":
						if ( touches.length != 0) {
							return;
						}

						return self._handleDragStop( e );

					case "click":
						return !self._didDrag;
					}
				};
			}

			$v.bind( this._dragEvt, this._dragCB );

			$v.bind( "keydown", function ( e ) {
				var elem,
					elem_top,
					screen_h;

				if ( e.keyCode == 9 ) {
					return false;
				}

				elem = $c.find(".ui-focus");

				if ( elem === undefined ) {
					return;
				}

				elem_top = elem.offset().top;
				screen_h = $c.offset().top + $c.height() - elem.height();

				if ( self._softkeyboard ) {
					screen_h -= self._softkeyboardHeight;
				}

				if ( ( elem_top < 0 ) || ( elem_top > screen_h ) ) {
					self.scrollTo( 0, self._sy - elem_top +
						elem.height() + $c.offset().top, 0);
				}

				return;
			});

			$v.bind( "keyup", function ( e ) {
				var input,
					elem,
					elem_top,
					screen_h;

				if ( e.keyCode != 9 ) {
					return;
				}

				/* Tab Key */

				input = $( this ).find(":input");

				for ( i = 0; i < input.length; i++ ) {
					if ( !$( input[i] ).hasClass("ui-focus") ) {
						continue;
					}

					if ( i + 1 == input.length ) {
						elem = $( input[0] );
					} else {
						elem = $( input[i + 1] );
					}

					elem_top = elem.offset().top;
					screen_h = $c.offset().top + $c.height() - elem.height();

					if ( self._softkeyboard ) {
						screen_h -= self._softkeyboardHeight;
					}

					if ( ( elem_top < 0 ) || ( elem_top > screen_h ) ) {
						self.scrollTo( 0, self._sy - elem_top +
							elem.height() + $c.offset().top, 0);
					}

					elem.focus();

					break;
				}

				return false;
			});

			$c.bind( "updatelayout", function ( e ) {
				var sy,
					vh,
					view_h = self._getViewHeight();

				if ( !$c.height() || !view_h ) {
					self.scrollTo( 0, 0, 0 );
					return;
				}

				sy = $c.height() - view_h;
				vh = view_h - self._view_height;

				self._view_height = view_h;

				if ( vh == 0 || vh > $c.height() / 2 ) {
					return;
				}

				if ( sy > 0 ) {
					self.scrollTo( 0, 0, 0 );
				} else if ( self._sy - sy <= -vh ) {
					self.scrollTo( 0, self._sy,
						self.options.snapbackDuration );
				} else if ( self._sy - sy <= vh + self.options.moveThreshold ) {
					self.scrollTo( 0, sy,
						self.options.snapbackDuration );
				}
			});

			$( window ).bind( "resize", function ( e ) {
				var focused,
					view_h = self._getViewHeight();

				if ( $(".ui-page-active").get(0) !== $c.closest(".ui-page").get(0) ) {
					return;
				}

				if ( !$c.height() || !view_h ) {
					return;
				}

				focused = $c.find(".ui-focus");

				if ( focused ) {
					focused.trigger("resize.scrollview");
				}

				/* calibration - after triggered throttledresize */
				setTimeout( function () {
					if ( self._sy < $c.height() - self._getViewHeight() ) {
						self.scrollTo( 0, $c.height() - self._getViewHeight(),
							self.options.overshootDuration );
					}
				}, 260 );

				self._view_height = view_h;
			});

			$( window ).bind( "vmouseout", function ( e ) {
				var drag_stop = false;

				if ( $(".ui-page-active").get(0) !== $c.closest(".ui-page").get(0) ) {
					return;
				}

				if ( !self._dragging ) {
					return;
				}

				if ( e.pageX < 0 || e.pageX > $( window ).width() ) {
					drag_stop = true;
				}

				if ( e.pageY < 0 || e.pageY > $( window ).height() ) {
					drag_stop = true;
				}

				if ( drag_stop ) {
					self._hideScrollBars();
					self._hideOverflowIndicator();
					self._disableTracking();
				}
			});

			this._softkeyboard = false;
			this._softkeyboardHeight = 0;

			window.addEventListener( "softkeyboardchange", function ( e ) {
				if ( $(".ui-page-active").get(0) !== $c.closest(".ui-page").get(0) ) {
					return;
				}

				self._softkeyboard = ( e.state === "on" ? true : false );
				self._softkeyboardHeight = e.height;
			});

			$c.closest(".ui-page")
				.bind( "pageshow", function ( e ) {
					/* should be called after pagelayout */
					setTimeout( function () {
						self._view_height = self._getViewHeight();
						self._set_scrollbar_size();
						self._setScrollPosition( self._sx, self._sy );
						self._showScrollBars( 2000 );
					}, 0 );
				});
		},

		_add_scrollbar: function () {
			var $c = this._$clip,
				prefix = "<div class=\"ui-scrollbar ui-scrollbar-",
				suffix = "\"><div class=\"ui-scrollbar-track\"><div class=\"ui-scrollbar-thumb\"></div></div></div>";

			if ( !this.options.showScrollBars ) {
				return;
			}

			if ( this._vTracker ) {
				$c.append( prefix + "y" + suffix );
				this._$vScrollBar = $c.children(".ui-scrollbar-y");
			}
			if ( this._hTracker ) {
				$c.append( prefix + "x" + suffix );
				this._$hScrollBar = $c.children(".ui-scrollbar-x");
			}

			this._scrollbar_showed = false;
		},

		_add_scroll_jump: function () {
			var $c = this._$clip,
				self = this,
				top_btn,
				left_btn;

			if ( !this.options.scrollJump ) {
				return;
			}

			if ( this._vTracker ) {
				top_btn = $( '<div class="ui-scroll-jump-top-bg">' +
						'<div data-role="button" data-inline="true" data-icon="scrolltop" data-style="box"></div></div>' );
				$c.append( top_btn ).trigger("create");

				top_btn.bind( "vclick", function () {
					self.scrollTo( 0, 0, self.options.overshootDuration );
				} );
			}

			if ( this._hTracker ) {
				left_btn = $( '<div class="ui-scroll-jump-left-bg">' +
						'<div data-role="button" data-inline="true" data-icon="scrollleft" data-style="box"></div></div>' );
				$c.append( left_btn ).trigger("create");

				left_btn.bind( "vclick", function () {
					self.scrollTo( 0, 0, self.options.overshootDuration );
				} );
			}
		},

		_add_overflow_indicator: function () {
			if ( !this.options.overflowEnable ) {
				return;
			}

			this._overflow_top = $( '<div class="ui-overflow-indicator-top"></div>' );
			this._overflow_bottom = $( '<div class="ui-overflow-indicator-bottom"></div>' );

			this._$clip.append( this._overflow_top );
			this._$clip.append( this._overflow_bottom );

			this._opacity_top = "0.5";
			this._opacity_bottom = "0.5";
			this._overflow_showed = false;
		},

		_set_scrollbar_size: function () {
			var $c = this._$clip,
				$v = this._$view,
				cw = 0,
				vw = 0,
				ch = 0,
				vh = 0,
				thumb;

			if ( !this.options.showScrollBars ) {
				return;
			}

			if ( this._hTracker ) {
				cw = $c.width();
				vw = $v.width();
				this._maxX = cw - vw;

				if ( this._maxX > 0 ) {
					this._maxX = 0;
				}
				if ( this._$hScrollBar && vw ) {
					thumb = this._$hScrollBar.find(".ui-scrollbar-thumb");
					thumb.css( "width", (cw >= vw ? "0" :
							(Math.floor(cw / vw * 100) || 1) + "%") );
				}
			}

			if ( this._vTracker ) {
				ch = $c.height();
				vh = this._getViewHeight();
				this._maxY = ch - vh;

				if ( this._maxY > 0 ) {
					this._maxY = 0;
				}
				if ( this._$vScrollBar && vh ) {
					thumb = this._$vScrollBar.find(".ui-scrollbar-thumb");
					thumb.css( "height", (ch >= vh ? "0" :
							(Math.floor(ch / vh * 100) || 1) + "%") );

					this._overflowAvail = !!thumb.height();
				}
			}
		}
	});

	$.extend( MomentumTracker.prototype, {
		start: function ( pos, speed, duration, minPos, maxPos ) {
			var tstate = ( pos < minPos || pos > maxPos ) ?
					tstates.snapback : tstates.scrolling,
				pos_temp;

			this.state = ( speed !== 0 ) ? tstate : tstates.done;
			this.pos = pos;
			this.speed = speed;
			this.duration = ( this.state === tstates.snapback ) ?
					this.options.snapbackDuration : duration;
			this.minPos = minPos;
			this.maxPos = maxPos;

			this.fromPos = ( this.state === tstates.snapback ) ? this.pos : 0;
			pos_temp = ( this.pos < this.minPos ) ? this.minPos : this.maxPos;
			this.toPos = ( this.state === tstates.snapback ) ? pos_temp : 0;

			this.startTime = getCurrentTime();
		},

		reset: function () {
			this.state = tstates.done;
			this.pos = 0;
			this.speed = 0;
			this.minPos = 0;
			this.maxPos = 0;
			this.duration = 0;
			this.remained = 0;
		},

		update: function ( overshootEnable ) {
			var state = this.state,
				cur_time = getCurrentTime(),
				duration = this.duration,
				elapsed =  cur_time - this.startTime,
				dx,
				x,
				didOverShoot;

			if ( state === tstates.done ) {
				return this.pos;
			}

			elapsed = elapsed > duration ? duration : elapsed;

			this.remained = duration - elapsed;

			if ( state === tstates.scrolling || state === tstates.overshot ) {
				dx = this.speed *
					( 1 - $.easing[this.easing]( elapsed / duration,
								elapsed, 0, 1, duration ) );

				x = this.pos + dx;

				didOverShoot = ( state === tstates.scrolling ) &&
					( x < this.minPos || x > this.maxPos );

				if ( didOverShoot ) {
					x = ( x < this.minPos ) ? this.minPos : this.maxPos;
				}

				this.pos = x;

				if ( state === tstates.overshot ) {
					if ( !overshootEnable ) {
						this.state = tstates.done;
					}
					if ( elapsed >= duration ) {
						this.state = tstates.snapback;
						this.fromPos = this.pos;
						this.toPos = ( x < this.minPos ) ?
								this.minPos : this.maxPos;
						this.duration = this.options.snapbackDuration;
						this.startTime = cur_time;
						elapsed = 0;
					}
				} else if ( state === tstates.scrolling ) {
					if ( didOverShoot && overshootEnable ) {
						this.state = tstates.overshot;
						this.speed = dx / 2;
						this.duration = this.options.overshootDuration;
						this.startTime = cur_time;
					} else if ( elapsed >= duration ) {
						this.state = tstates.done;
					}
				}
			} else if ( state === tstates.snapback ) {
				if ( elapsed >= duration ) {
					this.pos = this.toPos;
					this.state = tstates.done;
				} else {
					this.pos = this.fromPos + (( this.toPos - this.fromPos ) *
						$.easing[this.easing]( elapsed / duration,
							elapsed, 0, 1, duration ));
				}
			}

			return this.pos;
		},

		done: function () {
			return this.state === tstates.done;
		},

		isMin: function () {
			return this.pos === this.minPos;
		},

		isMax: function () {
			return this.pos === this.maxPos;
		},

		isAvail: function () {
			return !( this.minPos === this.maxPos );
		},

		getRemained: function () {
			return this.remained;
		},

		getPosition: function () {
			return this.pos;
		}
	});

	$( document ).bind( 'pagecreate create', function ( e ) {
		var $page = $( e.target ),
			content_scroll = $page.find(".ui-content").jqmData("scroll");

		/* content scroll */
		if ( $.support.scrollview === undefined ) {
			$.support.scrollview = true;
		}

		if ( $.support.scrollview === true && content_scroll === undefined ) {
			content_scroll = "y";
		}

		if ( content_scroll !== "y" ) {
			content_scroll = "none";
		}

		$page.find(".ui-content").attr( "data-scroll", content_scroll );

		$page.find(":jqmData(scroll)").not(".ui-scrollview-clip").each( function () {
			if ( $( this ).hasClass("ui-scrolllistview") ) {
				$( this ).scrolllistview();
			} else {
				var st = $( this ).jqmData("scroll"),
					dir = st && ( st.search(/^[xy]/) !== -1 ) ? st : null,
					content = $(this).hasClass("ui-content"),
					opts;

				if ( st === "none" ) {
					return;
				}

				opts = {
					direction: dir || undefined,
					overflowEnable: content,
					scrollMethod: $( this ).jqmData("scroll-method") || undefined,
					scrollJump: $( this ).jqmData("scroll-jump") || undefined
				};

				$( this ).scrollview( opts );
			}
		});
	});

	$( document ).bind( 'pageshow', function ( e ) {
		var $page = $( e.target ),
			scroll = $page.find(".ui-content").jqmData("scroll");

		if ( scroll === "y" ) {
			resizePageContentHeight( e.target );
		}
	});

}( jQuery, window, document ) );
/*global Globalize:false, range:false, regexp:false*/
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (C) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Salvatore Iovene <salvatore.iovene@intel.com>
 *			Daehyon Jung <darrenh.jung@samsung.com>
 */

/**
 * datetimepicker is a widget that lets the user select a date and/or a 
 * time. If you'd prefer use as auto-initialization of form elements, 
 * use input elements with type=date/time/datetime within form tag
 * as same as other form elements.
 * 
 * HTML Attributes:
 * 
 *	data-role: 'datetimepicker'
 *	data-format: date format string. e.g) "MMM dd yyyy, HH:mm"
 *	type: 'date', 'datetime', 'time'
 *	value: pre-set value. only accepts ISO date string. e.g) "2012-05-04", "2012-05-04T01:02:03+09:00" 
 *	data-date: any date/time string "new Date()" accepts.
 *
 * Options:
 *	type: 'date', 'datetime', 'time'
 *	format: see data-format in HTML Attributes.
 *	value: see value in HTML Attributes.
 *	date: preset value as JavaScript Date Object representation.
 *
 * APIs:
 *	value( datestring )
 *		: Set date/time to 'datestring'.
 *	value()
 *		: Get current selected date/time as W3C DTF style string.
 *	getValue() - replaced with 'value()'
 *		: same as value()
 *	setValue( datestring ) - replaced with 'value(datestring)'
 *		: same as value( datestring )
 *	changeTypeFormat( type, format ) - deprecated
 *		: Change Type and Format options. use datetimepicker( "option", "format" ) instead
 *
 * Events:
 *	date-changed: Raised when date/time was changed.
 *
 * Examples:
 *	<ul data-role="listview">
 *		<li class="ui-li-3-2-2">
 *			<span class="ui-li-text-main">
 *				<input type="datetime" name="demo-date" id="demo-date" 
 *					data-format="MMM dd yyyy hh:mm tt"/>
 *			</span>
 *			<span class="ui-li-text-sub">
 *				Date/Time Picker - <span id="selected-date1"><em>(select a date first)</em></span>
 *			</span>
 *		</li>
 *		<li class="ui-li-3-2-2">
 *			<span class="ui-li-text-main">
 *				<input type="date" name="demo-date2" id="demo-date2"/>
 *			</span>
 *			<span class="ui-li-text-sub">
 *				Date Picker  - <span id="selected-date2"><em>(select a date first)</em></span>
 *			</span>
 *		</li>
 *		<li class="ui-li-3-2-2">
 *			<span class="ui-li-text-main">
 *				<input type="time" name="demo-date3" id="demo-date3"/>
 *			</span>
 *			<span class="ui-li-text-sub">
 *				Time Picker - <span id="selected-date3"><em>(select a date first)</em></span>
 *			</span>
 *		</li>
 *	</ul>
 * How to get a return value:
 * ==========================
 * Bind to the 'date-changed' event, e.g.:
 *    $("#myDatetimepicker").bind("date-changed", function(e, date) {
 *        alert("New date: " + date.toString());
 *    });
 */

/**
	@class DateTimePicker
	The picker widgets show a control that you can use to enter date and time values. <br/> To add a date time picker widget to the application, use the following code:

			<li class="ui-li-dialogue ui-datetime">
				<div class="ui-datetime-text-main">
					<input type="datetime" data-format="MMM dd yyyy hh:mm:ss" name="demo-date" id="demo-date" />
				</div>
				<div class="ui-li-text-sub">Date/Time Picker
					<span id="selected-date1"><em>(select a date first)</em></span>
				</div>
			</li>
*/


( function ( $, window, undefined ) {
	$.widget( "tizen.datetimepicker", $.tizen.widgetex, {

		options: {
			type: null, // date, time, datetime applicable
			format: null,
			date: null,
			initSelector: "input[type='date'], input[type='datetime'], input[type='time'], :jqmData(role='datetimepicker')"
		},

		_calendar: function () {
			return window.Globalize.culture().calendars.standard;
		},

		_value: {
			attr: "data-" + ( $.mobile.ns || "" ) + "date",
			signal: "date-changed"
		},

		_daysInMonth: [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ],

		_isLeapYear: function ( year ) {
			return year % 4 ? 0 : ( year % 100 ? 1 : ( year % 400 ? 0 : 1 ) );
		},

		_makeTwoDigits: function ( val ) {
			var ret = val.toString(10);
			if ( val < 10 ) {
				ret = "0" + ret;
			}
			return ret;
		},

		_setType: function ( type ) {
			//datetime, date, time
			switch (type) {
			case 'datetime':
			case 'date':
			case 'time':
				this.options.type = type;
				break;
			default:
				this.options.type = 'datetime';
				break;
			}

			this.element.attr( "data-" + ( $.mobile.ns ? $.mobile.ns + "-" : "" ) + "type", this.options.type );
			return this.options.type;
		},

		_setFormat: function ( format ) {
			if ( this.options.format != format ) {
				this.options.format = format;
			} else {
				return;
			}

			this.ui.children().remove();

			var token = this._parsePattern( format ),
				div = document.createElement('div'),
				pat,
				tpl,
				period,
				btn,
				obj = this;

			while ( token.length > 0 ) {
				pat = token.shift();
				tpl = '<span class="ui-datefield-%1" data-pat="' + pat + '">%2</span>';
				switch ( pat ) {
				case 'H': //0 1 2 3 ... 21 22 23
				case 'HH': //00 01 02 ... 21 22 23
				case 'h': //0 1 2 3 ... 11 12
				case 'hh': //00 01 02 ... 11 12
					$(div).append( tpl.replace('%1', 'hour') );
					break;
				case 'mm': //00 01 ... 59
				case 'm': //0 1 2 ... 59
					if ( this.options.type == 'date' ) {
						$(div).append( tpl.replace('%1', 'month') );
					} else {
						$(div).append( tpl.replace('%1', 'min') );
					}
					break;
				case 'ss':
				case 's':
					$(div).append( tpl.replace('%1', 'sec') );
					break;
				case 'd': // day of month 5
				case 'dd': // day of month(leading zero) 05
					$(div).append( tpl.replace('%1', 'day') );
					break;
				case 'M': // Month of year 9
				case 'MM': // Month of year(leading zero) 09
				case 'MMM':
				case 'MMMM':
					$(div).append( tpl.replace('%1', 'month') );
					break;
				case 'yy':	// year two digit
				case 'yyyy': // year four digit
					$(div).append( tpl.replace('%1', 'year') );
					break;
				case 't': //AM / PM indicator(first letter) A, P
					// add button
				case 'tt': //AM / PM indicator AM/PM
					// add button
					btn = '<a href="#" class="ui-datefield-period"' +
						' data-role="button" data-inline="true">period</a>';
					$(div).append( btn );
					break;
				case 'g':
				case 'gg':
					$(div).append( tpl.replace('%1', 'era').replace('%2', this._calendar().eras.name) );
					break;
				case '\t':
					$(div).append( tpl.replace('%1', 'tab').replace('%2', pat) );
					break;
				default : // string or any non-clickable object
					$(div).append( tpl.replace('%1', 'seperator').replace('%2', pat) );
					break;
				}
			}

			this.ui.append( div );
			if ( this.options.date ) {
				this._setDate( this.options.date );
			}

			this.ui.find('.ui-datefield-period').buttonMarkup().bind( 'vclick', function ( e ) {
				obj._switchAmPm( obj );
			});

			this.element.attr( "data-" + ( $.mobile.ns ? $.mobile.ns + "-" : "" ) + "format", this.options.format );
			return this.options.format;
		},

		_setDate: function ( newdate ) {
			if ( typeof ( newdate ) == "string" ) {
				newdate = new Date( newdate );
			}

			var fields = $('span,a', this.ui),
				type,
				fn,
				$field,
				btn,
				i;

			function getMonth() {
				return newdate.getMonth() + 1;
			}

			for ( i = 0; i < fields.length; i++ ) {
				$field = $(fields[i]);
				type = $field.attr("class").match(/ui-datefield-([\w]*)/);
				if ( !type ) {
					type = "";
				}
				switch ( type[1] ) {
				case 'hour':
					fn = newdate.getHours;
					break;
				case 'min':
					fn = newdate.getMinutes;
					break;
				case 'sec':
					fn = newdate.getSeconds;
					break;
				case 'year':
					fn = newdate.getFullYear;
					break;
				case 'month':
					fn = getMonth;
					break;
				case 'day':
					fn = newdate.getDate;
					break;
				case 'period':
					fn = newdate.getHours() < 12 ? this._calendar().AM[0] : this._calendar().PM[0];
					btn = $field.find( '.ui-btn-text' );
					if ( btn.length == 0 ) {
						$field.text(fn);
					} else if ( btn.text() != fn ) {
						btn.text( fn );
					}
					fn = null;
					break;
				default:
					fn = null;
					break;
				}
				if ( fn ) {
					this._updateField( $field, fn.call( newdate ) );
				}
			}

			this.options.date = newdate;

			this._setValue( newdate );

			this.element.attr( "data-" + ( $.mobile.ns ? $.mobile.ns + "-" : "" ) + "date", this.options.date );
			return this.options.date;
		},

		destroy: function () {
			if ( this.ui ) {
				this.ui.remove();
			}

			if ( this.element ) {
				this.element.show();
			}
		},

		value: function ( val ) {
			function timeStr( t, obj ) {
				return obj._makeTwoDigits( t.getHours() ) + ':' +
					obj._makeTwoDigits( t.getMinutes() ) + ':' +
					obj._makeTwoDigits( t.getSeconds() );
			}

			function dateStr( d, obj ) {
				return ( ( d.getFullYear() % 10000 ) + 10000 ).toString().substr(1) + '-' +
					obj._makeTwoDigits( d.getMonth() + 1 ) + '-' +
					obj._makeTwoDigits( d.getDate() );
			}

			var rvalue = null;
			if ( val ) {
				rvalue = this._setDate( val );
			} else {
				switch ( this.options.type ) {
				case 'time':
					rvalue = timeStr( this.options.date, this );
					break;
				case 'date':
					rvalue = dateStr( this.options.date, this );
					break;
				default:
					rvalue = dateStr( this.options.date, this ) + 'T' + timeStr( this.options.date, this );
					break;
				}
			}
			return rvalue;
		},

		setValue: function ( newdate ) {
			console.warn( "setValue was deprecated. use datetimepicker('option', 'date', value) instead." );
			return this.value( newdate );
		},

		/**
		 * return W3C DTF string
		 */
		getValue: function () {
			console.warn("getValue() was deprecated. use datetimepicker('value') instead.");
			return this.value();
		},

		_updateField: function ( target, value ) {
			if ( !target || target.length == 0 ) {
				return;
			}

			if ( value == 0 ) {
				value = "0";
			}

			var pat = target.jqmData( 'pat' ),
				hour,
				text,
				self = this;

			switch ( pat ) {
			case 'H':
			case 'HH':
			case 'h':
			case 'hh':
				hour = value;
				if ( pat.charAt(0) == 'h' ) {
					if ( hour > 12 ) {
						hour -= 12;
					} else if ( hour == 0 ) {
						hour = 12;
					}
				}
				hour = this._makeTwoDigits( hour );
				text = hour;
				break;
			case 'm':
			case 'M':
			case 'd':
			case 's':
				text = value;
				break;
			case 'mm':
			case 'dd':
			case 'MM':
			case 'ss':
				text = this._makeTwoDigits( value );
				break;
			case 'MMM':
				text = this._calendar().months.namesAbbr[ value - 1];
				break;
			case 'MMMM':
				text = this._calendar().months.names[ value - 1 ];
				break;
			case 'yy':
				text = this._makeTwoDigits( value % 100 );
				break;
			case 'yyyy':
				if ( value < 10 ) {
					value = '000' + value;
				} else if ( value < 100 ) {
					value = '00' + value;
				} else if ( value < 1000 ) {
					value = '0' + value;
				}
				text = value;
				break;
			}

			// to avoid reflow where its value isn't out-dated
			if ( target.text() != text ) {
				if ( target.hasClass("ui-datefield-selected") ) {
					target.addClass("out");
					this._new_value = text;

					target.animationComplete( function () {
						target.text( self._new_value);
						target.addClass("in")
							.removeClass("out");

						target.animationComplete( function () {
							target.removeClass("in").
								removeClass("ui-datefield-selected");
						});
					});
				} else {
					target.text( text );
				}
			}
		},

		_switchAmPm: function ( obj ) {
			if ( this._calendar().AM != null ) {
				var date = new Date( this.options.date ),
					text,
					change = 1000 * 60 * 60 * 12;
				if ( date.getHours() > 11 ) {
					change = -change;
				}
				date.setTime( date.getTime() + change );
				this._setDate( date );
			}
		},

		_parsePattern: function ( pattern ) {
			var regex = /\/|\s|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|f|gg|g|\'[\w\W]*\'$|[\w\W]/g,
				matches,
				i;

			matches = pattern.match( regex );

			for ( i = 0; i < matches.length; i++ ) {
				if ( matches[i].charAt(0) == "'" ) {
					matches[i] = matches[i].substr( 1, matches[i].length - 2 );
				}
			}

			return matches;
		},

		changeTypeFormat: function ( type, format ) {
			console.warn('changeTypeFormat() was deprecated. use datetimepicker("option", "type"|"format", value) instead');
			if ( type ) {
				this._setType( type );
			}

			if ( format ) {
				this._setFormat( format );
			}
		},

		_create: function () {
			var obj = this;

			if ( this.element.is( "input" ) ) {
				( function ( obj ) {
					var type, value, format;

					type = obj.element.get(0).getAttribute( "type" );
					obj.options.type = type;

					value = obj.element.get(0).getAttribute( "value" );
					if ( value ) {
						obj.options.date = new Date( value );
					}
				}( this ) );
			}

			if ( !this.options.format ) {
				switch ( this.options.type ) {
				case 'datetime':
					this.options.format = this._calendar().patterns.d + "\t" + this._calendar().patterns.t;
					break;
				case 'date':
					this.options.format = this._calendar().patterns.d;
					break;
				case 'time':
					this.options.format = this._calendar().patterns.t;
					break;
				}
			}

			if ( !this.options.date ) {
				this.options.date = new Date();
			}

			this.element.hide();
			this.ui = $('<div class="ui-datefield"></div>');
			$(this.element).after( this.ui );

			this._popup_open = false;
			this.ui.bind('vclick', function ( e ) {
				obj._showDataSelector( obj, this, e.target );
			});
		},

		_populateDataSelector: function ( field, pat ) {
			var values,
				numItems,
				current,
				data,
				range = window.range,
				local,
				yearlb,
				yearhb,
				day;

			switch ( field ) {
			case 'hour':
				if ( pat == 'H' || pat == 'HH' ) {
					// twentyfour
					values = range( 0, 23 );
					data = range( 0, 23 );
					current = this.options.date.getHours();
				} else {
					values = range( 1, 12 );
					current = this.options.date.getHours() - 1;//11
					if ( current >= 11 ) {
						current = current - 12;
						data = range( 13, 23 );
						data.push( 12 ); // consider 12:00 am as 00:00
					} else {
						data = range( 1, 11 );
						data.push( 0 );
					}
					if ( current < 0 ) {
						current = 11; // 12:00 or 00:00
					}
				}
				if ( pat.length == 2 ) {
					// two digit
					values = values.map( this._makeTwoDigits );
				}
				numItems = values.length;
				break;
			case 'min':
			case 'sec':
				values = range( 0, 59 );
				if ( pat.length == 2 ) {
					values = values.map( this._makeTwoDigits );
				}
				data = range( 0, 59 );
				current = ( field == 'min' ? this.options.date.getMinutes() : this.options.date.getSeconds() );
				numItems = values.length;
				break;
			case 'year':
				yearlb = 1900;
				yearhb = 2100;
				data = range( yearlb, yearhb );
				current = this.options.date.getFullYear() - yearlb;
				values = range( yearlb, yearhb );
				numItems = values.length;
				break;
			case 'month':
				switch ( pat.length ) {
				case 1:
					values = range( 1, 12 );
					break;
				case 2:
					values = range( 1, 12 ).map( this._makeTwoDigits );
					break;
				case 3:
					values = this._calendar().months.namesAbbr.slice();
					break;
				case 4:
					values = this._calendar().months.names.slice();
					break;
				}
				if ( values.length == 13 ) { // @TODO Lunar calendar support
					if ( values[12] == "" ) { // to remove lunar calendar reserved space
						values.pop();
					}
				}
				data = range( 1, values.length );
				current = this.options.date.getMonth();
				numItems = values.length;
				break;
			case 'day':
				day = this._daysInMonth[ this.options.date.getMonth() ];
				if ( day == 28 ) {
					day += this._isLeapYear( this.options.date.getFullYear() );
				}
				values = range( 1, day );
				if ( pat.length == 2 ) {
					values = values.map( this._makeTwoDigits );
				}
				data = range( 1, day );
				current = this.options.date.getDate() - 1;
				numItems = day;
				break;
			}

			return {
				values: values,
				data: data,
				numItems: numItems,
				current: current
			};

		},

		_showDataSelector: function ( obj, ui, target ) {
			target = $(target);

			var attr = target.attr("class"),
				field = attr ? attr.match(/ui-datefield-([\w]*)/) : undefined,
				pat,
				data,
				values,
				numItems,
				current,
				valuesData,
				html,
				datans,
				$ul,
				$div,
				$ctx,
				$li,
				i,
				newLeft = 10,
				self = this;

			if ( !attr ) {
				return;
			}
			if ( !field ) {
				return;
			}
			if ( this._popup_open ) {
				return;
			}

			target.not('.ui-datefield-seperator').addClass('ui-datefield-selected');

			pat = target.jqmData('pat');
			data = obj._populateDataSelector.call( obj, field[1], pat );

			values = data.values;
			numItems = data.numItems;
			current = data.current;
			valuesData = data.data;

			if ( values ) {
				datans = "data-" + ($.mobile.ns ? ($.mobile.ns + '-') : "") + 'val="';
				for ( i = 0; i < values.length; i++ ) {
					html += '<li><a class="ui-link" ' + datans + valuesData[i] + '">' + values[i] + '</a></li>';
				}

				$ul = $("<ul></ul>");
				$div = $('<div class="ui-datetimepicker-selector" data-transition="fade" data-fade="false"></div>');
				$div.append( $ul ).appendTo( ui );
				$ctx = $div.ctxpopup();
				$ctx.parents('.ui-popupwindow').addClass('ui-datetimepicker');
				$li = $(html);
				$( $li[current] ).addClass("current");
				$div.jqmData( "list", $li );
				$div.circularview();
				// cause ctxpopup forced to subtract 10
				if ( $( window ).width() / 2 < target.offset().left ) {
					newLeft = -10;
				}
				$ctx.popupwindow( 'open',
						target.offset().left + ( target.width() / 2 ) + newLeft - window.pageXOffset ,
						target.offset().top + target.height() - window.pageYOffset );

				this._popup_open = true;

				$div.bind('popupafterclose', function ( e ) {
					if ( obj._reflow ) {
						$(window).unbind("resize", obj._reflow);
						obj._reflow = null;
					}

					if ( !( target.hasClass("in") || target.hasClass("out") ) ) {
						target.removeClass("ui-datefield-selected");
					}

					$div.unbind( 'popupafterclose' );
					$ul.unbind( 'vclick' );
					$(obj).unbind( 'update' );
					$ctx.popupwindow( 'destroy' );
					$div.remove();

					self._popup_open = false;
				});

				$(obj).bind( 'update', function ( e, val ) {
					var date = new Date( this.options.date ),
						month,
						date_calibration = function () {
							date.setDate( 1 );
							date.setDate( date.getDate() - 1 );
						};

					switch ( field[1] ) {
					case 'min':
						date.setMinutes( val );
						break;
					case 'hour':
						date.setHours( val );
						break;
					case 'sec':
						date.setSeconds( val );
						break;
					case 'year':
						month = date.getMonth();
						date.setFullYear( val );

						if ( date.getMonth() != month ) {
							date_calibration();
						}
						break;
					case 'month':
						date.setMonth( val - 1 );

						if ( date.getMonth() == val ) {
							date_calibration();
						}
						break;
					case 'day':
						date.setDate( val );
						break;
					}

					obj._setDate( date );

					$ctx.popupwindow( 'close' );
				});

				$ul.bind( 'click', function ( e ) {
					if ( $(e.target).is('a') ) {
						$ul.find(".current").removeClass("current");
						$(e.target).parent().addClass('current');
						var val = $(e.target).jqmData("val");
						$(obj).trigger( 'update', val ); // close popup, unselect field
					}
				});

				$div.circularview( 'centerTo', '.current', 500 );
				$div.bind( 'scrollend' , function ( e ) {
					if ( !obj._reflow ) {
						obj._reflow = function () {
							$div.circularview("reflow");
						};
						$(window).bind("resize", obj._reflow);
					}
				});
			}
			return ui;
		}

	});

	$(document).bind("pagecreate create", function ( e ) {
		$($.tizen.datetimepicker.prototype.options.initSelector, e.target)
			.not(":jqmData(role='none'), :jqmData(role='nojs')")
			.datetimepicker();
	});

} ( jQuery, this ) );
/*
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) and GPL licenses
 * http://phpjs.org/functions/range
 * original by: Waldo Malqui Silva
 * version: 1107.2516
 */
function range( low, high, step ) {
    // Create an array containing the range of integers or characters
    // from low to high (inclusive)  
    // 
    // version: 1107.2516
    // discuss at: http://phpjs.org/functions/range
    // +   original by: Waldo Malqui Silva
    // *     example 1: range ( 0, 12 );
    // *     returns 1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    // *     example 2: range( 0, 100, 10 );
    // *     returns 2: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    // *     example 3: range( 'a', 'i' );
    // *     returns 3: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
    // *     example 4: range( 'c', 'a' );
    // *     returns 4: ['c', 'b', 'a']
	var matrix = [],
		inival,
		endval,
		plus,
		walker = step || 1,
		chars = false;

    if (!isNaN(low) && !isNaN(high)) {
        inival = low;
        endval = high;
    } else if (isNaN(low) && isNaN(high)) {
        chars = true;
        inival = low.charCodeAt(0);
        endval = high.charCodeAt(0);
    } else {
        inival = (isNaN(low) ? 0 : low);
        endval = (isNaN(high) ? 0 : high);
    }

    plus = ((inival > endval) ? false : true);
    if (plus) {
        while (inival <= endval) {
            matrix.push(((chars) ? String.fromCharCode(inival) : inival));
            inival += walker;
        }
    } else {
        while (inival >= endval) {
            matrix.push(((chars) ? String.fromCharCode(inival) : inival));
            inival -= walker;
        }
    }

    return matrix;
}

/****************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Wongi Lee <wongi11.lee@samsung.com>
*/

/**
 *	Extendable List Widget for unlimited data.
 *	To support more then 1,000 items, special list widget developed.
 *	Fast initialize and append some element into the DOM tree repeatedly.
 *	DB connection and works like DB cursor.
 *
 * HTML Attributes:
 *
 *		data-role:	extendablelist
 *		data-template : jQuery.template ID that populate into extendable list. A button : a <DIV> element with "data-role : button" should be included on data-template.
 *		data-dbtable : DB Table name. It used as window[DB NAME]. Loaded data should be converted as window object.
 *		data-extenditems : Number of elements to extend at once.
 *		
 *		ID : <UL> element that has "data-role=extendablelist" must have ID attribute.
 *		Class : <UL> element that has "data-role=extendablelist" should have "vlLoadSuccess" class to guaranty DB loading is completed.
 *		tmp_load_more : Template ID for "load more" message and button.
 *
 *
 *APIs:
 *		create ( {
 *				itemData: function ( idx ) { return json_obj; },
 *				numItemData: number or function () { return number; },
 *				cacheItemData: function ( minIdx, maxIdx ) {}
 *				} )
 *			: Create a extendable list widget. At this moment, _create method is called.
 *			args : A collection of options
 *				itemData: A function that returns JSON object for given index. Mandatory.
 *				numItemData: Total number of itemData. Mandatory.
 *				cacheItemData: Extendable list will ask itemData between minIdx and maxIdx.
 *				    Developers can implement this function for preparing data.
 *				    Optional.
 *
 *Examples:
 *
 *		<script id="tmp-3-1-1" type="text/x-jquery-tmpl">
 *			<li class="ui-li-3-1-1"><span class="ui-li-text-main">${NAME}</span></li>
 *		</script>
 *
 *		<script id="tmp_load_more" type="text/x-jquery-tmpl"> 
 *			<li class="ui-li-3-1-1" style="text-align:center; margin:0 auto">
 *				<div data-role="button">Load ${NUM_MORE_ITEMS} more items</div>
 *			</li>
 *		</script>
 *	
 *		<ul id = "extendable_list_main" data-role="extendablelist" data-extenditems="50" data-template="tmp-3-1-1">
 *		</ul>
 *
 */

/**
	@class Extendablelist
	In the Web environment, it is challenging to display a large amount of data in a list, such as displaying a contact list of over 1000 list items. It takes time to display the entire list in HTML and the DOM manipulation is complex.
	The extendable list widget is used to display a list of unlimited data elements on the screen for better performance. The list is extended if you click the button at the bottom of the list to load more data elements. Extendable lists are based on the jQuery.template plugin as described in the jQuery documentation for jQuery.template plugin.<br/>
	To add a extendable list widget to the application, use the following code:

			<script id="tmp-3-1-1" type="text/x-jquery-tmpl">
				<li class="ui-li-3-1-1"><span class="ui-li-text-main">${NAME}</span></li>
			</script>
			<script id="tmp_load_more" type="text/x-jquery-tmpl">
				<li class="ui-li-3-1-1" style="text-align:center; margin:0 auto">
				<div data-role="button">Load ${NUM_MORE_ITEMS} more items</div>
				</li>
			</script>
			<ul id="extendable_list_main" data-role="extendablelist" data-extenditems="50" data-template="tmp-3-1-1">
			</ul>
*/
/**
	@property {String} data-role
	Creates the extendable list view. The value must be set to extendablelist. Only the &lt;ul&gt; element, which a id attribute defined, supports this option. Also, the elLoadSuccess class attribute must be defined in the &lt;ul&gt; element to ensure that loading data from the database is complete.
*/
/**
	@property {String} data-template
	Specifies the jQuery.template element ID. The jQuery.template must be defined. The template style can use rem units to support scalability. For using the button at the bottom of the list to load more data elements, there must be list view template with the button. The attribute ID must be tmp_load_more.
*/
/**
	@property {Integer} data-extenditems
	Defines the number of data elements to be extended at a time.
*/
( function ( $, undefined ) {

	//Keeps track of the number of lists per page UID
	//This allows support for multiple nested list in the same page
	//https://github.com/jquery/jquery-mobile/issues/1617
	var listCountPerPage = {};

	$.widget( "tizen.extendablelist", $.mobile.widget, {
		options: {
			theme: "s",
			countTheme: "c",
			headerTheme: "b",
			dividerTheme: "b",
			splitIcon: "arrow-r",
			splitTheme: "b",
			inset: false,
			id:	"",						/* Extendable list UL elemet's ID */
			extenditems: 50,			/* Number of append items */
			childSelector: " li",		/* To support swipe list */
			dbtable: "",
			template : "",				/* Template for each list item */
			loadmore : "tmp_load_more",	/* Template for "Load more" message */
			scrollview: false,
			initSelector: ":jqmData(role='extendablelist')"
		},

		_stylerMouseUp: function () {
			$( this ).addClass( "ui-btn-up-s" );
			$( this ).removeClass( "ui-btn-down-s" );
		},

		_stylerMouseDown: function () {
			$( this ).addClass( "ui-btn-down-s" );
			$( this ).removeClass( "ui-btn-up-s" );
		},

		_stylerMouseOver: function () {
			$( this ).toggleClass( "ui-btn-hover-s" );
		},

		_stylerMouseOut: function () {
			$( this ).toggleClass( "ui-btn-hover-s" );
			$( this ).addClass( "ui-btn-up-s" );
			$( this ).removeClass( "ui-btn-down-s" );
		},

		_pushData: function ( template ) {
			var o = this.options,
				t = this,
				i = 0,
				myTemplate = $( "#" + template ),
				loadMoreItems = ( o.extenditems > t._numItemData - t._lastIndex ? t._numItemData - t.lastIndex : o.extenditems ),
				htmlData;

			for (i = 0; i < loadMoreItems; i++ ) {
				htmlData = myTemplate.tmpl( t._itemData( i ) );
				$( o.id ).append( $( htmlData ).attr( 'id', 'li_' + i ) );

				/* Add style */
				$( o.id + ">" + o.childSelector )
					.addClass( "ui-btn-up-s" )
					.bind( "mouseup", t._stylerMouseUp )
					.bind( "mousedown", t._stylerMouseDown )
					.bind( "mouseover", t._stylerMouseOver )
					.bind( "mouseout", t._stylerMouseOut );

				t._lastIndex += 1;
			}

			/* After push data, re-style extendable list widget */
			$( o.id ).trigger( "create" );
		},

		_loadmore: function ( event ) {
			var t = event.data,	// <li> element
				o = t.options,
				i = 0,
				myTemplate = $( "#" + o.template ),
				loadMoreItems = ( o.extenditems > t._numItemData - t._lastIndex ? t._numItemData - t._lastIndex : o.extenditems ),
				htmlData,
				more_items_to_load,
				num_next_load_items;

			/* Remove load more message */
			$( "#load_more_message" ).remove();

			/* Append More Items */
			for ( i = 0; i < loadMoreItems; i++ ) {
				htmlData = myTemplate.tmpl( t._itemData( t._lastIndex ) );
				$( o.id ).append( $( htmlData ).attr( 'id', 'li_' + t._lastIndex ) );
				t._lastIndex += 1;
			}

			/* Append "Load more" message on the last of list */
			if ( t._numItemData > t._lastIndex ) {
				myTemplate = $( "#" + o.loadmore );
				more_items_to_load = t._numItemData - t._lastIndex;
				num_next_load_items = ( o.extenditems <= more_items_to_load ) ? o.extenditems : more_items_to_load;
				htmlData = myTemplate.tmpl( { NUM_MORE_ITEMS : num_next_load_items } );

				$( o.id ).append( $( htmlData ).attr( 'id', "load_more_message" ) );
			}

			$( o.id ).trigger( "create" );
			$( o.id ).extendablelist( "refresh" );
		},

		recreate: function ( newArray ) {
			this._create( {
				itemData: function ( idx ) { return newArray[ idx ]; },
				numItemData: newArray.length
			} );
		},

		_initList: function (args ) {
			var t = this,
				o = this.options,
				myTemplate,
				more_items_to_load,
				num_next_load_items,
				htmlData;

			/* Make Gen list by template */
			if ( t._lastIndex <= 0 ) {
				t._pushData( o.template );

				/* Append "Load more" message on the last of list */
				if ( t._numItemData > t._lastIndex ) {
					myTemplate = $( "#" + o.loadmore );
					more_items_to_load = t._numItemData - t._lastIndex;
					num_next_load_items = ( o.extenditems <= more_items_to_load) ? o.extenditems : more_items_to_load;
					htmlData = myTemplate.tmpl( { NUM_MORE_ITEMS : num_next_load_items } );

					$( o.id ).append( $( htmlData ).attr( 'id', "load_more_message" ) );

					$( "#load_more_message" ).live( "click", t, t._loadmore );
				} else {
					/* No more items to load */
					$( "#load_more_message" ).die();
					$( "#load_more_message" ).remove();
				}
			}

			if ( o.childSelector == " ul" ) {
				$( o.id + " ul" ).swipelist();
			}

			$( o.id ).trigger( "create" );

			t.refresh( true );
		},

		create: function () {
			var o = this.options;

			/* external API for AJAX callback */
			this._create.apply( this, arguments );
		},

		_create: function ( args ) {
			var t = this,
				o = this.options,
				$el = this.element,
				dbtable_name;


			t.destroy();

			$.extend(this, {
				_itemData: function ( idx ) { return null; },
				_numItemData: 0,
				_cacheItemData: function ( minIdx, maxIdx ) { },
				_lastIndex: 0
			});


			// create listview markup
			t.element.addClass( function ( i, orig ) {
				return orig + " ui-listview ui-extendable-list-container" + ( t.options.inset ? " ui-listview-inset ui-corner-all ui-shadow " : "" );
			});

			o.id = "#" + $el.attr( "id" );

			if ( $el.data( "extenditems" ) ) {
				o.extenditems = parseInt( $el.data( "extenditems" ), 10 );
			}

			$( o.id ).bind( "pagehide", function (e) {
				$( o.id ).empty();
			});

			/* Scroll view */
			if ( $( ".ui-scrollview-clip" ).size() > 0) {
				o.scrollview = true;
			} else {
				o.scrollview = false;
			}

			if ( args ) {
				if ( !t._loadData( args ) ) {
					return;
				}
			} else {
				// Legacy support: dbtable
				console.warn("WARNING: The data interface of extendable list is changed. \nOld data interface(data-dbtable) is still supported, but will be removed in next version. \nPlease fix your code soon!");

				if ( $( o.id ).hasClass( "elLoadSuccess" ) ) {
					dbtable_name = $el.jqmData('dbtable');
					o.dbtable = window[ dbtable_name ];
					if ( !(o.dbtable) ) {
						o.dbtable = { };
					}
					t._itemData = function ( idx ) {
						return o.dbtable[ idx ];
					};
					t._numItemData = o.dbtable.length;

				} else {
					console.warn("No elLoadSuccess class");
					return;
				}
			}

			if ( $el.data( "template" ) ) {
				o.template = $el.data( "template" );

				/* to support swipe list, <li> or <ul> can be main node of extendable list. */
				if ( $el.data( "swipelist" ) == true ) {
					o.childSelector = " ul";
				} else {
					o.shildSelector = " li";
				}
			}
			t._initList( args );
		},

		_loadData : function ( args ) {
			var self = this;

			if ( args.itemData && typeof args.itemData == 'function'  ) {
				self._itemData = args.itemData;
			} else {
				return false;
			}
			if ( args.numItemData ) {
				if ( typeof args.numItemData == 'function' ) {
					self._numItemData = args.numItemData( );
				} else if ( typeof args.numItemData == 'number' ) {
					self._numItemData = args.numItemData;
				} else {
					return false;
				}
			} else {
				return false;
			}
			return true;
		},


		destroy : function () {
			var o = this.options,
				eOTAL_ITEMS = 0,
				last_index = 0;

			$( o.id ).empty();

			$( "#load_more_message" ).die();
		},

		_itemApply: function ( $list, item ) {
			var $countli = item.find( ".ui-li-count" );

			if ( $countli.length ) {
				item.addClass( "ui-li-has-count" );
			}

			$countli.addClass( "ui-btn-up-" + ( $list.jqmData( "counttheme" ) || this.options.countTheme ) + " ui-btn-corner-all" );

			// TODO class has to be defined in markup
			item.find( "h1, h2, h3, h4, h5, h6" ).addClass( "ui-li-heading" ).end()
				.find( "p, dl" ).addClass( "ui-li-desc" ).end()
				.find( ">img:eq(0), .ui-link-inherit>img:eq(0)" ).addClass( "ui-li-thumb" ).each(function () {
					item.addClass( $( this ).is( ".ui-li-icon" ) ? "ui-li-has-icon" : "ui-li-has-thumb" );
				}).end()
				.find( ".ui-li-aside" ).each(function () {
					var $this = $( this );
					$this.prependTo( $this.parent() ); //shift aside to front for css float
				});
		},

		_removeCorners: function ( li, which ) {
			var top = "ui-corner-top ui-corner-tr ui-corner-tl",
				bot = "ui-corner-bottom ui-corner-br ui-corner-bl";

			li = li.add( li.find( ".ui-btn-inner, .ui-li-link-alt, .ui-li-thumb" ) );

			if ( which === "top" ) {
				li.removeClass( top );
			} else if ( which === "bottom" ) {
				li.removeClass( bot );
			} else {
				li.removeClass( top + " " + bot );
			}
		},

		_refreshCorners: function ( create ) {
			var $li,
				$visibleli,
				$topli,
				$bottomli;

			if ( this.options.inset ) {
				$li = this.element.children( "li" );
				// at create time the li are not visible yet so we need to rely on .ui-screen-hidden
				$visibleli = create ? $li.not( ".ui-screen-hidden" ) : $li.filter( ":visible" );

				this._removeCorners( $li );

				// Select the first visible li element
				$topli = $visibleli.first()
					.addClass( "ui-corner-top" );

				$topli.add( $topli.find( ".ui-btn-inner" ) )
					.find( ".ui-li-link-alt" )
						.addClass( "ui-corner-tr" )
					.end()
					.find( ".ui-li-thumb" )
						.not( ".ui-li-icon" )
						.addClass( "ui-corner-tl" );

				// Select the last visible li element
				$bottomli = $visibleli.last()
					.addClass( "ui-corner-bottom" );

				$bottomli.add( $bottomli.find( ".ui-btn-inner" ) )
					.find( ".ui-li-link-alt" )
						.addClass( "ui-corner-br" )
					.end()
					.find( ".ui-li-thumb" )
						.not( ".ui-li-icon" )
						.addClass( "ui-corner-bl" );
			}
		},

		refresh: function ( create ) {
			this.parentPage = this.element.closest( ".ui-page" );
			this._createSubPages();

			var o = this.options,
				$list = this.element,
				self = this,
				dividertheme = $list.jqmData( "dividertheme" ) || o.dividerTheme,
				listsplittheme = $list.jqmData( "splittheme" ),
				listspliticon = $list.jqmData( "spliticon" ),
				li = $list.children( "li" ),
				counter = $.support.cssPseudoElement || !$.nodeName( $list[ 0 ], "ol" ) ? 0 : 1,
				item,
				itemClass,
				itemTheme,
				a,
				last,
				splittheme,
				countParent,
				icon,
				pos,
				numli;

			if ( counter ) {
				$list.find( ".ui-li-dec" ).remove();
			}

			for ( pos = 0, numli = li.length; pos < numli; pos++ ) {
				item = li.eq( pos );
				itemClass = "ui-li";

				// If we're creating the element, we update it regardless
				if ( create || !item.hasClass( "ui-li" ) ) {
					itemTheme = item.jqmData( "theme" ) || o.theme;
					a = item.children( "a" );

					if ( a.length ) {
						icon = item.jqmData( "icon" );

						item.buttonMarkup({
							wrapperEls: "div",
							shadow: false,
							corners: false,
							iconpos: "right",
							/* icon: a.length > 1 || icon === false ? false : icon || "arrow-r",*/
							icon: false,	/* Remove unnecessary arrow icon */
							theme: itemTheme
						});

						if ( ( icon != false ) && ( a.length == 1 ) ) {
							item.addClass( "ui-li-has-arrow" );
						}

						a.first().addClass( "ui-link-inherit" );

						if ( a.length > 1 ) {
							itemClass += " ui-li-has-alt";

							last = a.last();
							splittheme = listsplittheme || last.jqmData( "theme" ) || o.splitTheme;

							last.appendTo(item)
								.attr( "title", last.getEncodedText() )
								.addClass( "ui-li-link-alt" )
								.empty()
								.buttonMarkup({
									shadow: false,
									corners: false,
									theme: itemTheme,
									icon: false,
									iconpos: false
								})
								.find( ".ui-btn-inner" )
								.append(
									$( "<span />" ).buttonMarkup( {
										shadow : true,
										corners : true,
										theme : splittheme,
										iconpos : "notext",
										icon : listspliticon || last.jqmData( "icon" ) || o.splitIcon
									})
								);
						}
					} else if ( item.jqmData( "role" ) === "list-divider" ) {

						itemClass += " ui-li-divider ui-btn ui-bar-" + dividertheme;
						item.attr( "role", "heading" );

						//reset counter when a divider heading is encountered
						if ( counter ) {
							counter = 1;
						}

					} else {
						itemClass += " ui-li-static ui-body-" + itemTheme;
					}
				}

				if ( counter && itemClass.indexOf( "ui-li-divider" ) < 0 ) {
					countParent = item.is( ".ui-li-static:first" ) ? item : item.find( ".ui-link-inherit" );

					countParent.addClass( "ui-li-jsnumbering" )
						.prepend( "<span class='ui-li-dec'>" + (counter++) + ". </span>" );
				}

				item.add( item.children( ".ui-btn-inner" ) ).addClass( itemClass );

				self._itemApply( $list, item );
			}

			this._refreshCorners( create );
		},

		//create a string for ID/subpage url creation
		_idStringEscape: function ( str ) {
			return str.replace(/\W/g , "-");

		},

		_createSubPages: function () {
			var parentList = this.element,
				parentPage = parentList.closest( ".ui-page" ),
				parentUrl = parentPage.jqmData( "url" ),
				parentId = parentUrl || parentPage[ 0 ][ $.expando ],
				parentListId = parentList.attr( "id" ),
				o = this.options,
				dns = "data-" + $.mobile.ns,
				self = this,
				persistentFooterID = parentPage.find( ":jqmData(role='footer')" ).jqmData( "id" ),
				hasSubPages,
				newRemove;

			if ( typeof listCountPerPage[ parentId ] === "undefined" ) {
				listCountPerPage[ parentId ] = -1;
			}

			parentListId = parentListId || ++listCountPerPage[ parentId ];

			$( parentList.find( "li>ul, li>ol" ).toArray().reverse() ).each(function ( i ) {
				var self = this,
					list = $( this ),
					listId = list.attr( "id" ) || parentListId + "-" + i,
					parent = list.parent(),
					nodeEls,
					title = nodeEls.first().getEncodedText(),//url limits to first 30 chars of text
					id = ( parentUrl || "" ) + "&" + $.mobile.subPageUrlKey + "=" + listId,
					theme = list.jqmData( "theme" ) || o.theme,
					countTheme = list.jqmData( "counttheme" ) || parentList.jqmData( "counttheme" ) || o.countTheme,
					newPage,
					anchor;

				nodeEls = $( list.prevAll().toArray().reverse() );
				nodeEls = nodeEls.length ? nodeEls : $( "<span>" + $.trim(parent.contents()[ 0 ].nodeValue) + "</span>" );

				//define hasSubPages for use in later removal
				hasSubPages = true;

				newPage = list.detach()
							.wrap( "<div " + dns + "role='page' " +	dns + "url='" + id + "' " + dns + "theme='" + theme + "' " + dns + "count-theme='" + countTheme + "'><div " + dns + "role='content'></div></div>" )
							.parent()
								.before( "<div " + dns + "role='header' " + dns + "theme='" + o.headerTheme + "'><div class='ui-title'>" + title + "</div></div>" )
								.after( persistentFooterID ? $( "<div " + dns + "role='footer' " + dns + "id='" + persistentFooterID + "'>" ) : "" )
								.parent()
									.appendTo( $.mobile.pageContainer );

				newPage.page();

				anchor = parent.find('a:first');

				if ( !anchor.length ) {
					anchor = $( "<a/>" ).html( nodeEls || title ).prependTo( parent.empty() );
				}

				anchor.attr( "href", "#" + id );

			}).extendablelist();

			// on pagehide, remove any nested pages along with the parent page, as long as they aren't active
			// and aren't embedded
			if ( hasSubPages &&
					parentPage.is( ":jqmData(external-page='true')" ) &&
					parentPage.data( "page" ).options.domCache === false ) {

				newRemove = function ( e, ui ) {
					var nextPage = ui.nextPage, npURL;

					if ( ui.nextPage ) {
						npURL = nextPage.jqmData( "url" );
						if ( npURL.indexOf( parentUrl + "&" + $.mobile.subPageUrlKey ) !== 0 ) {
							self.childPages().remove();
							parentPage.remove();
						}
					}
				};

				// unbind the original page remove and replace with our specialized version
				parentPage
					.unbind( "pagehide.remove" )
					.bind( "pagehide.remove", newRemove);
			}
		},

		// TODO sort out a better way to track sub pages of the extendable listview this is brittle
		childPages: function () {
			var parentUrl = this.parentPage.jqmData( "url" );

			return $( ":jqmData(url^='" +  parentUrl + "&" + $.mobile.subPageUrlKey + "')" );
		}
	});

	//auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		$( $.tizen.extendablelist.prototype.options.initSelector, e.target ).extendablelist();
	});

}( jQuery ));
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 * Copyright (c) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Elliot Smith <elliot.smith@intel.com>
 */

// fastscroll is a scrollview controller, which binds
// a scrollview to a a list of short cuts; the shortcuts are built
// from the text on dividers in the list. Clicking on a shortcut
// instantaneously jumps the scrollview to the selected list divider;
// mouse movements on the shortcut column move the scrollview to the
// list divider matching the text currently under the touch; a popup
// with the text currently under the touch is also displayed.
//
// To apply, add the attribute data-fastscroll="true" to a listview
// (a <ul> or <ol> element inside a page). Alternatively, call
// fastscroll() on an element.
//
// The closest element with class ui-scrollview-clip is used as the
// scrollview to be controlled.
//
// If a listview has no dividers or a single divider, the widget won't
// display.

/**
	@class fastscroll
	The shortcut scroll widget shows a shortcut list that is bound to its parent scroll bar and respective list view. This widget is displayed as a text pop-up representing shortcuts to different list dividers in the list view. If you select a shortcut text from the shortcut scroll, the parent list view is moved to the location representing the selected shortcut.

	To add a shortcut scroll widget to the application, use the following code:

		<div class="content" data-role="content" data-scroll="y">
			<ul id="contacts" data-role="listview" data-fastscroll="true">
				<li>Anton</li>
			</ul>
		</div>

	For the shortcut scroll widget to be visible, the parent list view must have multiple list dividers.
*/

/**
	@property {Boolean}  data-fastscroll
	When set to true, creates a shortcut scroll using the HTML unordered list (&lt;ul&gt;) element.
*/
/**
	@method fastscroll
	The shortcut scroll is created for the closest list view with the ui-scrollview-clip class.
*/
(function ( $, undefined ) {

	$.widget( "tizen.fastscroll", $.mobile.widget, {
		options: {
			initSelector: ":jqmData(fastscroll)"
		},

		_create: function () {
			var $el = this.element,
				self = this,
				$popup,
				page = $el.closest( ':jqmData(role="page")' ),
				jumpToDivider;

			this.scrollview = $el.closest( '.ui-scrollview-clip' );
			this.shortcutsContainer = $( '<div class="ui-fastscroll"/>' );
			this.shortcutsList = $( '<ul></ul>' );

			// popup for the hovering character
			this.scrollview.append($( '<div class="ui-fastscroll-popup"></div>' ) );
			$popup = this.scrollview.find( '.ui-fastscroll-popup' );

			this.shortcutsContainer.append( this.shortcutsList );
			this.scrollview.append( this.shortcutsContainer );

			// find the bottom of the last item in the listview
			this.lastListItem = $el.children().last();

			// remove scrollbars from scrollview
			this.scrollview.find( '.ui-scrollbar' ).hide();

			jumpToDivider = function ( divider ) {
				// get the vertical position of the divider (so we can scroll to it)
				var dividerY = $( divider ).position().top,
					// find the bottom of the last list item
					bottomOffset = self.lastListItem.outerHeight( true ) + self.lastListItem.position().top,
					scrollviewHeight = self.scrollview.height(),

				// check that after the candidate scroll, the bottom of the
				// last item will still be at the bottom of the scroll view
				// and not some way up the page
					maxScroll = bottomOffset - scrollviewHeight,
					dstOffset;

				dividerY = ( dividerY > maxScroll ? maxScroll : dividerY );

				// don't apply a negative scroll, as this means the
				// divider should already be visible
				dividerY = Math.max( dividerY, 0 );

				// apply the scroll
				self.scrollview.scrollview( 'scrollTo', 0, -dividerY );

				dstOffset = self.scrollview.offset();
				$popup
					.text( $( divider ).text() )
					.css( { marginLeft: -($popup.width() / 2),
							marginTop: -($popup.height() / 2) } )
					.show();
			};

			this.shortcutsList
			// bind mouse over so it moves the scroller to the divider
				.bind( 'touchstart mousedown vmousedown touchmove vmousemove vmouseover ', function ( e ) {
					// Get coords relative to the element
					var coords = $.mobile.tizen.targetRelativeCoordsFromEvent( e ),
						shortcutsListOffset = self.shortcutsList.offset();

					// If the element is a list item, get coordinates relative to the shortcuts list
					if ( e.target.tagName.toLowerCase() === "li" ) {
						coords.x += $( e.target ).offset().left - shortcutsListOffset.left;
						coords.y += $( e.target ).offset().top  - shortcutsListOffset.top;
					}

					self.shortcutsList.find( 'li' ).each( function () {
						var listItem = $( this );
						$( listItem )
							.removeClass( "ui-fastscroll-hover" )
							.removeClass( "ui-fastscroll-hover-up" )
							.removeClass( "ui-fastscroll-hover-down" );
					});
					// Hit test each list item
					self.shortcutsList.find( 'li' ).each( function () {
						var listItem = $( this ),
							l = listItem.offset().left - shortcutsListOffset.left,
							t = listItem.offset().top  - shortcutsListOffset.top,
							r = l + Math.abs(listItem.outerWidth( true ) ),
							b = t + Math.abs(listItem.outerHeight( true ) );

						if ( coords.x >= l && coords.x <= r && coords.y >= t && coords.y <= b ) {
							jumpToDivider( $( listItem.data( 'divider' ) ) );
							$( listItem ).addClass( "ui-fastscroll-hover" );
							if ( listItem.index() > 0 ) {
								$( listItem ).siblings().eq( listItem.index() - 1 ).addClass( "ui-fastscroll-hover-up" );
							}
							$( listItem ).siblings().eq( listItem.index() ).addClass( "ui-fastscroll-hover-down" );
							return false;
						}
						return true;
					} );



					e.preventDefault();
					e.stopPropagation();
				} )
				// bind mouseout of the fastscroll container to remove popup
				.bind( 'touchend mouseup vmouseup vmouseout', function () {
					$popup.hide();
				} );

			if ( page && !( page.is( ':visible' ) ) ) {
				page.bind( 'pageshow', function () { self.refresh(); } );
			} else {
				this.refresh();
			}

			// refresh the list when dividers are filtered out
			$el.bind( 'updatelayout', function () {
				self.refresh();
			} );
		},

		refresh: function () {
			var self = this,
				shortcutsTop,
				minClipHeight,
				dividers,
				listItems;

			this.shortcutsList.find( 'li' ).remove();

			// get all the dividers from the list and turn them into shortcuts
			dividers = this.element.find( '.ui-li-divider' );

			// get all the list items
			listItems = this.element.find('li').not('.ui-li-divider');

			// only use visible dividers
			dividers = dividers.filter( ':visible' );
			listItems = listItems.filter( ':visible' );

			if ( dividers.length < 2 ) {
				this.shortcutsList.hide();
				return;
			}

			this.shortcutsList.show();

			this.lastListItem = listItems.last();

			dividers.each( function ( index, divider ) {
				self.shortcutsList
					.append( $( '<li>' + $( divider ).text() + '</li>' )
						.data( 'divider', divider ) );
			} );

			// position the shortcut flush with the top of the first list divider
			shortcutsTop = dividers.first().position().top;
			this.shortcutsContainer.css( 'top', shortcutsTop );

			// make the scrollview clip tall enough to show the whole of the shortcutslist
			minClipHeight = shortcutsTop + this.shortcutsContainer.outerHeight() + 'px';
			this.scrollview.css( 'min-height', minClipHeight );
		}
	} );

	$( document ).bind( "pagecreate create", function ( e ) {
		$( $.tizen.fastscroll.prototype.options.initSelector, e.target )
			.not( ":jqmData(role='none'), :jqmData(role='nojs')" )
			.fastscroll();
	} );

} ( jQuery ) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Minkyu Kang <mk7.kang@samsung.com>
 */

/*
 * Gallery widget
 *
 * HTML Attributes
 *
 *  data-role: set to 'gallery'
 *  data-index: start index
 *  data-vertical-align: set to top or middle or bottom.
 *
 * APIs
 *
 *  add(file): add the image (parameter: url of iamge)
 *  remove(index): remove the image (parameter: index of image)
 *  refresh(index): refresh the widget, should be called after add or remove. (parameter: start index)
 *  empty: remove all of images from the gallery
 *  length: get length of images
 *  value(index): get or set current index of gallery (parameter: index of image)
 *
 * Events
 *
 *  N/A
 *
 * Example
 *
 * <div data-role="gallery" id="gallery" data-index="3" data-vertical-align="middle">
 *	<img src="01.jpg">
 *	<img src="02.jpg">
 *	<img src="03.jpg">
 *	<img src="04.jpg">
 *	<img src="05.jpg">
 * </div>
 *
 *
 * $('#gallery-add').bind('vmouseup', function ( e ) {
 *	$('#gallery').gallery('add', '9.jpg');
 *	$('#gallery').gallery('add', '10.jpg');
 *	$('#gallery').gallery('refresh');
 * });
 *
 * $('#gallery-del').bind('vmouseup', function ( e ) {
 *	$('#gallery').gallery('remove');
 * });
 *
 */

 /**
	@class Gallery
	The gallery widget shows images in a gallery on the screen. <br/><br/> To add an gallery widget to the application, use the following code:

		<div data-role="gallery" id="gallery" data-vertical-align="middle" data-index="3">
			<img src="01.jpg">
			<img src="02.jpg">
			<img src="03.jpg">
			<img src="04.jpg">
			<img src="05.jpg">
		</div>
*/
/**
	@property {Integer} data-index
	Defines the index number of the first image in the gallery.
	<br/>The default value is 0.
*/
/**
	@property {String} data-vertical-align
	Defines the image alignment. The alignment options are top, middle, and bottom.
	<br/>The default value is top.
*/
/**
	@method add
	The add method is used to add an image to the gallery. The image_file attribute defines the image file URL.

		<div id="gallery" data-role="gallery" data-vertical-align="middle"></div>
		$("#gallery").gallery('add', [image_file]);
*/
/**
	@method remove
	The remove method is used to delete an image from the gallery. The image_index attribute defines the index of the image to be deleted. If not set removes current image.

		<div id="gallery" data-role="gallery" data-vertical-align="middle"></div>
		$("#gallery").gallery('remove', [image_index]);
*/
/**
	@method refresh
	The refresh method is used to refresh the gallery. This method must be called after adding images to the gallery.

		<div id="gallery" data-role="gallery" data-vertical-align="middle"></div>
		$("#gallery").gallery('refresh');
*/
/**
	@method empty
	The empty method is used to remove all of images from the gallery.

		<div id="gallery" data-role="gallery" data-vertical-align="middle"></div>
		$("#gallery").gallery('empty');
*/
/**
	@method length
	The length method is used to get length of images.

		<div id="gallery" data-role="gallery" data-vertical-align="middle"></div>
		length = $("#gallery").gallery('length');
*/
/**
	@method value
	The value method is used to get or set current index of gallery. The image_index attribute defines the index of the image to be set. If not get current index.

		<div id="gallery" data-role="gallery" data-vertical-align="middle"></div>
		value = $("#gallery").gallery('value');
		$("#gallery").gallery('value', [image_index]);
*/
(function ( $, window, undefined ) {
	$.widget( "tizen.gallery", $.mobile.widget, {
		options: {
			flicking: false,
			duration: 500
		},

		dragging: false,
		moving: false,
		max_width: 0,
		max_height: 0,
		org_x: 0,
		org_time: null,
		cur_img: null,
		prev_img: null,
		next_img: null,
		images: [],
		images_hold: [],
		index: 0,
		align_type: null,
		direction: 1,
		container: null,

		_resize: function ( index ) {
			var img = this.images[index],
				width = this.images[index].width(),
				height = this.images[index].height(),
				margin = 0,
				ratio,
				img_max_width = this.max_width - margin,
				img_max_height = this.max_height - margin;

			ratio = height / width;

			if ( width > img_max_width ) {
				img.width( img_max_width );
				img.height( img_max_width * ratio );
			}

			height = img.height();

			if ( height > img_max_height ) {
				img.height( img_max_height );
				img.width( img_max_height / ratio );
			}
		},

		_align: function ( index, obj ) {
			var img = this.images[index],
				img_top = 0;

			if ( !obj ) {
				return;
			}
			if ( !obj.length ) {
				return;
			}

			if ( this.align_type == "middle" ) {
				img_top = ( this.max_height - img.height() ) / 2;
			} else if ( this.align_type == "bottom" ) {
				img_top = this.max_height - img.height();
			} else {
				img_top = 0;
			}

			obj.css( 'top', img_top + 'px' );
		},

		_attach: function ( index, obj ) {
			var self = this,
				processing = function () {
					self._resize( index );
					self._align( index, obj );
				},
				loading = function () {
					if ( self.images[index] === undefined ) {
						return;
					}

					if ( !self.images[index].height() ) {
						setTimeout( loading, 10 );
						return;
					}

					processing();
				};

			if ( !obj ) {
				return;
			}
			if ( !obj.length ) {
				return;
			}
			if ( index < 0 ) {
				return;
			}
			if ( !this.images.length ) {
				return;
			}
			if ( index >= this.images.length ) {
				return;
			}

			obj.css( "display", "block" );
			obj.append( this.images[index] );

			loading();
		},

		_detach: function ( index, obj ) {
			if ( !obj ) {
				return;
			}
			if ( !obj.length ) {
				return;
			}
			if ( index < 0 ) {
				return;
			}
			if ( index >= this.images.length ) {
				return;
			}

			obj.css( "display", "none" );
			this.images[index].removeAttr("style");
			this.images[index].detach();
		},

		_detach_all: function () {
			var i;

			for ( i = 0; i < this.images.length; i++ ) {
				this.images[i].detach();
			}
		},

		_drag: function ( _x ) {
			var delta,
				coord_x;

			if ( !this.dragging ) {
				return;
			}

			if ( this.options.flicking === false ) {
				delta = this.org_x - _x;

				// first image
				if ( delta < 0 && !this.prev_img.length ) {
					return;
				}
				// last image
				if ( delta > 0 && !this.next_img.length ) {
					return;
				}
			}

			coord_x = _x - this.org_x;

			this.cur_img.css( 'left', coord_x + 'px' );
			if ( this.next_img.length ) {
				this.next_img.css( 'left', coord_x + this.window_width + 'px' );
			}
			if ( this.prev_img.length ) {
				this.prev_img.css( 'left', coord_x - this.window_width + 'px' );
			}
		},

		_move: function ( _x ) {
			var delta = this.org_x - _x,
				flip = 0,
				drag_time,
				sec,
				self;

			if ( delta == 0 ) {
				return;
			}

			if ( delta > 0 ) {
				flip = delta < ( this.max_width * 0.45 ) ? 0 : 1;
			} else {
				flip = -delta < ( this.max_width * 0.45 ) ? 0 : 1;
			}

			if ( !flip ) {
				drag_time = Date.now() - this.org_time;

				if ( Math.abs( delta ) / drag_time > 1 ) {
					flip = 1;
				}
			}

			if ( flip ) {
				if ( delta > 0 && this.next_img.length ) {
					/* next */
					this._detach( this.index - 1, this.prev_img );

					this.prev_img = this.cur_img;
					this.cur_img = this.next_img;
					this.next_img = this.next_img.next();

					this.index++;

					if ( this.next_img.length ) {
						this.next_img.css( 'left', this.window_width + 'px' );
						this._attach( this.index + 1, this.next_img );
					}

					this.direction = 1;

				} else if ( delta < 0 && this.prev_img.length ) {
					/* prev */
					this._detach( this.index + 1, this.next_img );

					this.next_img = this.cur_img;
					this.cur_img = this.prev_img;
					this.prev_img = this.prev_img.prev();

					this.index--;

					if ( this.prev_img.length ) {
						this.prev_img.css( 'left', -this.window_width + 'px' );
						this._attach( this.index - 1, this.prev_img );
					}

					this.direction = -1;
				}
			}

			sec = this.options.duration;
			self = this;

			this.moving = true;

			setTimeout( function () {
				self.moving = false;
			}, sec - 50 );

			this.cur_img.animate( { left: 0 }, sec );
			if ( this.next_img.length ) {
				this.next_img.animate( { left: this.window_width }, sec );
			}
			if ( this.prev_img.length ) {
				this.prev_img.animate( { left: -this.window_width }, sec );
			}
		},

		_add_event: function () {
			var self = this,
				date;

			this.container.bind( 'vmousemove', function ( e ) {
				e.preventDefault();

				if ( self.moving ) {
					return;
				}
				if ( !self.dragging ) {
					return;
				}

				self._drag( e.pageX );
			} );

			this.container.bind( 'vmousedown', function ( e ) {
				e.preventDefault();

				if ( self.moving ) {
					return;
				}

				self.dragging = true;

				self.org_x = e.pageX;

				self.org_time = Date.now();
			} );

			this.container.bind( 'vmouseup', function ( e ) {
				if ( self.moving ) {
					return;
				}

				self.dragging = false;

				self._move( e.pageX );
			} );

			this.container.bind( 'vmouseout', function ( e ) {
				if ( self.moving ) {
					return;
				}
				if ( !self.dragging ) {
					return;
				}

				if ( ( e.pageX < 20 ) ||
						( e.pageX > ( self.max_width - 20 ) ) ) {
					self._move( e.pageX );
					self.dragging = false;
				}
			} );
		},

		_del_event: function () {
			this.container.unbind( 'vmousemove' );
			this.container.unbind( 'vmousedown' );
			this.container.unbind( 'vmouseup' );
			this.container.unbind( 'vmouseout' );
		},

		_show: function () {
			/* resizing */
			this.window_width = $( window ).width();
			this.max_width = this._get_width();
			this.max_height = this._get_height();
			this.container.css( 'height', this.max_height );

			this.cur_img = $( 'div' ).find( '.ui-gallery-bg:eq(' + this.index + ')' );
			this.prev_img = this.cur_img.prev();
			this.next_img = this.cur_img.next();

			this._attach( this.index - 1, this.prev_img );
			this._attach( this.index, this.cur_img );
			this._attach( this.index + 1, this.next_img );

			if ( this.prev_img.length ) {
				this.prev_img.css( 'left', -this.window_width + 'px' );
			}

			this.cur_img.css( 'left', '0px' );

			if ( this.next_img.length ) {
				this.next_img.css( 'left', this.window_width + 'px' );
			}
		},

		show: function () {
			if ( !this.images.length ) {
				return;
			}

			this._show();
			this._add_event();
		},

		_hide: function () {
			this._detach( this.index - 1, this.prev_img );
			this._detach( this.index, this.cur_img );
			this._detach( this.index + 1, this.next_img );
		},

		hide: function () {
			this._hide();
			this._del_event();
		},

		_get_width: function () {
			return $( this.element ).width();
		},

		_get_height: function () {
			var $page = $( this.element ).parentsUntil( 'ui-page' ),
				$content = $page.children( '.ui-content' ),
				header_h = $page.children( '.ui-header' ).outerHeight() || 0,
				footer_h = $page.children( '.ui-footer' ).outerHeight() || 0,
				padding = parseFloat( $content.css( 'padding-top' ) )
					+ parseFloat( $content.css( 'padding-bottom' ) ),
				content_h = $( window ).height() - header_h - footer_h - padding;

			return content_h;
		},

		_create: function () {
			var temp_img,
				self = this,
				index,
				i = 0;

			$( this.element ).wrapInner( '<div class="ui-gallery"></div>' );
			$( this.element ).find( 'img' ).wrap( '<div class="ui-gallery-bg"></div>' );

			this.container = $( this.element ).find('.ui-gallery');

			temp_img = $( 'div' ).find( '.ui-gallery-bg:first' );

			while ( temp_img.length ) {
				this.images[i] = temp_img.find( 'img' );
				temp_img = temp_img.next();
				i++;
			}

			this._detach_all();

			index = parseInt( $( this.element ).jqmData( 'index' ), 10 );
			if ( !index ) {
				index = 0;
			}
			if ( index < 0 ) {
				index = 0;
			}
			if ( index >= this.images.length ) {
				index = this.images.length - 1;
			}

			this.index = index;

			this.align_type = $( this.element ).jqmData( 'vertical-align' );

			$( window ).bind( 'resize', function () {
				self.refresh();
			});
		},

		_update: function () {
			var image_file,
				bg_html,
				temp_img;

			while ( this.images_hold.length ) {
				image_file = this.images_hold.shift();

				bg_html = $( '<div class="ui-gallery-bg"></div>' );
				temp_img = $( '<img src="' + image_file + '"></div>' );

				bg_html.append( temp_img );
				this.container.append( bg_html );
				this.images.push( temp_img );
			}

			this._detach_all();
		},

		refresh: function ( start_index ) {
			this._update();

			this._hide();

			if ( start_index === undefined ) {
				start_index = this.index;
			}
			if ( start_index < 0 ) {
				start_index = 0;
			}
			if ( start_index >= this.images.length ) {
				start_index = this.images.length - 1;
			}

			this.index = start_index;

			this._show();

			return this.index;
		},

		add: function ( file ) {
			this.images_hold.push( file );
		},

		remove: function ( index ) {
			var temp_img;

			if ( index === undefined ) {
				index = this.index;
			}

			if ( index < 0 || index >= this.images.length ) {
				return;
			}

			if ( index == this.index ) {
				temp_img = this.cur_img;

				if ( this.index == 0 ) {
					this.direction = 1;
				} else if ( this.index == this.images.length - 1 ) {
					this.direction = -1;
				}

				if ( this.direction < 0 ) {
					this.cur_img = this.prev_img;
					this.prev_img = this.prev_img.prev();
					if ( this.prev_img.length ) {
						this.prev_img.css( 'left', -this.window_width );
						this._attach( index - 2, this.prev_img );
					}
					this.index--;
				} else {
					this.cur_img = this.next_img;
					this.next_img = this.next_img.next();
					if ( this.next_img.length ) {
						this.next_img.css( 'left', this.window_width );
						this._attach( index + 2, this.next_img );
					}
				}

				this.cur_img.animate( { left: 0 }, this.options.duration );

			} else if ( index == this.index - 1 ) {
				temp_img = this.prev_img;
				this.prev_img = this.prev_img.prev();
				if ( this.prev_img.length ) {
					this.prev_img.css( 'left', -this.window_width );
					this._attach( index - 1, this.prev_img );
				}
				this.index--;

			} else if ( index == this.index + 1 ) {
				temp_img = this.next_img;
				this.next_img = this.next_img.next();
				if ( this.next_img.length ) {
					this.next_img.css( 'left', this.window_width );
					this._attach( index + 1, this.next_img );
				}

			} else {
				temp_img = $( 'div' ).find( '.ui-gallery-bg:eq(' + index + ')' );
			}

			this.images.splice( index, 1 );
			temp_img.detach();
		},

		empty: function () {
			this.images.splice( 0, this.images.length );
			this.container.find('.ui-gallery-bg').detach();
		},

		length: function () {
			return this.images.length;
		},

		value: function ( index ) {
			if ( index === undefined ) {
				return this.index;
			}

			this.refresh( index );
		}
	}); /* End of widget */

	// auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		$( e.target ).find( ":jqmData(role='gallery')" ).gallery();
	});

	$( document ).bind( "pageshow", function ( e ) {
		$( e.target ).find( ":jqmData(role='gallery')" ).gallery( 'show' );
	});

	$( document ).bind( "pagebeforehide", function ( e ) {
		$( e.target ).find( ":jqmData(role='gallery')" ).gallery( 'hide' );
	} );

}( jQuery, this ) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Wonseop Kim ( wonseop.kim@samsung.com )
*/

/**
 * "Handler" is a widget helping a user to scroll a window or panel.
 * It is different from the scrollview feature in that the handler has a fixed size
 * and disappears when a scroll size is smaller than a parent window's size.
 * If the handler widget is activated, a scroll bar on the screen will be deactivated.
 * The handler widget supports scrolling up and down and indicates the position of the scrolled window.
 *
 * HTML Attributes:
 *
 *		data-handler : This attribute is indicating that whether enable.
 *						If you want to use, you will set 'true'.
 *		data-handler-theme : Set the widget theme ( optional )
 *
 * APIs:
 *
 *		enableHandler ( boolean )
 *			: Get or set the use of handler widget.
 *			If the value is "true", it will be run handler widget.
 *			If the value is "false", it will be not run handler widget.
 *			If no value is specified, will act as a getter.
 *
 * Events:
 *
 * Examples:
 *
 *		<div data-role="content" data-scroll="y" data-handler="true">
 *			<ul data-role="listview">
 *				<li data-role="list-divider">A</li>
 *				<li><a href="#">Adam Kinkaid</a></li>
 *					...
 *			</ul>
 *		</div>
 */

/**
	@class handler
	The handler widget enables the user to vertically scroll through a page or panel using a fixed-size handle. The widget indicates the position of the scrolled window, and only appears on the screen if the parent page or panel's scroll size is larger than the screen size. <br/> To add a handler widget to the application, use the following code:

		<div data-role="content" data-scroll="y" data-handler="true">
			<ul data-role="listview">
				<li data-role="list-divider">A</li>
				<li><a href="#">Adam Kinkaid</a></li>
					...
			</ul>
		</div>
	
	You can use the enableHandler method with the handler widget to get (if no value is defined) or set the handler usage status. If the [enable] value is true, the handler is enabled; otherwise the handler is not used.

		$("#.selector").scrollview("enableHandler", [enable]);
*/
/**
	@property {Boolean} data-handler
	Enables the handler widget. The value must be set to true.
*/
/**
	@property {String} data-handler-theme
	Sets the handler widget theme.
*/
( function ( $, document, undefined ) {
	// The options of handler in scrollview
	$.tizen.scrollview.prototype.options.handler = false;
	$.tizen.scrollview.prototype.options.handlerTheme = "s";

	var originSetOption = $.tizen.scrollview.prototype._setOption,
		createHandler = function ( target ) {
			var $view = target,
				prefix = "<div class=\"ui-handler ui-handler-direction-",
				suffix = "\"><div class=\"ui-handler-track\"><div class=\"ui-handler-thumb\"></div></div></div>",
				scrollview = $view.data( "scrollview" ),
				options = scrollview.options,
				direction = options.direction,
				parentTheme = $.mobile.getInheritedTheme( scrollview, "s" ),
				theme = options.theme || parentTheme,
				isHorizontal = ( scrollview.options.direction === "x" ),
				_$view = scrollview._$view,
				_$clip = scrollview._$clip,
				scrollbar = $view.find( ".ui-scrollbar" ),
				handler = null,
				handlerThumb = null,
				viewLength = 0,
				clipLength = 0,
				handlerHeight = 0,
				handlerMargin = 0,
				trackLength = 0,
				moveTimer,
				isTouchable = $.support.touch,
				dragStartEvt = ( isTouchable ? "touchstart" : "mousedown" ) + ".handler",
				dragMoveEvt = ( isTouchable ? "touchmove" : "mousemove" ) + ".handler",
				dragStopEvt = ( isTouchable ? "touchend" : "mouseup" ) + ".handler",
				dragLeaveEvt = ( isTouchable ? " touchleave" : " mouseleave" ) + ".handler",
				calculateLength = function () {
					clipLength = ( isHorizontal ? _$clip.width() : _$clip.height() );
					viewLength = ( isHorizontal ? _$view.width() : _$view.height() ) - clipLength;
					trackLength = clipLength - handlerHeight - handlerMargin * 2;
				},
				setHanderPostion = function ( scrollPos ) {
					var handlerPos = Math.round( ( isHorizontal ? scrollPos.x : scrollPos.y ) / viewLength * trackLength );
					handlerThumb[0].style[ ( isHorizontal ? "left" : "top" ) ] = handlerPos + "px";
				},
				stopHandlerScroll = function () {
					$( document ).unbind( ".handler" );
					$view.moveData = null;
					_$view.trigger( "scrollstop" );
				};

			if ( $view.find( ".ui-handler-thumb" ).length !== 0 || typeof direction !== "string" ) {
				return;
			}

			handler = $( [ prefix, direction, suffix ].join( "" ) ).appendTo( $view.addClass( " ui-handler-" + theme ) );
			handlerThumb = $view.find( ".ui-handler-thumb" ).hide();
			handlerHeight = ( isHorizontal ? handlerThumb.width() : handlerThumb.height() );
			handlerMargin = ( isHorizontal ? parseInt( handler.css( "right" ), 10 ) : parseInt( handler.css( "bottom" ), 10 ) );

			$.extend( $view, {
				moveData : null
			});

			// handler drag
			handlerThumb.bind( dragStartEvt, {
				e : handlerThumb[0]
			}, function ( event ) {
				scrollview._stopMScroll();

				var target = event.data.e,
					t = ( isTouchable ? event.originalEvent.targetTouches[0] : event );

				target.style.opacity = 1.0;

				$view.moveData = {
					target : target,
					X : parseInt( target.style.left, 10 ) || 0,
					Y : parseInt( target.style.top, 10 ) || 0,
					pX : t.pageX,
					pY : t.pageY
				};
				calculateLength();

				_$view.trigger( "scrollstart" );

				if ( !isTouchable ) {
					event.preventDefault();
				}

				$( document ).bind( dragMoveEvt, function ( event ) {
					var moveData = $view.moveData,
						target = moveData.target,
						handlePos = 0,
						scrollPos = 0,
						t = ( isTouchable ? event.originalEvent.targetTouches[0] : event );

					handlePos = ( isHorizontal ? moveData.X + t.pageX - moveData.pX : moveData.Y + t.pageY - moveData.pY );

					if ( handlePos < 0 ) {
						handlePos = 0;
					}

					if ( handlePos > trackLength ) {
						handlePos = trackLength;
					}
					scrollPos = - Math.round( handlePos / trackLength * viewLength );

					if ( isHorizontal ) {
						scrollview._setScrollPosition( scrollPos, 0 );
						target.style.left = handlePos + "px";
					} else {
						scrollview._setScrollPosition( 0, scrollPos );
						target.style.top = handlePos + "px";
					}

					event.preventDefault();
				}).bind( dragStopEvt + dragLeaveEvt, function ( event ) {
					stopHandlerScroll();
				});
			});

			_$view.bind( dragStopEvt, function ( event ) {
				stopHandlerScroll();
			});

			$view.bind( "scrollstart", function ( event ) {
				if ( !scrollview.enableHandler() ) {
					return;
				}

				calculateLength();

				if ( viewLength < 0 || clipLength < handlerHeight ) {
					if ( scrollbar.is( ":hidden" ) ) {
						scrollbar.show();
					}
					return;
				}

				if ( scrollbar.is( ":visible" ) ) {
					scrollbar.hide();
				}

				if ( moveTimer ) {
					clearInterval( moveTimer );
					moveTimer = undefined;
				}

				handler.addClass( "ui-handler-visible" );
				handlerThumb.stop( true, true )
							.fadeIn();
			}).bind( "scrollupdate", function ( event, data ) {
				if ( !scrollview.enableHandler() || viewLength < 0 || clipLength < handlerHeight ) {
					return;
				}

				setHanderPostion( scrollview.getScrollPosition() );
			}).bind( "scrollstop", function ( event ) {
				if ( !scrollview.enableHandler() || viewLength < 0 || clipLength < handlerHeight ) {
					return;
				}

				moveTimer = setInterval( function () {
					setHanderPostion( scrollview.getScrollPosition() );
					if ( !scrollview._gesture_timer ) {
						clearInterval( moveTimer );
						moveTimer = undefined;
					}
				}, 10 );

				if ( scrollview._handlerTimer ) {
					clearTimeout( scrollview._handlerTimer );
					scrollview._handlerTimer = 0;
				}
				scrollview._handlerTimer = setTimeout( function () {
					if ( scrollview._timerID === 0 && $view.moveData === null ) {
						handlerThumb.stop( true, true )
									.css( "opacity", 1.0 )
									.fadeOut( function () {
										handler.removeClass( "ui-handler-visible" );
									});
						scrollview._handlerTimer = 0;
					}
				}, 1000 );
			}).bind( "mousewheel", function ( event ) {
				handler.removeClass( "ui-handler-visible" );
				setHanderPostion( scrollview.getScrollPosition() );
			});
		};

	$.extend( $.tizen.scrollview.prototype, {
		enableHandler: function ( enabled ) {
			if ( typeof enabled === 'undefined' ) {
				return this.options.handler;
			}

			this.options.handler = !!enabled;

			var $view = this.element;
			if ( this.options.handler ) {
				if ( $view.find( ".ui-handler" ).length === 0 ) {
					createHandler( $view );
				}

				$view.find( ".ui-scrollbar" ).hide();
				$view.find( ".ui-handler" ).show();
			} else {
				$view.find( ".ui-handler" ).removeClass( "ui-handler-visible" ).hide();
				$view.find( ".ui-scrollbar" ).show();
			}
		},

		_setHandlerTheme: function ( handlerTheme ) {
			if ( !handlerTheme ) {
				return;
			}

			var oldClass = "ui-handler-" + this.options.handlerTheme,
				newClass = "ui-handler-" + handlerTheme;

			this.element.removeClass( oldClass ).addClass( newClass );
			this.options.handlerTheme = handlerTheme;
		},

		_setOption: function ( key, value ) {
			switch ( key ) {
			case "handler":
				this.enableHandler( value );
				break;
			case "handlerTheme":
				this._setHandlerTheme( value );
				break;
			default:
				originSetOption.call( this, key, value );
			}
		},

		_handlerTimer : 0
	});

	$( document ).delegate( ":jqmData(scroll)", "scrollviewcreate", function () {
		var widget = $( this );
		if ( widget.attr( "data-" + $.mobile.ns + "scroll" ) === "none"
				|| widget.attr( "data-" + $.mobile.ns + "handler" ) !== "true" ) {
			return;
		}
		widget.scrollview( "enableHandler", "true" );
	});
} ( jQuery, document ) );
/* ***************************************************************************
* style : normal, check
* option :
*    - folded : decide to show divider press effect or not
*    - line : decide to draw divider line or not
*/
/**
	@class ListDivider
	The list divider widget is used as a list separator for grouping lists. List dividers can be used in Tizen as described in the jQueryMobile documentation for list dividers.<br/>
	To add a list divider widget to the application, use the following code:

		<li data-role="list-divider" data-style="check">
		<form><input type="checkbox" name="c2line-check1" /></form></li>

	The list divider can define callbacks for events as described in the jQueryMobile documentation for list events. <br/> You can use methods with the list divider as described in the jQueryMobile documentation for list methods.

	@since tizen2.0	
*/
/**
	@property {String} data-style
	Sets the style of the list divider. The style options are dialogue, check, expandable, and checkexpandable.
*/

(function ( $, undefined ) {
	$.widget( "tizen.listdivider", $.mobile.widget, {
		options: {
			initSelector: ":jqmData(role='list-divider')",
			folded : false,
			listDividerLine : true,
		},

		_create: function () {

			var $listdivider = this.element,
				openStatus = true,
				expandSrc,
				listDividerLine = true,
				style = $listdivider.attr( "data-style" );

			if ( $listdivider.data("line") === false ) {
				this.options.listDividerLine = false;
			}

			if ( $listdivider.data("folded") === true ) {
				this.options.folded = true;
			}

			if ( style == undefined || style === "normal" || style === "check" ) {
				if ( this.options.folded ) {
					$listdivider.buttonMarkup();
				} else {
					$listdivider.wrapInner("<span class='ui-btn-text'></span>");
				}

				if ( this.options.listDividerLine ) {
					expandSrc = "<span class='ui-divider-normal-line'></span>";
					if ( this.options.folded ) {
						$( expandSrc ).appendTo( $listdivider.children( ".ui-btn-inner" ) );
					} else {
						$( expandSrc ).appendTo( $listdivider);
					}
				}
			}

			$listdivider.bind( "vclick", function ( event, ui ) {
			/* need to implement expand/collapse divider */
			});
		},
	});

	//auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		$( $.tizen.listdivider.prototype.options.initSelector, e.target ).listdivider();
	});
}( jQuery ) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Yonghwi Park <yonghwi0324.park@samsung.com>
 *		 Wonseop Kim <wonseop.kim@samsung.com>
*/

/**
 *
 * MultiMediaView is a widget that lets the user view and handle multimedia contents.
 * Video and audio elements are coded as standard HTML elements and enhanced by the 
 * MultiMediaview to make them attractive and usable on a mobile device.
 *
 * HTML Attributes:
 *			data-theme : Set a theme of widget.
 *				If this value is not defined, widget will use parent`s theme. (optional)
 *			data-controls : If this value is 'true', widget will use belonging controller.
 *				If this value is 'false', widget will use browser`s controller.
 *				Default value is 'true'.
 *			data-full-screen : Set a status that full-screen when inital start.
 *				Default value is 'false'.
 *
 * APIs:
 *			width( [number] )
 *					: Get or set the width of widget.
 *					The first argument is the width of widget.
 *					If no first argument is specified, will act as a getter.
 *			height( [number] )
 *					: Get or set the height of widget.
 *					The first argument is the height of widget.
 *					If no first argument is specified, will act as a getter.
 *			fullScreen( [boolean] )
 *					: Get or Set the status of full-screen.
 *					If no first argument is specified, will act as a getter.
 *
 * Events:
 *
 *			create :  triggered when a multimediaview is created.
 *
 * Examples:
 *
 *			VIDEO :
 *				<video data-controls="true" style="width:100%;">
 *					<source src="media/oceans-clip.mp4" type="video/mp4" />
 *					Your browser does not support the video tag.
 *				</video>
 *
 *			AUDIO :
 *				<audio data-controls="true" style="width:100%;">
 *					<source src="media/Over the horizon.mp3" type="audio/mp3" />
 *					Your browser does not support the audio tag.
 *				</audio>
 *
 */
/**
	@class MutimediaView
	The multimedia view widget shows a player control that you can use to view and handle multimedia content. This widget uses the standard HTML video and audio elements, which have been enhanced for use on a mobile device.

	To add a multimedia view widget to the application, use the following code:
	
		// Video player control
		<video data-controls="true" style="width:100%;">
		<source src="<VIDEO_FILE_URL>" type="video/mp4" /> Your browser does not support the video tag. </video>
		// Audio player control
		<audio data-controls="true" style="width:100%;"> <source src="<AUDIO_FILE_URL>" type="audio/mp3" /> Your browser does not support the audio tag.
		</audio>

	The multimedia view can define a callback for the create event, which is fired when the widget is created.
		$('.selector').multimediaview({
			create:function(event, u){...}
		});
		$(".selector").bind("create", function(event, ui)
		{
			// Respond to the multimedia view widget creation
		});
*/
/**
	@property {Boolean} data-control
	Sets the controls for the widget.
	The default value is true. If the value is set to true, the widget uses its own player controls. If the value is set to false, the widget uses the browser's player controls.
*/
/**
	@property {Boolean} data-full-screen
	Defines whether the widget opens in the fullscreen view mode.
	The default value is false.
*/
/**
	@property {String} data-theme
	Sets the widget theme.
	If the value is not set, the parent control's theme is used
*/
/**
	@method width
	The width method is used to get (if no value is defined) or set the multimedia view widget width:
		<video>
			 <source src="test.mp4" type="video/mp4" />
		</video>
		$(".selector").multimediaview("width", [value]);
*/
/**
	@method height
	The height method is used to get (if no value is defined) or set the multimedia view widget height:
		<video>
			<source src="test.mp4" type="video/mp4" />
		</video>
		$(".selector").multimediaview("height", [value]);
*/
/**
	@method fullScreen
	The fullScreen method is used to get (if no value is defined) or set the full-screen mode of the multimedia view widget. If the value is true, the full-screen mode is used; otherwise the multimedia view widget runs in the normal mode.

		<video>
			<source src="test.mp4" type="video/mp4" />
		</video>
		$(".selector").multimediaview("fullScreen", [value]);
*/
( function ( $, document, window, undefined ) {
	$.widget( "tizen.multimediaview", $.mobile.widget, {
		options: {
			theme: null,
			controls: true,
			fullScreen: false,
			initSelector: "video, audio"
		},

		_create: function () {
			var self = this,
				view = self.element,
				viewElement = view[0],
				option = self.options,
				parentTheme = $.mobile.getInheritedTheme( view, "s" ),
				theme = option.theme || parentTheme,
				role = "multimediaview",
				control = null;

			$.extend( this, {
				role: null,
				isControlHide: false,
				controlTimer: null,
				isVolumeHide: true,
				isVertical: true,
				backupView: null
			});

			self.role = role;
			view.addClass( "ui-multimediaview" );
			control = self._createControl();
			control.find( ".ui-button" ).each( function ( index ) {
				$( this ).buttonMarkup( { corners: true, theme: theme, shadow: true } );
			});

			if ( view[0].nodeName === "VIDEO" ) {
				control.addClass( "ui-" + role + "-video" );
			}

			control.hide();
			view.wrap( [ "<div class='ui-", role, "-wrap ui-", role , "-", theme, "'>" ].join( "" ) ).after( control );
			if ( option.controls && view.attr( "controls" ) ) {
				view.removeAttr( "controls" );
			}

			self._addEvent();
		},

		_resize: function () {
			var view = this.element,
				parent = view.parent(),
				control = parent.find( ".ui-multimediaview-control" ),
				viewWidth = 0,
				viewHeight = 0,
				viewOffset = null;

			this._resizeFullscreen( this.options.fullScreen );
			viewWidth = ( ( view[0].nodeName === "VIDEO" ) ? view.width() : parent.width() );
			viewHeight = ( ( view[0].nodeName === "VIDEO" ) ? view.height() : control.height() );
			viewOffset = view.offset();

			this._resizeControl( viewOffset, viewWidth, viewHeight );

			this._updateSeekBar();
			this._updateVolumeState();
		},

		_resizeControl: function ( offset, width, height ) {
			var self = this,
				view = self.element,
				viewElement = view[0],
				control = view.parent().find( ".ui-multimediaview-control" ),
				buttons = control.find( ".ui-button" ),
				playpauseButton = control.find( ".ui-playpausebutton" ),
				seekBar = control.find( ".ui-seekbar" ),
				durationLabel = control.find( ".ui-durationlabel" ),
				timestampLabel = control.find( ".ui-timestamplabel" ),
				volumeControl = control.find( ".ui-volumecontrol" ),
				volumeBar = volumeControl.find( ".ui-volumebar" ),
				controlWidth = width,
				controlHeight = control.outerHeight( true ),
				availableWidth = 0,
				controlOffset = null;

			if ( control ) {
				if ( view[0].nodeName === "VIDEO" ) {
					controlOffset = control.offset();
					controlOffset.left = offset.left;
					controlOffset.top = offset.top + height - controlHeight;
					control.offset( controlOffset );
				}

				control.width( controlWidth );
			}

			if ( seekBar ) {
				availableWidth = control.width() - ( buttons.outerWidth( true ) * buttons.length );
				availableWidth -= ( parseInt( buttons.eq( 0 ).css( "margin-left" ), 10 ) + parseInt( buttons.eq( 0 ).css( "margin-right" ), 10 ) ) * buttons.length;
				if ( !self.isVolumeHide ) {
					availableWidth -= volumeControl.outerWidth( true );
				}
				seekBar.width( availableWidth );
			}

			if ( durationLabel && !isNaN( viewElement.duration ) ) {
				durationLabel.find( "p" ).text( self._convertTimeFormat( viewElement.duration ) );
			}

			if ( viewElement.autoplay && viewElement.paused === false ) {
				playpauseButton.removeClass( "ui-play-icon" ).addClass( "ui-pause-icon" );
			}

			if ( seekBar.width() < ( volumeBar.width() + timestampLabel.width() + durationLabel.width() ) ) {
				durationLabel.hide();
			} else {
				durationLabel.show();
			}
		},

		_resizeFullscreen: function ( isFullscreen ) {
			var self = this,
				view = self.element,
				parent = view.parent(),
				control = view.parent().find( ".ui-multimediaview-control" ),
				playpauseButton = control.find( ".ui-playpausebutton" ),
				timestampLabel = control.find( ".ui-timestamplabel" ),
				seekBar = control.find( ".ui-seekbar" ),
				durationBar = seekBar.find( ".ui-duration" ),
				currenttimeBar = seekBar.find( ".ui-currenttime" ),
				docWidth = 0,
				docHeight = 0;

			if ( isFullscreen ) {
				if ( !self.backupView ) {
					self.backupView = {
						width: view[0].style.getPropertyValue( "width" ) || "",
						height: view[0].style.getPropertyValue( "height" ) || "",
						position: view.css( "position" ),
						zindex: view.css( "z-index" )
					};
				}
				docWidth = $( "body" )[0].clientWidth;
				docHeight = $( "body" )[0].clientHeight;

				view.width( docWidth ).height( docHeight - 1 );
				view.closest(".ui-multimediaview-wrap").height( docHeight - 1 );
				view.addClass( "ui-" + self.role + "-fullscreen" );
				view.offset( {
					top: 0,
					left: 0
				});
			} else {
				if ( !self.backupView ) {
					return;
				}

				view.removeClass( "ui-" + self.role + "-fullscreen" );
				view.css( {
					"width": self.backupView.width,
					"height": self.backupView.height,
					"position": self.backupView.position,
					"z-index": self.backupView.zindex
				});
				view.closest(".ui-multimediaview-wrap").css( "height", "" );
				self.backupView = null;
			}
			parent.show();
		},

		_addEvent: function () {
			var self = this,
				view = self.element,
				option = self.options,
				viewElement = view[0],
				control = view.parent().find( ".ui-multimediaview-control" ),
				playpauseButton = control.find( ".ui-playpausebutton" ),
				timestampLabel = control.find( ".ui-timestamplabel" ),
				durationLabel = control.find( ".ui-durationlabel" ),
				volumeButton = control.find( ".ui-volumebutton" ),
				volumeControl = control.find( ".ui-volumecontrol" ),
				volumeBar = volumeControl.find( ".ui-volumebar" ),
				volumeGuide = volumeControl.find( ".ui-guide" ),
				volumeHandle = volumeControl.find( ".ui-handler" ),
				fullscreenButton = control.find( ".ui-fullscreenbutton" ),
				seekBar = control.find( ".ui-seekbar" ),
				durationBar = seekBar.find( ".ui-duration" ),
				currenttimeBar = seekBar.find( ".ui-currenttime" );

			$( document ).unbind( ".multimediaview" ).bind( "pagechange.multimediaview", function ( e ) {
				var $page = $( e.target );
				if ( $page.find( view ).length > 0 && viewElement.autoplay ) {
					viewElement.play();
				}

				if ( option.controls ) {
					control.show();
					self._resize();
				}
			}).bind( "pagebeforechange.multimediaview", function ( e ) {
				if ( viewElement.played.length !== 0 ) {
					viewElement.pause();
					control.hide();
				}
			});

			$( window ).unbind( ".multimediaview" ).bind( "resize.multimediaview orientationchange.multimediaview", function ( e ) {
				if ( !option.controls ) {
					return;
				}
				var $page = $( e.target ),
					$scrollview = view.parents( ".ui-scrollview-clip" );

				$scrollview.each( function ( i ) {
					if ( $.data( this, "scrollview" ) ) {
						$( this ).scrollview( "scrollTo", 0, 0 );
					}
				});

				// for maintaining page layout
				if ( !option.fullScreen ) {
					$( ".ui-footer:visible" ).show();
				} else {
					$( ".ui-footer" ).hide();
					self._fitContentArea( $page );
				}

				self._resize();
			});

			view.bind( "loadedmetadata.multimediaview", function ( e ) {
				if ( !isNaN( viewElement.duration ) ) {
					durationLabel.find( "p" ).text( self._convertTimeFormat( viewElement.duration ) );
				}
				self._resize();
			}).bind( "timeupdate.multimediaview", function ( e ) {
				self._updateSeekBar();
			}).bind( "play.multimediaview", function ( e ) {
				playpauseButton.removeClass( "ui-play-icon" ).addClass( "ui-pause-icon" );
			}).bind( "pause.multimediaview", function ( e ) {
				playpauseButton.removeClass( "ui-pause-icon" ).addClass( "ui-play-icon" );
			}).bind( "ended.multimediaview", function ( e ) {
				if ( typeof viewElement.loop == "undefined" || viewElement.loop === "" ) {
					self.stop();
				}
			}).bind( "volumechange.multimediaview", function ( e ) {
				if ( viewElement.volume < 0.1 ) {
					viewElement.muted = true;
					volumeButton.removeClass( "ui-volume-icon" ).addClass( "ui-mute-icon" );
				} else {
					viewElement.muted = false;
					volumeButton.removeClass( "ui-mute-icon" ).addClass( "ui-volume-icon" );
				}

				if ( !self.isVolumeHide ) {
					self._updateVolumeState();
				}
			}).bind( "durationchange.multimediaview", function ( e ) {
				if ( !isNaN( viewElement.duration ) ) {
					durationLabel.find( "p" ).text( self._convertTimeFormat( viewElement.duration ) );
				}
				self._resize();
			}).bind( "error.multimediaview", function ( e ) {
				switch ( e.target.error.code ) {
				case e.target.error.MEDIA_ERR_ABORTED:
					window.alert( 'You aborted the video playback.' );
					break;
				case e.target.error.MEDIA_ERR_NETWORK:
					window.alert( 'A network error caused the video download to fail part-way.' );
					break;
				case e.target.error.MEDIA_ERR_DECODE:
					window.alert( 'The video playback was aborted due to a corruption problem or because the video used features your browser did not support.' );
					break;
				case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					window.alert( 'The video could not be loaded, either because the server or network failed or because the format is not supported.' );
					break;
				default:
					window.alert( 'An unknown error occurred.' );
					break;
				}
			}).bind( "vclick.multimediaview", function ( e ) {
				if ( !self.options.controls ) {
					return;
				}

				control.fadeToggle( "fast", function () {
					var offset = control.offset();
					self.isControlHide = !self.isControlHide;
					if ( self.options.mediatype == "video" ) {
						self._startTimer();
					}
				});
				self._resize();
			});

			playpauseButton.bind( "vclick.multimediaview", function () {
				self._endTimer();

				if ( viewElement.paused ) {
					viewElement.play();
				} else {
					viewElement.pause();
				}

				if ( self.options.mediatype == "video" ) {
					self._startTimer();
				}
			});

			fullscreenButton.bind( "vclick.multimediaview", function ( e ) {
				self.fullScreen( !self.options.fullScreen );
				control.fadeIn( "fast" );
				self._endTimer();
				e.preventDefault();
				e.stopPropagation();
			});

			seekBar.bind( "vmousedown.multimediaview", function ( e ) {
				var x = e.clientX,
					duration = viewElement.duration,
					durationOffset = durationBar.offset(),
					durationWidth = durationBar.width(),
					timerate = ( x - durationOffset.left ) / durationWidth,
					time = duration * timerate;

				if ( !viewElement.played.length ) {
					return;
				}

				viewElement.currentTime = time;

				self._endTimer();

				e.preventDefault();
				e.stopPropagation();

				$( document ).bind( "vmousemove.multimediaview", function ( e ) {
					var x = e.clientX,
						timerate = ( x - durationOffset.left ) / durationWidth;

					viewElement.currentTime = duration * timerate;

					e.preventDefault();
					e.stopPropagation();
				}).bind( "vmouseup.multimediaview", function () {
					$( document ).unbind( "vmousemove.multimediaview vmouseup.multimediaview" );
					if ( viewElement.paused ) {
						viewElement.pause();
					} else {
						viewElement.play();
					}
				});
			});

			volumeButton.bind( "vclick.multimediaview", function () {
				if ( self.isVolumeHide ) {
					var view = self.element,
						volume = viewElement.volume;

					self.isVolumeHide = false;
					self._resize();
					volumeControl.fadeIn( "fast" );
					self._updateVolumeState();
					self._updateSeekBar();
				} else {
					self.isVolumeHide = true;
					volumeControl.fadeOut( "fast", function () {
						self._resize();
					});
					self._updateSeekBar();
				}
			});

			volumeBar.bind( "vmousedown.multimediaview", function ( e ) {
				var baseX = e.clientX,
					volumeGuideLeft = volumeGuide.offset().left,
					volumeGuideWidth = volumeGuide.width(),
					volumeBase = volumeGuideLeft + volumeGuideWidth,
					handlerOffset = volumeHandle.offset(),
					volumerate = ( baseX - volumeGuideLeft ) / volumeGuideWidth,
					currentVolume = ( baseX - volumeGuideLeft ) / volumeGuideWidth;

				self._endTimer();
				self._setVolume( currentVolume.toFixed( 2 ) );

				e.preventDefault();
				e.stopPropagation();

				$( document ).bind( "vmousemove.multimediaview", function ( e ) {
					var currentX = e.clientX,
						currentVolume = ( currentX - volumeGuideLeft ) / volumeGuideWidth;

					self._setVolume( currentVolume.toFixed( 2 ) );

					e.preventDefault();
					e.stopPropagation();
				}).bind( "vmouseup.multimediaview", function () {
					$( document ).unbind( "vmousemove.multimediaview vmouseup.multimediaview" );

					if ( self.options.mediatype == "video" ) {
						self._startTimer();
					}
				});
			});
		},

		_removeEvent: function () {
			var self = this,
				view = self.element,
				control = view.parent().find( ".ui-multimediaview-control" ),
				playpauseButton = control.find( ".ui-playpausebutton" ),
				fullscreenButton = control.find( ".ui-fullscreenbutton" ),
				seekBar = control.find( ".ui-seekbar" ),
				volumeControl = control.find( ".ui-volumecontrol" ),
				volumeBar = volumeControl.find( ".ui-volumebar" ),
				volumeHandle = volumeControl.find( ".ui-handler" );

			view.unbind( ".multimediaview" );
			playpauseButton.unbind( ".multimediaview" );
			fullscreenButton.unbind( ".multimediaview" );
			seekBar.unbind( ".multimediaview" );
			volumeBar.unbind( ".multimediaview" );
			volumeHandle.unbind( ".multimediaview" );
		},

		_createControl: function () {
			var self = this,
				view = self.element,
				control = $( "<span></span>" ).addClass( "ui-" + self.role + "-control" ),
				playpauseButton = $( "<span></span>" ).addClass( "ui-playpausebutton ui-button" ),
				seekBar = $( "<span></span>" ).addClass( "ui-seekbar" ),
				timestampLabel = $( "<span><p>00:00:00</p></span>" ).addClass( "ui-timestamplabel" ),
				durationLabel = $( "<span><p>00:00:00</p></span>" ).addClass( "ui-durationlabel" ),
				volumeButton = $( "<span></span>" ).addClass( "ui-volumebutton ui-button" ),
				volumeControl = $( "<span></span>" ).addClass( "ui-volumecontrol" ),
				volumeBar = $( "<div></div>" ).addClass( "ui-volumebar" ),
				volumeGuide = $( "<span></span>" ).addClass( "ui-guide" ),
				volumeValue = $( "<span></span>" ).addClass( "ui-value" ),
				volumeHandle = $( "<span></span>" ).addClass( "ui-handler" ),
				fullscreenButton = $( "<span></span>" ).addClass( "ui-fullscreenbutton ui-button" ),
				durationBar = $( "<span></span>" ).addClass( "ui-duration" ),
				currenttimeBar = $( "<span></span>" ).addClass( "ui-currenttime" );

			seekBar.append( durationBar ).append( currenttimeBar ).append( durationLabel ).append( timestampLabel );

			playpauseButton.addClass( "ui-play-icon" );
			volumeButton.addClass( view[0].muted ? "ui-mute-icon" : "ui-volume-icon" );
			volumeBar.append( volumeGuide ).append( volumeValue ).append( volumeHandle );
			volumeControl.append( volumeBar );

			control.append( playpauseButton ).append( seekBar ).append( volumeControl ).append( volumeButton );

			if ( self.element[0].nodeName === "VIDEO" ) {
				$( fullscreenButton ).addClass( "ui-fullscreen-on" );
				control.append( fullscreenButton );
			}
			volumeControl.hide();

			return control;
		},

		_startTimer: function ( duration ) {
			this._endTimer();

			if ( !duration ) {
				duration = 3000;
			}

			var self = this,
				view = self.element,
				control = view.parent().find( ".ui-multimediaview-control" ),
				volumeControl = control.find( ".ui-volumecontrol" );

			self.controlTimer = setTimeout( function () {
				self.isVolumeHide = true;
				self.isControlHide = true;
				self.controlTimer = null;
				volumeControl.hide();
				control.fadeOut( "fast" );
			}, duration );
		},

		_endTimer: function () {
			if ( this.controlTimer ) {
				clearTimeout( this.controlTimer );
				this.controlTimer = null;
			}
		},

		_convertTimeFormat: function ( systime ) {
			var ss = parseInt( systime % 60, 10 ).toString(),
				mm = parseInt( ( systime / 60 ) % 60, 10 ).toString(),
				hh = parseInt( systime / 3600, 10 ).toString(),
				time =	( ( hh.length < 2  ) ? "0" + hh : hh ) + ":" +
						( ( mm.length < 2  ) ? "0" + mm : mm ) + ":" +
						( ( ss.length < 2  ) ? "0" + ss : ss );

			return time;
		},

		_updateSeekBar: function ( currenttime ) {
			var self = this,
				view = self.element,
				duration = view[0].duration,
				control = view.parent().find( ".ui-multimediaview-control" ),
				seekBar = control.find(  ".ui-seekbar"  ),
				durationBar = seekBar.find( ".ui-duration" ),
				currenttimeBar = seekBar.find( ".ui-currenttime" ),
				timestampLabel = control.find( ".ui-timestamplabel" ),
				durationOffset = durationBar.offset(),
				durationWidth = durationBar.width(),
				durationHeight = durationBar.height(),
				timebarWidth = 0;

			if ( typeof currenttime == "undefined" ) {
				currenttime = view[0].currentTime;
			}
			timebarWidth = parseInt( currenttime / duration * durationWidth, 10 );
			durationBar.offset( durationOffset );
			currenttimeBar.offset( durationOffset ).width( timebarWidth );
			timestampLabel.find( "p" ).text( self._convertTimeFormat( currenttime ) );
		},

		_updateVolumeState: function () {
			var self = this,
				view = self.element,
				control = view.parent().find( ".ui-multimediaview-control" ),
				volumeControl = control.find( ".ui-volumecontrol" ),
				volumeButton = control.find( ".ui-volumebutton" ),
				volumeBar = volumeControl.find( ".ui-volumebar" ),
				volumeGuide = volumeControl.find( ".ui-guide" ),
				volumeValue = volumeControl.find( ".ui-value" ),
				volumeHandle = volumeControl.find( ".ui-handler" ),
				handlerWidth = volumeHandle.width(),
				handlerHeight = volumeHandle.height(),
				volumeGuideHeight = volumeGuide.height(),
				volumeGuideWidth = volumeGuide.width(),
				volumeGuideTop = 0,
				volumeGuideLeft = 0,
				volumeBase = 0,
				handlerOffset = null,
				volume = view[0].volume;

			volumeGuideTop = parseInt( volumeGuide.offset().top, 10 );
			volumeGuideLeft = parseInt( volumeGuide.offset().left, 10 );
			volumeBase = volumeGuideLeft;
			handlerOffset = volumeHandle.offset();
			handlerOffset.top = volumeGuideTop - parseInt( ( handlerHeight - volumeGuideHeight ) / 2, 10 );
			handlerOffset.left = volumeBase + parseInt( volumeGuideWidth * volume, 10 ) - parseInt( handlerWidth / 2, 10 );
			volumeHandle.offset( handlerOffset );
			volumeValue.width( parseInt( volumeGuideWidth * ( volume ), 10 ) );
		},

		_setVolume: function ( value ) {
			var viewElement = this.element[0];

			if ( value < 0.0 || value > 1.0 ) {
				return;
			}

			viewElement.volume = value;
		},

		_fitContentArea: function ( page, parent ) {
			if ( typeof parent == "undefined" ) {
				parent = window;
			}

			var $page = $( page ),
				$content = $( ".ui-content:visible:first" ),
				hh = $( ".ui-header:visible" ).outerHeight() || 0,
				fh = $( ".ui-footer:visible" ).outerHeight() || 0,
				pt = parseFloat( $content.css( "padding-top" ) ),
				pb = parseFloat( $content.css( "padding-bottom" ) ),
				wh = ( ( parent === window ) ? window.innerHeight : $( parent ).height() ),
				height = wh - ( hh + fh ) - ( pt + pb );

			$content.offset( {
				top: ( hh + pt )
			}).height( height );
		},

		width: function ( value ) {
			var self = this,
				args = arguments,
				view = self.element;

			if ( args.length === 0 ) {
				return view.width();
			}
			if ( args.length === 1 ) {
				view.width( value );
				self._resize();
			}
		},

		height: function ( value ) {
			var self = this,
				view = self.element,
				args = arguments;

			if ( args.length === 0 ) {
				return view.height();
			}
			if ( args.length === 1 ) {
				view.height( value );
				self._resize();
			}
		},

		fullScreen: function ( value ) {
			var self = this,
				view = self.element,
				control = view.parent().find( ".ui-multimediaview-control" ),
				fullscreenButton = control.find( ".ui-fullscreenbutton" ),
				args = arguments,
				option = self.options,
				currentPage = $( ".ui-page-active" );

			if ( args.length === 0 ) {
				return option.fullScreen;
			}
			if ( args.length === 1 ) {
				view.parents( ".ui-content" ).scrollview( "scrollTo", 0, 0 );

				this.options.fullScreen = value;
				if ( value ) {
					currentPage.children( ".ui-header" ).hide();
					currentPage.children( ".ui-footer" ).hide();
					currentPage.addClass( "ui-fullscreen-page" );
					this._fitContentArea( currentPage );
					fullscreenButton.removeClass( "ui-fullscreen-on" ).addClass( "ui-fullscreen-off" );
				} else {
					currentPage.children( ".ui-header" ).show();
					currentPage.children( ".ui-footer" ).show();
					currentPage.removeClass( "ui-fullscreen-page" );
					this._fitContentArea( currentPage );
					fullscreenButton.removeClass( "ui-fullscreen-off" ).addClass( "ui-fullscreen-on" );
				}
				self._resize();
			}
		},

		refresh: function () {
			this._resize();
		}
	});

	$( document ).bind( "pagecreate create", function ( e ) {
		$.tizen.multimediaview.prototype.enhanceWithin( e.target );
	});
} ( jQuery, document, window ) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Minkyu Kang <mk7.kang@samsung.com>
 */

/*
 * Notification widget
 *
 * HTML Attributes
 *
 *  data-role: set to 'notification'.
 *  data-type: 'ticker' or 'popup'.
 *  data-interval: time to showing. If don't set, will show infinitely.
 *
 * APIs
 *
 *  open(): open the notification.
 *  close(): close the notification.
 *  text(text0, text1): set texts or get texts
 *  icon(src): set the icon (tickernoti only)
 *
 * Events
 *
 *  N/A
 *
 * Examples
 *
 * // tickernoti
 * <div data-role="notification" id="notification" data-type="ticker" data-interval="3000">
 *	<img src="icon01.png">
 *	<p>Hello World</p>
 *	<p>Denis</p>
 * </div>
 *
 * // smallpopup
 * <div data-role="notification" id="notification" data-type="popup" data-interval="3000">
 *	<p>Hello World</p>
 * </div>
 *
 */

/**
	@class Notification
	The notification widget shows a pop-up window on the screen to provide notifications.
	To add a notification widget to the application, use the following code:

		<div data-role="page">
			<div data-role="notification" data-type="smallpopup">
				<p>text1</p>
			</div>
			<div data-role="header"></div>
			<div data-role="content"></div>
			<div data-role="footer"></div>
		</div>
*/
/**
	@property {String} data-type
	Defines the notification type. The type options are tickernoti and smallpopup. <br/>The default value is smallpopup.

*/
/**
	@property {Integer} data-interval
	Defines the time to showing a notification widget. <br/>The default is infinitely.

*/
/**
	@method open
	The open method is used to open the notification widget:

		<div data-role="notification" data-type="smallpopup" data-interval="3000"></div>
		$('#notification').notification('open');
*/
/**
	@method close
	The close method is used to close the notification widget:

		<div data-role="notification" data-type="smallpopup" data-interval="3000"></div>
		$('#notification').notification('close');
*/
/**
	@method text
	The text method is used to set or get the notification text:

		<div data-role="notification" data-type="smallpopup" data-interval="3000"></div>
		// Set notification text
		$('#notification').notification('text', 'setThisText');
		// Get notification text
		texts = $('#notification').notification('text');
	@since Tizen2.0
*/
/**
	@method icon
	The setIcon method is used to set the ticker notification icon. The icon can be set only if the notification type is set to tickernoti.

		<div data-role="notification" data-type="ticker" data-interval="3000"></div>
		$('#notification').notification('icon', './test.png');
*/
(function ( $, window ) {
	$.widget( "tizen.notification", $.mobile.widget, {
		btn: null,
		text_bg: [],
		icon_img: [],
		interval: null,
		seconds: null,
		running: false,

		_get_text: function () {
			var text = new Array( 2 );

			if ( this.type === 'ticker' ) {
				text[0] = $( this.text_bg[0] ).text();
				text[1] = $( this.text_bg[1] ).text();
			} else {
				text[0] = $( this.text_bg[0] ).text();
			}

			return text;
		},

		_set_text: function ( text0, text1 ) {
			var _set = function ( elem, text ) {
				if ( !text ) {
					return;
				}
				elem.text( text );
			};

			if ( this.type === 'ticker' ) {
				_set( $( this.text_bg[0] ), text0 );
				_set( $( this.text_bg[1] ), text1 );
			} else {
				_set( $( this.text_bg[0] ), text0 );
			}
		},

		text: function ( text0, text1 ) {
			if ( text0 === undefined && text1 === undefined ) {
				return this._get_text();
			}

			this._set_text( text0, text1 );
		},

		icon: function ( src ) {
			if ( src === undefined ) {
				return;
			}

			this.icon_img.detach();
			this.icon_img = $( "<img src='" + src + "' class='ui-ticker-icon'>" );
			$( this.element ).find(".ui-ticker").append( this.icon_img );
		},

		_refresh: function () {
			var container = this._get_container();

			$( container ).addClass("fix")
					.removeClass("show")
					.removeClass("hide");

			this._set_interval();
		},

		open: function () {
			var container = this._get_container();

			if ( this.running ) {
				this._refresh();
				return;
			}

			$( container ).addClass("show")
					.removeClass("hide")
					.removeClass("fix");

			this.running = true;

			if ( this.type === 'popup' ) {
				this._set_position();
			}

			this._set_interval();
		},

		close: function () {
			var container = this._get_container();

			if ( !this.running ) {
				return;
			}

			$( container ).addClass("hide")
					.removeClass("show")
					.removeClass("fix");

			this.running = false;
			clearInterval( this.interval );
		},

		destroy: function () {
			var container = this._get_container();

			$( container ).removeClass("show")
					.removeClass("hide")
					.removeClass("fix");

			this._del_event();

			this.running = false;
		},

		_get_container: function () {
			if ( this.type === 'ticker' ) {
				return $( this.element ).find(".ui-ticker");
			}

			return $( this.element ).find(".ui-smallpopup");
		},

		_set_interval: function () {
			var self = this;

			clearInterval( this.interval );

			if ( this.seconds !== undefined && this.second !== 0 ) {
				this.interval = setInterval( function () {
					self.close();
				}, this.seconds );
			}
		},

		_add_event: function () {
			var self = this,
				container = this._get_container();

			if ( this.type === 'ticker' ) {
				container.find(".ui-ticker-btn").append( this.btn ).trigger("create");

				this.btn.bind( "vmouseup", function () {
					self.close();
				});
			}

			container.bind( 'vmouseup', function () {
				self.close();
			});
		},

		_del_event: function () {
			var container = this._get_container();

			if ( this.type === 'ticker' ) {
				this.btn.unbind("vmouseup");
			}
			container.unbind('vmouseup');
			clearInterval( this.interval );
		},

		_set_position: function () {
			var container = this._get_container(),
				$footer = $('.ui-page-active').children('.ui-footer'),
				footer_h = $footer.outerHeight() || 0;

			container.css( 'bottom', footer_h);
		},

		_create: function () {
			var self = this,
				elem = $( this.element ),
				i;

			this.btn = $('<div data-role="button" data-inline="true">Close</div>');

			this.seconds = elem.jqmData('interval');
			this.type = elem.jqmData('type') || 'popup';

			if ( this.type === 'ticker' ) {
				elem.wrapInner("<div class='ui-ticker'></div>");
				elem.find(".ui-ticker").append("<div class='ui-ticker-body'></div>" +
							"<div class='ui-ticker-btn'></div>");
				this.text_bg = elem.find("p");

				if ( this.text_bg.length < 2 ) {
					elem.find(".ui-ticker").append("<p></p><p></p>");
					this.text_bg = elem.find("p");
				} else if ( this.text_bg.length > 2 ) {
					for ( i = 2; i < this.text_bg.length; i++ ) {
						$( this.text_bg[i] ).css( "display", "none" );
					}
				}

				$( this.text_bg[0] ).addClass("ui-ticker-text1-bg");
				$( this.text_bg[1] ).addClass("ui-ticker-text2-bg");

				this.icon_img = elem.find("img");

				if ( this.icon_img.length ) {
					$( this.icon_img ).addClass("ui-ticker-icon");

					for ( i = 1; i < this.icon_img.length; i++ ) {
						$( this.icon_img[i] ).css( "display", "none" );
					}
				}
			} else {
				elem.wrapInner("<div class='ui-smallpopup'></div>");
				this.text_bg = elem.find("p").addClass("ui-smallpopup-text-bg");

				if ( this.text_bg.length < 1 ) {
					elem.find(".ui-smallpopup")
						.append("<p class='ui-smallpopup-text-bg'></p>");
					this.text_bg = elem.find("p");
				} else if ( this.text_bg.length > 1 ) {
					for ( i = 1; i < this.text_bg.length; i++ ) {
						$( this.text_bg[i] ).css( "display", "none" );
					}
				}

				this._set_position();
			}

			this._add_event();

			$( window ).bind( "resize", function () {
				if ( !self.running ) {
					return;
				}

				self._refresh();

				if ( self.type === 'popup' ) {
					self._set_position();
				}
			});
		}
	}); // End of widget

	// auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		$( e.target ).find(":jqmData(role='notification')").notification();
	});

	$( document ).bind( "pagebeforehide", function ( e ) {
		$( e.target ).find(":jqmData(role='notification')").notification('destroy');
	});
}( jQuery, this ));
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Jinhyuk Jun <jinhyuk.jun@samsung.com>
 */

(function ( $, undefined ) {

	$.widget( "mobile.pagelayout", $.mobile.widget, {
		options: {
			visibleOnPageShow: true,
			disablePageZoom: true,
			transition: "slide", //can be none, fade, slide (slide maps to slideup or slidedown)
			fullscreen: false,
			tapToggle: true,
			tapToggleBlacklist: "a, input, select, textarea, .ui-header-fixed, .ui-footer-fixed",
			hideDuringFocus: "input, textarea, select",
			updatePagePadding: true,
			trackPersistentToolbars: true,
			// Browser detection! Weeee, here we go...
			// Unfortunately, position:fixed is costly, not to mention probably impossible, to feature-detect accurately.
			// Some tests exist, but they currently return false results in critical devices and browsers, which could lead to a broken experience.
			// Testing fixed positioning is also pretty obtrusive to page load, requiring injected elements and scrolling the window
			// The following function serves to rule out some popular browsers with known fixed-positioning issues
			// This is a plugin option like any other, so feel free to improve or overwrite it
			supportBlacklist: function () {
				var w = window,
					ua = navigator.userAgent,
					platform = navigator.platform,
					// Rendering engine is Webkit, and capture major version
					wkmatch = ua.match( /AppleWebKit\/([0-9]+)/ ),
					wkversion = !!wkmatch && wkmatch[ 1 ],
					ffmatch = ua.match( /Fennec\/([0-9]+)/ ),
					ffversion = !!ffmatch && ffmatch[ 1 ],
					operammobilematch = ua.match( /Opera Mobi\/([0-9]+)/ ),
					omversion = !!operammobilematch && operammobilematch[ 1 ];

				if (
					// iOS 4.3 and older : Platform is iPhone/Pad/Touch and Webkit version is less than 534 (ios5)
					( ( platform.indexOf( "iPhone" ) > -1 || platform.indexOf( "iPad" ) > -1  || platform.indexOf( "iPod" ) > -1 ) && wkversion && wkversion < 534 ) ||
						// Opera Mini
						( w.operamini && ({}).toString.call( w.operamini ) === "[object OperaMini]" ) ||
						( operammobilematch && omversion < 7458 ) ||
						//Android lte 2.1: Platform is Android and Webkit version is less than 533 (Android 2.2)
						( ua.indexOf( "Android" ) > -1 && wkversion && wkversion < 533 ) ||
						// Firefox Mobile before 6.0 -
						( ffversion && ffversion < 6 ) ||
						// WebOS less than 3
						( window.palmGetResource !== undefined && wkversion && wkversion < 534 ) ||
						// MeeGo
						( ua.indexOf( "MeeGo" ) > -1 && ua.indexOf( "NokiaBrowser/8.5.0" ) > -1 )
				) {
					return true;
				}

				return false;
			},
			initSelector: ":jqmData(role='content')"
		},

		_create: function () {

			var self = this,
				o = self.options,
				$el = self.element;

			// Feature detecting support for
			if ( o.supportBlacklist() ) {
				self.destroy();
				return;
			}

			self._addFixedClass();
			self._addTransitionClass();
			self._bindPageEvents();

			// only content
			self._bindContentControlEvents();
		},

		/* add minimum fixed css style to bar(header/footer) and content
		*  it need to update when core source modified(jquery.mobile.page.section.js)
		*  modified from core source cuz initSelector different */
		_addFixedClass: function () {
			var self = this,
				o = self.options,
				$el = self.element,
				$elHeader = $el.siblings( ":jqmData(role='header')" ),
				$elFooter = $el.siblings( ":jqmData(role='footer')" ),
				$elPage = $el.closest(".ui-page");

			$elHeader.addClass( "ui-header-fixed" );
			$elFooter.addClass( "ui-footer-fixed" );

			// "fullscreen" overlay positioning
			if ( o.fullscreen ) {
				$elHeader.addClass( "ui-header-fullscreen" );
				$elFooter.addClass( "ui-footer-fullscreen" );
				$elPage
					.addClass( "ui-page-header-fullscreen" )
					.addClass( "ui-page-footer-fullscreen" );
			} else {
			// If not fullscreen, add class to page to set top or bottom padding
				$elPage.addClass( "ui-page-header-fixed" )
					.addClass( "ui-page-footer-fixed" );
			}
		},

		/* original core source(jquery.mobile.fixedToolbar.js)
		* never changed */
		_addTransitionClass: function () {
			var tclass = this.options.transition;

			if ( tclass && tclass !== "none" ) {
				// use appropriate slide for header or footer
				if ( tclass === "slide" ) {
					tclass = this.element.is( ".ui-header" ) ? "slidedown" : "slideup";
				}

				this.element.addClass( tclass );
			}
		},


		/* Set default page positon
		* 1. add title style to header
		* 2. Set default header/footer position */
		setHeaderFooter: function ( thisPage ) {
			var $elPage = $( thisPage ),
				$elHeader = $elPage.find( ":jqmData(role='header')" ).length ? $elPage.find( ":jqmData(role='header')") : $elPage.siblings( ":jqmData(role='header')"),
				$elContent = $elPage.find( ".ui-content" ),
				$elFooter = $elPage.find( ":jqmData(role='footer')" ),
				$elFooterGroup = $elFooter.find( ":jqmData(role='fieldcontain')" );

			// divide content mode scrollview and non-scrollview
			if ( !$elPage.is( ".ui-dialog" ) ) {
				if ( $elHeader.jqmData("position") == "fixed" || ( $.support.scrollview && $.tizen.frameworkData.theme.match(/tizen/) ) ) {
					$elHeader
						.css( "position", "fixed" )
						.css( "top", "0px" );
				} else if ( !$.support.scrollview && $elHeader.jqmData("position") != "fixed" ) {
					$elHeader.css( "position", "relative" );
				}
			}

			/* set Title style */
			if ( $elHeader.find("span.ui-title-text-sub").length ) {
				$elHeader.addClass( "ui-title-multiline");
			}

			if ( $elFooterGroup.find( "div" ).is( ".ui-controlgroup-label" ) ) {
				$elFooterGroup.find( "div.ui-controlgroup-label" ).remove();
			}
		},

		_bindPageEvents: function () {
			var self = this,
				o = self.options,
				$el = self.element,
				$elCurrentFooter;

			//page event bindings
			// Fixed toolbars require page zoom to be disabled, otherwise usability issues crop up
			// This method is meant to disable zoom while a fixed-positioned toolbar page is visible
			$el.closest( ".ui-page" )
				.bind( "pagebeforeshow", function ( event ) {
					var thisPage = this;
					if ( o.disablePageZoom ) {
						$.mobile.zoom.disable( true );
					}
					if ( !o.visibleOnPageShow ) {
						self.hide( true );
					}
					self.setHeaderFooter( thisPage );
					self._setContentMinHeight( thisPage );
				} )
				.bind( "webkitAnimationStart animationstart updatelayout", function ( e, data ) {
					var thisPage = this;
					if ( o.updatePagePadding ) {
						self.updatePagePadding(thisPage);
						self.updatePageLayout( false, thisPage);
					}
				})

				.bind( "pageshow", function ( event ) {
					var thisPage = this;
					self._setContentMinHeight( thisPage );
					self.updatePagePadding( thisPage );
					self._updateHeaderArea( thisPage );
					if ( o.updatePagePadding ) {
						$( window ).bind( "throttledresize." + self.widgetName, function () {
							self.updatePagePadding(thisPage);

							self.updatePageLayout( false, thisPage);
							self._updateHeaderArea( thisPage );
							self._setContentMinHeight( thisPage );
						});
					}
				})

				.bind( "pagebeforehide", function ( e, ui ) {
					if ( o.disablePageZoom ) {
						$.mobile.zoom.enable( true );
					}
					if ( o.updatePagePadding ) {
						$( window ).unbind( "throttledresize." + self.widgetName );
					}

					if ( o.trackPersistentToolbars ) {
						var thisFooter = $( ".ui-footer-fixed:jqmData(id)", this ),
							thisHeader = $( ".ui-header-fixed:jqmData(id)", this ),
							nextFooter = thisFooter.length && ui.nextPage && $( ".ui-footer-fixed:jqmData(id='" + thisFooter.jqmData( "id" ) + "')", ui.nextPage ),
							nextHeader = thisHeader.length && ui.nextPage && $( ".ui-header-fixed:jqmData(id='" + thisHeader.jqmData( "id" ) + "')", ui.nextPage );

						nextFooter = nextFooter || $();

						if ( nextFooter.length || nextHeader.length ) {

							nextFooter.add( nextHeader ).appendTo( $.mobile.pageContainer );

							ui.nextPage.one( "pageshow", function () {
								nextFooter.add( nextHeader ).appendTo( this );
							});
						}
					}
				});

			window.addEventListener( "softkeyboardchange", function ( e ) {
				var thisPage = this;

				if ( e.state == "on" ) {
					$elCurrentFooter = $( ".ui-page-active .ui-footer" );
					$elCurrentFooter.hide();
				} else if (e.state == "off") {
					$elCurrentFooter.show();
				}
				self.updatePagePadding( thisPage );
				self.updatePageLayout( true, thisPage );
			});
		},

		_bindContentControlEvents: function () {
			var self = this,
				o = self.options,
				$el = self.element;

			$el.closest( ".ui-page" )
				.bind( "pagebeforeshow", function ( event ) {

				});
		},

		_setContentMinHeight : function ( thisPage ) {
			var $elPage = $( thisPage ),
				$elHeader = $elPage.find( ":jqmData(role='header')" ),
				$elFooter = $elPage.find( ":jqmData(role='footer')" ),
				$elContent = $elPage.find( ":jqmData(role='content')" ),
				resultMinHeight;

			resultMinHeight = window.innerHeight - $elHeader.height() - $elFooter.height();

			$elContent.css( "min-height", resultMinHeight - parseFloat( $elContent.css("padding-top") ) - parseFloat( $elContent.css("padding-bottom") ) + "px" );
		},

		_updateHeaderArea : function ( thisPage ) {
			var $elPage = $( thisPage ),
				$elHeader = $elPage.find( ":jqmData(role='header')" ).length ? $elPage.find( ":jqmData(role='header')") : $elPage.siblings( ":jqmData(role='header')"),
				headerBtnNum = $elHeader.children("a").length,
				headerSrcNum = $elHeader.children("img").length;

			if ( !$elPage.is( ".ui-dialog" ) ) {
				$elHeader.find( "h1" ).css( "width", window.innerWidth - $elHeader.children( "a" ).width() * headerBtnNum - $elHeader.children( "a" ).width() / 4 - $elHeader.children( "img" ).width() * headerSrcNum * 4 );
			}
			/* add half width for default space between text and button, and img tag area is too narrow, so multiply three for img width*/
		},

		_visible: true,

		// This will set the content element's top or bottom padding equal to the toolbar's height
		updatePagePadding: function ( tbPage ) {
			var $el = this.element,
				header = $el.siblings( ".ui-header" ).length,
				footer = $el.siblings( ".ui-footer" ).length;

			// This behavior only applies to "fixed", not "fullscreen"
			if ( this.options.fullscreen ) {
				return;
			}

			tbPage = tbPage || $el.closest( ".ui-page" );

			if ( $el.siblings( ".ui-header" ).jqmData("position") == "fixed" || $.support.scrollview ) {
				$( tbPage ).css( "padding-top", ( header ? $el.siblings( ".ui-header" ).outerHeight() : 0 ) );
			}
			$( tbPage ).css( "padding-bottom", ( footer ? $el.siblings( ".ui-footer" ).outerHeight() : 0 ) );
		},

		/* 1. Calculate and update content height   */
		updatePageLayout: function ( receiveType, thisPage ) {
			var $elFooter,
				$elPage = $( thisPage ),
				$elHeader = $elPage.find( ":jqmData(role='header')" ),
				$elContent = $elPage.find( ":jqmData(role='content')" ),
				resultContentHeight = 0,
				resultFooterHeight = 0,
				resultHeaderHeight = 0;

			if ( $elPage.length ) {
				$elFooter = $elPage.find( ":jqmData(role='footer')" );
			} else {
				$elFooter = $( document ).find( ":jqmData(role='footer')" ).eq( 0 );
			}

			// calculate footer height
			resultFooterHeight = ( $elFooter.css( "display" ) == "none" ) ? 0 : $elFooter.height();
			resultHeaderHeight = ( $elHeader.css( "display" ) == "none" ) ? 0 : $elHeader.height();

			if (resultFooterHeight != 0 ) {
				$elFooter.css( "bottom", 0 );
			}

			resultContentHeight = window.innerHeight - resultFooterHeight - resultHeaderHeight;

			if ( $.support.scrollview ) {
				$elContent.height( resultContentHeight -
						parseFloat( $elContent.css("padding-top") ) -
						parseFloat( $elContent.css("padding-bottom") ) );
			}

			// External call page( "refresh") - in case title changed
			if ( receiveType ) {
				$elPage
					.css( "min-height", resultContentHeight )
					.css( "padding-top", resultHeaderHeight )
					.css( "padding-bottom", resultFooterHeight );
			}
		},

		show: function ( notransition ) {
			/* blank function: deprecated */
		},

		hide: function ( notransition ) {
			/* blank function: deprecated */
		},

		toggle: function () {
			this[ this._visible ? "hide" : "show" ]();
		},

		destroy: function () {
			this.element.removeClass( "ui-header-fixed ui-footer-fixed ui-header-fullscreen ui-footer-fullscreen in out fade slidedown slideup ui-fixed-hidden" );
			this.element.closest( ".ui-page" ).removeClass( "ui-page-header-fixed ui-page-footer-fixed ui-page-header-fullscreen ui-page-footer-fullscreen" );
		}
	});

	//auto self-init widgets
	$( document )
		.bind( "pagecreate create", function ( e ) {
			// DEPRECATED in 1.1: support for data-fullscreen=true|false on the page element.
			// This line ensures it still works, but we recommend moving the attribute to the toolbars themselves.
			if ( $( e.target ).jqmData( "fullscreen" ) ) {
				$( $.mobile.pagelayout.prototype.options.initSelector, e.target ).not( ":jqmData(fullscreen)" ).jqmData( "fullscreen", true );
			}
			$.mobile.pagelayout.prototype.enhanceWithin( e.target );
		});

}( jQuery ));
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 * Copyright (c) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>,
 *          Elliot Smith <elliot.smith@intel.com>
 *			Hyunjung Kim <hjnim.kim@samsung.com>
 */

/*
 * % Popupwindow widget do not use anymore(will be deprecated, internal use only)
 *
 *
 * Shows other elements inside a popup window.
 *
 * To apply, add the attribute data-role="popupwindow" to a <div> element inside
 * a page. Alternatively, call popupwindow()
 * on an element, eg :
 *
 *     $("#mypopupwindowContent").popupwindow();
 * where the html might be :
 *     <div id="mypopupwindowContent"></div>
 *
 * To trigger the popupwindow to appear, it is necessary to make a call to its
 * 'open()' method. This is typically done by binding a function to an event
 * emitted by an input element, such as a the clicked event emitted by a button
 * element. The open() method takes two arguments, specifying the x and y
 * screen coordinates of the center of the popup window.

 * You can associate a button with a popup window like this:
 *      <div id="mypopupContent" style="display: table;" data-role="popupwindow">
 *          <table>
 *              <tr> <td>Eenie</td>   <td>Meenie</td>  <td>Mynie</td>   <td>Mo</td>  </tr>
 *              <tr> <td>Catch-a</td> <td>Tiger</td>   <td>By-the</td>  <td>Toe</td> </tr>
 *              <tr> <td>If-he</td>   <td>Hollers</td> <td>Let-him</td> <td>Go</td>  </tr>
 *              <tr> <td>Eenie</td>   <td>Meenie</td>  <td>Mynie</td>   <td>Mo</td>  </tr>
 *          </table>
 *      </div>
 * <a href="#myPopupContent" data-rel="popupwindow" data-role="button">Show popup</a>
 *
 * Options:
 *
 *     theme: String; the theme for the popupwindow contents
 *                   Default: null
 *
 *     overlayTheme: String; the theme for the popupwindow
 *                   Default: null
 *
 *     shadow: Boolean; display a shadow around the popupwindow
 *             Default: true
 *
 *     corners: Boolean; display a shadow around the popupwindow
 *             Default: true
 *
 *     fade: Boolean; fades the opening and closing of the popupwindow
 *
 *     transition: String; the transition to use when opening or closing
 *                 a popupwindow
 *                 Default: $.mobile.defaultDialogTransition
 *
 * Events:
 *	popupbeforeposition: triggered after a popup has completed preparations for opening, but has not yet opened
 *	popupafteropen: triggered after a popup has completely opened
 *	popupafterclose triggered when a popup has completely closed
*/

/**
	class Popupwindow
	The pop-up widget shows a list of items in a pop-up window in the middle of the screen. It automatically optimizes the pop-up window size within the screen.
	To add a pop-up widget to the application, use the following code:

		// Basic pop-up
		<div id="center_info" data-role="popup" data-style="center_info">
			<div data-role="text">
				<p>
				Pop-up dialog box, a child window that blocks user interaction in the parent window
				</p>
			</div>
		</div>
		// Pop-up with a title and button
		<div id="center_title_1btn" data-role="popup" data-style="center_title_1btn">
			<p data-role="title">
				Pop-up title
			</p>
			<p data-role="text">
				Pop-up dialog box
			</p>
		<div data-role="button-bg">
			<input type="button" value="Text Button" />
		</div>
		</div>

	The pop-up can define callbacks for events as described in the jQueryMobile documentation for pop-up events. <br/>You can use methods with the pop-up as described in the jQueryMobile documentation for pop-up methods.

	@deprecated 2.0 verisons
*/

/**
	@property {String} data-style
	Defines the pop-up window style.
	The following styles are available:

	center_info: basic pop-up message
	center_title: pop-up message with a title
	center_basic_1btn: pop-up message with 1 button
	center_basic_2btn: pop-up message with 2 horizontal buttons
	center_title_1btn: pop-up message with a title and 1 button
	center_title_2btn: pop-up message with a title and 2 horizontal buttons
	center_title_3btn: pop-up message with a title and 3 horizontal buttons
	center_button_vertical: pop-up message with vertical buttons
	center_checkbox: pop-up message with a check box
	center_liststyle_1btn>: pop-up message with a list and 1 button
	center_liststyle_2btn: pop-up message with a list and 2 horizontal buttons
	center_liststyle_3btn: pop-up message with a list and 3 horizontal buttons
*/

(function ( $, undefined ) {
	$.widget( "tizen.popupwindow", $.tizen.widgetex, {
		options: {
			theme: null,
			overlayTheme: "s",
			style: "custom",
			disabled: false,
			shadow: true,
			corners: true,
			fade: false,
			opacity: 0.7,
			widthRatio: 0.8612,
			transition: $.mobile.defaultDialogTransition,
			initSelector: ":jqmData(role='popupwindow')"
		},

		_htmlProto: {
source:

 [ "<div><div>" ,
  "    <div id='popupwindow-screen' class='ui-selectmenu-screen ui-screen-hidden ui-popupwindow-screen'></div>" ,
  "    <div id='popupwindow-container' class='ui-popupwindow ui-popupwindow-padding ui-selectmenu-hidden ui-overlay-shadow ui-corner-all'></div>" ,
  "</div>" ,
  "</div>" ].join("")
,			ui: {
				screen: "#popupwindow-screen",
				container: "#popupwindow-container"
			}
		},

		_setStyle: function () {
			var popup = this.element,
				style = popup.attr( 'data-style' );

			if ( style ) {
				this.options.style = style;
			}

			popup.addClass( this.options.style );
			popup.find( ":jqmData(role='title')" )
					.wrapAll( "<div class='popup-title'></div>" );
			popup.find( ":jqmData(role='text')" )
					.wrapAll( "<div class='popup-text'></div>" );
			popup.find( ":jqmData(role='button-bg')" )
					.wrapAll( "<div class='popup-button-bg'></div>" );
			popup.find( ":jqmData(role='check-bg')" )
					.wrapAll( "<div class='popup-check-bg'></div>" );
			popup.find( ":jqmData(role='scroller-bg')" )
					.addClass( "popup-scroller-bg" );
			popup.find( ":jqmData(role='text-bottom-bg')" )
					.wrapAll( "<div class='popup-text-bottom-bg'></div>" );
			popup.find( ":jqmData(role='text-left')" )
					.wrapAll( "<div class='popup-text-left'></div>" );
			popup.find( ":jqmData(role='text-right')" )
					.wrapAll( "<div class='popup-text-right'></div>" );
			popup.find( ":jqmData(role='progress-bg')" )
					.wrapAll( "<div class='popup-progress-bg'></div>" );
		},

		_create: function () {
			console.warn("popupwindow() was deprecated. use popup() instead.");
			var thisPage = this.element.closest(":jqmData(role='page')"),
				self = this;

			if ( thisPage.length === 0 ) {
				thisPage = $("body");
			}

			this._ui.placeholder =
					$( "<div><!-- placeholder for " + this.element.attr("id") + " --></div>" )
					.css("display", "none")
					.insertBefore( this.element );

			thisPage.append( this._ui.screen );
			this._ui.container.insertAfter( this._ui.screen );
			this._ui.container.append( this.element );

			this._setStyle();

			this._isOpen = false;

			this._ui.screen.bind( "vclick", function ( e ) {
				self.close();
				return false;
			} );

			this.element.bind( "vclick", function ( e ) {
				if ( $( e.target ).is("ui-btn-ctxpopup-close") ) {
					self.close();
				}
			} );
		},

		destroy: function () {
			this.element.insertBefore( this._ui.placeholder );

			this._ui.placeholder.remove();
			this._ui.container.remove();
			this._ui.screen.remove();
			this.element.triggerHandler("destroyed");
			$.Widget.prototype.destroy.call( this );
		},

		_placementCoords: function ( x, y, cw, ch ) {
			var screenHeight = $( window ).height(),
				screenWidth = $( window ).width(),
				halfheight = ch / 2,
				maxwidth = parseFloat( this._ui.container.css( "max-width" ) ),
				roomtop = y,
				roombot = screenHeight - y,
				newtop,
				newleft;

			if ( roomtop > ch / 2 && roombot > ch / 2 ) {
				newtop = y - halfheight;
			} else {
				newtop = roomtop > roombot ? screenHeight - ch - 30 : 30;
			}

			if ( cw < maxwidth ) {
				newleft = ( screenWidth - cw ) / 2;
			} else {
				newleft = x - cw / 2;

				if ( newleft < 10 ) {
					newleft = 10;
				} else if ( ( newleft + cw ) > screenWidth ) {
					newleft = screenWidth - cw - 10;
				}
			}

			return { x : newleft, y : newtop };
		},

		_setPosition: function ( x_where, y_where ) {
			var x = ( undefined === x_where ? $( window ).width()  / 2 : x_where ),
				y = ( undefined === y_where ? $( window ).height() / 2 : y_where ),
				coords,
				ctxpopup = this.element.data("ctxpopup"),
				popupWidth,
				menuHeight,
				menuWidth,
				screenHeight,
				screenWidth,
				roomtop,
				roombot,
				halfheight,
				maxwidth,
				newtop,
				newleft;

			if ( !ctxpopup ) {
				popupWidth = $( window ).width() * this.options.widthRatio;
				this._ui.container.css( "width", popupWidth );

				if ( this._ui.container.outerWidth() > $( window ).width() ) {
					this._ui.container.css( {"max-width" : $( window ).width() - 30} );
				}
			}

			coords = this._placementCoords( x, y,
					this._ui.container.outerWidth(),
					this._ui.container.outerHeight() );

			menuHeight = this._ui.container.innerHeight();
			menuWidth = this._ui.container.innerWidth();
			screenHeight = $( window ).height();
			screenWidth = $( window ).width();
			roomtop = y;
			roombot = screenHeight - y;
			halfheight = menuHeight / 2;
			maxwidth = parseFloat( this._ui.container.css( "max-width" ) );
			newtop = ( screenHeight - menuHeight ) / 2;

			if ( !maxwidth || menuWidth < maxwidth ) {
				newleft = ( screenWidth - menuWidth ) / 2;
			} else {
				newleft = x - menuWidth / 2;

				if ( newleft < 30 ) {
					newleft = 30;
				} else if ( ( newleft + menuWidth ) > screenWidth ) {
					newleft = screenWidth - menuWidth - 30;
				}
			}

			if ( ctxpopup ) {
				newtop = coords.y;
				newleft = coords.x;
			}

			this._ui.container.css({
				top: newtop,
				left: newleft
			});

			this._ui.screen.css( "height", screenHeight );
		},
		open: function ( x_where, y_where, backgroundclose ) {
			var self = this,
				zIndexMax = 0;

			if ( this._isOpen || this.options.disabled ) {
				return;
			}

			$( document ).find("*").each( function () {
				var el = $( this ),
					zIndex = parseInt( el.css("z-index"), 10 );

				if ( !( el.is( self._ui.container ) ||
						el.is( self._ui.screen ) ||
						isNaN( zIndex ))) {
					zIndexMax = Math.max( zIndexMax, zIndex );
				}
			} );

			this._ui.screen.css( "height", $( window ).height() );

			if ( backgroundclose ) {
				this._ui.screen.css( "opacity", 0 )
						.removeClass("ui-screen-hidden");
			} else {
				this._ui.removeClass("ui-screen-hidden");

				if ( this.options.fade ) {
					this._ui.screen.animate( {opacity: this.options.opacity}, "fast" );
				} else {
					this._ui.screen.css( {opacity: this.options.opacity} );
				}
			}

			this._setPosition( x_where, y_where );

			this.element.trigger("popupbeforeposition");

			this._ui.container
				.removeClass("ui-selectmenu-hidden")
				.addClass("in")
				.animationComplete( function () {
					self.element.trigger("popupafteropen");
				} );

			this._isOpen = true;

			if ( !this._reflow ) {
				this._reflow = function () {
					if ( !self._isOpen ) {
						return;
					}

					self._setPosition( x_where, y_where );
				};

				$( window ).bind( "resize", this._reflow );
			}
		},

		close: function () {
			if ( !this._isOpen ) {
				return;
			}

			if ( this._reflow ) {
				$( window ).unbind( "resize", this._reflow );
				this._reflow = null;
			}

			var self = this,
				hideScreen = function () {
					self._ui.screen.addClass("ui-screen-hidden");
					self._isOpen = false;
				};

			this._ui.container.removeClass("in").addClass("reverse out");

			if ( this.options.transition === "none" ) {
				this._ui.container
					.addClass("ui-selectmenu-hidden")
					.removeAttr("style");
				this.element.trigger("popupafterclose");
			} else {
				this._ui.container.animationComplete( function () {
					self._ui.container
						.removeClass("reverse out")
						.addClass("ui-selectmenu-hidden")
						.removeAttr("style");
					self.element.trigger("popupafterclose");
				} );
			}

			if ( this.options.fade ) {
				this._ui.screen.animate( {opacity: 0}, "fast", hideScreen );
			} else {
				hideScreen();
			}
		},

		_realSetTheme: function ( dst, theme ) {
			var classes = ( dst.attr("class") || "" ).split(" "),
				alreadyAdded = true,
				currentTheme = null,
				matches;

			while ( classes.length > 0 ) {
				currentTheme = classes.pop();
				matches = currentTheme.match(/^ui-body-([a-z])$/);

				if ( matches && matches.length > 1 ) {
					currentTheme = matches[1];
					break;
				} else {
					currentTheme = null;
				}
			}

			dst.removeClass( "ui-body-" + currentTheme );
			if ( ( theme || "" ).match(/[a-z]/) ) {
				dst.addClass( "ui-body-" + theme );
			}
		},

		_setTheme: function ( value ) {
			this._realSetTheme( this.element, value );
			this.options.theme = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "theme", value );
		},

		_setOverlayTheme: function ( value ) {
			this._realSetTheme( this._ui.container, value );
			this.options.overlayTheme = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "overlay-theme", value );
		},

		_setShadow: function ( value ) {
			this.options.shadow = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "shadow", value );
			this._ui.container[value ? "addClass" : "removeClass"]("ui-overlay-shadow");
		},

		_setCorners: function ( value ) {
			this.options.corners = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "corners", value );
			this._ui.container[value ? "addClass" : "removeClass"]("ui-corner-all");
		},

		_setFade: function ( value ) {
			this.options.fade = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "fade", value );
		},

		_setTransition: function ( value ) {
			this._ui.container
				.removeClass( this.options.transition || "" )
				.addClass( value );
			this.options.transition = value;
			this.element.attr( "data-" + ( $.mobile.ns || "" ) + "transition", value );
		},

		_setDisabled: function ( value ) {
			$.Widget.prototype._setOption.call( this, "disabled", value );
			if ( value ) {
				this.close();
			}
		}
	});

	$.tizen.popupwindow.bindPopupToButton = function ( btn, popup ) {
		if ( btn.length === 0 || popup.length === 0 ) {
			return;
		}

		var btnVClickHandler = function ( e ) {
			if ( !popup.jqmData("overlay-theme-set") ) {
				popup.popupwindow( "option", "overlayTheme", btn.jqmData("theme") );
			}

			popup.popupwindow( "open",
				btn.offset().left + btn.outerWidth()  / 2,
				btn.offset().top  + btn.outerHeight() / 2 );

			return false;
		};

		if ( ( popup.popupwindow("option", "overlayTheme") || "" ).match(/[a-z]/) ) {
			popup.jqmData( "overlay-theme-set", true );
		}

		btn
			.attr({
				"aria-haspopup": true,
				"aria-owns": btn.attr("href")
			})
			.removeAttr("href")
			.bind( "vclick", btnVClickHandler );

		popup.bind( "destroyed", function () {
			btn.unbind( "vclick", btnVClickHandler );
		} );
	};

	$( document ).bind( "pagecreate create", function ( e ) {
		$( $.tizen.popupwindow.prototype.options.initSelector, e.target )
			.not(":jqmData(role='none'), :jqmData(role='nojs')")
			.popupwindow();

		$( "a[href^='#']:jqmData(rel='popupwindow')", e.target ).each( function () {
			$.tizen.popupwindow.bindPopupToButton( $( this ), $( $( this ).attr("href") ) );
		});
	});
}( jQuery ));
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 * Copyright (c) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Gabriel Schulhof <gabriel.schulhof@intel.com>
 *			Hyunjung Kim <hjnim.kim@samsung.com>
 */

/*
 * % ContextPopup widget do not use anymore(will be deprecated, internal use only)
 */
// This widget is implemented in an extremely ugly way. It should derive from $.tizen.popupwindow, but it doesn't
// because there's a bug in jquery.ui.widget.js which was fixed in jquery-ui commit
// b9153258b0f0edbff49496ed16d2aa93bec07d95. Once a version of jquery-ui containing that commit is released
// (probably >= 1.9m5), and jQuery Mobile picks up the widget from there, this widget needs to be rewritten properly.
// The problem is that, when a widget inherits from a superclass and declares an object in its prototype identical in key
// to one in the superclass, upon calling $.widget the object is overwritten in both the prototype of the superclass and
// the prototype of the subclass. The prototype of the superclass should remain unchanged.

/**
	class ContextPopup
		The context pop-up widget shows a list of options and automatically optimizes its size within the screen. This widget is intended for a small list of options for a larger list, use the List widget. <br/>The context pop-up widget requires a target button, which must be clicked to open the context pop-up. In the default application theme, an arrow pointer is displayed at the top-left corner of the context pop-up widget when it is opened.<br/><br/> To add a context pop-up widget to the application, use the following code:

			// Target button
			<a href="#pop_3_icons" id="btn_3_icons" data-role="button" data-inline="true" data-rel="popupwindow">3 Icons</a>
			// Context pop-up
				<div class="horizontal" id="pop_3_icons" data-role="popupwindow" data-show-arrow="true">
				<ul>
					<li class="icon">
						<a href="#" data-role="button" data-icon="call"></a>
					</li>
					<li class="icon">
						<a href="#" data-role="button" data-icon="favorite"></a>
					</li>
					<li class="text">
						<a href="#">Function</a>
					</li>
				</ul>
			</div>
	The context pop-up can define callbacks for events as described in the [jQueryMobile documentation for pop-up events.][1]
	You can use methods with the context pop-up as described in the [jQueryMobile documentation for pop-up methods.][2]
	[1]: http://jquerymobile.com/demos/1.2.0-alpha.1/docs/pages/popup/events.html
	[2]: http://jquerymobile.com/demos/1.2.0-alpha.1/docs/pages/popup/methods.html

	@deprecated 2.0 verisons
*/

(function ( $, undefined ) {
	$.widget( "tizen.ctxpopup", $.tizen.widgetex, {
		options: $.extend( {}, $.tizen.popupwindow.prototype.options, {
			initSelector: ":jqmData(show-arrow)"
		} ),

		_htmlProto: {
source:

 [ "<div><div id='outer' class='ui-ctxpopup'>" ,
  "    <div id='top' class='ui-ctxpopup-row' data-role='triangle' data-location='top'></div>" ,
  "    <div class='ui-ctxpopup-row'>" ,
  "        <div id='left' class='ui-ctxpopup-cell' data-role='triangle' data-location='left'></div>" ,
  "        <div id='container' class='ui-ctxpopup-cell'></div>" ,
  "        <div id='right' class='ui-ctxpopup-cell' data-role='triangle' data-location='right'></div>" ,
  "    </div>" ,
  "    <div id='bottom' class='ui-ctxpopup-row' data-role='triangle' data-location='bottom'></div>" ,
  "</div>" ,
  "</div>" ].join("")
,			ui: {
				outer		: "#outer",
				container	: "#container", // the key has to have the name "container"
				arrow		: {
					all		: ":jqmData(role='triangle')",
					l		: "#left",
					t		: "#top",
					r		: "#right",
					b		: "#bottom"
				}
			}
		},

		_create: function () {
			console.warn("ctxpopup() was deprecated. use popup() instead.");
			if ( !this.element.data( "popupwindow" ) ) {
				this.element.popupwindow();
			}

			this.element.data( "popupwindow" )
				._ui.container
				.removeClass( "ui-popupwindow-padding" )
				.append( this._ui.outer );
			this._ui.outer.trigger( "create" ); // Creates the triangle widgets
			this._ui.container
				.addClass( "ui-popupwindow-padding" )
				.append( this.element );
		},

		_setOption: function ( key, value ) {
			$.tizen.popupwindow.prototype._setOption.apply( this.element.data( "popupwindow" ), arguments );
			this.options[key] = value;
		}
	} );

	var origOpen = $.tizen.popupwindow.prototype.open,
		orig_setOption = $.tizen.popupwindow.prototype._setOption,
		orig_placementCoords = $.tizen.popupwindow.prototype._placementCoords;

	$.tizen.popupwindow.prototype._setOption = function ( key, value ) {
		var ctxpopup = this.element.data( "ctxpopup" ),
			needsApplying = true,
			origContainer;
		if ( ctxpopup ) {
			if ( "shadow" === key || "overlayTheme" === key || "corners" === key ) {
				origContainer = this._ui.container;

				this._ui.container = ctxpopup._ui.container;
				orig_setOption.apply( this, arguments );
				this._ui.container = origContainer;
				needsApplying = false;
			}
			ctxpopup.options[key] = value;
		}

		if ( needsApplying ) {
			orig_setOption.apply(this, arguments);
		}
	};

	$.tizen.popupwindow.prototype._placementCoords = function ( x, y, cx, cy ) {
		var ctxpopup = this.element.data( "ctxpopup" ),
			self = this,
			coords = {},
			minDiff,
			minDiffIdx;

		function getCoords( arrow, x_factor, y_factor ) {
			// Unhide the arrow we want to test to take it into account
			ctxpopup._ui.arrow.all.hide();
			ctxpopup._ui.arrow[arrow].show();

			var isHorizontal = ( "b" === arrow || "t" === arrow ),
			// Names of keys used in calculations depend on whether things are horizontal or not
				coord = ( isHorizontal
						? { point: "x", size: "cx", beg: "left", outerSize: "outerWidth",  niceSize: "width", triangleSize : "height" }
						: { point: "y", size: "cy", beg: "top",  outerSize: "outerHeight", niceSize: "height", triangleSize : "width" } ),
				size = {
					cx : self._ui.container.width(),
					cy : self._ui.container.height()
				},
				halfSize = {
					cx : size.cx / 2,
					cy : size.cy / 2
				},
				desired = {
					"x" : x + halfSize.cx * x_factor,
					"y" : y + halfSize.cy * y_factor
				},
				orig = orig_placementCoords.call( self, desired.x, desired.y, size.cx, size.cy ),

			// The triangleOffset must be clamped to the range described below:
			//
			//                          +-------...
			//                          |   /\
			//                          |  /  \
			//                   ----+--+-,-----...
			//lowerDiff       -->____|  |/ <-- possible rounded corner
			//triangle size   -->    | /|
			//                   ____|/ |
			//                    ^  |\ | <-- lowest possible offset for triangle
			// actual range of    |  | \| 
			// arrow offset       |  |  | 
			// values due to      |  .  . Payload table cell looks like
			// possible rounded   |  .  . a popup window, and it may have
			// corners and arrow  |  .  . arbitrary things like borders,
			// triangle size -    |  |  | shadows, and rounded corners.
			// our clamp range    |  | /|
			//                   _v__|/ |
			//triangle size   -->    |\ | <-- highest possible offset for triangle
			//                   ____| \|
			//upperDiff       -->    |  |\ <-- possible rounded corner
			//                   ----+--+-'-----...
			//                          |  \  /
			//                          |   \/
			//                          +-------...
			//
			// We calculate lowerDiff and upperDiff by considering the offset and width of the payload (this.element)
			// versus the offset and width of the element enclosing the triangle, because the payload is inside
			// whatever decorations (such as borders, shadow, rounded corners) and thus can give a reliable indication
			// of the thickness of the combined decorations

				arrowBeg = ctxpopup._ui.arrow[arrow].offset()[coord.beg],
				arrowSize = ctxpopup._ui.arrow[arrow][coord.outerSize]( true ),
				payloadBeg = self.element.offset()[coord.beg],
				payloadSize = self.element[coord.outerSize]( true ),
				triangleSize = ctxpopup._ui.arrow[arrow][coord.triangleSize](),
				triangleOffset =
					Math.max(
						triangleSize // triangle size
							+ Math.max( 0, payloadBeg - arrowBeg ), // lowerDiff
						Math.min(
								arrowSize // bottom
									- triangleSize // triangle size
									- Math.max( 0, arrowBeg + arrowSize - ( payloadBeg + payloadSize ) ), // upperDiff
								arrowSize / 2 // arrow unrestricted offset
									+ desired[coord.point]
									- orig[coord.point]
									- halfSize[coord.size]
							)
					),
					// Triangle points here
				final = {
					"x": orig.x + ( isHorizontal ? triangleOffset : 0) + ("r" === arrow ? size.cx : 0),
					"y": orig.y + (!isHorizontal ? triangleOffset : 0) + ("b" === arrow ? size.cy : 0)
				},
				ret = {
					actual			: orig,
					triangleOffset	: triangleOffset,
					absDiff			: Math.abs( x - final.x ) + Math.abs( y - final.y )
				};

			// Hide it back
			ctxpopup._ui.arrow[arrow].hide();

			return ret;
		}

		if ( ctxpopup ) {
			// Returns:
			// {
			//    absDiff: int
			//    triangleOffset: int
			//    actual: { x: int, y: int }
			// }

			coords = {
				l : getCoords( "l", 1, 0 ),
				r : getCoords( "r", -1, 0 ),
				t : getCoords( "t", 0, 1 ),
				b : getCoords( "b", 0, -1 )
			};

			$.each( coords, function ( key, value ) {
				if ( minDiff === undefined || value.absDiff < minDiff ) {
					minDiff = value.absDiff;
					minDiffIdx = key;
				}
			} );

			// Side-effect: show the appropriate arrow and move it to the right offset
			ctxpopup._ui.arrow[minDiffIdx]
				.show()
				.triangle( "option", "offset", coords[minDiffIdx].triangleOffset );
			return coords[minDiffIdx].actual;
		}

		return orig_placementCoords.call( this, x, y, cx, cy );
	};

	$.tizen.popupwindow.prototype.open = function ( x, y ) {
		var ctxpopup = this.element.data( "ctxpopup" );

		if ( ctxpopup ) {
			this._setFade( false );
			this._setShadow( false );
			this._setCorners( false );
			this._setOverlayTheme( null );
			this._setOption( "overlayTheme", ctxpopup.options.overlayTheme );
			ctxpopup._ui.arrow.all.triangle( "option", "color", ctxpopup._ui.container.css( "background-color" ) );

			// temporary
			$( '.ui-popupwindow' ).css( 'background', 'none' );
		}

		origOpen.call( this, x, y, true );
	};

	//auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		var ctxpopups = $( $.tizen.ctxpopup.prototype.options.initSelector, e.target );
		$.tizen.ctxpopup.prototype.enhanceWithin( e.target );
	} );
}( jQuery ) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software" ),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Minkyu Kang <mk7.kang@samsung.com>
 *	Author: Koeun Choi <koeun.choi@samsung.com>
 */

/*
 * Progress widget
 *
 * HTML Attributes
 *
 *  data-role: set to 'progress'.
 *  data-style: 'circle' or 'pending'.
 *
 * APIs
 *
 *  show(): show the progress.
 *  hide(): hide the progress.
 *  running(boolean): start or stop the running.
 *
 * Events
 *
 *  N/A
 *
 * Examples
 *
 * <li data-role="list-divider">Progress Pending</li>
 * <li>
 *	<div data-role="progress" data-style="pending" id="pending"></div>
 * </li>
 * <li data-role="list-divider">Progress ~ing</li>
 * <li>
 *	<div data-role="progress" data-style="circle" id="progress"></div>Loading..
 * </li>
 *
 * $("#pending").progress( "running", true );
 * $("#progress").progress( "running", true );
 *
 */

/**
	@class Progress
	The progress widget shows that an operation is in progress. <br/>To add a progress widget to the application, use the following code:

		<div data-role="progress" data-style="circle"></div>
*/
/**
	@property {String} data-style
	Sets the style of the progress widget. The style options are pending (pending progress style) and circle (circular progress status style).
*/
/**
	@method running
	The running method is used to set the current running state of the pending or circular progress widget:

		<div id="foo" data-role="progress" data-style="pending"></div>
		$("#foo").progress("running", true);
*/
/**
	@method show
	The show method is used to show the pending or circular progress widget:

		<div id="foo" data-role="progress" data-style="pending"></div>
		$("#foo").progress("show");
*/
/**
	@method hide
	The show method is used to hide the pending or circular progress widget:

		<div id="foo" data-role="progress" data-style="pending"></div>
		$("#foo").progress("hide");
*/

(function ( $, window, undefined ) {
	$.widget( "tizen.progress", $.mobile.widget, {
		options: {
			style: "circle",
			running: false
		},

		show: function () {
			$( this.element ).show();
		},

		hide: function () {
			$( this.element ).hide();
		},

		_start: function () {
			if ( !this.init ) {
				$( this.element ).append( this.html );
				this.init = true;
			}

			this.show();

			$( this.element )
				.find( ".ui-progress-" + this.options.style )
				.addClass( this.runningClass );
		},

		_stop: function () {
			$( this.element )
				.find( ".ui-progress-" + this.options.style )
				.removeClass( this.runningClass );
		},

		running: function ( running ) {
			if ( running === undefined ) {
				return this.options.running;
			}

			this._setOption( "running", running );
		},

		_setOption: function ( key, value ) {
			if ( key === "running" ) {
				if ( typeof value !== "boolean" ) {
					window.alert( "running value MUST be boolean type!" );
					return;
				}

				this.options.running = value;
				this._refresh();
			}
		},

		_refresh: function () {
			if ( this.options.running ) {
				this._start();
			} else {
				this._stop();
			}
		},

		_create: function () {
			var self = this,
				element = this.element,
				style = element.jqmData( "style" ),
				_html,
				runningClass;

			if ( style ) {
				this.options.style = style;
			} else {
				style = this.options.style;
			}

			if ( style == "circle" ) {
				$( this.element ).addClass("ui-progress-container-circle");

				_html =	'<div class="ui-progress-circle"></div>';
			} else if ( style === "pending" ) {
				$( this.element ).addClass("ui-progressbar");

				_html = '<div class="ui-progressbar-bg">' +
						'<div class="ui-progress-pending"></div>' +
					'</div>';
			}

			this.html = $( _html );

			runningClass = "ui-progress-" + style + "-running";

			$.extend( this, {
				init: false,
				runningClass: runningClass
			} );
			this._refresh();
		}
	} ); /* End of widget */

	$( document ).bind( "pagecreate create", function ( e ) {
		$( e.target ).find( ":jqmData(role='progress')" ).progress();
	} );
}( jQuery, this ));
/*
 * jQuery UI Progressbar @VERSION
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Progressbar
 *
 * Depends:
 *   jquery.ui.core.js
 *   jquery.ui.widget.js
 * Original file:
 *   jquery.ui.progressbar.js
 */
/* This is from jquery ui plugin - progressbar 11/16/2011 */


/**
	@class ProgressBar
	The progress bar widget shows a control that indicates the progress percentage of an on-going operation. This widget can be scaled to fit inside a parent container.

	To add a progress bar widget to the application, use the following code:

		<div id="foo" data-role="progressbar"</div>
*/
/**
	@event change
	The progress bar can define a callback for the change event, which is fired when the progress value is changed:
		<div id="foo" data-role="progressbar"></div>
		$("#foo").bind("change", function (ev, val) {
			Console.log("Value is changed to " + val);
		});
*/
/**
	@method value
	You can use the value method with the pickers to set or get the current default progress bar value:

		<div id="foo" data-role="progressbar"></div>
		var oldVal = $("#foo").progressbar("value");
		$("#foo").progressbar("value", 50);
*/

(function ( $, window, undefined ) {

	$.widget( "tizen.progressbar", $.mobile.widget, {
		options: {
			value: 0,
			max: 100
		},

		min: 0,

		_create: function () {
			this.element
				.addClass( "ui-progressbar" )
				.attr( {
					role: "progressbar",
					"aria-valuemin": this.min,
					"aria-valuemax": this.options.max,
					"aria-valuenow": this._value()
				} );

			this.valueDiv = $( "<div class='ui-progressbar-value'></div>" )
				.appendTo( this.element );

			this.valueDiv.wrap("<div class='ui-progressbar-bg'></div>");

			this.oldValue = this._value();
			this._refreshValue();
		},

		_destroy: function () {
			this.element
				.removeClass( "ui-progressbar" )
				.removeAttr( "role" )
				.removeAttr( "aria-valuemin" )
				.removeAttr( "aria-valuemax" )
				.removeAttr( "aria-valuenow" );

			this.valueDiv.remove();
		},

		value: function ( newValue ) {
			if ( newValue === undefined ) {
				return this._value();
			}

			this._setOption( "value", newValue );
			return this;
		},

		_setOption: function ( key, value ) {
			if ( key === "value" ) {
				this.options.value = value;
				this._refreshValue();
				if ( this._value() === this.options.max ) {
					this.element.trigger( "complete" );
				}
			}
			// jquery.ui.widget.js MUST be updated to new version!
			//this._super( "_setOption", key, value );
		},

		_value: function () {
			var val = this.options.value;
			// normalize invalid value
			if ( typeof val !== "number" ) {
				val = 0;
			}
			return Math.min( this.options.max, Math.max( this.min, val ) );
		},

		_percentage: function () {
			return 100 * this._value() / this.options.max;
		},

		_refreshValue: function () {
			var value = this.value(),
				percentage = this._percentage();

			if ( this.oldValue !== value ) {
				this.oldValue = value;
				this.element.trigger( "change" );
			}

			this.valueDiv
				.toggle( value > this.min )
				.width( percentage.toFixed(0) + "%" );
			this.element.attr( "aria-valuenow", value );
		}
	} );

	// auto self-init widgets
	$( document ).bind( "pagecreate", function ( e ) {
		$( e.target ).find( ":jqmData(role='progressbar')" ).progressbar();
	} );

}( jQuery, this ) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */
/*
* jQuery Mobile Framework : "textinput" plugin for text inputs, textareas
* Copyright (c) jQuery Project
* Dual licensed under the MIT or GPL Version 2 licenses.
* http://jquery.org/license
* Authors: Jinhyuk Jun <jinhyuk.jun@samsung.com>
*          Wongi Lee <wongi11.lee@samsung.com>
*/

/**
 * Searchbar can be created using <input> element with type=search
 * <input type="search" name="search" id="search1" value=""  />
 *
 * Searchbar can be inserted 3 cases
 * content : seachbar behave same as content element
 * header : searchbar placed below title(header), It doesn't move when scrolling page
 * inside optionheader : Searchbar placed inside optionheader, searchbar can be seen only expand optionheader
 *
 * Examples:
 *
 *	HTML markup for creating Searchbar
 *		<input type="search"/>
 *
 *	How to make searchbar in content
 *		<input type="search" name="" id="" value=""  />
 *
 *	How to make cancel button in searchbar
 *		<div data-role="header" data-position ="fixed" >
 *			<h1>Searchbar</h1>
 *			<input type="search" data-cancel-btn=true name="" id="" value=""  />
 *		</div>
 *
 *	How to make icon in front of searchbar
 *		<div data-role="header" data-position ="fixed" >
 *			<h1>Searchbar</h1>
 *			<input type="search" data-icon="call" name="" id="" value=""  />
 *		</div>
*/

/**
	@class SearchBar
	The search bar widget is used to search for page content. This widget can be placed in the header, option header, or page content.

	To add a search bar widget to the application, use the following code:

		<label for="search-basic">Search Input:</label>
		<input type="search" name="search" id="searc-basic" value="" data-mini="true" />

	Tizen supports many search bar options as described in the jQueryMobile documentation for search bar options.
	The search bar can define callbacks for events as described in the jQueryMobile documentation for search bar events.
	You can use methods with the search bar as described in the jQueryMobile documentation for search bar methods.
*/

(function ( $, undefined ) {

	$.widget( "tizen.searchbar", $.mobile.widget, {
		options: {
			theme: null,
			initSelector: "input[type='search'],:jqmData(type='search'), input[type='tizen-search'],:jqmData(type='tizen-search')"
		},

		_create: function () {
			var input = this.element,
				o = this.options,
				theme = o.theme || $.mobile.getInheritedTheme( this.element, "c" ),
				themeclass  = " ui-body-" + theme,
				focusedEl,
				clearbtn,
				cancelbtn,
				defaultText,
				defaultTextClass,
				trimedText,
				newClassName,
				newStyle,
				newDiv,
				searchimage,
				inputedText,
				useCancelBtn = false,
				frontIcon = false;

			$( "label[for='" + input.attr( "id" ) + "']" ).addClass( "ui-input-text" );

			if ( typeof input[0].autocorrect !== "undefined" && !$.support.touchOverflow ) {
				// Set the attribute instead of the property just in case there
				// is code that attempts to make modifications via HTML.
				input[0].setAttribute( "autocorrect", "off" );
				input[0].setAttribute( "autocomplete", "off" );
			}

			focusedEl = input.wrap( "<div class='ui-input-search ui-shadow-inset ui-corner-all ui-btn-shadow" + themeclass + "'></div>" ).parent();

			if ( $( this.element ).data( "cancel-btn" ) === true ) {
				useCancelBtn = true;
				focusedEl.addClass( "ui-input-search-default" );
			}
			if ( $( this.element ).data( "icon" ) != undefined ) {
				frontIcon = true;
				focusedEl.addClass( "ui-search-bar-icon" );
			}

			clearbtn = $( "<a href='#' class='ui-input-clear' title='clear text'>clear text</a>" )
				.bind('click', function ( event ) {
					if ( input.attr( "disabled" ) == "disabled" ) {
						return false;
					}
					input
						.val( "" )
						.focus()
						.trigger( "change" );
					clearbtn.addClass( "ui-input-clear-hidden" );
					event.preventDefault();
				})
				.appendTo( focusedEl )
				.buttonMarkup({
					icon: "deleteSearch",
					iconpos: "notext",
					corners: true,
					shadow: true
				});

			function toggleClear() {
				setTimeout(function () {
					clearbtn.toggleClass( "ui-input-clear-hidden", !input.val() );
				}, 0);
			}

			function showCancel() {
				focusedEl
					.addClass( "ui-input-search-default" )
					.removeClass( "ui-input-search-wide" );
				cancelbtn
					.addClass( "ui-btn-cancel-show" )
					.removeClass( "ui-btn-cancel-hide" );
			}

			function hideCancel() {
				focusedEl
					.addClass( "ui-input-search-wide" )
					.removeClass( "ui-input-search-default" );
				cancelbtn
					.addClass( "ui-btn-cancel-hide" )
					.removeClass( "ui-btn-cancel-show" );
				toggleClear();
			}

			function makeFrontIcon() {
				var IconStyle = $( input ).jqmData( "icon" ),
					frontIcon = $( "<div data-role='button' data-style='circle'></div>" );

				frontIcon
					.appendTo( focusedEl.parent() )
					.buttonMarkup( {
						icon: IconStyle,
						corners: true,
						shadow: true
					} );
				frontIcon.addClass( "ui-btn-search-front-icon" );
			}

			toggleClear();

			input.bind( 'paste cut keyup focus change blur', toggleClear );

			//SLP --start search bar with cancel button
			focusedEl.wrapAll( "<div class='input-search-bar'></div>" );
			searchimage = $("<div class='ui-image-search'></div>").appendTo( focusedEl );

			if ( frontIcon ) {
				makeFrontIcon();
			}

			if ( useCancelBtn ) {
				cancelbtn = $( "<div data-role='button' class='ui-input-cancel' title='clear text'>Cancel</div>" )
					.bind('click', function ( event ) {
						if ( input.attr( "disabled" ) == "disabled" ) {
							return false;
						}
						event.preventDefault();
						event.stopPropagation();

						input
							.val( "" )
							.blur()
							.trigger( "change" );

						if ( useCancelBtn ) {
							hideCancel();
						}
					} )
					.appendTo( focusedEl.parent() )
					.buttonMarkup( {
						iconpos: "cancel",
						corners: true,
						shadow: true
					} );
			}

			// Input Focused
			input
				.focus( function () {
					if ( input.attr( "disabled" ) == "disabled" ) {
						return false;
					}
					if ( useCancelBtn ) {
						showCancel();
					}
					focusedEl.addClass( $.mobile.focusClass );
				})
				.blur(function () {
					focusedEl.removeClass( $.mobile.focusClass );
				});

			// Default Text
			defaultText = input.jqmData( "default-text" );

			if ( ( defaultText != undefined ) && ( defaultText.length > 0 ) ) {
				defaultTextClass = "ui-input-default-text";
				trimedText = defaultText.replace(/\s/g, "");

				/* Make new class for default text string */
				newClassName = defaultTextClass + "-" + trimedText;
				newStyle = $( "<style>" + '.' + newClassName + ":after" + "{content:" + "'" + defaultText + "'" + "}" + "</style>" );
				$( 'html > head' ).append( newStyle );

				/* Make new empty <DIV> for default text */
				newDiv = $( "<div></div>" );

				/* Add class and append new div */
				newDiv.addClass( defaultTextClass );
				newDiv.addClass( newClassName );
				newDiv.tap( function ( event ) {
					input.blur();
					input.focus();
				} );

				input.parent().append( newDiv );

				/* When focus, default text will be hide. */
				input
					.focus( function () {
						input.parent().find( "div.ui-input-default-text" ).addClass( "ui-input-default-hidden" );
					} )
					.blur( function () {
						var inputedText = input.val();
						if ( inputedText.length > 0 ) {
							input.parent().find( "div.ui-input-default-text" ).addClass( "ui-input-default-hidden" );
						} else {
							input.parent().find( "div.ui-input-default-text" ).removeClass( "ui-input-default-hidden" );
						}
					} );
			}

			if ( !input.attr("placeholder") ) {
				input.attr( "placeholder", "Search" );
			}
		},

		disable: function () {
			this.element.attr( "disabled", true );
			this.element.parent().addClass( "ui-disabled" );
			$( this.element ).blur();
			this.element.parent().parent().find(".ui-input-cancel").addClass( "ui-disabled" );
		},

		enable: function () {
			this.element.attr( "disabled", false );
			this.element.parent().removeClass( "ui-disabled" );
			this.element.parent().parent().find(".ui-input-cancel").removeClass( "ui-disabled" );
			$( this.element ).focus();
		}
	} );

	//auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		$.tizen.searchbar.prototype.enhanceWithin( e.target );
	} );

}( jQuery ) );
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 * Copyright (c) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Max Waterman <max.waterman@intel.com>
 * Authors: Minkyu Kang <mk7.kang@samsung.com>
 */

/**
 * tizenslider modifies the JQuery Mobile slider and is created in the same way.
 *
 * See the JQuery Mobile slider widget for more information :
 *     http://jquerymobile.com/demos/1.0a4.1/docs/forms/forms-slider.html
 *
 * The JQuery Mobile slider option:
 *     theme: specify the theme using the 'data-theme' attribute
 *
 * Options:
 *     theme: string; the theme to use if none is specified using the 'data-theme' attribute
 *            default: 'c'
 *     popup: boolean; controls whether the popup is displayed or not
 *                   specify if the popup is enabled using the 'data-popup' attribute
 *                   set from javascript using .tizenslider('option','popup',newValue)
 *
 * Events:
 *     changed: triggers when the value is changed (rather than when the handle is moved)
 *
 * Examples:
 *
 *     <a href="#" id="popupEnabler" data-role="button" data-inline="true">Enable popup</a>
 *     <a href="#" id="popupDisabler" data-role="button" data-inline="true">Disable popup</a>
 *     <div data-role="fieldcontain">
 *         <input id="mySlider" data-theme='a' data-popup='false' type="range" name="slider" value="7" min="0" max="9" />
 *     </div>
 *     <div data-role="fieldcontain">
 *         <input id="mySlider2" type="range" name="slider" value="77" min="0" max="777" />
 *     </div>
 *
 *     // disable popup from javascript
 *     $('#mySlider').tizenslider('option','popup',false);
 *
 *     // from buttons
 *     $('#popupEnabler').bind('vclick', function() {
 *         $('#mySlider').tizenslider('option','popup',true);
 *     });
 *     $('#popupDisabler').bind('vclick', function() {
 *         $('#mySlider').tizenslider('option','popup',false);
 *     });
 */

/**
	@class Slider
	The slider widget shows a control on the screen that you can use to change values by dragging a handle on a horizontal scale. Sliders can be used in Tizen as described in the jQueryMobile documentation for sliders.

	To add a slider widget to the application, use the following code:

		<input data-popup='false' type="range" name="slider" value="5" min="0" max="10" data-icon="text" data-text-left="Min" data-text-right="Max" />

	The slider can define callbacks for events as described in the jQueryMobile documentation for slider events.
	You can use methods with the slider as described in the jQueryMobile documentation for slider methods.
*/
/**
	@property {String} data-icon
	Defines the icon style for the slider ends. The icon options are bright, volume, and text.
	The default value is text.
*/
/**
	@property {Boolean} data-popup
	Enables or disables a pop-up showing the current value while the handle is dragged.
	The default value is true.
*/
/**
	@property {String} data-text-left
	Defines the text displayed on the left side of the slider.
	The data-icon option must be set to text.
*/
/**
	@property {String} data-text-right
	Defines the text displayed on the right side of the slider.
	The data-icon option must be set to text.
*/

(function ($, window, undefined) {
	$.widget("tizen.tizenslider", $.mobile.widget, {
		options: {
			popup: true
		},

		popup: null,
		handle: null,
		handleText: null,

		_create: function () {
			this.currentValue = null;
			this.popupVisible = false;

			var self = this,
				inputElement = $( this.element ),
				slider,
				handle_press,
				popupEnabledAttr,
				icon,
				text_right,
				text_left,
				text_length,
				elem_left,
				elem_right,
				margin_left,
				margin_right;

			// apply jqm slider
			inputElement.slider();

			// hide the slider input element proper
			inputElement.hide();

			self.popup = $('<div class="ui-slider-popup"></div>');

			// set the popup according to the html attribute
			popupEnabledAttr = inputElement.jqmData('popup');
			if ( popupEnabledAttr !== undefined ) {
				self.options.popup = ( popupEnabledAttr == true );
			}

			// get the actual slider added by jqm
			slider = inputElement.next('.ui-slider');

			icon = inputElement.attr('data-icon');

			// wrap the background
			slider.wrap('<div class="ui-slider-container"></div>');

			// get the handle
			self.handle = slider.find('.ui-slider-handle');

			// remove the rounded corners from the slider and its children
			slider.removeClass('ui-btn-corner-all');
			slider.find('*').removeClass('ui-btn-corner-all');

			// add icon
			switch ( icon ) {
			case 'bright':
			case 'volume':
				elem_left = $('<div class="ui-slider-left-' + icon + '"></div>');
				elem_right = $('<div class="ui-slider-right-' + icon + '"></div>');

				slider.before( elem_left );
				slider.after( elem_right );

				margin_left = elem_left.width() + 16;
				margin_right = elem_right.width() + 16;
				break;

			case 'text':
				text_left = ( inputElement.attr('data-text-left') === undefined ) ? '' :
						inputElement.attr('data-text-left').substring( 0, 3 );
				text_right = ( inputElement.attr('data-text-right') === undefined ) ? '' :
						inputElement.attr('data-text-right').substring( 0, 3 );

				text_length = Math.max( text_left.length, text_right.length ) + 1;

				margin_left = text_length + "rem";
				margin_right = text_length + "rem";

				elem_left = $('<div class="ui-slider-left-text" style="left:' +
					-( text_length ) + 'rem; width:' + text_length + 'rem;">' +
					'<span style="position:relative;top:0.4em;">' +
					text_left +
					'</span></div>');
				elem_right = $('<div class="ui-slider-right-text" style="right:' +
					-( text_length ) + 'rem; width:' + text_length + 'rem;">' +
					'<span style="position:relative;top:0.4em;">' +
					text_right +
					'</span></div>');

				slider.before( elem_left );
				slider.after( elem_right );
				break;
			}

			if ( icon ) {
				slider.parent('.ui-slider-container').css({
					"margin-left": margin_left,
					"margin-right": margin_right
				});
			}

			// handle press
			slider.append($('<div class="ui-slider-handle-press"></div>'));
			self.handle_press = slider.find('.ui-slider-handle-press');
			self.handle_press.css('display', 'none');

			// add a popup element (hidden initially)
			slider.before( self.popup );
			self.popup.hide();

			// get the element where value can be displayed
			self.handleText = slider.find('.ui-btn-text');

			// set initial value
			self.updateSlider();

			// bind to changes in the slider's value to update handle text
			this.element.bind('change', function () {
				self.updateSlider();
			});

			// bind clicks on the handle to show the popup
			self.handle.bind('vmousedown', function () {
				self.showPopup();
			});

			// watch events on the document to turn off the slider popup
			slider.add( document ).bind('vmouseup', function () {
				self.hidePopup();
			});
		},

		_handle_press_show: function () {
			this.handle_press.css('display', '');
		},

		_handle_press_hide: function () {
			this.handle_press.css('display', 'none');
		},

		// position the popup
		positionPopup: function () {
			var dstOffset = this.handle.offset();

			this.popup.offset({
				left: dstOffset.left + ( this.handle.width() - this.popup.width() ) / 2
			});

			this.handle_press.offset({
				left: dstOffset.left,
				top: dstOffset.top
			});
		},

		// show value on the handle and in popup
		updateSlider: function () {
			var font_size,
				font_length,
				font_top,
				padding_size,
				newValue,
				get_value_length = function ( v ) {
					var val = Math.abs( v ),
						len;

					if ( val > 999 ) {
						len = 4;
					} else if ( val > 99 ) {
						len = 3;
					} else if ( val > 9 ) {
						len = 2;
					} else {
						len = 1;
					}

					if ( v < 0 ) {
						len++;
					}

					return len;
				};

			// remove the title attribute from the handle (which is
			// responsible for the annoying tooltip); NB we have
			// to do it here as the jqm slider sets it every time
			// the slider's value changes :(
			this.handle.removeAttr('title');

			newValue = this.element.val();

			font_length = get_value_length( newValue );

			if ( this.popupVisible ) {
				this.positionPopup();

				switch ( font_length ) {
				case 1:
				case 2:
					font_size = '1.5rem';
					padding_size = '0.15rem';
					break;
				case 3:
					font_size = '1rem';
					padding_size = '0.5rem';
					break;
				default:
					font_size = '0.8rem';
					padding_size = '0.5rem';
					break;
				}

				this.popup.css({
					"font-size": font_size,
					"padding-top": padding_size
				});
			}

			if ( newValue === this.currentValue ) {
				return;
			}

			switch ( font_length ) {
			case 1:
				font_size = '0.95rem';
				font_top = '0';
				break;
			case 2:
				font_size = '0.85rem';
				font_top = '-0.01rem';
				break;
			case 3:
				font_size = '0.65rem';
				font_top = '-0.05rem';
				break;
			default:
				font_size = '0.45rem';
				font_top = '-0.15rem';
				break;
			}

			if ( font_size != this.handleText.css('font-size') ) {
				this.handleText.css({
					'font-size': font_size,
					'top': font_top
				});
			}

			this.currentValue = newValue;
			this.handleText.text( newValue );
			this.popup.html( newValue );

			this.element.trigger( 'update', newValue );
		},

		// show the popup
		showPopup: function () {
			if ( !this.options.popup || this.popupVisible ) {
				return;
			}

			this.popup.show();
			this.popupVisible = true;
			this._handle_press_show();
		},

		// hide the popup
		hidePopup: function () {
			if ( !this.options.popup || !this.popupVisible ) {
				return;
			}

			this.popup.hide();
			this.popupVisible = false;
			this._handle_press_hide();
		},

		_setOption: function (key, value) {
			var needToChange = ( value !== this.options[key] );

			if ( !needToChange ) {
				return;
			}

			switch ( key ) {
			case 'popup':
				this.options.popup = value;

				if ( this.options.popup) {
					this.updateSlider();
				} else {
					this.hidePopup();
				}

				break;
			}
		}
	});

	// stop jqm from initialising sliders
	$( document ).bind( "pagebeforecreate", function ( e ) {
		if ( $.data( window, "jqmSliderInitSelector" ) === undefined ) {
			$.data( window, "jqmSliderInitSelector",
				$.mobile.slider.prototype.options.initSelector );
			$.mobile.slider.prototype.options.initSelector = null;
		}
	});

	// initialise sliders with our own slider
	$( document ).bind( "pagecreate create", function ( e ) {
		var jqmSliderInitSelector = $.data( window, "jqmSliderInitSelector" );
		$( e.target ).find(jqmSliderInitSelector).not('select').tizenslider();
		$( e.target ).find(jqmSliderInitSelector).filter('select').slider();
	});

}( jQuery, this ));
/*
 * jQuery Mobile Widget @VERSION
 *
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 * Copyright (c) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * Authors: Kalyan Kondapally <kalyan.kondapally@intel.com>,
 *          Elliot Smith <elliot.smith@intel.com>
 *          Hyunjung Kim <hjnim.kim@samsung.com>
 */

// Widget which turns a html element into a "swipe":
// i.e. each list item has a sliding "cover" which can be swiped
// to the right (to reveal buttons underneath) or left (to
// cover the buttons again). Clicking on a button under a swipe
// also moves the cover back to the left.
//
// In this case, the cover is over a grid of buttons;
// but it is should also be possible to use other types of markup under the
// list items.
//
// WARNING: This doesn't work well inside a scrollview widget, as
// the touch events currently interfere with each other badly (e.g.
// a swipe will work but cause a scroll as well).
//
// Theme: default is to use the theme on the target element,
// theme passed in options, parent theme, or 'c' if none of the above.
// If list items are themed individually, the cover will pick up the
// theme of the list item which is its parent.
//

/**
	@class Swipe
	The swipe widget shows a view on the screen where the items can be swiped vertically to show a menu.
	To add a swipe widget to the application, use the following code:

		<ul data-role="listview">
			<li data-role="swipe">
				<div data-role="swipe-cover">
					<div data-role="button" data-inline="true">OK</div>
					<div data-role="button" data-inline="true">Cancel</div>
				</div>
				<div data-role="swipe-item-cover">
					<p>This is a swipe item cover.<br>
						This will be swiped out when swipe event comes.</p>
				</div>
			</li>
		</ul>

	You can use methods with the swipe as described in the jQueryMobile documentation for view methods.
*/
/**
	@property {String} data-role
	Creates a swipe using the HTML unordered view (&gt;ul&lt;) element.
	The default value is swipe.

	Creates a swipe item cover using an HTML $gt;div$lt; element. This cover can be swiped to show the content beneath it.
	The default value is swipe-item-cover.
*/
/**
	@method open
	uncover swipe item
*/
/**
	@method close
	cover swipe item
*/
/**
	@method opened
	return coveritem status( coverd or uncovred )
*/
/**
	@event animationstart
	The swipe can define a callback for the animationstart event, which is fired after a item is swipe and the swipe animation is start:
*/
/**
	@event animationend
	The swipe can define a callback for the animationend event, which is fired after a item is swiped and the swipe animation is complete:

		<ul data-role="listview">
		<li data-role="swipe">
				<div data-role="swipe-cover">
					<div data-role="button" data-inline="true">OK</div>
					<div data-role="button" data-inline="true">Cancel</div>
				</div>
				<div data-role="swipe-item-cover" id="foo">
				<p>This is a swipe item cover.<br>
						This will be swiped out when swipe event comes.</p>
				</div>
			</li>
		</ul>
		$("#foo").bind("animationend", function (ev)
		{
			Console.log("Swipe cover's animation is complete.");
		});
*/
(function ($) {

	$.widget("tizen.swipe", $.mobile.widget, {
		options: {
			theme: null
		},

		_create: function () {
			// use the theme set on the element, set in options,
			// the parent theme, or 'c' (in that order of preference)
			var theme = this.element.jqmData('theme') ||
				this.options.theme ||
				this.element.parent().jqmData('theme') ||
				's';

			this.options.theme = theme;
			this._isopen = false;
			this.refresh();
		},

		refresh: function () {
			this._cleanupDom();

			var self = this,
				defaultCoverTheme,
				covers,
				coverTheme,
				item,
				itemHasThemeClass;

			defaultCoverTheme = 'ui-body-' + this.options.theme;

			if ( !this.element.parent().hasClass('ui-listview') ) {
				this.element.parent().listview();
			}
			this.element.addClass('ui-swipe');

			// get the item covers
			covers = this.element.find(':jqmData(role="swipe-item-cover")');
			item = this.element.find(':jqmData(role="swipe-item")');

			this._covers = covers;
			this._item = item;
			item.addClass('ui-swipe-item');
			coverTheme = defaultCoverTheme;
			itemHasThemeClass = item.parent().attr('class')
					.match(/ui\-body\-[a-z]|ui\-bar\-[a-z]/);

			covers.each( function () {
				var cover = $( this );

				if ( itemHasThemeClass ) {
					coverTheme = itemHasThemeClass[0];
				}

				cover.addClass('ui-swipe-item-cover');
				cover.addClass( coverTheme );

				if ( cover.has('.ui-swipe-item-cover-inner').length === 0 ) {
					cover.wrapInner( $('<span/>').addClass('ui-swipe-item-cover-inner') );
				}

				if ( !( cover.data('animateRight') && cover.data('animateLeft') ) ) {
					cover.data('animateRight', function () {
						self._animateCover( cover, 110, item );
					});

					cover.data('animateLeft', function () {
						self._animateCover( cover, 0, item );
					});
				}

				// bind to synthetic events
				item.bind( 'swipeleft', cover.data('animateLeft') );
				cover.bind( 'swiperight', cover.data('animateRight') );
				item.find( '.ui-btn' ).bind( 'vclick', cover.data('animateLeft') );
			} );

		},

		_cleanupDom: function () {
			var self = this,
				defaultCoverTheme,
				cover,
				coverTheme = defaultCoverTheme,
				item,
				itemClass,
				itemHasThemeClass,
				text,
				wrapper;

			defaultCoverTheme = 'ui-body-' + this.options.theme;

			this.element.removeClass('ui-swipe');

			// get the item covers
			cover = this.element.find(':jqmData(role="swipe-item-cover")');
			item = this.element.find(':jqmData(role="swipe-item")');

			item.removeClass('ui-swipe-item');
			cover.removeClass('ui-swipe-item-cover');

			itemClass = item.attr('class');
			itemHasThemeClass = itemClass &&
				itemClass.match(/ui\-body\-[a-z]|ui\-bar\-[a-z]/);

			if ( itemHasThemeClass ) {
				coverTheme = itemHasThemeClass[0];
			}

			cover.removeClass(coverTheme);

			// remove wrapper HTML
			wrapper = cover.find('.ui-swipe-item-cover-inner');
			wrapper.children().unwrap();
			text = wrapper.text();

			if ( text ) {
				cover.append( text );
				wrapper.remove();
			}

			// unbind swipe events
			if ( cover.data('animateRight') && cover.data('animateLeft') ) {
				cover.unbind( 'swiperight', cover.data('animateRight') );
				item.unbind( 'swipeleft', cover.data('animateLeft') );

				// unbind clicks on buttons inside the item
				item.find('.ui-btn').unbind( 'vclick', cover.data('animateLeft') );

				cover.data( 'animateRight', null );
				cover.data( 'animateLeft', null );
			}
		},

		// NB I tried to use CSS animations for this, but the performance
		// and appearance was terrible on Android 2.2 browser;
		// so I reverted to jQuery animations
		//
		// once the cover animation is done, the cover emits an
		// animationComplete event
		_animateCover: function ( cover, leftPercentage, item ) {
			var self = this,
				animationOptions = {
					easing: 'linear',
					duration: 'normal',
					queue: true,
					complete: function () {
						cover.trigger('animationend');
					}
				};

			$( this.element.parent() )
				.find(":jqmData(role='swipe')")
				.each(
					function () {
						if ( this !== self.element.get(0) &&
								$( this ).swipe("opened") ) {
							$( this ).swipe("close");
						}
					}
				);

			if ( leftPercentage == 110 ) {
				this._isopen = true;
			} else {
				this._isopen = false;
			}

			cover.stop();
			cover.clearQueue();
			cover.trigger('animationstart');
			cover.animate( { left: leftPercentage + '%' }, animationOptions );
			if ( leftPercentage == 0 ) {
				item.animate({ opacity: 0 }, "slow");
			} else {
				item.animate({ opacity: 1 }, "slow");
			}

		},

		destroy: function () {
			this._cleanupDom();
		},

		open: function () {
			var self = this;

			$( self._covers ).each( function () {
				var cover = $( this );
				self._animateCover( cover, 110, self._item);
			} );
		},

		opened: function () {
			return this._isopen;
		},

		close: function () {
			var self = this;

			$( self._covers ).each( function () {
				var cover = $( this );
				self._animateCover( cover, 0, self._item);
			} );
		}

	});

	$( document ).bind("pagecreate", function ( e ) {
		$( e.target ).find(":jqmData(role='swipe')").swipe();
	});

}( jQuery ));
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 * jQuery Mobile Framework : "tabbar" plugin
 * Copyright (c) jQuery Project
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 * Authors: Jinhyuk Jun <jinhyuk.jun@samsung.com>
*/

/**
 *  Tabbar can be created using data-role = "tabbar" inside footer 
 *  Framework determine which tabbar will display with tabbar attribute
 *
 * Examples:
 *         
 *     HTML markup for creating tabbar: ( 2 ~ 5 li item available )
 *     icon can be changed data-icon attribute (customized icon need)
 *         <div data-role="footer" data-position ="fixed">
 *              <div data-role="tabbar">
 *                     <ul>
 *                            <li><a href="#" class="ui-btn-active">Menu</a></li>
 *                            <li><a href="#">Save</a></li>
 *                            <li><a href="#">Share</a></li>
 *                     </ul>
 *             </div>
 *      </div>
*/

(function ( $, undefined ) {

	$.widget( "tizen.tabbar", $.mobile.widget, {
		options: {
			iconpos: "top",
			grid: null,
			defaultList : 4,
			initSelector: ":jqmData(role='tabbar')"
		},

		_create: function () {

			var $tabbar = this.element,
				$tabbtns,
				textpos,
				iconpos,
				theme = $.mobile.listview.prototype.options.theme,	/* Get current theme */
				ww = window.innerWidth || $( window ).width(),
				wh = window.innerHeight || $( window ).height(),
				tabbarDividerLeft = "<div class='ui-tabbar-divider ui-tabbar-divider-left'></div>",
				tabbarDividerRight = "<div class='ui-tabbar-divider ui-tabbar-divider-right'></div>",
				isScrollingStart = false,
				isScrollingEnd = false,
				isLandscape;

			isLandscape = ww > wh && ( ww - wh );

			if ( isLandscape ) {
				$tabbar.removeClass( "ui-portrait-tabbar" ).addClass( "ui-landscape-tabbar" );
			} else {
				$tabbar.removeClass( "ui-landscape-tabbar" ).addClass( "ui-portrait-tabbar" );
			}

			if ( $tabbar.find( "a" ).length ) {
				$tabbtns = $tabbar.find( "a" );
				iconpos = $tabbtns.filter( ":jqmData(icon)" ).length ? this.options.iconpos : undefined;
				textpos = $tabbtns.html().length ? true : false;
			}

			if ( $tabbar.parents( ".ui-header" ).length && $tabbar.parents( ".ui-scrollview-view" ).length ) {
				$tabbar.find( "li" ).addClass( "tabbar-scroll-li" );
				$tabbar.find( "ul" ).addClass( "tabbar-scroll-ul" );

				/* add shadow divider */
				$( tabbarDividerLeft ).appendTo( $tabbar.parents( ".ui-scrollview-clip" ) );
				$( tabbarDividerRight ).appendTo( $tabbar.parents( ".ui-scrollview-clip" ) );

				$( ".ui-tabbar-divider-left" ).hide();
				$( ".ui-tabbar-divider-right" ).hide();

				/* add width calculation*/
				if ( $tabbar.parents( ".ui-scrollview-view" ).data("default-list") ) {
					this.options.defaultList = $tabbar.parents( ".ui-scrollview-view" ).data( "default-list" );
				}
				$tabbar.find( "li" ).css( "width", window.innerWidth / this.options.defaultList + "px" );
			} else {
				if ( $tabbar.find( "ul" ).children().length ) {
					$tabbar.addClass( "ui-navbar" )
						.find( "ul" )
						.grid( { grid: this.options.grid } );
				}
			}

			if ( $tabbar.parents( ".ui-footer" ).length  ) {
				$tabbar.find( "li" ).addClass( "ui-tab-btn-style" );
			}

			/* title tabbar */
			if ( $tabbar.siblings( ".ui-title" ).length ) {
				$tabbar.parents( ".ui-header" ).addClass( "ui-title-tabbar" );
			}

			if ( !iconpos ) {
				$tabbar.addClass( "ui-tabbar-noicons" );
			}
			if ( !textpos ) {
				$tabbar.addClass( "ui-tabbar-notext" );
			}
			if ( textpos && iconpos ) {
				$tabbar.parents( ".ui-header" ).addClass( "ui-title-tabbar-multiline" );
			}

			if ( $tabbar.find( "a" ).length ) {
				$tabbtns.buttonMarkup({
					corners:	false,
					shadow:		false,
					iconpos:	iconpos
				});
			}

			if ( $tabbar.find( ".ui-state-persist" ).length ) {
				$tabbar.addClass( "ui-tabbar-persist" );
			}

			$tabbar.delegate( "a", "vclick", function ( event ) {
				$tabbtns.not( ".ui-state-persist" ).removeClass( $.mobile.activeBtnClass );
				$( this ).addClass( $.mobile.activeBtnClass );
			});

			$tabbar.addClass( "ui-tabbar");

			$( document ).bind( "pagebeforeshow", function ( event, ui ) {
				var footer_filter = $( event.target ).find( ":jqmData(role='footer')" ),
					tabbar_filter = footer_filter.find( ":jqmData(role='tabbar')" ),
					$elFooterMore = tabbar_filter.siblings( ":jqmData(icon='naviframe-more')" ),
					$elFooterBack = tabbar_filter.siblings( ".ui-btn-back" );

				footer_filter
					.css( "position", "fixed" )
					.css( "bottom", 0 )
					.css( "height", tabbar_filter.height() );
				if ( $elFooterMore.length ) {
					tabbar_filter.addClass( "ui-tabbar-margin-more" );
				}
				if ( $elFooterBack.length ) {
					tabbar_filter.addClass( "ui-tabbar-margin-back" );
				}

				isScrollingStart = false;
			});

			$( window ).bind( "tabbar.scrollstart", function ( e ) {
				if ( $( e.target ).find( ".ui-tabbar" ).length ) {
					isScrollingStart = true;
					isScrollingEnd = false;
				}
			});

			$( window ).bind( "tabbar.scrollstop", function ( e ) {
				var $tabbarScrollview = $( e.target ),
					$minElement = $tabbar.find( "li" ).eq( 0 ),
					minElementIndexVal = Math.abs( $tabbar.find( "li" ).eq( 0 ).offset().left ),
					minElementIndex = -1;

				isScrollingEnd = true;
				if ( $( e.target ).find( ".ui-tabbar" ).length && isScrollingStart == true ) {
					$tabbar.find( "li" ).each( function ( i ) {
						var offset	= $tabbar.find( "li" ).eq( i ).offset();
						if ( Math.abs( offset.left ) < minElementIndexVal ) {
							minElementIndexVal = Math.abs( offset.left );
							minElementIndex = i;
							$minElement = $tabbar.find( "li" ).eq( i );
						}
					});

					if ( $tabbarScrollview.length && isScrollingStart == isScrollingEnd && minElementIndex != -1) {
						isScrollingStart = false;
						$tabbarScrollview.scrollview( "scrollTo", -( window.innerWidth / $( e.target ).find( ".ui-tabbar" ).data( "defaultList" ) * minElementIndex ) , 0, 357);
					}
				}

				$( ".ui-tabbar-divider-left" ).hide();
				$( ".ui-tabbar-divider-right" ).hide();
			});

			$tabbar.bind( "touchstart vmousedown", function ( e ) {
				var $tabbarScroll = $( e.target ).parents( ".ui-scrollview-view" );
				if ( $tabbarScroll.offset() ) {
					if ( $tabbarScroll.offset().left < 0 ) {
						$( ".ui-tabbar-divider-left" ).show();
					} else {
						$( ".ui-tabbar-divider-left" ).hide();
					}
					if ( ( $tabbarScroll.width() - $tabbarScroll.parents( ".ui-scrollview-clip" ).width() ) ==  Math.abs( $tabbarScroll.offset().left ) ) {
						$( ".ui-tabbar-divider-right" ).hide();
					} else {
						$( ".ui-tabbar-divider-right" ).show();
					}
				}
			});

			this._bindTabbarEvents();
		},

		_bindTabbarEvents: function () {
			var $tabbar = this.element;

			$( window ).bind( "orientationchange", function ( e, ui ) {
				var ww = window.innerWidth || $( window ).width(),
					wh = window.innerHeight || $( window ).height(),
					isLandscape = ww > wh && ( ww - wh );

				if ( isLandscape ) {
					$tabbar.removeClass( "ui-portrait-tabbar" ).addClass( "ui-landscape-tabbar" );
				} else {
					$tabbar.removeClass( "ui-landscape-tabbar" ).addClass( "ui-portrait-tabbar" );
				}
			});
		},

		_setDisabled: function ( value, cnt ) {
			this.element.find( "li" ).eq( cnt ).attr( "disabled", value );
			this.element.find( "li" ).eq( cnt ).attr( "aria-disabled", value );
		},

		disable: function ( cnt ) {
			this._setDisabled( true, cnt );
			this.element.find( "li" ).eq( cnt ).addClass( "ui-disabled" );
		},

		enable: function ( cnt ) {
			this._setDisabled( false, cnt );
			this.element.find( "li" ).eq( cnt ).removeClass( "ui-disabled" );
		}
	});

	//auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		$( $.tizen.tabbar.prototype.options.initSelector, e.target ).tabbar();
	});
}( jQuery ) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Kangsik Kim <kangsik81.kim@samsung.com>
 *				Minkyeong Kim <minkyeong.kim@samsung.com>
*/

/**
 *	The TokenTextArea widget changes a text item to a button. It can be comprised of a number of button widgets. 
 *	When a user types text and the text gets a specific event to change from a text to a button, 
 *	the input text is changed to a TokenTextArea widget.
 *	A user can add the TokenTextArea widget to a contact list, email list, or another list.
 *	The typical use of this widget is composing a number of contacts or phone numbers in a specific area of the screen.
 *
 *	HTML Attributes:
 *
 *		data-link : Represents the page id.
 *				The page contains data for the user, for example, an address book.
 *				If the value is null, anchor button doesn't work. (Default : null)
 *		data-label:	Provide a label for a user-guide. (Default : 'To : ')
 *		data-description : This attribute is managing message format.
 *				This message is displayed when widget status was changed to 'focusout'. (Default : '+ {0}')
 *
 *	APIs:
 *
 *		inputtext (  [string]  )
 *			: If argument is not exist, will get a string from inputbox.
 *			If argument is exist, will set a string to inputbox.
 *		select (  [number]  )
 *			: If no argument exists, gets a string of the selected block.
 *			If any button isn't selected on a token text area widget, this method returns "null" value.
 *			When a user call this method with an argument which is a number type,
 *			this method selects the button which is matched with the argument.
 *		add ( text, [number] )
 *			:  If second argument does not exist, will insert to a new button at last position.
 *			Insert a new button at indexed position. The position is decided by the second argument.
 *			"index of position" means that the position of inserting a new button is decided by the second argument on "add" method.
 *			For example, if a user call the method like this "add("Tizen", 2)",
 *			new button labed "Tizen" will be inserted on the third position.
 *		remove ( [number] )
 *			: If no argument exists, all buttons are removed.
 *			Remove a button at indexed position.
 *			The position is decided by the second argument. (index: index of button)
 *		length ( void )
 *			: Get a number of buttons.
 *		foucsIn ( void )
 *			: This method change a status to 'focusin'.
 *			This status is able to manage a widget.
 *		focusOut ( void )
 *			: Changes the focus status to 'focus out'.
 *			The status is not able to manage a widget.
 *			All buttons that contained in the widget are removed and
 *			summarized message is displayed.
 *		destroy ( void )
 *			: Remove all of the new DOM elements for the current widget that you created.
 *
 *	Events:
 *
 *		create : Occur when create TokenTextArea widget.
 *		select : Occur when a button is selected.
 *		add : Occur when new button is inserted.
 *		remove : Occur when a button is removed.
 *
 *	Examples:
 *
 *		<div data-role="tokentextarea" data-label="To : " data-link:"#addressbook" data-description="+ {0}">
 *		</div>
 *
 */


/**
	@class TokenTextArea
	The TokenTextArea widget enables the user to enter text and convert it to a button. Each button that is created from entered text as a result of a change event forms a token text area widget. This widget is useful in composing an e-mail or SMS message to a group of addresses, each of which is a clickable item for more actions, such as copying, editing, or removing the address.

	To add a token text area widget to the application, use the following code:

		<div data-role="tokentextarea" data-label="To : " data-link="pageId">
		</div>
*/

/**
	@property {String}  data-label
	Sets a label as a guide for the user.
	For example, while composing an e-mail message, the 'To : ' label is a guide for the user to enter e-mail addresses.
*/

/**
	@property {String} data-decription
	Manages the message format.
	The message is displayed when the widget status changes to focus out
 */
/**
	@property {String} data-link
	Sets the ID of the page to which the button links.
*/
/**
	@event create
	The create event is fired when the token text area widget is created:

		<div data-role="tokentextarea">
		</div>
		// Option 01
		$(".selector").tokentextarea
		({
			create: function(event, ui)
			{
				// Handle the create event
			}
		});
		// Option 02
		$(".selector").bind("create", function(event, ui)
		{
			// Handle the create event
		});
**/
/**
	@event select
	The select event is fired when a token text area widget button is selected:

		<div data-role="tokentextarea">
		</div>
		// Option 01
		$(".selector").tokentextarea
		({
			select: function(event, ui)
			{
			// Handle the select event
			}
		});
		// Option 02
		$(".selector").bind("select", function(event, ui)
		{
			// Handle the select event
		});	
*/
/**
	@event add
	The add event is fired when a token text area widget button is created:

		<div data-role="tokentextarea">
		</div>
		// Option 01
		$(".selector").tokentextarea
		({
			add: function(event, ui)
			{
				// Handle the add event
			}
		});
		// Option 02
		$(".selector").bind("add", function(event, ui)
		{
		// Handle the add event
		});
*/
/**
	@event remove
	The remove event is fired when a token text area widget button is removed:

		<div data-role="tokentextarea">
		</div>
		// Option 01
		$(".selector").tokentextarea
		({
			remove: function(event, ui)
			{
			// Handle the remove event
			}
		});
		// Option 02
		$(".selector").bind("remove", function(event, ui)
		{
			// Handle the remove event
		});
*/
/**
	@method destroy
	The destroy method is used to remove in the current widget all the new DOM elements that you have created.
	
		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("destroy");
	
	@since Tizen2.0
*/
/**
	@method inputText
	The inputText method is used to manage the widget input box text. If no parameter is set, the method gets the input box text. If a parameter is set, the parameter text is set in the input box.
	
		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("inputText", [text]);
*/
/**
	@method select
	The select method is used to select a token text area widget button based on its index value. If no index value is defined, the method returns the string of the selected block. If there are no buttons present in the widget, the method returns null.

		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("select", [index]);
*/
/**
	@method add
	The add method is used to add a new token text area widget button with the specified label text at the specified index position. If the index parameter is not defined, the widget button is added at the bottom of the list. For example, the $(".selector").tokentextarea("add", "Tizen", 2) method call creates a new widget button labeled 'Tizen' at the third position in the widget.

		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("add", [text], [index]);
*/
/**
	@method remove
	The remove method is used to remove a token text area widget button at the specified index position. If the parameter is not defined, all the widget buttons are removed.

		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("remove", [index]);
*/
/**
	@method length
	The length method is used to retrieve the number of buttons in the token text area widget:
		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("length");
*/
/**
	@method focusIn
	The focusIn method is used to set the focus status to "focus in". This focus state enables the user to add or remove buttons in the token text area widget.

		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("focusIn");
*/
/**
	@method focusOut
	The focusOut method is used to set the focus status to "focus out". In this focus state, the user cannot manage the buttons in the widget, all the buttons are removed, and a message is displayed.

		<div data-role="tokentextarea">
		</div>
		$(".selector").tokentextarea("focusOut");
*/
( function ( $, window, document, undefined ) {
	$.widget( "tizen.tokentextarea", $.mobile.widget, {
		_focusStatus : null,
		_items : null,
		_viewWidth : 0,
		_reservedWidth : 0,
		_currentWidth : 0,
		_fontSize : 0,
		_anchorWidth : 0,
		_labelWidth : 0,
		_marginWidth : 0,
		options : {
			label : "To : ",
			link : null,
			description : "+ {0}"
		},

		_create : function () {
			var self = this,
				$view = this.element,
				role = $view.jqmData( "role" ),
				option = this.options,
				className = "ui-tokentextarea-link",
				inputbox = $( document.createElement( "input" ) ),
				labeltag = $( document.createElement( "label" ) ),
				moreBlock = $( document.createElement( "a" ) );

			$view.hide().empty().addClass( "ui-" + role );

			// create a label tag.
			$( labeltag ).text( option.label ).addClass( "ui-tokentextarea-label" );
			$view.append( labeltag );

			// create a input tag
			$( inputbox ).addClass( "ui-tokentextarea-input ui-tokentextarea-input-visible ui-input-text ui-body-s" );
			$view.append( inputbox );

			// create a anchor tag.
			if ( option.link === null || $.trim( option.link ).length < 1 || $( option.link ).length === 0 ) {
				className += "-dim";
			}
			$( moreBlock ).attr( "data-role", "button" )
				.buttonMarkup( {
					inline: true,
					icon: "plus",
					style: "circle"
				})
				.attr( "href", $.trim( option.link ) )
				.addClass( "ui-tokentextarea-link-base" )
				.addClass( className );

			// append default htmlelements to main widget.
			$view.append( moreBlock );

			// bind a event
			this._bindEvents();
			self._focusStatus = "init";
			// display widget
			$view.show();
			$view.attr( "tabindex", -1 ).focusin( function ( e ) {
				self.focusIn();
			});

			// assign global variables
			self._viewWidth = $view.innerWidth();
			self._reservedWidth += self._calcBlockWidth( moreBlock );
			self._reservedWidth += self._calcBlockWidth( labeltag );
			self._fontSize = parseInt( $( moreBlock ).css( "font-size" ), 10 );
			self._currentWidth = self._reservedWidth;
			self._modifyInputBoxWidth();
		},

		// bind events
		_bindEvents : function () {
			var self = this,
				$view = self.element,
				option = self.options,
				inputbox = $view.find( ".ui-tokentextarea-input" ),
				moreBlock = $view.find( ".ui-tokentextarea-link-base" ),
				isSeparator = false;

			// delegate a event to HTMLDivElement(each block).
			$view.delegate( "div", "click", function ( event ) {
				if ( $( this ).hasClass( "ui-tokentextarea-sblock" ) ) {
					// If block is selected, it will be removed.
					self._removeTextBlock();
				}

				var lockBlock = $view.find( "div.ui-tokentextarea-sblock" );
				if ( typeof lockBlock !== "undefined" ) {
					lockBlock.removeClass( "ui-tokentextarea-sblock" ).addClass( "ui-tokentextarea-block" );
				}
				$( this ).removeClass( "ui-tokentextarea-block" ).addClass( "ui-tokentextarea-sblock" );
				self._trigger( "select" );
			});

			inputbox.bind( "keyup", function ( event ) {
				// 8  : backspace
				// 13 : Enter
				// 186 : semi-colon
				// 188 : comma
				var keyValue = event.keyCode,
					valueString = $( inputbox ).val(),
					valueStrings = [],
					index;

				if ( keyValue === 8 ) {
					if ( valueString.length === 0 ) {
						self._validateTargetBlock();
					}
				} else if ( keyValue === 13 || keyValue === 186 || keyValue === 188 ) {
					if ( valueString.length !== 0 ) {
						// split content by separators(',', ';')
						valueStrings = valueString.split ( /[,;]/ );
						for ( index = 0; index < valueStrings.length; index++ ) {
							if ( valueStrings[index].length !== 0 && valueStrings[index].replace( /\s/g, "" ).length !== 0 ) {
								self._addTextBlock( valueStrings[index] );
							}
						}
					}
					inputbox.val( "" );
					isSeparator = true;
				} else {
					self._unlockTextBlock();
				}

				return !isSeparator;
			});

			moreBlock.click( function () {
				if ( $( moreBlock ).hasClass( "ui-tokentextarea-link-dim" ) ) {
					return;
				}

				$( inputbox ).removeClass( "ui-tokentextarea-input-visible" ).addClass( "ui-tokentextarea-input-invisible" );

				$.mobile.changePage( option.link, {
					transition: "slide",
					reverse: false,
					changeHash: false
				});
			});

			$( document ).bind( "pagechange.mbe", function ( event ) {
				if ( $view.innerWidth() === 0 ) {
					return ;
				}
				var inputBox = $view.find( ".ui-tokentextarea-input" );
				self._modifyInputBoxWidth();
				$( inputbox ).removeClass( "ui-tokentextarea-input-invisible" ).addClass( "ui-tokentextarea-input-visible" );
			});

			$view.bind( "click", function ( event ) {
				if ( self._focusStatus === "focusOut" ) {
					self.focusIn();
				}
			});
		},

		// create a textbutton and append this button to parent layer.
		// @param arg1 : string
		// @param arg2 : index
		_addTextBlock : function ( messages, blockIndex ) {
			if ( arguments.length === 0 ) {
				return;
			}

			if ( !messages ) {
				return ;
			}

			var self = this,
				$view = self.element,
				content = messages,
				index = blockIndex,
				blocks = null,
				textBlock = null;

			if ( self._viewWidth === 0 ) {
				self._viewWidth = $view.innerWidth();
			}

			// Create a new text HTMLDivElement.
			textBlock = $( document.createElement( 'div' ) );

			textBlock.text( content ).addClass( "ui-tokentextarea-block" );
			textBlock.css( {'visibility': 'hidden'} );

			blocks = $view.find( "div" );
			if ( index !== null && index <= blocks.length ) {
				$( blocks[index] ).before( textBlock );
			} else {
				$view.find( ".ui-tokentextarea-input" ).before( textBlock );
			}

			textBlock = self._ellipsisTextBlock( textBlock );
			textBlock.css( {'visibility': 'visible'} );

			self._currentWidth += self._calcBlockWidth( textBlock );
			self._modifyInputBoxWidth();
			self._trigger( "add" );
		},

		_removeTextBlock : function () {
			var self = this,
				$view = this.element,
				lockBlock = $view.find( "div.ui-tokentextarea-sblock" );

			if ( lockBlock !== null && lockBlock.length > 0 ) {
				self._currentWidth -= self._calcBlockWidth( lockBlock );
				lockBlock.remove();
				self._modifyInputBoxWidth();
				this._trigger( "remove" );
			} else {
				$view.find( "div:last" ).removeClass( "ui-tokentextarea-block" ).addClass( "ui-tokentextarea-sblock" );
			}
		},

		_calcBlockWidth : function ( block ) {
			return $( block ).outerWidth( true );
		},

		_unlockTextBlock : function () {
			var $view = this.element,
				lockBlock = $view.find( "div.ui-tokentextarea-sblock" );
			if ( lockBlock ) {
				lockBlock.removeClass( "ui-tokentextarea-sblock" ).addClass( "ui-tokentextarea-block" );
			}
		},

		// call when remove text block by backspace key.
		_validateTargetBlock : function () {
			var self = this,
				$view = self.element,
				lastBlock = $view.find( "div:last" ),
				tmpBlock = null;

			if ( lastBlock.hasClass( "ui-tokentextarea-sblock" ) ) {
				self._removeTextBlock();
			} else {
				tmpBlock = $view.find( "div.ui-tokentextarea-sblock" );
				tmpBlock.removeClass( "ui-tokentextarea-sblock" ).addClass( "ui-tokentextarea-block" );
				lastBlock.removeClass( "ui-tokentextarea-block" ).addClass( "ui-tokentextarea-sblock" );
			}
		},

		_ellipsisTextBlock : function ( textBlock ) {
			var self = this,
				$view = self.element,
				maxWidth = self._viewWidth - ( self._labelWidth + self._anchorWidth ) * 2;

			if ( self._calcBlockWidth( textBlock ) > maxWidth ) {
				$( textBlock ).width( maxWidth - self._marginWidth );
			}

			return textBlock;
		},

		_modifyInputBoxWidth : function () {
			var self = this,
				$view = self.element,
				margin = 0,
				labelWidth = 0,
				anchorWidth = 0,
				inputBoxWidth = 0,
				blocks = $view.find( "div" ),
				blockWidth = 0,
				index = 0,
				inputBoxMargin = 10,
				inputBox = $view.find( ".ui-tokentextarea-input" );

			if ( $view.width() === 0 ) {
				return;
			}

			if ( self._labelWidth === 0 ) {
				self._labelWidth = $view.find( ".ui-tokentextarea-label" ).outerWidth( true );
				self._anchorWidth = $view.find( ".ui-tokentextarea-link-base" ).outerWidth( true );
				self._marginWidth = parseInt( ( $( inputBox ).css( "margin-left" ) ), 10 );
				self._marginWidth += parseInt( ( $( inputBox ).css( "margin-right" ) ), 10 );
				self._viewWidth = $view.innerWidth();
			}

			margin = self._marginWidth;
			labelWidth = self._labelWidth;
			anchorWidth = self._anchorWidth;
			inputBoxWidth = self._viewWidth - labelWidth;

			for ( index = 0; index < blocks.length; index += 1 ) {
				blockWidth = self._calcBlockWidth( blocks[index] );

				if ( blockWidth >= inputBoxWidth + anchorWidth ) {
					if ( blockWidth >= inputBoxWidth ) {
						inputBoxWidth = self._viewWidth - blockWidth;
					} else {
						inputBoxWidth = self._viewWidth;
					}
				} else {
					if ( blockWidth >= inputBoxWidth ) {
						inputBoxWidth = self._viewWidth - blockWidth;
					} else {
						inputBoxWidth -= blockWidth;
					}
				}
			}

			inputBoxWidth -= margin;
			if ( inputBoxWidth < anchorWidth * 2 ) {
				inputBoxWidth = self._viewWidth - margin;
			}
			$( inputBox ).width( inputBoxWidth - anchorWidth - inputBoxMargin );
		},

		_stringFormat : function ( expression ) {
			var pattern = null,
				message = expression,
				i = 0;
			for ( i = 1; i < arguments.length; i += 1 ) {
				pattern = "{" + ( i - 1 ) + "}";
				message = message.replace( pattern, arguments[i] );
			}
			return message;
		},

		_resizeBlocks : function () {
			var self = this,
				$view = self.element,
				blocks = $view.find( "div" ),
				index = 0;

			for ( index = 0 ; index < blocks.length ; index += 1 ) {
				$( blocks[index] ).css( "width", "auto" );
				blocks[index] = self._ellipsisTextBlock( blocks[index] );
			}
		},

		//---------------------------------------------------- //
		//					Public Method   //
		//----------------------------------------------------//
		//
		// Focus In Event
		//
		focusIn : function () {
			if ( this._focusStatus === "focusIn" ) {
				return;
			}

			var $view = this.element;

			$view.find( "label" ).show();
			$view.find( ".ui-tokentextarea-desclabel" ).remove();
			$view.find( "div.ui-tokentextarea-sblock" ).removeClass( "ui-tokentextarea-sblock" ).addClass( "ui-tokentextarea-block" );
			$view.find( "div" ).show();
			$view.find( ".ui-tokentextarea-input" ).removeClass( "ui-tokentextarea-input-invisible" ).addClass( "ui-tokentextarea-input-visible" );
			$view.find( "a" ).show();

			// change focus state.
			this._modifyInputBoxWidth();
			this._focusStatus = "focusIn";
			$view.removeClass( "ui-tokentextarea-focusout" ).addClass( "ui-tokentextarea-focusin" );
		},

		focusOut : function () {
			if ( this._focusStatus === "focusOut" ) {
				return;
			}

			var self = this,
				$view = self.element,
				tempBlock = null,
				statement = "",
				index = 0,
				lastIndex = 10,
				label = $view.find( "label" ),
				more = $view.find( "span" ),
				blocks = $view.find( "div" ),
				currentWidth = $view.outerWidth( true ) - more.outerWidth( true ) - label.outerWidth( true ),
				blockWidth = 0;

			$view.find( ".ui-tokentextarea-input" ).removeClass( "ui-tokentextarea-input-visible" ).addClass( "ui-tokentextarea-input-invisible" );
			$view.find( "a" ).hide();
			blocks.hide();

			currentWidth = currentWidth - self._reservedWidth;

			for ( index = 0; index < blocks.length; index++ ) {
				blockWidth = $( blocks[index] ).outerWidth( true );
				if ( currentWidth - blockWidth <= 0 ) {
					lastIndex = index - 1;
					break;
				}

				$( blocks[index] ).show();
				currentWidth -= blockWidth;
			}

			if ( lastIndex !== blocks.length ) {
				statement = self._stringFormat( self.options.description, blocks.length - lastIndex - 1 );
				tempBlock = $( document.createElement( 'label' ) );
				tempBlock.text( statement );
				tempBlock.addClass( "ui-tokentextarea-desclabel" ).addClass( "ui-tokentextarea-desclabel" );
				$( blocks[lastIndex] ).after( tempBlock );
			}

			// update focus state
			this._focusStatus = "focusOut";
			$view.removeClass( "ui-tokentextarea-focusin" ).addClass( "ui-tokentextarea-focusout" );
		},

		inputText : function ( message ) {
			var $view = this.element;

			if ( arguments.length === 0 ) {
				return $view.find( ".ui-tokentextarea-input" ).val();
			}
			$view.find( ".ui-tokentextarea-input" ).val( message );
			return message;
		},

		select : function ( index ) {
			var $view = this.element,
				lockBlock = null,
				blocks = null;

			if ( this._focusStatus === "focusOut" ) {
				return;
			}

			if ( arguments.length === 0 ) {
				// return a selected block.
				lockBlock = $view.find( "div.ui-tokentextarea-sblock" );
				if ( lockBlock ) {
					return lockBlock.text();
				}
				return null;
			}
			// 1. unlock all blocks.
			this._unlockTextBlock();
			// 2. select pointed block.
			blocks = $view.find( "div" );
			if ( blocks.length > index ) {
				$( blocks[index] ).removeClass( "ui-tokentextarea-block" ).addClass( "ui-tokentextarea-sblock" );
				this._trigger( "select" );
			}
			return null;
		},

		add : function ( message, position ) {
			if ( this._focusStatus === "focusOut" ) {
				return;
			}

			this._addTextBlock( message, position );
		},

		remove : function ( position ) {
			var self = this,
				$view = this.element,
				blocks = $view.find( "div" ),
				index = 0;
			if ( this._focusStatus === "focusOut" ) {
				return;
			}

			if ( arguments.length === 0 ) {
				blocks.remove();
				this._trigger( "clear" );
			} else if ( !isNaN( position ) ) {
				// remove selected button
				index = ( ( position < blocks.length ) ? position : ( blocks.length - 1 ) );
				$( blocks[index] ).remove();
				this._trigger( "remove" );
			}
			self._modifyInputBoxWidth();
		},

		length : function () {
			return this.element.find( "div" ).length;
		},

		refresh : function () {
			var self = this,
				$view = this.element;

			self._viewWidth = $view.innerWidth();
			self._resizeBlocks();
			self._modifyInputBoxWidth();
		},

		destroy : function () {
			var $view = this.element;

			$view.find( "label" ).remove();
			$view.find( "div" ).undelegate( "click" ).remove();
			$view.find( "a" ).remove();
			$view.find( ".ui-tokentextarea-input" ).unbind( "keyup" ).remove();

			this._trigger( "destroy" );
		}
	});

	$( document ).bind( "pagecreate create", function () {
		$( ":jqmData(role='tokentextarea')" ).tokentextarea();
	});

	$( window ).bind( "resize", function () {
		$( ":jqmData(role='tokentextarea')" ).tokentextarea( "refresh" );
	});
} ( jQuery, window, document ) );
/*
 * This software is licensed under the MIT licence (as defined by the OSI at
 * http://www.opensource.org/licenses/mit-license.php)
 *
 * ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 * Copyright (c) 2011 by Intel Corporation Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 */

( function ($, undefined) {

	$.widget( "tizen.triangle", $.tizen.widgetex, {
		options: {
			extraClass: "",
			offset: null,
			color: null,
			location: "top",
			initSelector: ":jqmData(role='triangle')"
		},

		_create: function () {
			var triangle = $( "<div></div>", {"class" : "ui-triangle"} );

			$.extend(this, {
				_triangle: triangle
			});

			this.element.addClass( "ui-triangle-container" ).append( triangle );
		},

		_doCSS: function () {
			var location = ( this.options.location || "top" ),
				offsetCoord = ( ($.inArray(location, ["top", "bottom"]) === -1) ? "top" : "left"),
				cssArg = {
					"border-bottom-color" : "top"    === location ? this.options.color : "transparent",
					"border-top-color"    : "bottom" === location ? this.options.color : "transparent",
					"border-left-color"   : "right"  === location ? this.options.color : "transparent",
					"border-right-color"  : "left"   === location ? this.options.color : "transparent"
				};

			cssArg[offsetCoord] = this.options.offset;

			this._triangle.removeAttr( "style" ).css( cssArg );
		},

		_setOffset: function ( value ) {
			this.options.offset = value;
			this.element.attr( "data-" + ($.mobile.ns || "") + "offset", value );
			this._doCSS();
		},

		_setExtraClass: function ( value ) {
			this._triangle.addClass( value );
			this.options.extraClass = value;
			this.element.attr( "data-" + ($.mobile.ns || "") + "extra-class", value );
		},

		_setColor: function ( value ) {
			this.options.color = value;
			this.element.attr( "data-" + ($.mobile.ns || "") + "color", value );
			this._doCSS();
		},

		_setLocation: function ( value ) {
			this.element
				.removeClass( "ui-triangle-container-" + this.options.location )
				.addClass( "ui-triangle-container-" + value );
			this._triangle
				.removeClass( "ui-triangle-" + this.options.location )
				.addClass( "ui-triangle-" + value );

			this.options.location = value;
			this.element.attr( "data-" + ($.mobile.ns || "") + "location", value );

			this._doCSS();
		}
	});

	$( document ).bind( "pagecreate create", function ( e ) {
	    $($.tizen.triangle.prototype.options.initSelector, e.target)
	        .not(":jqmData(role='none'), :jqmData(role='nojs')")
	        .triangle();
	});

}(jQuery) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Kangsik Kim <kangsik81.kim@samsung.com>
 *			Youmin Ha <youmin.ha@samsung.com>
*/

/**
 * In the web environment, it is challenging to display a large amount of data in a grid.
 * When an application needs to show, for example, image gallery with over 1,000 images,
 * the same enormous data must be inserted into a HTML document.
 * It takes a long time to display the data and manipulating DOM is complex.
 * The virtual grid widget supports storing unlimited data without performance issues
 * by reusing a limited number of grid elements.
 * The virtual grid widget is based on the jQuery.template plug-in 
 * For more information, see jQuery.template.
 *
 * HTML Attributes:
 *
 *		data-role:  virtualgrid
 *		data-template :	Has the ID of the jQuery.template element.
 *						jQuery.template for a virtual grid must be defined.
 *						Style for template would use rem unit to support scalability.
 *		data-direction : This option define the direction of the scroll.
 *						You must choose one of the 'x' and 'y' (Default : y)
 *		data-rotation : This option defines whether or not the circulation of the data.
 *						If option is 'true' and scroll is reached the last data,
 *						Widget will present the first data on the screen.
 *						If option is ‘false’, Widget will operate like a scrollview.
 *
 *		ID : <DIV> element that has "data-role=virtualgrid" must have ID attribute.
 *
 * APIs:
 *
 *		create ( {
 *				itemData: function ( idx ) { return json_obj; },
 *				numItemData: number or function () { return number; },
 *				cacheItemData: function ( minIdx, maxIdx ) {}
 *				} )
 *			: Create VirtualGrid widget. At this moment, _create method is called.
 *			args : A collection of options
 *				itemData: A function that returns JSON object for given index. Mandatory.
 *				numItemData: Total number of itemData. Mandatory.
 *				cacheItemData: Virtuallist will ask itemData between minIdx and maxIdx.
 *				Developers can implement this function for preparing data.
 *				Optional.
 *
 *		centerTo ( String )
 *			: Find a DOM Element with the given class name.
 *			This element will be centered on the screen.
 *			Serveral elements were found, the first element is displayed.
 *
 * Events:
 *		scrollstart : : This event triggers when a user begin to move the scroll on VirtualGrid.
 *		scrollupdate : : This event triggers while a user moves the scroll on VirtualGrid.
 *		scrollstop : This event triggers when a user stop the scroll on VirtualGrid.
 *		select : This event triggers when a cell is selected.
 *
 * Examples:
 *
 *			<script id="tizen-demo-namecard" type="text/x-jquery-tmpl">
 *				<div class="ui-demo-namecard">
 *					<div class="ui-demo-namecard-pic">
 *						<img class="ui-demo-namecard-pic-img" src="${TEAM_LOGO}" />
 *					</div>
 *					<div class="ui-demo-namecard-contents">
 *						<span class="name ui-li-text-main">${NAME}</span>
 *						<span class="active ui-li-text-sub">${ACTIVE}</span>
 *						<span class="from ui-li-text-sub">${FROM}</span>
 *					</div>
 *				</div>
 *			</script>
 *			<div id="virtualgrid-demo" data-role="virtualgrid" data-template="tizen-demo-namecard" >
 *			</div>
 *
 */

// most of following codes are derived from jquery.mobile.scrollview.js

/**
	@class VirtualGrid
	In the Web environment, it is challenging to display large amount of data in a list, such as displaying a contact list of over 1000 list items. It takes time to display the entire list in HTML and the DOM manipulation is complex.

	The virtual grid widget is used to display a list of unlimited data elements on the screen for better performance. This widget displays the data in the grid format by reusing the existing grid control space. Virtual grids are based on the jQuery.template plugin as described in the jQuery documentation for jQuery.template plugin.

	To add a virtual grid widget to the application, use the following code:

		<script id="tizen-demo-namecard" type="text/x-jquery-tmpl">
			<div class="ui-demo-namecard">
				<div class="ui-demo-namecard-pic">
					<img class="ui-demo-namecard-pic-img" src="${TEAM_LOGO}" />
				</div>
				<div class="ui-demo-namecard-contents">
				<span class="name ui-li-text-main">${NAME}</span>
				</div>
			</div>
		</script>
		<div id="virtualgrid-demo" data-role="virtualgrid" data-template="tizen-demo-namecard">
		</div>
*/
/**
	@property {String} data-template
	Specifies the jQuery.template element ID.
	The jQuery.template must be defined. The template style can use rem units to support scalability.
*/
/**
	@property {String} data-direction
	Defines the scroll direction. The direction options are x (horizontal) and y (vertical).
	The default value is y.
*/
/**
	@property {Boolean} data-rotation
	Defines whether the data elements are displayed from the beginning of the list again once the end of file is reached.
	The default value is false.
*/
/**
	@event scrollstart
	The scrollstart event is fired when the user starts scrolling through the grid:

		<div data-role="virtualgrid" data-scroll="y" data-template="tizen-demo-namecard"></div>
		// Option 01
		$(".selector").virtualgrid
		({
			scrollstart: function(event, ui)
			{
			// Handle the scrollstart event
			}
		});
		// Option 02
		$(".selector").bind("scrollstart", function(event, ui)
		{
		// Handle the scrollstart event
		});
*/
/**
	@event scrollupdate
	The scrollupdate event is fired when the user moves the scroll bar in the grid:

		<div data-role="virtualgrid" data-scroll="y" data-template="tizen-demo-namecard"></div>
		// Option 01
		$(".selector").virtualgrid
		({
			scrollupdate: function(event, ui)
			{
			// Handle the scrollupdate event
			}
		});
		// Option 02
		$(".selector").bind("scrollupdate", function(event, ui)
		{
		// Handle the scrollupdate event
		});
*/
/**
	@event scrollstop
	The scrollstop event is fired when the user stops scrolling:

		<div data-role="virtualgrid" data-scroll="y" data-template="tizen-demo-namecard"></div>
		// Option 01
		$(".selector").virtualgrid
		({
			scrollstop: function(event, ui)
			{
			// Handle the scrollstop event
			}
		});
		// Option 02
		$(".selector").bind("scrollstop", function(event, ui)
		{
		// Handle the scrollstop event
		});
*/
/**
	@event select
	The select event is fired when a virtual grid cell is selected:

		<div data-role="virtualgrid" data-scroll="y" data-template="tizen-demo-namecard"></div>
		// Option 01
		$(".selector").virtualgrid
		({
			select: function(event, ui)
			{
			// Handle the select event
			}
		});
		// Option 02
		$(".selector").bind("select", function(event, ui)
		{
		// Handle the select event
		});
*/
/**
	@method create
	@param {function} itemData(index)
	@param {Number} numItemData
	@param {function} cacheItemData(minIndex, maxIndex)
	The create method is used to call the jQuery _create method. In the method parameters:

	function itemData(index) returns the JSON object matched with the given index. The index value is between 0 and numItemData-1.<br/>
	number numItemData or function numItemData() defines or returns a static number of items.<br/>
	function cacheItemData(minIndex, maxIndex) prepares the JSON data. This method is called before calling the itemData() method with index values between minIndex and maxIndex.<br/>

		<div data-role="virtualgrid" data-scroll="y" data-template="tizen-demo-namecard"></div>
			function itemData(idx)
			{
				return DATA[idx];
			}
			function cacheItemData(minIdx, maxIdx)
			{
			// Prepare JSON data between minIdx and maxIdx
			}
			var numItemData = DATA.length;
			$(".selector").virtualgrid("create",
			{
				itemData, numItemData, cacheItemData
			});
*/
/**
	@method centerTo
	The centerTo method is used to search for the DOM element with a specified class name. The retrieved element is placed at the center of the virtual grid. If multiple elements are retrieved, the first element from the result list is placed at the center of the virtual grid.

		<div data-role="virtualgrid" data-scroll="y" data-template="tizen-demo-namecard"></div>
		$(".selector").virtualgrid("centerTo", "selector");
*/
/**
	@method resize
	The resize method is used to rearrange the DOM elements to fit a new screen size when the screen is resized:

		<div data-role="virtualgrid" data-scroll="y" data-template="tizen-demo-namecard"></div>
		".selector").virtualgrid("resize");

	@since Tizen2.0
*/

( function ($, window, document, undefined) {

	function circularNum (num, total) {
		var n = num % total;
		if (n < 0) {
			n = total + n;
		}
		return n;
	}

	function MomentumTracker (options) {
		this.options = $.extend({}, options);
		this.easing = "easeOutQuad";
		this.reset();
	}

	var tstates = {
		scrolling : 0,
		done : 1
	};

	function getCurrentTime () {
		return Date.now();
	}

	$.extend (MomentumTracker.prototype, {
		start : function (pos, speed, duration) {
			this.state = (speed !== 0 ) ? tstates.scrolling : tstates.done;
			this.pos = pos;
			this.speed = speed;
			this.duration = duration;

			this.fromPos = 0;
			this.toPos = 0;

			this.startTime = getCurrentTime();
		},

		reset : function () {
			this.state = tstates.done;
			this.pos = 0;
			this.speed = 0;
			this.duration = 0;
		},

		update : function () {
			var state = this.state, duration, elapsed, dx, x;

			if (state == tstates.done) {
				return this.pos;
			}
			duration = this.duration;
			elapsed = getCurrentTime () - this.startTime;
			elapsed = elapsed > duration ? duration : elapsed;
			dx = this.speed * (1 - $.easing[this.easing] (elapsed / duration, elapsed, 0, 1, duration) );
			x = this.pos + dx;
			this.pos = x;

			if (elapsed >= duration) {
				this.state = tstates.done;
			}
			return this.pos;
		},

		done : function () {
			return this.state == tstates.done;
		},

		getPosition : function () {
			return this.pos;
		}
	});

	jQuery.widget ("mobile.virtualgrid", jQuery.mobile.widget, {
		options : {
			// virtualgrid option
			template : "",
			direction : "y",
			rotation : false,
		},

		create : function () {
			this._create.apply( this, arguments );
		},

		_create : function ( args ) {
			$.extend(this, {
				// view
				_$view : null,
				_$clip : null,
				_$rows : null,
				_tracker : null,
				_viewSize : 0,
				_clipSize : 0,
				_cellSize : undefined,
				_currentItemCount : 0,
				_itemCount : 1,
				_inheritedSize : null,

				// timer
				_timerInterval : 0,
				_timerID : 0,
				_timerCB : null,
				_lastMove : null,

				// Data
				_itemData : function ( idx ) { return null; },
				_numItemData : 0,
				_cacheItemData : function ( minIdx, maxIdx ) { },
				_totalRowCnt : 0,
				_template : null,
				_maxViewSize : 0,
				_modifyViewPos : 0,
				_maxSize : 0,

				// axis - ( true : x , false : y )
				_direction : false,
				_didDrag : true,
				_reservedPos : 0,
				_scalableSize : 0,
				_eventPos : 0,
				_nextPos : 0,
				_movePos : 0,
				_lastY : 0,
				_speedY : 0,
				_lastX : 0,
				_speedX : 0,
				_rowsPerView : 0,
				_fragment : null,

				_filterRatio : 0.9
			});

			var self = this,
				$dom = $(self.element),
				opts = self.options,
				$item = null;

			// itemData
			// If mandatory options are not given, Do nothing.
			if ( !args ) {
				return ;
			}

			if ( !self._loadData(args) ) {
				return;
			}

			// make a fragment.
			self._fragment = document.createDocumentFragment();

			// read defined properties(width and height) from dom element.
			self._inheritedSize = self._getinheritedSize(self.element);

			// set a scroll direction.
			self._direction = opts.direction === 'x' ? true : false;

			// make view layer
			self._$clip = $(self.element).addClass("ui-scrollview-clip").addClass("ui-virtualgrid-view");
			$item = $(document.createElement("div")).addClass("ui-scrollview-view");
			self._clipSize =  self._calculateClipSize();
			self._$clip.append($item);
			self._$view = $item;
			self._$clip.css("overflow", "hidden");
			self._$view.css("overflow", "hidden");

			// inherit from scrollview widget.
			self._scrollView = $.tizen.scrollview.prototype;
			self._initScrollView();

			// create tracker.
			self._createTracker();
			self._makePositioned(self._$clip);
			self._timerInterval = 1000 / self.options.fps;

			self._timerID = 0;
			self._timerCB = function () {
				self._handleMomentumScroll();
			};
			$dom.closest(".ui-content").addClass("ui-virtualgrid-content").css("overflow", "hidden");

			// add event handler.
			self._addBehaviors();

			self._currentItemCount = 0;
			self._createScrollBar();
			self.refresh();
		},

		// The argument is checked for compliance with the specified format.
		// @param args   : Object
		// @return boolean
		_loadData : function ( args ) {
			var self = this;

			if ( args.itemData && typeof args.itemData == 'function'  ) {
				self._itemData = args.itemData;
			} else {
				return false;
			}
			if ( args.numItemData ) {
				if ( typeof args.numItemData == 'function' ) {
					self._numItemData = args.numItemData( );
				} else if ( typeof args.numItemData == 'number' ) {
					self._numItemData = args.numItemData;
				} else {
					return false;
				}
			} else {
				return false;
			}
			return true;
		},

		// Make up the first screen.
		_initLayout: function () {
			var self = this,
				opts = self.options,
				i,
				$row;

			for ( i = -1; i < self._rowsPerView + 1; i += 1 ) {
				$row = self._$rows[ circularNum( i, self._$rows.length ) ];
				self._$view.append( $row );
			}
			self._setElementTransform( -self._cellSize );

			self._replaceRow(self._$view.children().first(), self._totalRowCnt - 1);
			if ( opts.rotation && self._rowsPerView >= self._totalRowCnt ) {
				self._replaceRow(self._$view.children().last(), 0);
			}
			self._setViewSize();
		},

		_setViewSize : function () {
			var self = this,
				height = 0,
				width = 0;

			if ( self._direction ) {
				width = self._cellSize * ( self._rowsPerView + 2 );
				width = parseInt(width, 10) + 1;
				self._$view.width( width );
				self._viewSize = self._$view.width();
			} else {
				self._$view.height( self._cellSize * ( self._rowsPerView + 2 ) );
				self._$clip.height( self._clipSize );
				self._viewSize = self._$view.height();
			}
		},

		_getViewHeight : function () {
			var self = this;
			return self._$view.height();
		},

		refresh : function () {
			var self = this,
				opts = self.options,
				width = 0,
				height = 0;

			self._template = $( "#" + opts.template );
			if ( !self._template ) {
				return ;
			}

			width = self._calculateClipWidth();
			height = self._calculateClipHeight();
			self._$view.width(width).height(height);
			self._$clip.width(width).height(height);

			self._clipSize = self._calculateClipSize();
			self._calculateColumnSize();
			self._initPageProperty();
			self._setScrollBarSize();
		},

		_initPageProperty : function () {
			var self = this,
				rowsPerView = 0,
				$child,
				columnCount = 0,
				totalRowCnt = 0,
				attributeName = self._direction ? "width" : "height";

			columnCount = self._calculateColumnCount();

			totalRowCnt = parseInt(self._numItemData / columnCount , 10 );
			self._totalRowCnt = self._numItemData % columnCount === 0 ? totalRowCnt : totalRowCnt + 1;
			self._itemCount = columnCount;

			if ( self._cellSize <= 0) {
				return ;
			}

			rowsPerView = self._clipSize / self._cellSize;
			rowsPerView = Math.ceil( rowsPerView );
			self._rowsPerView = parseInt( rowsPerView, 10);

			$child = self._makeRows( rowsPerView + 2 );
			$(self._$view).append($child.children());
			self._$view.children().css(attributeName, self._cellSize + "px");
			self._$rows = self._$view.children().detach();

			self._reservedPos = -self._cellSize;
			self._scalableSize = -self._cellSize;

			self._initLayout();

			self._blockScroll = self._rowsPerView > self._totalRowCnt;
			self._maxSize = ( self._totalRowCnt - self._rowsPerView ) * self._cellSize;
			self._maxViewSize = ( self._rowsPerView ) * self._cellSize;
			self._modifyViewPos = -self._cellSize;
			if ( self._clipSize < self._maxViewSize ) {
				self._modifyViewPos = (-self._cellSize) + ( self._clipSize - self._maxViewSize );
			}
		},

		_getinheritedSize : function ( elem ) {
			var $target = $(elem),
				height,
				width,
				NODETYPE = { ELEMENT_NODE : 1, TEXT_NODE : 3 },
				ret = {
					isDefinedWidth : false,
					isDefinedHeight : false,
					width : 0,
					height : 0
				};

			while ( $target[0].nodeType === NODETYPE.ELEMENT_NODE && (ret.isDefinedWidth === false || ret.isHeightDefined === false )) {
				height = $target[0].style.height;
				width = $target[0].style.width;

				if (ret.isDefinedHeight === false && height !== "" ) {
					// Size was defined
					ret.isDefinedHeight = true;
					ret.height = parseInt(height, 10);
				}

				if ( ret.isDefinedWidth === false && width !== "" ) {
					// Size was defined
					ret.isDefinedWidth = true;
					ret.width = parseInt(width, 10);
				}
				$target = $target.parent();
			}
			return ret;
		},

		resize : function ( ) {
			var self = this,
				ret = null,
				rowsPerView = 0,
				itemCount = 0,
				totalRowCnt = 0,
				diffRowCnt = 0,
				clipSize = 0,
				prevcnt = 0,
				clipPosition = 0;

			itemCount = self._calculateColumnCount();
			if ( itemCount != self._itemCount ) {
				totalRowCnt = parseInt(self._numItemData / itemCount , 10 );
				self._totalRowCnt = self._numItemData % itemCount === 0 ? totalRowCnt : totalRowCnt + 1;
				prevcnt = self._itemCount;
				self._itemCount = itemCount;
				clipPosition = self._getClipPosition();
				self._$view.hide();

				diffRowCnt = self._replaceRows(itemCount, prevcnt, self._totalRowCnt, clipPosition);
				self._maxSize = ( self._totalRowCnt - self._rowsPerView ) * self._cellSize;
				self._scalableSize += (-diffRowCnt) * self._cellSize;
				self._reservedPos  += (-diffRowCnt) * self._cellSize;
				self._setScrollBarSize();
				self._setScrollBarPosition(diffRowCnt);

				self._$view.show();
			}

			clipSize = self._calculateClipSize();
			if ( clipSize !== self._clipSize ) {
				rowsPerView = clipSize / self._cellSize;
				rowsPerView = parseInt( Math.ceil( rowsPerView ), 10 );

				if ( rowsPerView > self._rowsPerView ) {
					// increase row.
					self._increaseRow( rowsPerView - self._rowsPerView );
				} else if ( rowsPerView < self._rowsPerView ) {
					// decrease row.
					self._decreaseRow( self._rowsPerView - rowsPerView );
				}
				self._rowsPerView = rowsPerView;
				self._clipSize = clipSize;
				self._blockScroll = self._rowsPerView > self._totalRowCnt;
				self._maxSize = ( self._totalRowCnt - self._rowsPerView ) * self._cellSize;
				self._maxViewSize = ( self._rowsPerView ) * self._cellSize;
				if ( self._clipSize < self._maxViewSize ) {
					self._modifyViewPos = (-self._cellSize) + ( self._clipSize - self._maxViewSize );
				}
				if ( self._direction ) {
					self._$clip.width(self._clipSize);
				} else {
					self._$clip.height(self._clipSize);
				}
				self._setScrollBarSize();
				self._setScrollBarPosition(0);
				self._setViewSize();
			}
		},

		_initScrollView : function () {
			var self = this;
			$.extend(self.options, self._scrollView.options);
			self.options.moveThreshold = 10;
			self.options.showScrollBars = false;
			self._getScrollHierarchy = self._scrollView._getScrollHierarchy;
			self._makePositioned =  self._scrollView._makePositioned;
			self._set_scrollbar_size = self._scrollView._set_scrollbar_size;
			self._setStyleTransform = self._scrollView._setElementTransform;
			self._hideOverflowIndicator = self._scrollView._hideOverflowIndicator;
			self._showOverflowIndicator = self._scrollView._showOverflowIndicator;
			self._setGestureScroll = self._scrollView._setGestureScroll;
		},

		_createTracker : function () {
			var self = this;

			self._tracker = new MomentumTracker(self.options);
			if ( self._direction ) {
				self._hTracker = self._tracker;
				self._$clip.width(self._clipSize);
			} else {
				self._vTracker = self._tracker;
				self._$clip.height(self._clipSize);
			}
		},

		//----------------------------------------------------//
		//		Scrollbar		//
		//----------------------------------------------------//
		_createScrollBar : function () {
			var self = this,
				prefix = "<div class=\"ui-scrollbar ui-scrollbar-",
				suffix = "\"><div class=\"ui-scrollbar-track\"><div class=\"ui-scrollbar-thumb\"></div></div></div>";

			if ( self.options.rotation ) {
				return ;
			}

			if ( self._direction ) {
				self._$clip.append( prefix + "x" + suffix );
				self._hScrollBar = $(self._$clip.children(".ui-scrollbar-x"));
				self._hScrollBar.find(".ui-scrollbar-thumb").addClass("ui-scrollbar-thumb-x");
			} else {
				self._$clip.append( prefix + "y" + suffix );
				self._vScrollBar = $(self._$clip.children(".ui-scrollbar-y"));
				self._vScrollBar.find(".ui-scrollbar-thumb").addClass("ui-scrollbar-thumb-y");
			}
		},

		_setScrollBarSize: function () {
			var self = this,
				scrollBarSize = 0,
				currentSize = 0,
				$scrollBar,
				attrName,
				className;

			if ( self.options.rotation ) {
				return ;
			}

			scrollBarSize = parseInt( self._maxViewSize / self._clipSize , 10);
			if ( self._direction ) {
				$scrollBar = self._hScrollBar.find(".ui-scrollbar-thumb");
				attrName = "width";
				currentSize = $scrollBar.width();
				className = "ui-scrollbar-thumb-x";
				self._hScrollBar.css("width", self._clipSize);
			} else {
				$scrollBar = self._vScrollBar.find(".ui-scrollbar-thumb");
				attrName = "height";
				className = "ui-scrollbar-thumb-y";
				currentSize = $scrollBar.height();
				self._vScrollBar.css("height", self._clipSize);
			}

			if ( scrollBarSize > currentSize ) {
				$scrollBar.removeClass(className);
				$scrollBar.css(attrName, scrollBarSize);
			} else {
				scrollBarSize = currentSize;
			}

			self._itemScrollSize = parseFloat( ( self._clipSize - scrollBarSize ) / ( self._totalRowCnt - self._rowsPerView ) );
			self._itemScrollSize = Math.round(self._itemScrollSize * 100) / 100;
		},

		_setScrollBarPosition : function ( di, duration ) {
			var self = this,
				$sbt = null,
				x = "0px",
				y = "0px";

			if ( self.options.rotation ) {
				return ;
			}

			self._currentItemCount = self._currentItemCount + di;
			if ( self._vScrollBar ) {
				$sbt = self._vScrollBar .find(".ui-scrollbar-thumb");
				y = ( self._currentItemCount * self._itemScrollSize ) + "px";
			} else {
				$sbt = self._hScrollBar .find(".ui-scrollbar-thumb");
				x = ( self._currentItemCount * self._itemScrollSize ) + "px";
			}
			self._setStyleTransform( $sbt, x, y, duration );
		},

		_hideScrollBars : function () {
			var self = this,
				vclass = "ui-scrollbar-visible";

			if ( self.options.rotation ) {
				return ;
			}

			if ( self._vScrollBar ) {
				self._vScrollBar.removeClass( vclass );
			} else {
				self._hScrollBar.removeClass( vclass );
			}
		},

		_showScrollBars : function () {
			var self = this,
				vclass = "ui-scrollbar-visible";

			if ( self.options.rotation ) {
				return ;
			}

			if ( self._vScrollBar ) {
				self._vScrollBar.addClass( vclass );
			} else {
				self._hScrollBar.addClass( vclass );
			}
		},

		//----------------------------------------------------//
		//		scroll process		//
		//----------------------------------------------------//
		centerTo: function ( selector ) {
			var self = this,
				i,
				newX = 0,
				newY = 0;

			if ( !self.options.rotation ) {
				return;
			}

			for ( i = 0; i < self._$rows.length; i++ ) {
				if ( $( self._$rows[i]).hasClass( selector ) ) {
					if ( self._direction ) {
						newX = -( i * self._cellSize - self._clipSize / 2 + self._cellSize * 2 );
					} else {
						newY = -( i * self._cellSize - self._clipSize / 2 + self._cellSize * 2 );
					}
					self.scrollTo( newX, newY );
					return;
				}
			}
		},

		scrollTo: function ( x, y, duration ) {
			var self = this;
			if ( self._direction ) {
				self._sx = self._reservedPos;
				self._reservedPos = x;
			} else {
				self._sy = self._reservedPos;
				self._reservedPos = y;
			}
			self._scrollView.scrollTo.apply( this, [ x, y, duration ] );
		},

		getScrollPosition: function () {
			if ( this.direction ) {
				return { x: -this._ry, y: 0 };
			}
			return { x: 0, y: -this._ry };
		},

		_setScrollPosition: function ( x, y ) {
			var self = this,
				sy = self._scalableSize,
				distance = self._direction ? x : y,
				dy = distance - sy,
				di = parseInt( dy / self._cellSize, 10 ),
				i = 0,
				idx = 0,
				$row = null;

			if ( self._blockScroll ) {
				return ;
			}

			if ( ! self.options.rotation ) {
				if ( dy > 0 && distance >= -self._cellSize && self._scalableSize >= -self._cellSize ) {
					// top
					self._stopMScroll();
					self._scalableSize = -self._cellSize;
					self._setElementTransform( -self._cellSize );
					return;
				}
				if ( (dy < 0 && self._scalableSize <= -(self._maxSize + self._cellSize) )) {
					// bottom
					self._stopMScroll();
					self._scalableSize = -(self._maxSize + self._cellSize);
					self._setElementTransform( self._modifyViewPos );
					return;
				}
			}

			if ( di > 0 ) { // scroll up
				for ( i = 0; i < di; i++ ) {
					idx = -parseInt( ( sy / self._cellSize ) + i + 3, 10 );
					$row = self._$view.children( ).last( ).detach( );
					self._replaceRow( $row, circularNum( idx, self._totalRowCnt ) );
					self._$view.prepend( $row );
					self._setScrollBarPosition(-1);
				}
			} else if ( di < 0 ) { // scroll down
				for ( i = 0; i > di; i-- ) {
					idx = self._rowsPerView - parseInt( ( sy / self._cellSize ) + i, 10 );
					$row = self._$view.children().first().detach();
					self._replaceRow($row, circularNum( idx, self._totalRowCnt ) );
					self._$view.append( $row );
					self._setScrollBarPosition(1);
				}
			}
			self._scalableSize += di * self._cellSize;
			self._setElementTransform( distance - self._scalableSize - self._cellSize );
		},

		_setElementTransform : function ( value ) {
			var self = this,
				x = 0,
				y = 0;

			if ( self._direction ) {
				x = value + "px";
			} else {
				y = value + "px";
			}
			self._setStyleTransform(self._$view, x, y );
		},

		//----------------------------------------------------//
		//		Event handler		//
		//----------------------------------------------------//
		_handleMomentumScroll: function () {
			var self = this,
				opts = self.options,
				keepGoing = false,
				v = this._$view,
				x = 0,
				y = 0,
				t = self._tracker;

			if ( t ) {
				t.update();
				if ( self._direction ) {
					x = t.getPosition();
				} else {
					y = t.getPosition();
				}
				keepGoing = !t.done();
			}

			self._setScrollPosition( x, y );
			if ( !opts.rotation ) {
				keepGoing = !t.done();
				self._reservedPos = self._direction ? x : y;
				// bottom
				self._reservedPos = self._reservedPos <= (-(self._maxSize - self._modifyViewPos)) ? ( - ( self._maxSize + self._cellSize) ) : self._reservedPos;
				// top
				self._reservedPos = self._reservedPos > -self._cellSize ? -self._cellSize : self._reservedPos;
			} else {
				self._reservedPos = self._direction ? x : y;
			}
			self._$clip.trigger( self.options.updateEventName, [ { x: x, y: y } ] );

			if ( keepGoing ) {
				self._timerID = setTimeout( self._timerCB, self._timerInterval );
			} else {
				self._stopMScroll();
			}
		},

		_startMScroll: function ( speedX, speedY ) {
			var self = this;
			if ( self._direction  ) {
				self._sx = self._reservedPos;
			} else {
				self._sy = self._reservedPos;
			}
			self._scrollView._startMScroll.apply(self, [speedX, speedY]);
		},

		_stopMScroll: function () {
			this._scrollView._stopMScroll.apply(this);
		},

		_enableTracking: function () {
			$(document).bind( this._dragMoveEvt, this._dragMoveCB );
			$(document).bind( this._dragStopEvt, this._dragStopCB );
		},

		_disableTracking: function () {
			$(document).unbind( this._dragMoveEvt, this._dragMoveCB );
			$(document).unbind( this._dragStopEvt, this._dragStopCB );
		},

		_handleDragStart: function ( e, ex, ey ) {
			var self = this;
			self._scrollView._handleDragStart.apply( this, [ e, ex, ey ] );
			self._eventPos = self._direction ? ex : ey;
			self._nextPos = self._reservedPos;
		},

		_handleDragMove: function ( e, ex, ey ) {
			var self = this,
				dx = ex - self._lastX,
				dy = ey - self._lastY,
				x = 0,
				y = 0;

			self._lastMove = getCurrentTime();
			self._speedX = dx;
			self._speedY = dy;

			self._didDrag = true;

			self._lastX = ex;
			self._lastY = ey;

			if ( self._direction ) {
				self._movePos = ex - self._eventPos;
				x = self._nextPos + self._movePos;
			} else {
				self._movePos = ey - self._eventPos;
				y = self._nextPos + self._movePos;
			}
			self._showScrollBars();
			self._setScrollPosition( x, y );
			return false;
		},

		_handleDragStop: function ( e ) {
			var self = this;

			self._reservedPos = self._movePos ? self._nextPos + self._movePos : self._reservedPos;
			self._scrollView._handleDragStop.apply( this, [ e ] );
			return self._didDrag ? false : undefined;
		},

		_addBehaviors: function () {
			var self = this;

			// scroll event handler.
			if ( self.options.eventType === "mouse" ) {
				self._dragStartEvt = "mousedown";
				self._dragStartCB = function ( e ) {
					return self._handleDragStart( e, e.clientX, e.clientY );
				};

				self._dragMoveEvt = "mousemove";
				self._dragMoveCB = function ( e ) {
					return self._handleDragMove( e, e.clientX, e.clientY );
				};

				self._dragStopEvt = "mouseup";
				self._dragStopCB = function ( e ) {
					return self._handleDragStop( e, e.clientX, e.clientY );
				};

				self._$view.bind( "vclick", function (e) {
					return !self._didDrag;
				} );
			} else { //touch
				self._dragStartEvt = "touchstart";
				self._dragStartCB = function ( e ) {
					var t = e.originalEvent.targetTouches[0];
					return self._handleDragStart(e, t.pageX, t.pageY );
				};

				self._dragMoveEvt = "touchmove";
				self._dragMoveCB = function ( e ) {
					var t = e.originalEvent.targetTouches[0];
					return self._handleDragMove(e, t.pageX, t.pageY );
				};

				self._dragStopEvt = "touchend";
				self._dragStopCB = function ( e ) {
					return self._handleDragStop( e );
				};
			}
			self._$view.bind( self._dragStartEvt, self._dragStartCB );

			// other events.
			self._$view.delegate(".virtualgrid-item", "click", function (event) {
				var $selectedItem = $(this);
				$selectedItem.trigger("select", this);
			});

			$( window ).bind("resize", function ( e ) {
				var height = 0,
					$virtualgrid = $(".ui-virtualgrid-view");
				if ( $virtualgrid.length !== 0 ) {
					if ( self._direction ) {
						height = self._calculateClipHeight();
						self._$view.height(height);
						self._$clip.height(height);
					} else {
						height = self._calculateClipWidth();
						self._$view.width(height);
						self._$clip.width(height);
					}
					self.resize( );
				}
			});

			$(document).one("pageshow", function (event) {
				var $page = $(self.element).parents(".ui-page"),
					$header = $page.find( ":jqmData(role='header')" ),
					$footer = $page.find( ":jqmData(role='footer')" ),
					$content = $page.find( ":jqmData(role='content')" ),
					footerHeight = $footer ? $footer.height() : 0,
					headerHeight = $header ? $header.height() : 0;

				if ( $page && $content ) {
					$content.height(window.innerHeight - headerHeight - footerHeight).css("overflow", "hidden");
					$content.addClass("ui-virtualgrid-content");
				}
			});
		},

		//----------------------------------------------------//
		//		Calculate size about dom element.		//
		//----------------------------------------------------//
		_calculateClipSize : function () {
			var self = this,
				clipSize = 0;

			if ( self._direction ) {
				clipSize = self._calculateClipWidth();
			} else {
				clipSize = self._calculateClipHeight();
			}
			return clipSize;
		},

		_calculateClipWidth : function () {
			var self = this,
				view = $(self.element),
				$parent = $(self.element).parent(),
				paddingValue = 0,
				clipSize = $(window).width();

			if ( self._inheritedSize.isDefinedWidth ) {
				return self._inheritedSize.width;
			}

			if ( $parent.hasClass("ui-content") ) {
				paddingValue = parseInt($parent.css("padding-left"), 10);
				clipSize = clipSize - ( paddingValue || 0 );
				paddingValue = parseInt($parent.css("padding-right"), 10);
				clipSize = clipSize - ( paddingValue || 0);
			} else {
				clipSize = view.width();
			}
			return clipSize;
		},

		_calculateClipHeight : function () {
			var self = this,
				view = $(self.element),
				$parent = $(self.element).parent(),
				header = null,
				footer = null,
				paddingValue = 0,
				clipSize = $(window).height();

			if ( self._inheritedSize.isDefinedHeight ) {
				return self._inheritedSize.height;
			}

			if ( $parent.hasClass("ui-content") ) {
				paddingValue = parseInt($parent.css("padding-top"), 10);
				clipSize = clipSize - ( paddingValue || 0 );
				paddingValue = parseInt($parent.css("padding-bottom"), 10);
				clipSize = clipSize - ( paddingValue || 0);
				header = $parent.siblings(".ui-header");
				footer = $parent.siblings(".ui-footer");

				if ( header ) {
					if ( header.outerHeight(true) === null ) {
						clipSize = clipSize - ( $(".ui-header").outerHeight() || 0 );
					} else {
						clipSize = clipSize - header.outerHeight(true);
					}
				}
				if ( footer ) {
					clipSize = clipSize - footer.outerHeight(true);
				}
			} else {
				clipSize = view.height();
			}
			return clipSize;
		},

		_calculateColumnSize : function () {
			var self = this,
				$tempBlock,
				$cell;

			$tempBlock = self._makeRows( 1 );
			self._$view.append( $tempBlock.children().first() );
			if ( self._direction ) {
				// x-axis
				self._viewSize = self._$view.width();
				$cell = self._$view.children().first().children().first();
				self._cellSize = $cell.outerWidth(true);
				self._cellOtherSize = $cell.outerHeight(true);
			} else {
				// y-axis
				self._viewSize = self._$view.height();
				$cell = self._$view.children().first().children().first();
				self._cellSize = $cell.outerHeight(true);
				self._cellOtherSize = $cell.outerWidth(true);
			}
			$tempBlock.remove();
			self._$view.children().remove();
		},

		_calculateColumnCount : function ( ) {
			var self = this,
				$view = $(self.element),
				viewSize = self._direction ? $view.innerHeight() : $view.innerWidth(),
				itemCount = 0 ;

			if ( self._direction ) {
				viewSize = viewSize - ( parseInt( $view.css("padding-top"), 10 ) + parseInt( $view.css("padding-bottom"), 10 ) );
			} else {
				viewSize = viewSize - ( parseInt( $view.css("padding-left"), 10 ) + parseInt( $view.css("padding-right"), 10 ) );
			}

			itemCount = parseInt( (viewSize / self._cellOtherSize), 10);
			return itemCount > 0 ? itemCount : 1 ;
		},

		// Read the position of clip form property ('webkit-transform').
		// @return : number - position of clip.
		_getClipPosition : function () {
			var self = this,
				matrix = null,
				contents = null,
				result = -self._cellSize,
				$scrollview = self._$view.closest(".ui-scrollview-view");

			if ( $scrollview ) {
				matrix = $scrollview.css("-webkit-transform");
				contents = matrix.substr( 7 );
				contents = contents.substr( 0, contents.length - 1 );
				contents = contents.split( ', ' );
				result =  Math.abs(contents [5]);
			}
			return result;
		},

		//----------------------------------------------------//
		//		DOM Element handle		//
		//----------------------------------------------------//
		_makeRows : function ( count ) {
			var self = this,
				opts = self.options,
				index = 0,
				$row = null,
				$wrapper = null;

			$wrapper = $( self._createElement( "div" ) );
			$wrapper.addClass("ui-scrollview-view");
			for ( index = 0; index < count ; index += 1 ) {
				$row = self._makeRow( self._template, index );
				if ( self._direction ) {
					$row.css("top", 0).css("left", ( index * self._cellSize ));
				}
				$wrapper.append($row);
			}
			return $wrapper;
		},

		// make a single row block
		_makeRow : function ( myTemplate, rowIndex ) {
			var self = this,
				opts = self.options,
				index = rowIndex * self._itemCount,
				htmlData = null,
				itemData = null,
				colIndex = 0,
				attrName = self._direction ? "top" : "left",
				blockClassName = self._direction ? "ui-virtualgrid-wrapblock-x" : "ui-virtualgrid-wrapblock-y",
				blockAttrName = self._direction ? "top" : "left",
				wrapBlock = $( self._createElement( "div" ) );

			wrapBlock.addClass( blockClassName ).attr("row-index", rowIndex);
			for ( colIndex = 0; colIndex < self._itemCount; colIndex++ ) {
				htmlData = self._makeHtmlData( myTemplate, index, colIndex);
				if ( htmlData ) {
					wrapBlock.append( htmlData );
				}
				index += 1;
			}
			return wrapBlock;
		},

		_makeHtmlData : function ( myTemplate, dataIndex, colIndex ) {
			var self = this,
				htmlData = null,
				itemData = null,
				attrName = self._direction ? "top" : "left";

			itemData = self._itemData( dataIndex );
			if ( itemData ) {
				htmlData = myTemplate.tmpl( itemData );
				$(htmlData).css(attrName, ( colIndex * self._cellOtherSize )).addClass("virtualgrid-item");
			}
			return htmlData;
		},

		_increaseRow : function ( num ) {
			var self = this,
				rotation = self.options.rotation,
				$row = null,
				headItemIndex = 0,
				tailItemIndex = 0,
				itemIndex = 0,
				size = self._scalableSize,
				idx = 0;

			headItemIndex = parseInt( $(self._$view.children().first()).attr("row-index"), 10) - 1;
			tailItemIndex = parseInt( $(self._$view.children()[self._rowsPerView]).attr("row-index"), 10) + 1;

			for ( idx = 1 ; idx <= num ; idx++ ) {
				if ( tailItemIndex + idx  >= self._totalRowCnt ) {
					$row = self._makeRow( self._template, headItemIndex );
					self._$view.prepend($row);
					headItemIndex -= 1;
				} else {
					$row = self._makeRow( self._template, tailItemIndex + idx );
					self._$view.append($row);
				}
				if ( self._direction ) {
					$row.width(self._cellSize);
				} else {
					$row.height(self._cellSize);
				}
			}
		},

		_decreaseRow : function ( num ) {
			var self = this,
				idx = 0;

			for ( idx = 0 ; idx < num ; idx++ ) {
				self._$view.children().last().remove();
			}
		},

		_replaceRows : function ( curCnt, prevCnt, maxCnt, clipPosition ) {
			var self = this,
				$rows = self._$view.children(),
				prevRowIndex = 0,
				rowIndex = 0,
				diffRowCnt = 0,
				targetCnt = 1,
				filterCondition = ( self._filterRatio * self._cellSize) + self._cellSize,
				idx = 0;

			if ( filterCondition < clipPosition ) {
				targetCnt += 1;
			}

			prevRowIndex = parseInt( $($rows[targetCnt]).attr("row-index"), 10);
			if ( prevRowIndex === 0 ) {
				// only top.
				rowIndex = maxCnt - targetCnt;
			} else {
				rowIndex = Math.round( (prevRowIndex * prevCnt) / curCnt );
				if ( rowIndex + self._rowsPerView >= maxCnt ) {
					// only bottom.
					rowIndex = maxCnt - self._rowsPerView;
				}
				diffRowCnt = prevRowIndex - rowIndex;
				rowIndex -= targetCnt;
			}

			for ( idx = 0 ; idx < $rows.length ; idx += 1 ) {
				self._replaceRow($rows[idx], circularNum( rowIndex, self._totalRowCnt ));
				rowIndex++;
			}
			return -diffRowCnt;
		},

		_replaceRow : function ( block, index ) {
			var self = this,
				opts = self.options,
				$columns = null,
				$column = null,
				$block = block.attr ? block : $( block ),
				data = null,
				htmlData = null,
				myTemplate = null,
				idx = 0,
				dataIdx = 0,
				tempBlocks = null;

			$columns = $block.attr("row-index", index).children();
			if ( $columns.length !== self._itemCount ) {
				$block.children().remove();
				tempBlocks = $(self._makeRow( self._template, index ));
				$block.append(tempBlocks.children());
				tempBlocks.remove();
				return ;
			}

			dataIdx = index * self._itemCount;
			for ( idx = 0; idx < self._itemCount ; idx += 1 ) {
				$column = $columns.eq(idx);
				data = self._itemData(dataIdx);
				if ( $column && data ) {
					myTemplate = self._template;
					htmlData = myTemplate.tmpl( data );
					self._replace( $column, htmlData, false );
					htmlData.remove();	// Clear temporary htmlData to free cache
					dataIdx ++;
				} else if ($column && !data ) {
					$column.remove();
				}
			}
		},

		_createElement : function ( tag ) {
			var element = document.createElement( tag );

			this._fragment.appendChild( element );
			return element;
		},

		/* Text & image src replace function */
		// @param oldItem   : prev HtmlDivElement
		// @param newItem   : new HtmlDivElement for replace
		// @param key       :
		_replace : function ( oldItem, newItem, key ) {
			var NODETYPE = { ELEMENT_NODE : 1, TEXT_NODE : 3 };

			$( oldItem ).find( ".ui-li-text-main", ".ui-li-text-sub", "ui-btn-text" ).each( function ( index ) {
				var oldObj = $( this ),
					newText = $( newItem ).find( ".ui-li-text-main", ".ui-li-text-sub", "ui-btn-text" ).eq( index ).text();

				$( oldObj ).contents().filter( function () {
					return ( this.nodeType == NODETYPE.TEXT_NODE );
				}).get( 0 ).data = newText;
			});

			$( oldItem ).find( "img" ).each( function ( imgIndex ) {
				var oldObj = $( this ),
					newImg = $( newItem ).find( "img" ).eq( imgIndex ).attr( "src" );

				$( oldObj ).attr( "src", newImg );
			});
			$( oldItem).removeData();
			if ( key ) {
				$( oldItem ).data( key, $( newItem ).data( key ) );
			}
		}
	} );

	$( document ).bind( "pagecreate create", function ( e ) {
		$(":jqmData(role='virtualgrid')").virtualgrid();
	} );
} (jQuery, window, document) );
/* ***************************************************************************
 * Copyright (c) 2000 - 2011 Samsung Electronics Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * ***************************************************************************
 *
 *	Author: Wongi Lee <wongi11.lee@samsung.com>
 *	        Youmin Ha <youmin.ha@samsung.com>
 */

/**
 * Virtual List Widget for unlimited data.
 * To support more then 1,000 items, special list widget developed. 
 * Fast initialize and light DOM tree.
 * DB connection and works like DB cursor.
 * 
 * HTML Attributes:
 *
 *		data-role:	virtuallistview
 *		data-template : jQuery.template ID that populate into virtual list 
 *		data-row : Optional. Set number of <li> elements that are used for data handling. 
 *		
 *		ID : <UL> element that has "data-role=virtuallist" must have ID attribute.
 *
 * * APIs:
 *
 *		create ( {
 *				itemData: function ( idx ) { return json_obj; },
 *				numItemData: number or function () { return number; },
 *				cacheItemData: function ( minIdx, maxIdx ) {}
 *				} )
 *			: Create a virtuallist widget. At this moment, _create method is called.
 *			args : A collection of options
 *				itemData: A function that returns JSON object for given index. Mandatory.
 *				numItemData: Total number of itemData. Mandatory.
 *				cacheItemData: Virtuallist will ask itemData between minIdx and maxIdx.
 *				               Developers can implement this function for preparing data.
 *				               Optional.
 *
 * Events:
 *
 *		touchstart : Temporary preventDefault applied on touchstart event to avoid broken screen.
 *
 * Examples:
 *
 *		<script id="tmp-3-2-7" type="text/x-jquery-tmpl">
 *			<li class="ui-li-3-2-7">
 *				<span class="ui-li-text-main">${NAME}</span>
 *				<img src="00_winset_icon_favorite_on.png" class="ui-li-icon-sub">
 *				<span class="ui-li-text-sub">${ACTIVE}</span>
 *				<span class="ui-li-text-sub2">${FROM}</span>
 *			</li>
 *		</script>
 *
 *		<ul id="virtuallist-normal_3_2_7_ul" data-role="virtuallistview" data-template="tmp-3-2-7" data-dbtable="JSON_DATA" data-row="100">
 *		</ul>
 *
 */

/**
	@class VirtualList
	In the Web environment, it is challenging to display a large amount of data in a list, such as displaying a contact list of over 1000 list items. It takes time to display the entire list in HTML and the DOM manipulation is complex.

	The virtual list widget is used to display a list of unlimited data elements on the screen for better performance. This widget provides easy access to databases to retrieve and display data. Virtual lists are based on the jQuery.template plugin as described in the jQuery documentation for jQuery.template plugin.

	To add a virtual list widget to the application, use the following code:

		<script id="tmp-3-2-7" type="text/x-jquery-tmpl">
			<li class="ui-li-3-2-7">
				<span class="ui-li-text-main">${NAME}</span>
				<img src="00_winset_icon_favorite_on.png" class="ui-li-icon-sub"/>
				<span class="ui-li-text-sub">${ACTIVE}</span>
				<span class="ui-li-text-sub2">${FROM}</span>
			</li>
		</script>
		<ul id="vlist" data-role="virtuallistview" data-template="tmp-3-2-7" data-dbtable="JSON_DATA" data-row="100"></ul>
*/
/**
	@property {String} data-role
	Creates the virtual list view. The value must be set to virtuallistview.
	Only the &gt;ul&lt; element, which a id attribute defined, supports this option. Also, the vlLoadSuccess class attribute must be defined in the &gt;ul&lt; element to ensure that loading data from the database is complete.
*/
/**
	@property {String} data-template
	Defines the jQuery.template element ID.
	The jQuery.template must be defined. The template style can use rem units to support scalability.
*/
/**
	@property {Number} data-row
	Defines the number of virtual list child elements.
	The minimum value is 20 and the default value is 100. As the value gets higher, the loading time increases while the system performance improves. So you need to pick a value that provides the best performance without excessive loading time.
*/
/**
	@method create
	@param {function} itemData(index)
	: function itemData(index) returns the JSON object matched with the given index. The index value is between 0 and numItemData-1.
	@param {Number} numItemData
	: number numItemData or function numItemData() defines or returns a static number of items.
	@param {function} cacheItemData(minIndex, maxIndex)
	: function cacheItemData(minIndex, maxIndex) prepares the JSON data. This method is called before calling the itemData() method with index values between minIndex and maxIndex.
*/

(function ( $, undefined ) {

	/* Code for Virtual List Demo */
	var listCountPerPage = {},	/* Keeps track of the number of lists per page UID. This allows support for multiple nested list in the same page. https://github.com/jquery/jquery-mobile/issues/1617 */
		_NO_SCROLL = 0,					/* ENUM */
		_SCROLL_DOWN = 1,				/* ENUM */
		_SCROLL_UP = -1;					/* ENUM */

	$.widget( "tizen.virtuallistview", $.mobile.widget, {
		options: {
			theme: "s",
			countTheme: "s",
			headerTheme: "s",
			dividerTheme: "s",
			splitIcon: "arrow-r",
			splitTheme: "s",
			inset: false,
			id:	"",					/* Virtual list UL elemet's ID */
			childSelector: " li",	/* To support swipe list */
			dbtable: "",
			template : "",
			dbkey: false,			/* Data's unique Key */
			scrollview: false,
			row: 100,
			page_buf: 30,
			initSelector: ":jqmData(role='virtuallistview')"
		},

		_stylerMouseUp: function () {
			$( this ).addClass( "ui-btn-up-s" );
			$( this ).removeClass( "ui-btn-down-s" );
		},

		_stylerMouseDown: function () {
			$( this ).addClass( "ui-btn-down-s" );
			$( this ).removeClass( "ui-btn-up-s" );
		},

		_stylerMouseOver: function () {
			$( this ).toggleClass( "ui-btn-hover-s" );
		},

		_stylerMouseOut: function () {
			$( this ).toggleClass( "ui-btn-hover-s" );
			$( this ).addClass( "ui-btn-up-s" );
			$( this ).removeClass( "ui-btn-down-s" );
		},

		// ?
		// this		virtuallistview object
		// @param[in]	template	template name(string)
		_pushData: function ( template ) {
			var o = this.options,
				i,
				myTemplate = $( "#" + template ),	// Get template object
				// NOTE: o.row = # of rows handled at once. Default value is 100.
				lastIndex = ( o.row > this._numItemData ? this._numItemData : o.row ),	// last index of handled data
				htmlData;

			for ( i = 0; i < lastIndex; i++ ) {
				htmlData = myTemplate.tmpl( this._itemData( i ) );	// Make rows with template,
				$( o.id ).append( $( htmlData ).attr( 'id', o.itemIDPrefix + i ) );	// and append it to the vlist object
			}

			// After pushing data re-style virtuallist widget
			$( o.id ).trigger( "create" );
		},

		// Set children <li> elements' position
		//
		// this: virtuallist element
		// event: virtuallistview.options
		//		TODO: Why this arg name is 'event'? Not resonable.
		//		(this function is not called with event element as args!)
		_reposition: function ( event ) {
			var o,
				t = this,
				padding,
				margin;

			if ( event.data ) {
				o = event.data;
			} else {
				o = event;
			}
			if ( $( o.id + o.childSelector ).size() > 0 ) { // $("#vlistid li")
				// first child's top position
				// NOTE: the first element may not be '0'!!!
				t._title_h = $( o.id + o.childSelector + ':first' ).position().top;
				// first child's outer height (TODO: reuse selected items)
				t._line_h = $( o.id + o.childSelector + ':first' ).outerHeight();

				// container(vlist element)'s innerwidth
				t._container_w = $( o.id ).innerWidth();

				// get sum of container's left/right padding
				padding = parseInt( $( o.id + o.childSelector ).css( "padding-left" ), 10 )
					+ parseInt( $( o.id + o.childSelector ).css( "padding-right" ), 10 );

				// Add CSS to all <li> elements
				//	* absolute position
				//	* btn-up
				//	* mouse up/down/over/out styles
				$( o.id + ">" + o.childSelector )
					.addClass( "position_absolute" )
					.addClass( "ui-btn-up-s" )
					.bind( "mouseup", t._stylerMouseUp )
					.bind( "mousedown", t._stylerMouseDown )
					.bind( "mouseover", t._stylerMouseOver )
					.bind( "mouseout", t._stylerMouseOut );
			}

			// Set absolute top/left position of each <li>
			$( o.id + ">" + o.childSelector ).each( function ( index ) {
				margin = parseInt( $( this ).css( "margin-left" ), 10 )
					+ parseInt( $( this ).css( "margin-right" ), 10 );

				$( this ).css( "top", t._title_h + t._line_h * index + 'px' )
					.css( "width", t._container_w - padding - margin );
			} );

			// Set Max Listview Height
			$( o.id ).height( t._numItemData * t._line_h );
		},

		_resize: function ( event ) {
			var o,
				t = this,
				padding,
				margin;

			if ( event.data ) {
				o = event.data;
			} else {
				o = event;
			}

			t._container_w = $( o.id ).innerWidth();

			padding = parseInt( $( o.id + o.childSelector ).css( "padding-left" ), 10 )
				+ parseInt( $( o.id + o.childSelector ).css( "padding-right" ), 10 );

			$( o.id + o.childSelector ).each( function (index) {
				margin = parseInt( $( this ).css( "margin-left" ), 10 )
					+ parseInt( $( this ).css( "margin-right" ), 10 );
				$( this ).css( "width", t._container_w - padding - margin );
			} );
		},

		// New scrollmove function supporting scrollTo
		_scrollmove: function ( ev ) {
			var t = ev.data,	// vlist (JQM object)
				o = t.options,	// options
				prevTopBufLen = t._num_top_items,	// Previous(remembered) top buf length
				timerInterval = 100,
				i,
				_scrollView,
				_normalScroll;

			_scrollView = {
				viewTop: function ( ) {
					var sv = $( o.id ).parentsUntil( ".ui-page" ).find( ".ui-scrollview-view" ),
						svTrans = sv.css( "-webkit-transform" ),
						svTransVal = "0,0,0,0,0,0";
					if ( svTrans ) {
						svTransVal = svTrans.replace( /matrix\s*\((.*)\)/, "$1" );	// matrix(a,c,b,d,tx,ty)
					}
					return - parseInt( svTransVal.split(',')[5], 10 );
				}
			};
			_normalScroll = {
				viewTop: function ( ) {
					return $( window ).scrollTop( );	// TODO: - _line_h?
				}
			};
			// Get current view top position
			function viewTop ( ) {
				return o.scrollview ? _scrollView.viewTop() : _normalScroll.viewTop();
			}
			// log function for debug
			function log ( msg ) {
				var debug = false;
				if ( debug ) {
					console.log( ">>virtualllist: " + msg );
				}
			}

			// Timer interval function
			// @param[in]	vl	virtuallist object (JQM object)
			function timerMove ( vl, undefined ) {
				var cy,				// current y position
					cti,		// current top idx
					cbi,		// current bottom idx
					oti = vl._first_index,	// old top idx
					obi = vl._last_index,	// old botton idx
					dti,			// delta of top idx
					fromIdx,
					toIdx,	// index range to be moved
					delta,			// moveItem delta
					rowLen = vl.options.row,	// max. # of items handled at once
					bufSize,		// top/bottom buffer size. unit: # of items
					i;

				// subroutine: Move itemContents in i2 into i1
				function moveItemContents( vl, i1, i2 ) {
					// TODO: Find a efficient way to replace data!
					// Assumption: i1 and i2 has same children.
					var NODETYPE = { ELEMENT_NODE: 1, TEXT_NODE: 3 },
						c1,	// child item 1 (old)
						c2,	// child item 2 (new)
						newText,
						newImg,
						i;

					$( i1 ).find( ".ui-li-text-main", ".ui-li-text-sub", ".ui-li-text-sub2", "ui-btn-text" ).each( function ( index ) {
						c1 = $( this );
						newText = $( i2 ).find( ".ui-li-text-main", ".ui-li-text-sub", "ui-btn-text" ).eq( index ).text();

						$( c1 ).contents().filter( function () {
							return ( this.nodeType == NODETYPE.TEXT_NODE );
						} ).get( 0 ).data = newText;
					} );

					$( i1 ).find( "img" ).each( function ( imgIdx ) {
						var c1 = $( this );
						newImg = $( i2 ).find( "img" ).eq( imgIdx ).attr( "src" );

						$( c1 ).attr( "src", newImg );
					} );

					$( i1 ).removeData( );	// Clear old data
				}

				// subroutine: Move item
				function moveItem( vl, fromIdx, toIdx ) {
					var itemData,	// data from itemData()
						item,		// item element
						newItem,	// new item element
						tmpl;		// template

					log( ">> move item: " + fromIdx + " --> " + toIdx );

					// Find current item
					item = $( '#' + vl.options.itemIDPrefix + fromIdx );	// TODO: refactor ID generation!
					if ( ! item || ! item.length ) {
						return false;
					}

					// Get new item
					tmpl = $( "#" + vl.options.template );
					if ( tmpl ) {
						newItem = tmpl.tmpl( vl._itemData( toIdx ) );

						// TODO: Consider touch block while moving?

						// Move item contents
						moveItemContents( vl, item, newItem );

						// clean up temporary item
						newItem.remove();
					}

					// Move position, and set id
					item.css( 'top', toIdx * vl._line_h )
						.attr( 'id' , vl.options.itemIDPrefix + toIdx );	// TODO: refactor ID generation!

					// TODO: Apply jqmdata? check following old code;
					// $( oldItem ).removeData( );	// Clear old data
					// if (key) { $( oldItem ).data( key, $( newItem ).data( key ) ); }

					return true;
				}


				// Get current view position
				cy = viewTop();

				// Calculate bufSize: rowLen / 3
				// NOTE: Assumption: total row length = visible items * 3 (upper+visible+lower)
				bufSize = Math.ceil( rowLen / 3 );

				// Calculate current top/bottom index (to be applied)
				// top index = current position / line height
				cti = Math.floor( cy / vl._line_h ) - bufSize;	// TODO: consider buffer!
				cbi = cti + rowLen - 1;

				if ( cti < 0 ) {		// Top boundary check
					cbi += ( - cti );
					cti = 0;
				} else if ( cbi > ( vl._numItemData - 1 ) ) {		// Bottom boundary check
					cti -= ( cbi - ( vl._numItemData - 1 ) );
					cbi = ( vl._numItemData - 1 );
				}

				// Calculate dti
				dti = cti - oti;
				log( "cy=" + cy + ", oti=" + oti + ", obi=" + obi + ", cti=" + cti + ", cbi=" + cbi + ", dti=" + dti );

				// switch: dti = 0 --> timer stop condition: delta=0 or scrollstop event comes. END.
				if ( 0 == dti ) {
					// Check timer runtime
					vl.timerStillCount += 1;
					if ( vl.timerStillCount < 12 ) {	// check count ( TODO: test and adjust )
						log("dti=0 " + vl.timerStillCount + " times");
						vl.timerMoveID = setTimeout( timerMove, timerInterval, vl );	// run once more
						return;
					}

					log("dti=0 " + vl.timerStillCount + " times. End timer.");
					vl.timerStillCount = 0;
					// Stop timer
					if ( vl.timerMoveID ) {
						clearTimeout( vl.timerMoveID );
						vl.timerMoveID = null;
					}
				} else {
					// switch: dti >= # of max elements --> total replace.
					vl.timerStillCount = 0;		// Reset still counter

					if ( Math.abs( dti ) >= rowLen ) {
						fromIdx = oti;
						toIdx = obi;
						delta = dti;
						log( ">>> WHOLE CHANGE! delta=" + delta );
					} else {
						// switch: dti < # of max elements --> move t2b or b2t until new top/bottom idx is covered
						if ( dti > 0 ) {
							fromIdx = oti;
							toIdx = oti + dti - 1;
							delta = rowLen;
						} else {
							fromIdx = obi + dti + 1;	// dti < 0
							toIdx = obi;
							delta = -rowLen;
						}
						log( ">>> partial change. delta=" + delta );
					}

					// Move items
					for ( i = fromIdx; i <= toIdx; i++ ) {
						moveItem( vl, i, i + delta );		// Change data and position
					}

					// Store current top/bottom idx into vl
					vl._first_index = cti;
					vl._last_index = cbi;

					// Register timer to check again
					vl.timerMoveID = setTimeout( timerMove, timerInterval, vl );
				}
				return;	// End of function
			}

			// ==== function start ====

			t.timerStillCount = 0;	// Count do-nothing time.	For behavior tuning.

			// If a timer function is alive, clear it
			if ( t.timerMoveID ) {
				clearTimeout( t.timerMoveID );
				t.timerMoveID = null;
			}
			// run TimerMove()
			timerMove( t );
		},

		_recreate: function ( newArray ) {
			var t = this,
				o = this.options;

			$( o.id ).empty();

			t._numItemData = newArray.length;
			t._direction = _NO_SCROLL;
			t._first_index = 0;
			t._last_index = o.row - 1;

			t._pushData( o.template );

			if (o.childSelector == " ul" ) {
				$( o.id + " ul" ).swipelist();
			}

			$( o.id ).virtuallistview();

			t.refresh( true );

			t._reposition( o );
		},

		// Init virtuallistview
		// this		virtuallistview object
		_initList: function () {
			var t = this,
				o = this.options;

			/* After AJAX loading success */

			// Put initial <li> elements
			t._pushData( o.template );

			// find a parent page, and run _reposition() at 'pageshow' event
			// TODO: Consider replace parentsUntil().parent() to parent('.ui-page') ???
			$( o.id ).parentsUntil( ".ui-page" ).parent().one( "pageshow", function () {
				setTimeout( function () {
					t._reposition( o );
				}, 0);
			});

			// Bind _scrollmove() at 'scrollstart.virtuallist' event
			$( document ).bind( "scrollstart.virtuallist scrollstop.vrituallist", t, t._scrollmove );

			// Bind _resize() at 'resize.virtuallist'
			$( window ).bind( "resize.virtuallist", t._resize );

			// when ul is a childselector, assume that this is also a swipelist,
			// and run swipelist constructor
			if ( o.childSelector == " ul" ) {
				$( o.id + " ul" ).swipelist();
			}

			t.refresh( true );
		},

		create: function () {
			var o = this.options;

			/* external API for AJAX callback */
			this._create.apply( this, arguments );

			// TODO: remove this line? _initList() calls reposition...
			this._reposition( o );
		},

		_create: function ( args ) {
			// Extend instance variables
			$.extend( this, {
				_itemData : function ( idx ) { return null; },
				_numItemData : 0,
				_cacheItemData : function ( minIdx, maxIdx ) { },
				_title_h : 0,
				_container_w : 0,
				_minimum_row : 100,
				_direction : _NO_SCROLL,
				_first_index : 0,
				_last_index : 0,
				_num_top_items : 0	// By scroll move, number of hidden elements.
			} );

			// local variables
			var t = this,
				o = this.options,
				$el = this.element,
				shortcutsContainer = $('<div class="ui-virtuallist"/>'),
				shortcutsList = $('<ul></ul>'),
				dividers = $el.find(':jqmData(role="virtuallistview" )'),
				lastListItem = null,
				shortcutscroll = this,
				dbtable_name,
				dbtable;


			// Add CSS classes to $el (=virtuallistview)
			$el.addClass( function ( i, orig ) {
				return orig + " ui-listview ui-virtual-list-container" + ( t.options.inset ? " ui-listview-inset ui-corner-all ui-shadow " : "" );
			});

			// keep the vlist's ID
			o.itemIDPrefix = $el.attr( "id" ) + '_';
			o.id = "#" + $el.attr( "id" );

			// when page hides, empty all child elements
			$( o.id ).bind( "pagehide", function ( e ) {
				$( o.id ).empty();
			});

			// Find if scrollview is used
			if ( $( ".ui-scrollview-clip" ).size() > 0 ) {
				o.scrollview = true;
			} else {
				o.scrollview = false;
			}

			// Calculate page buffer size
			if ( $el.data( "row" ) ) {
				o.row = $el.data( "row" );

				if ( o.row < t._minimum_row ) {
					o.row = t._minimum_row;
				}

				o.page_buf = parseInt( ( o.row / 2 ), 10 );
			}

			// Get arguments
			if ( args ) {
				if ( args.itemData && typeof args.itemData == 'function'  ) {
					t._itemData = args.itemData;
				} else {
					return;
				}
				if ( args.numItemData ) {
					if ( typeof args.numItemData == 'function' ) {
						t._numItemData = args.numItemData( );
					} else if ( typeof args.numItemData == 'number' ) {
						t._numItemData = args.numItemData;
					} else {
						return;
					}
				} else {
					return;
				}
			} else {	// No option is given
				// Legacy support: dbtable
				console.warn( "WARNING: The data interface of virtuallist is changed. \nOld data interface(data-dbtable) is still supported, but will be removed in next version. \nPlease fix your code soon!" );

				/* After DB Load complete, Init Vritual list */
				if ( $( o.id ).hasClass( "vlLoadSuccess" ) ) {
					dbtable_name = $el.jqmData('dbtable');
					dbtable = window[ dbtable_name ];

					$( o.id ).empty();

					if ( !dbtable ) {
						dbtable = { };
					}

					t._itemData = function ( idx ) {
						return dbtable[ idx ];
					};
					t._numItemData = dbtable.length;
				} else {
					return;	// Do nothing
				}
			}

			// Get template data
			if ( $el.data( "template" ) ) {
				o.template = $el.data( "template" );

				/* to support swipe list, <li> or <ul> can be main node of virtual list. */
				if ( $el.data( "swipelist" ) == true ) {
					o.childSelector = " ul";
				} else {
					o.childSelector = " li";
				}
			}

			// Set data's unique key
			// NOTE: Unnecessary?
			if ( $el.data( "dbkey" ) ) {
				o.dbkey = $el.data( "dbkey" );
			}

			t._first_index = 0;			// initial top idx of <li> element.
			t._last_index = o.row - 1;		// initial bottom idx of <li> element.
			t._initList();	// NOTE: Called at here only!
		},

		destroy : function () {
			var o = this.options;

			$( document ).unbind( "scrollstop" );

			$( window ).unbind( "resize.virtuallist" );

			$( o.id ).empty();

			if ( this.timerMoveID ) {
				clearTimeout( this.timerMoveID );
				this.timerMoveID = null;
			}
		},

		_itemApply: function ( $list, item ) {
			var $countli = item.find( ".ui-li-count" );

			if ( $countli.length ) {
				item.addClass( "ui-li-has-count" );
			}

			$countli.addClass( "ui-btn-up-" + ( $list.jqmData( "counttheme" ) || this.options.countTheme ) + " ui-btn-corner-all" );

			// TODO class has to be defined in markup
			item.find( "h1, h2, h3, h4, h5, h6" ).addClass( "ui-li-heading" ).end()
				.find( "p, dl" ).addClass( "ui-li-desc" ).end()
				.find( ">img:eq(0), .ui-link-inherit>img:eq(0)" ).addClass( "ui-li-thumb" ).each( function () {
					item.addClass( $( this ).is( ".ui-li-icon" ) ? "ui-li-has-icon" : "ui-li-has-thumb" );
				}).end()
				.find( ".ui-li-aside" ).each(function () {
					var $this = $( this );
					$this.prependTo( $this.parent() ); //shift aside to front for css float
				} );
		},

		_removeCorners: function ( li, which ) {
			var top = "ui-corner-top ui-corner-tr ui-corner-tl",
				bot = "ui-corner-bottom ui-corner-br ui-corner-bl";

			li = li.add( li.find( ".ui-btn-inner, .ui-li-link-alt, .ui-li-thumb" ) );

			if ( which === "top" ) {
				li.removeClass( top );
			} else if ( which === "bottom" ) {
				li.removeClass( bot );
			} else {
				li.removeClass( top + " " + bot );
			}
		},

		_refreshCorners: function ( create ) {
			var $li,
				$visibleli,
				$topli,
				$bottomli;

			if ( this.options.inset ) {
				$li = this.element.children( "li" );
				// at create time the li are not visible yet so we need to rely on .ui-screen-hidden
				$visibleli = create ? $li.not( ".ui-screen-hidden" ) : $li.filter( ":visible" );

				this._removeCorners( $li );

				// Select the first visible li element
				$topli = $visibleli.first()
					.addClass( "ui-corner-top" );

				$topli.add( $topli.find( ".ui-btn-inner" ) )
					.find( ".ui-li-link-alt" )
						.addClass( "ui-corner-tr" )
					.end()
					.find( ".ui-li-thumb" )
						.not( ".ui-li-icon" )
						.addClass( "ui-corner-tl" );

				// Select the last visible li element
				$bottomli = $visibleli.last()
					.addClass( "ui-corner-bottom" );

				$bottomli.add( $bottomli.find( ".ui-btn-inner" ) )
					.find( ".ui-li-link-alt" )
						.addClass( "ui-corner-br" )
					.end()
					.find( ".ui-li-thumb" )
						.not( ".ui-li-icon" )
						.addClass( "ui-corner-bl" );
			}
		},

		// this		virtuallistview object
		refresh: function ( create ) {
			this.parentPage = this.element.closest( ".ui-page" );
			// Make sub page, and move the virtuallist into it...
			// NOTE: check this subroutine.
			this._createSubPages();

			var o = this.options,
				$list = this.element,
				self = this,
				dividertheme = $list.jqmData( "dividertheme" ) || o.dividerTheme,
				listsplittheme = $list.jqmData( "splittheme" ),
				listspliticon = $list.jqmData( "spliticon" ),
				li = $list.children( "li" ),
				counter = $.support.cssPseudoElement || !$.nodeName( $list[ 0 ], "ol" ) ? 0 : 1,
				item,
				itemClass,
				temTheme,
				a,
				last,
				splittheme,
				countParent,
				icon,
				pos,
				numli,
				itemTheme;

			// TODO: ?
			if ( counter ) {
				$list.find( ".ui-li-dec" ).remove();
			}

			for ( pos = 0, numli = li.length; pos < numli; pos++ ) {
				item = li.eq( pos );
				itemClass = "ui-li";

				// If we're creating the element, we update it regardless
				if ( create || !item.hasClass( "ui-li" ) ) {
					itemTheme = item.jqmData( "theme" ) || o.theme;
					a = item.children( "a" );

					if ( a.length ) {
						icon = item.jqmData( "icon" );

						item.buttonMarkup({
							wrapperEls: "div",
							shadow: false,
							corners: false,
							iconpos: "right",
							/* icon: a.length > 1 || icon === false ? false : icon || "arrow-r",*/
							icon: false,	/* Remove unnecessary arrow icon */
							theme: itemTheme
						});

						if ( ( icon != false ) && ( a.length == 1 ) ) {
							item.addClass( "ui-li-has-arrow" );
						}

						a.first().addClass( "ui-link-inherit" );

						if ( a.length > 1 ) {
							itemClass += " ui-li-has-alt";

							last = a.last();
							splittheme = listsplittheme || last.jqmData( "theme" ) || o.splitTheme;

							last.appendTo(item)
								.attr( "title", last.getEncodedText() )
								.addClass( "ui-li-link-alt" )
								.empty()
								.buttonMarkup({
									shadow: false,
									corners: false,
									theme: itemTheme,
									icon: false,
									iconpos: false
								})
								.find( ".ui-btn-inner" )
								.append(
									$( "<span />" ).buttonMarkup({
										shadow: true,
										corners: true,
										theme: splittheme,
										iconpos: "notext",
										icon: listspliticon || last.jqmData( "icon" ) || o.splitIcon
									})
								);
						}
					} else if ( item.jqmData( "role" ) === "list-divider" ) {

						itemClass += " ui-li-divider ui-btn ui-bar-" + dividertheme;
						item.attr( "role", "heading" );

						//reset counter when a divider heading is encountered
						if ( counter ) {
							counter = 1;
						}

					} else {
						itemClass += " ui-li-static ui-body-" + itemTheme;
					}
				}

				if ( counter && itemClass.indexOf( "ui-li-divider" ) < 0 ) {
					countParent = item.is( ".ui-li-static:first" ) ? item : item.find( ".ui-link-inherit" );

					countParent.addClass( "ui-li-jsnumbering" )
						.prepend( "<span class='ui-li-dec'>" + (counter++) + ". </span>" );
				}

				item.add( item.children( ".ui-btn-inner" ) ).addClass( itemClass );

				self._itemApply( $list, item );
			}

			this._refreshCorners( create );
		},

		//create a string for ID/subpage url creation
		_idStringEscape: function ( str ) {
			return str.replace(/\W/g , "-");
		},

		// ?
		// this		virtuallistview object
		_createSubPages: function () {
			var parentList = this.element,
				parentPage = parentList.closest( ".ui-page" ),
				parentUrl = parentPage.jqmData( "url" ),
				parentId = parentUrl || parentPage[ 0 ][ $.expando ],
				parentListId = parentList.attr( "id" ),
				o = this.options,
				dns = "data-" + $.mobile.ns,
				self = this,
				persistentFooterID = parentPage.find( ":jqmData(role='footer')" ).jqmData( "id" ),
				hasSubPages,
				newRemove;

			if ( typeof listCountPerPage[ parentId ] === "undefined" ) {
				listCountPerPage[ parentId ] = -1;
			}

			parentListId = parentListId || ++listCountPerPage[ parentId ];

			$( parentList.find( "li>ul, li>ol" ).toArray().reverse() ).each(function ( i ) {
				var self = this,
					list = $( this ),
					listId = list.attr( "id" ) || parentListId + "-" + i,
					parent = list.parent(),
					nodeEls,
					title = nodeEls.first().getEncodedText(),//url limits to first 30 chars of text
					id = ( parentUrl || "" ) + "&" + $.mobile.subPageUrlKey + "=" + listId,
					theme = list.jqmData( "theme" ) || o.theme,
					countTheme = list.jqmData( "counttheme" ) || parentList.jqmData( "counttheme" ) || o.countTheme,
					newPage,
					anchor;

				nodeEls = $( list.prevAll().toArray().reverse() );
				nodeEls = nodeEls.length ? nodeEls : $( "<span>" + $.trim( parent.contents()[ 0 ].nodeValue ) + "</span>" );

				//define hasSubPages for use in later removal
				hasSubPages = true;

				newPage = list.detach()
							.wrap( "<div " + dns + "role='page' " +	dns + "url='" + id + "' " + dns + "theme='" + theme + "' " + dns + "count-theme='" + countTheme + "'><div " + dns + "role='content'></div></div>" )
							.parent()
								.before( "<div " + dns + "role='header' " + dns + "theme='" + o.headerTheme + "'><div class='ui-title'>" + title + "</div></div>" )
								.after( persistentFooterID ? $( "<div " + dns + "role='footer' " + dns + "id='" + persistentFooterID + "'>" ) : "" )
								.parent()
								.appendTo( $.mobile.pageContainer );

				newPage.page();

				anchor = parent.find('a:first');

				if ( !anchor.length ) {
					anchor = $( "<a/>" ).html( nodeEls || title ).prependTo( parent.empty() );
				}

				anchor.attr( "href", "#" + id );

			}).virtuallistview();

			// on pagehide, remove any nested pages along with the parent page, as long as they aren't active
			// and aren't embedded
			if ( hasSubPages &&
						parentPage.is( ":jqmData(external-page='true')" ) &&
						parentPage.data( "page" ).options.domCache === false ) {

				newRemove = function ( e, ui ) {
					var nextPage = ui.nextPage, npURL;

					if ( ui.nextPage ) {
						npURL = nextPage.jqmData( "url" );
						if ( npURL.indexOf( parentUrl + "&" + $.mobile.subPageUrlKey ) !== 0 ) {
							self.childPages().remove();
							parentPage.remove();
						}
					}
				};

				// unbind the original page remove and replace with our specialized version
				parentPage
					.unbind( "pagehide.remove" )
					.bind( "pagehide.remove", newRemove );
			}
		},

		// TODO sort out a better way to track sub pages of the virtuallistview this is brittle
		childPages: function () {
			var parentUrl = this.parentPage.jqmData( "url" );

			return $( ":jqmData(url^='" +  parentUrl + "&" + $.mobile.subPageUrlKey + "')" );
		}
	});

	//auto self-init widgets
	$( document ).bind( "pagecreate create", function ( e ) {
		$( $.tizen.virtuallistview.prototype.options.initSelector, e.target ).virtuallistview();
	});

} ( jQuery ) );
/*!
 * Globalize
 *
 * http://github.com/jquery/globalize
 *
 * Copyright Software Freedom Conservancy, Inc.
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */

(function( window, undefined ) {

var Globalize,
	// private variables
	regexHex,
	regexInfinity,
	regexParseFloat,
	regexTrim,
	// private JavaScript utility functions
	arrayIndexOf,
	endsWith,
	extend,
	isArray,
	isFunction,
	isObject,
	startsWith,
	trim,
	truncate,
	zeroPad,
	// private Globalization utility functions
	appendPreOrPostMatch,
	expandFormat,
	formatDate,
	formatNumber,
	getTokenRegExp,
	getEra,
	getEraYear,
	parseExact,
	parseNegativePattern;

// Global variable (Globalize) or CommonJS module (globalize)
Globalize = function( cultureSelector ) {
	return new Globalize.prototype.init( cultureSelector );
};

if ( typeof require !== "undefined"
	&& typeof exports !== "undefined"
	&& typeof module !== "undefined" ) {
	// Assume CommonJS
	module.exports = Globalize;
} else {
	// Export as global variable
	window.Globalize = Globalize;
}

Globalize.cultures = {};

Globalize.prototype = {
	constructor: Globalize,
	init: function( cultureSelector ) {
		this.cultures = Globalize.cultures;
		this.cultureSelector = cultureSelector;

		return this;
	}
};
Globalize.prototype.init.prototype = Globalize.prototype;

// 1.	 When defining a culture, all fields are required except the ones stated as optional.
// 2.	 Each culture should have a ".calendars" object with at least one calendar named "standard"
//		 which serves as the default calendar in use by that culture.
// 3.	 Each culture should have a ".calendar" object which is the current calendar being used,
//		 it may be dynamically changed at any time to one of the calendars in ".calendars".
Globalize.cultures[ "default" ] = {
	// A unique name for the culture in the form <language code>-<country/region code>
	name: "en",
	// the name of the culture in the english language
	englishName: "English",
	// the name of the culture in its own language
	nativeName: "English",
	// whether the culture uses right-to-left text
	isRTL: false,
	// "language" is used for so-called "specific" cultures.
	// For example, the culture "es-CL" means "Spanish, in Chili".
	// It represents the Spanish-speaking culture as it is in Chili,
	// which might have different formatting rules or even translations
	// than Spanish in Spain. A "neutral" culture is one that is not
	// specific to a region. For example, the culture "es" is the generic
	// Spanish culture, which may be a more generalized version of the language
	// that may or may not be what a specific culture expects.
	// For a specific culture like "es-CL", the "language" field refers to the
	// neutral, generic culture information for the language it is using.
	// This is not always a simple matter of the string before the dash.
	// For example, the "zh-Hans" culture is netural (Simplified Chinese).
	// And the "zh-SG" culture is Simplified Chinese in Singapore, whose lanugage
	// field is "zh-CHS", not "zh".
	// This field should be used to navigate from a specific culture to it's
	// more general, neutral culture. If a culture is already as general as it
	// can get, the language may refer to itself.
	language: "en",
	// numberFormat defines general number formatting rules, like the digits in
	// each grouping, the group separator, and how negative numbers are displayed.
	numberFormat: {
		// [negativePattern]
		// Note, numberFormat.pattern has no "positivePattern" unlike percent and currency,
		// but is still defined as an array for consistency with them.
		//   negativePattern: one of "(n)|-n|- n|n-|n -"
		pattern: [ "-n" ],
		// number of decimal places normally shown
		decimals: 2,
		// string that separates number groups, as in 1,000,000
		",": ",",
		// string that separates a number from the fractional portion, as in 1.99
		".": ".",
		// array of numbers indicating the size of each number group.
		// TODO: more detailed description and example
		groupSizes: [ 3 ],
		// symbol used for positive numbers
		"+": "+",
		// symbol used for negative numbers
		"-": "-",
		// symbol used for NaN (Not-A-Number)
		NaN: "NaN",
		// symbol used for Negative Infinity
		negativeInfinity: "-Infinity",
		// symbol used for Positive Infinity
		positiveInfinity: "Infinity",
		percent: {
			// [negativePattern, positivePattern]
			//   negativePattern: one of "-n %|-n%|-%n|%-n|%n-|n-%|n%-|-% n|n %-|% n-|% -n|n- %"
			//   positivePattern: one of "n %|n%|%n|% n"
			pattern: [ "-n %", "n %" ],
			// number of decimal places normally shown
			decimals: 2,
			// array of numbers indicating the size of each number group.
			// TODO: more detailed description and example
			groupSizes: [ 3 ],
			// string that separates number groups, as in 1,000,000
			",": ",",
			// string that separates a number from the fractional portion, as in 1.99
			".": ".",
			// symbol used to represent a percentage
			symbol: "%"
		},
		currency: {
			// [negativePattern, positivePattern]
			//   negativePattern: one of "($n)|-$n|$-n|$n-|(n$)|-n$|n-$|n$-|-n $|-$ n|n $-|$ n-|$ -n|n- $|($ n)|(n $)"
			//   positivePattern: one of "$n|n$|$ n|n $"
			pattern: [ "($n)", "$n" ],
			// number of decimal places normally shown
			decimals: 2,
			// array of numbers indicating the size of each number group.
			// TODO: more detailed description and example
			groupSizes: [ 3 ],
			// string that separates number groups, as in 1,000,000
			",": ",",
			// string that separates a number from the fractional portion, as in 1.99
			".": ".",
			// symbol used to represent currency
			symbol: "$"
		}
	},
	// calendars defines all the possible calendars used by this culture.
	// There should be at least one defined with name "standard", and is the default
	// calendar used by the culture.
	// A calendar contains information about how dates are formatted, information about
	// the calendar's eras, a standard set of the date formats,
	// translations for day and month names, and if the calendar is not based on the Gregorian
	// calendar, conversion functions to and from the Gregorian calendar.
	calendars: {
		standard: {
			// name that identifies the type of calendar this is
			name: "Gregorian_USEnglish",
			// separator of parts of a date (e.g. "/" in 11/05/1955)
			"/": "/",
			// separator of parts of a time (e.g. ":" in 05:44 PM)
			":": ":",
			// the first day of the week (0 = Sunday, 1 = Monday, etc)
			firstDay: 0,
			days: {
				// full day names
				names: [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ],
				// abbreviated day names
				namesAbbr: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ],
				// shortest day names
				namesShort: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa" ]
			},
			months: {
				// full month names (13 months for lunar calendards -- 13th month should be "" if not lunar)
				names: [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "" ],
				// abbreviated month names
				namesAbbr: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "" ]
			},
			// AM and PM designators in one of these forms:
			// The usual view, and the upper and lower case versions
			//   [ standard, lowercase, uppercase ]
			// The culture does not use AM or PM (likely all standard date formats use 24 hour time)
			//   null
			AM: [ "AM", "am", "AM" ],
			PM: [ "PM", "pm", "PM" ],
			eras: [
				// eras in reverse chronological order.
				// name: the name of the era in this culture (e.g. A.D., C.E.)
				// start: when the era starts in ticks (gregorian, gmt), null if it is the earliest supported era.
				// offset: offset in years from gregorian calendar
				{
					"name": "A.D.",
					"start": null,
					"offset": 0
				}
			],
			// when a two digit year is given, it will never be parsed as a four digit
			// year greater than this year (in the appropriate era for the culture)
			// Set it as a full year (e.g. 2029) or use an offset format starting from
			// the current year: "+19" would correspond to 2029 if the current year 2010.
			twoDigitYearMax: 2029,
			// set of predefined date and time patterns used by the culture
			// these represent the format someone in this culture would expect
			// to see given the portions of the date that are shown.
			patterns: {
				// short date pattern
				d: "M/d/yyyy",
				// long date pattern
				D: "dddd, MMMM dd, yyyy",
				// short time pattern
				t: "h:mm tt",
				// long time pattern
				T: "h:mm:ss tt",
				// long date, short time pattern
				f: "dddd, MMMM dd, yyyy h:mm tt",
				// long date, long time pattern
				F: "dddd, MMMM dd, yyyy h:mm:ss tt",
				// month/day pattern
				M: "MMMM dd",
				// month/year pattern
				Y: "yyyy MMMM",
				// S is a sortable format that does not vary by culture
				S: "yyyy\u0027-\u0027MM\u0027-\u0027dd\u0027T\u0027HH\u0027:\u0027mm\u0027:\u0027ss"
			}
			// optional fields for each calendar:
			/*
			monthsGenitive:
				Same as months but used when the day preceeds the month.
				Omit if the culture has no genitive distinction in month names.
				For an explaination of genitive months, see http://blogs.msdn.com/michkap/archive/2004/12/25/332259.aspx
			convert:
				Allows for the support of non-gregorian based calendars. This convert object is used to
				to convert a date to and from a gregorian calendar date to handle parsing and formatting.
				The two functions:
					fromGregorian( date )
						Given the date as a parameter, return an array with parts [ year, month, day ]
						corresponding to the non-gregorian based year, month, and day for the calendar.
					toGregorian( year, month, day )
						Given the non-gregorian year, month, and day, return a new Date() object
						set to the corresponding date in the gregorian calendar.
			*/
		}
	},
	// For localized strings
	messages: {}
};

Globalize.cultures[ "default" ].calendar = Globalize.cultures[ "default" ].calendars.standard;

Globalize.cultures[ "en" ] = Globalize.cultures[ "default" ];

Globalize.cultureSelector = "en";

//
// private variables
//

regexHex = /^0x[a-f0-9]+$/i;
regexInfinity = /^[+-]?infinity$/i;
regexParseFloat = /^[+-]?\d*\.?\d*(e[+-]?\d+)?$/;
regexTrim = /^\s+|\s+$/g;

//
// private JavaScript utility functions
//

arrayIndexOf = function( array, item ) {
	if ( array.indexOf ) {
		return array.indexOf( item );
	}
	for ( var i = 0, length = array.length; i < length; i++ ) {
		if ( array[i] === item ) {
			return i;
		}
	}
	return -1;
};

endsWith = function( value, pattern ) {
	return value.substr( value.length - pattern.length ) === pattern;
};

extend = function( deep ) {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction(target) ) {
		target = {};
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( isObject(copy) || (copyIsArray = isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && isArray(src) ? src : [];

					} else {
						clone = src && isObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

isArray = Array.isArray || function( obj ) {
	return Object.prototype.toString.call( obj ) === "[object Array]";
};

isFunction = function( obj ) {
	return Object.prototype.toString.call( obj ) === "[object Function]";
};

isObject = function( obj ) {
	return Object.prototype.toString.call( obj ) === "[object Object]";
};

startsWith = function( value, pattern ) {
	return value.indexOf( pattern ) === 0;
};

trim = function( value ) {
	return ( value + "" ).replace( regexTrim, "" );
};

truncate = function( value ) {
	if ( isNaN( value ) ) {
		return NaN;
	}
	return Math[ value < 0 ? "ceil" : "floor" ]( value );
};

zeroPad = function( str, count, left ) {
	var l;
	for ( l = str.length; l < count; l += 1 ) {
		str = ( left ? ("0" + str) : (str + "0") );
	}
	return str;
};

//
// private Globalization utility functions
//

appendPreOrPostMatch = function( preMatch, strings ) {
	// appends pre- and post- token match strings while removing escaped characters.
	// Returns a single quote count which is used to determine if the token occurs
	// in a string literal.
	var quoteCount = 0,
		escaped = false;
	for ( var i = 0, il = preMatch.length; i < il; i++ ) {
		var c = preMatch.charAt( i );
		switch ( c ) {
			case "\'":
				if ( escaped ) {
					strings.push( "\'" );
				}
				else {
					quoteCount++;
				}
				escaped = false;
				break;
			case "\\":
				if ( escaped ) {
					strings.push( "\\" );
				}
				escaped = !escaped;
				break;
			default:
				strings.push( c );
				escaped = false;
				break;
		}
	}
	return quoteCount;
};

expandFormat = function( cal, format ) {
	// expands unspecified or single character date formats into the full pattern.
	format = format || "F";
	var pattern,
		patterns = cal.patterns,
		len = format.length;
	if ( len === 1 ) {
		pattern = patterns[ format ];
		if ( !pattern ) {
			throw "Invalid date format string \'" + format + "\'.";
		}
		format = pattern;
	}
	else if ( len === 2 && format.charAt(0) === "%" ) {
		// %X escape format -- intended as a custom format string that is only one character, not a built-in format.
		format = format.charAt( 1 );
	}
	return format;
};

formatDate = function( value, format, culture ) {
	var cal = culture.calendar,
		convert = cal.convert;

	if ( !format || !format.length || format === "i" ) {
		var ret;
		if ( culture && culture.name.length ) {
			if ( convert ) {
				// non-gregorian calendar, so we cannot use built-in toLocaleString()
				ret = formatDate( value, cal.patterns.F, culture );
			}
			else {
				var eraDate = new Date( value.getTime() ),
					era = getEra( value, cal.eras );
				eraDate.setFullYear( getEraYear(value, cal, era) );
				ret = eraDate.toLocaleString();
			}
		}
		else {
			ret = value.toString();
		}
		return ret;
	}

	var eras = cal.eras,
		sortable = format === "s";
	format = expandFormat( cal, format );

	// Start with an empty string
	ret = [];
	var hour,
		zeros = [ "0", "00", "000" ],
		foundDay,
		checkedDay,
		dayPartRegExp = /([^d]|^)(d|dd)([^d]|$)/g,
		quoteCount = 0,
		tokenRegExp = getTokenRegExp(),
		converted;

	function padZeros( num, c ) {
		var r, s = num + "";
		if ( c > 1 && s.length < c ) {
			r = ( zeros[c - 2] + s);
			return r.substr( r.length - c, c );
		}
		else {
			r = s;
		}
		return r;
	}

	function hasDay() {
		if ( foundDay || checkedDay ) {
			return foundDay;
		}
		foundDay = dayPartRegExp.test( format );
		checkedDay = true;
		return foundDay;
	}

	function getPart( date, part ) {
		if ( converted ) {
			return converted[ part ];
		}
		switch ( part ) {
			case 0: return date.getFullYear();
			case 1: return date.getMonth();
			case 2: return date.getDate();
		}
	}

	if ( !sortable && convert ) {
		converted = convert.fromGregorian( value );
	}

	for ( ; ; ) {
		// Save the current index
		var index = tokenRegExp.lastIndex,
			// Look for the next pattern
			ar = tokenRegExp.exec( format );

		// Append the text before the pattern (or the end of the string if not found)
		var preMatch = format.slice( index, ar ? ar.index : format.length );
		quoteCount += appendPreOrPostMatch( preMatch, ret );

		if ( !ar ) {
			break;
		}

		// do not replace any matches that occur inside a string literal.
		if ( quoteCount % 2 ) {
			ret.push( ar[0] );
			continue;
		}

		var current = ar[ 0 ],
			clength = current.length;

		switch ( current ) {
			case "ddd":
				//Day of the week, as a three-letter abbreviation
			case "dddd":
				// Day of the week, using the full name
				var names = ( clength === 3 ) ? cal.days.namesAbbr : cal.days.names;
				ret.push( names[value.getDay()] );
				break;
			case "d":
				// Day of month, without leading zero for single-digit days
			case "dd":
				// Day of month, with leading zero for single-digit days
				foundDay = true;
				ret.push(
					padZeros( getPart(value, 2), clength )
				);
				break;
			case "MMM":
				// Month, as a three-letter abbreviation
			case "MMMM":
				// Month, using the full name
				var part = getPart( value, 1 );
				ret.push(
					( cal.monthsGenitive && hasDay() )
					?
					cal.monthsGenitive[ clength === 3 ? "namesAbbr" : "names" ][ part ]
					:
					cal.months[ clength === 3 ? "namesAbbr" : "names" ][ part ]
				);
				break;
			case "M":
				// Month, as digits, with no leading zero for single-digit months
			case "MM":
				// Month, as digits, with leading zero for single-digit months
				ret.push(
					padZeros( getPart(value, 1) + 1, clength )
				);
				break;
			case "y":
				// Year, as two digits, but with no leading zero for years less than 10
			case "yy":
				// Year, as two digits, with leading zero for years less than 10
			case "yyyy":
				// Year represented by four full digits
				part = converted ? converted[ 0 ] : getEraYear( value, cal, getEra(value, eras), sortable );
				if ( clength < 4 ) {
					part = part % 100;
				}
				ret.push(
					padZeros( part, clength )
				);
				break;
			case "h":
				// Hours with no leading zero for single-digit hours, using 12-hour clock
			case "hh":
				// Hours with leading zero for single-digit hours, using 12-hour clock
				hour = value.getHours() % 12;
				if ( hour === 0 ) hour = 12;
				ret.push(
					padZeros( hour, clength )
				);
				break;
			case "H":
				// Hours with no leading zero for single-digit hours, using 24-hour clock
			case "HH":
				// Hours with leading zero for single-digit hours, using 24-hour clock
				ret.push(
					padZeros( value.getHours(), clength )
				);
				break;
			case "m":
				// Minutes with no leading zero for single-digit minutes
			case "mm":
				// Minutes with leading zero for single-digit minutes
				ret.push(
					padZeros( value.getMinutes(), clength )
				);
				break;
			case "s":
				// Seconds with no leading zero for single-digit seconds
			case "ss":
				// Seconds with leading zero for single-digit seconds
				ret.push(
					padZeros( value.getSeconds(), clength )
				);
				break;
			case "t":
				// One character am/pm indicator ("a" or "p")
			case "tt":
				// Multicharacter am/pm indicator
				part = value.getHours() < 12 ? ( cal.AM ? cal.AM[0] : " " ) : ( cal.PM ? cal.PM[0] : " " );
				ret.push( clength === 1 ? part.charAt(0) : part );
				break;
			case "f":
				// Deciseconds
			case "ff":
				// Centiseconds
			case "fff":
				// Milliseconds
				ret.push(
					padZeros( value.getMilliseconds(), 3 ).substr( 0, clength )
				);
				break;
			case "z":
				// Time zone offset, no leading zero
			case "zz":
				// Time zone offset with leading zero
				hour = value.getTimezoneOffset() / 60;
				ret.push(
					( hour <= 0 ? "+" : "-" ) + padZeros( Math.floor(Math.abs(hour)), clength )
				);
				break;
			case "zzz":
				// Time zone offset with leading zero
				hour = value.getTimezoneOffset() / 60;
				ret.push(
					( hour <= 0 ? "+" : "-" ) + padZeros( Math.floor(Math.abs(hour)), 2 )
					// Hard coded ":" separator, rather than using cal.TimeSeparator
					// Repeated here for consistency, plus ":" was already assumed in date parsing.
					+ ":" + padZeros( Math.abs(value.getTimezoneOffset() % 60), 2 )
				);
				break;
			case "g":
			case "gg":
				if ( cal.eras ) {
					ret.push(
						cal.eras[ getEra(value, eras) ].name
					);
				}
				break;
		case "/":
			ret.push( cal["/"] );
			break;
		default:
			throw "Invalid date format pattern \'" + current + "\'.";
			break;
		}
	}
	return ret.join( "" );
};

// formatNumber
(function() {
	var expandNumber;

	expandNumber = function( number, precision, formatInfo ) {
		var groupSizes = formatInfo.groupSizes,
			curSize = groupSizes[ 0 ],
			curGroupIndex = 1,
			factor = Math.pow( 10, precision ),
			rounded = Math.round( number * factor ) / factor;

		if ( !isFinite(rounded) ) {
			rounded = number;
		}
		number = rounded;

		var numberString = number+"",
			right = "",
			split = numberString.split( /e/i ),
			exponent = split.length > 1 ? parseInt( split[1], 10 ) : 0;
		numberString = split[ 0 ];
		split = numberString.split( "." );
		numberString = split[ 0 ];
		right = split.length > 1 ? split[ 1 ] : "";

		var l;
		if ( exponent > 0 ) {
			right = zeroPad( right, exponent, false );
			numberString += right.slice( 0, exponent );
			right = right.substr( exponent );
		}
		else if ( exponent < 0 ) {
			exponent = -exponent;
			numberString = zeroPad( numberString, exponent + 1 );
			right = numberString.slice( -exponent, numberString.length ) + right;
			numberString = numberString.slice( 0, -exponent );
		}

		if ( precision > 0 ) {
			right = formatInfo[ "." ] +
				( (right.length > precision) ? right.slice(0, precision) : zeroPad(right, precision) );
		}
		else {
			right = "";
		}

		var stringIndex = numberString.length - 1,
			sep = formatInfo[ "," ],
			ret = "";

		while ( stringIndex >= 0 ) {
			if ( curSize === 0 || curSize > stringIndex ) {
				return numberString.slice( 0, stringIndex + 1 ) + ( ret.length ? (sep + ret + right) : right );
			}
			ret = numberString.slice( stringIndex - curSize + 1, stringIndex + 1 ) + ( ret.length ? (sep + ret) : "" );

			stringIndex -= curSize;

			if ( curGroupIndex < groupSizes.length ) {
				curSize = groupSizes[ curGroupIndex ];
				curGroupIndex++;
			}
		}

		return numberString.slice( 0, stringIndex + 1 ) + sep + ret + right;
	};

	formatNumber = function( value, format, culture ) {
		if ( !isFinite(value) ) {
			if ( value === Infinity ) {
				return culture.numberFormat.positiveInfinity;
			}
			if ( value === -Infinity ) {
				return culture.numberFormat.negativeInfinity;
			}
			return culture.numberFormat.NaN;
		}
		if ( !format || format === "i" ) {
			return culture.name.length ? value.toLocaleString() : value.toString();
		}
		format = format || "D";

		var nf = culture.numberFormat,
			number = Math.abs( value ),
			precision = -1,
			pattern;
		if ( format.length > 1 ) precision = parseInt( format.slice(1), 10 );

		var current = format.charAt( 0 ).toUpperCase(),
			formatInfo;

		switch ( current ) {
			case "D":
				pattern = "n";
				number = truncate( number );
				if ( precision !== -1 ) {
					number = zeroPad( "" + number, precision, true );
				}
				if ( value < 0 ) number = "-" + number;
				break;
			case "N":
				formatInfo = nf;
				// fall through
			case "C":
				formatInfo = formatInfo || nf.currency;
				// fall through
			case "P":
				formatInfo = formatInfo || nf.percent;
				pattern = value < 0 ? formatInfo.pattern[ 0 ] : ( formatInfo.pattern[1] || "n" );
				if ( precision === -1 ) precision = formatInfo.decimals;
				number = expandNumber( number * (current === "P" ? 100 : 1), precision, formatInfo );
				break;
			default:
				throw "Bad number format specifier: " + current;
		}

		var patternParts = /n|\$|-|%/g,
			ret = "";
		for ( ; ; ) {
			var index = patternParts.lastIndex,
				ar = patternParts.exec( pattern );

			ret += pattern.slice( index, ar ? ar.index : pattern.length );

			if ( !ar ) {
				break;
			}

			switch ( ar[0] ) {
				case "n":
					ret += number;
					break;
				case "$":
					ret += nf.currency.symbol;
					break;
				case "-":
					// don't make 0 negative
					if ( /[1-9]/.test(number) ) {
						ret += nf[ "-" ];
					}
					break;
				case "%":
					ret += nf.percent.symbol;
					break;
			}
		}

		return ret;
	};

}());

getTokenRegExp = function() {
	// regular expression for matching date and time tokens in format strings.
	return /\/|dddd|ddd|dd|d|MMMM|MMM|MM|M|yyyy|yy|y|hh|h|HH|H|mm|m|ss|s|tt|t|fff|ff|f|zzz|zz|z|gg|g/g;
};

getEra = function( date, eras ) {
	if ( !eras ) return 0;
	var start, ticks = date.getTime();
	for ( var i = 0, l = eras.length; i < l; i++ ) {
		start = eras[ i ].start;
		if ( start === null || ticks >= start ) {
			return i;
		}
	}
	return 0;
};

getEraYear = function( date, cal, era, sortable ) {
	var year = date.getFullYear();
	if ( !sortable && cal.eras ) {
		// convert normal gregorian year to era-shifted gregorian
		// year by subtracting the era offset
		year -= cal.eras[ era ].offset;
	}
	return year;
};

// parseExact
(function() {
	var expandYear,
		getDayIndex,
		getMonthIndex,
		getParseRegExp,
		outOfRange,
		toUpper,
		toUpperArray;

	expandYear = function( cal, year ) {
		// expands 2-digit year into 4 digits.
		if ( year < 100 ) {
			var now = new Date(),
				era = getEra( now ),
				curr = getEraYear( now, cal, era ),
				twoDigitYearMax = cal.twoDigitYearMax;
			twoDigitYearMax = typeof twoDigitYearMax === "string" ? new Date().getFullYear() % 100 + parseInt( twoDigitYearMax, 10 ) : twoDigitYearMax;
			year += curr - ( curr % 100 );
			if ( year > twoDigitYearMax ) {
				year -= 100;
			}
		}
		return year;
	};

	getDayIndex = function	( cal, value, abbr ) {
		var ret,
			days = cal.days,
			upperDays = cal._upperDays;
		if ( !upperDays ) {
			cal._upperDays = upperDays = [
				toUpperArray( days.names ),
				toUpperArray( days.namesAbbr ),
				toUpperArray( days.namesShort )
			];
		}
		value = toUpper( value );
		if ( abbr ) {
			ret = arrayIndexOf( upperDays[1], value );
			if ( ret === -1 ) {
				ret = arrayIndexOf( upperDays[2], value );
			}
		}
		else {
			ret = arrayIndexOf( upperDays[0], value );
		}
		return ret;
	};

	getMonthIndex = function( cal, value, abbr ) {
		var months = cal.months,
			monthsGen = cal.monthsGenitive || cal.months,
			upperMonths = cal._upperMonths,
			upperMonthsGen = cal._upperMonthsGen;
		if ( !upperMonths ) {
			cal._upperMonths = upperMonths = [
				toUpperArray( months.names ),
				toUpperArray( months.namesAbbr )
			];
			cal._upperMonthsGen = upperMonthsGen = [
				toUpperArray( monthsGen.names ),
				toUpperArray( monthsGen.namesAbbr )
			];
		}
		value = toUpper( value );
		var i = arrayIndexOf( abbr ? upperMonths[1] : upperMonths[0], value );
		if ( i < 0 ) {
			i = arrayIndexOf( abbr ? upperMonthsGen[1] : upperMonthsGen[0], value );
		}
		return i;
	};

	getParseRegExp = function( cal, format ) {
		// converts a format string into a regular expression with groups that
		// can be used to extract date fields from a date string.
		// check for a cached parse regex.
		var re = cal._parseRegExp;
		if ( !re ) {
			cal._parseRegExp = re = {};
		}
		else {
			var reFormat = re[ format ];
			if ( reFormat ) {
				return reFormat;
			}
		}

		// expand single digit formats, then escape regular expression characters.
		var expFormat = expandFormat( cal, format ).replace( /([\^\$\.\*\+\?\|\[\]\(\)\{\}])/g, "\\\\$1" ),
			regexp = [ "^" ],
			groups = [],
			index = 0,
			quoteCount = 0,
			tokenRegExp = getTokenRegExp(),
			match;

		// iterate through each date token found.
		while ( (match = tokenRegExp.exec(expFormat)) !== null ) {
			var preMatch = expFormat.slice( index, match.index );
			index = tokenRegExp.lastIndex;

			// don't replace any matches that occur inside a string literal.
			quoteCount += appendPreOrPostMatch( preMatch, regexp );
			if ( quoteCount % 2 ) {
				regexp.push( match[0] );
				continue;
			}

			// add a regex group for the token.
			var m = match[ 0 ],
				len = m.length,
				add;
			switch ( m ) {
				case "dddd": case "ddd":
				case "MMMM": case "MMM":
				case "gg": case "g":
					add = "(\\D+)";
					break;
				case "tt": case "t":
					add = "(\\D*)";
					break;
				case "yyyy":
				case "fff":
				case "ff":
				case "f":
					add = "(\\d{" + len + "})";
					break;
				case "dd": case "d":
				case "MM": case "M":
				case "yy": case "y":
				case "HH": case "H":
				case "hh": case "h":
				case "mm": case "m":
				case "ss": case "s":
					add = "(\\d\\d?)";
					break;
				case "zzz":
					add = "([+-]?\\d\\d?:\\d{2})";
					break;
				case "zz": case "z":
					add = "([+-]?\\d\\d?)";
					break;
				case "/":
					add = "(\\" + cal[ "/" ] + ")";
					break;
				default:
					throw "Invalid date format pattern \'" + m + "\'.";
					break;
			}
			if ( add ) {
				regexp.push( add );
			}
			groups.push( match[0] );
		}
		appendPreOrPostMatch( expFormat.slice(index), regexp );
		regexp.push( "$" );

		// allow whitespace to differ when matching formats.
		var regexpStr = regexp.join( "" ).replace( /\s+/g, "\\s+" ),
			parseRegExp = { "regExp": regexpStr, "groups": groups };

		// cache the regex for this format.
		return re[ format ] = parseRegExp;
	};

	outOfRange = function( value, low, high ) {
		return value < low || value > high;
	};

	toUpper = function( value ) {
		// "he-IL" has non-breaking space in weekday names.
		return value.split( "\u00A0" ).join( " " ).toUpperCase();
	};

	toUpperArray = function( arr ) {
		var results = [];
		for ( var i = 0, l = arr.length; i < l; i++ ) {
			results[ i ] = toUpper( arr[i] );
		}
		return results;
	};

	parseExact = function( value, format, culture ) {
		// try to parse the date string by matching against the format string
		// while using the specified culture for date field names.
		value = trim( value );
		var cal = culture.calendar,
			// convert date formats into regular expressions with groupings.
			// use the regexp to determine the input format and extract the date fields.
			parseInfo = getParseRegExp( cal, format ),
			match = new RegExp( parseInfo.regExp ).exec( value );
		if ( match === null ) {
			return null;
		}
		// found a date format that matches the input.
		var groups = parseInfo.groups,
			era = null, year = null, month = null, date = null, weekDay = null,
			hour = 0, hourOffset, min = 0, sec = 0, msec = 0, tzMinOffset = null,
			pmHour = false;
		// iterate the format groups to extract and set the date fields.
		for ( var j = 0, jl = groups.length; j < jl; j++ ) {
			var matchGroup = match[ j + 1 ];
			if ( matchGroup ) {
				var current = groups[ j ],
					clength = current.length,
					matchInt = parseInt( matchGroup, 10 );
				switch ( current ) {
					case "dd": case "d":
						// Day of month.
						date = matchInt;
						// check that date is generally in valid range, also checking overflow below.
						if ( outOfRange(date, 1, 31) ) return null;
						break;
					case "MMM": case "MMMM":
						month = getMonthIndex( cal, matchGroup, clength === 3 );
						if ( outOfRange(month, 0, 11) ) return null;
						break;
					case "M": case "MM":
						// Month.
						month = matchInt - 1;
						if ( outOfRange(month, 0, 11) ) return null;
						break;
					case "y": case "yy":
					case "yyyy":
						year = clength < 4 ? expandYear( cal, matchInt ) : matchInt;
						if ( outOfRange(year, 0, 9999) ) return null;
						break;
					case "h": case "hh":
						// Hours (12-hour clock).
						hour = matchInt;
						if ( hour === 12 ) hour = 0;
						if ( outOfRange(hour, 0, 11) ) return null;
						break;
					case "H": case "HH":
						// Hours (24-hour clock).
						hour = matchInt;
						if ( outOfRange(hour, 0, 23) ) return null;
						break;
					case "m": case "mm":
						// Minutes.
						min = matchInt;
						if ( outOfRange(min, 0, 59) ) return null;
						break;
					case "s": case "ss":
						// Seconds.
						sec = matchInt;
						if ( outOfRange(sec, 0, 59) ) return null;
						break;
					case "tt": case "t":
						// AM/PM designator.
						// see if it is standard, upper, or lower case PM. If not, ensure it is at least one of
						// the AM tokens. If not, fail the parse for this format.
						pmHour = cal.PM && ( matchGroup === cal.PM[0] || matchGroup === cal.PM[1] || matchGroup === cal.PM[2] );
						if (
							!pmHour && (
								!cal.AM || ( matchGroup !== cal.AM[0] && matchGroup !== cal.AM[1] && matchGroup !== cal.AM[2] )
							)
						) return null;
						break;
					case "f":
						// Deciseconds.
					case "ff":
						// Centiseconds.
					case "fff":
						// Milliseconds.
						msec = matchInt * Math.pow( 10, 3 - clength );
						if ( outOfRange(msec, 0, 999) ) return null;
						break;
					case "ddd":
						// Day of week.
					case "dddd":
						// Day of week.
						weekDay = getDayIndex( cal, matchGroup, clength === 3 );
						if ( outOfRange(weekDay, 0, 6) ) return null;
						break;
					case "zzz":
						// Time zone offset in +/- hours:min.
						var offsets = matchGroup.split( /:/ );
						if ( offsets.length !== 2 ) return null;
						hourOffset = parseInt( offsets[0], 10 );
						if ( outOfRange(hourOffset, -12, 13) ) return null;
						var minOffset = parseInt( offsets[1], 10 );
						if ( outOfRange(minOffset, 0, 59) ) return null;
						tzMinOffset = ( hourOffset * 60 ) + ( startsWith(matchGroup, "-") ? -minOffset : minOffset );
						break;
					case "z": case "zz":
						// Time zone offset in +/- hours.
						hourOffset = matchInt;
						if ( outOfRange(hourOffset, -12, 13) ) return null;
						tzMinOffset = hourOffset * 60;
						break;
					case "g": case "gg":
						var eraName = matchGroup;
						if ( !eraName || !cal.eras ) return null;
						eraName = trim( eraName.toLowerCase() );
						for ( var i = 0, l = cal.eras.length; i < l; i++ ) {
							if ( eraName === cal.eras[i].name.toLowerCase() ) {
								era = i;
								break;
							}
						}
						// could not find an era with that name
						if ( era === null ) return null;
						break;
				}
			}
		}
		var result = new Date(), defaultYear, convert = cal.convert;
		defaultYear = convert ? convert.fromGregorian( result )[ 0 ] : result.getFullYear();
		if ( year === null ) {
			year = defaultYear;
		}
		else if ( cal.eras ) {
			// year must be shifted to normal gregorian year
			// but not if year was not specified, its already normal gregorian
			// per the main if clause above.
			year += cal.eras[( era || 0 )].offset;
		}
		// set default day and month to 1 and January, so if unspecified, these are the defaults
		// instead of the current day/month.
		if ( month === null ) {
			month = 0;
		}
		if ( date === null ) {
			date = 1;
		}
		// now have year, month, and date, but in the culture's calendar.
		// convert to gregorian if necessary
		if ( convert ) {
			result = convert.toGregorian( year, month, date );
			// conversion failed, must be an invalid match
			if ( result === null ) return null;
		}
		else {
			// have to set year, month and date together to avoid overflow based on current date.
			result.setFullYear( year, month, date );
			// check to see if date overflowed for specified month (only checked 1-31 above).
			if ( result.getDate() !== date ) return null;
			// invalid day of week.
			if ( weekDay !== null && result.getDay() !== weekDay ) {
				return null;
			}
		}
		// if pm designator token was found make sure the hours fit the 24-hour clock.
		if ( pmHour && hour < 12 ) {
			hour += 12;
		}
		result.setHours( hour, min, sec, msec );
		if ( tzMinOffset !== null ) {
			// adjust timezone to utc before applying local offset.
			var adjustedMin = result.getMinutes() - ( tzMinOffset + result.getTimezoneOffset() );
			// Safari limits hours and minutes to the range of -127 to 127.	 We need to use setHours
			// to ensure both these fields will not exceed this range.	adjustedMin will range
			// somewhere between -1440 and 1500, so we only need to split this into hours.
			result.setHours( result.getHours() + parseInt(adjustedMin / 60, 10), adjustedMin % 60 );
		}
		return result;
	};
}());

parseNegativePattern = function( value, nf, negativePattern ) {
	var neg = nf[ "-" ],
		pos = nf[ "+" ],
		ret;
	switch ( negativePattern ) {
		case "n -":
			neg = " " + neg;
			pos = " " + pos;
			// fall through
		case "n-":
			if ( endsWith(value, neg) ) {
				ret = [ "-", value.substr(0, value.length - neg.length) ];
			}
			else if ( endsWith(value, pos) ) {
				ret = [ "+", value.substr(0, value.length - pos.length) ];
			}
			break;
		case "- n":
			neg += " ";
			pos += " ";
			// fall through
		case "-n":
			if ( startsWith(value, neg) ) {
				ret = [ "-", value.substr(neg.length) ];
			}
			else if ( startsWith(value, pos) ) {
				ret = [ "+", value.substr(pos.length) ];
			}
			break;
		case "(n)":
			if ( startsWith(value, "(") && endsWith(value, ")") ) {
				ret = [ "-", value.substr(1, value.length - 2) ];
			}
			break;
	}
	return ret || [ "", value ];
};

//
// public instance functions
//

Globalize.prototype.findClosestCulture = function( cultureSelector ) {
	return Globalize.findClosestCulture.call( this, cultureSelector );
};

Globalize.prototype.format = function( value, format, cultureSelector ) {
	return Globalize.format.call( this, value, format, cultureSelector );
};

Globalize.prototype.localize = function( key, cultureSelector ) {
	return Globalize.localize.call( this, key, cultureSelector );
};

Globalize.prototype.parseInt = function( value, radix, cultureSelector ) {
	return Globalize.parseInt.call( this, value, radix, cultureSelector );
};

Globalize.prototype.parseFloat = function( value, radix, cultureSelector ) {
	return Globalize.parseFloat.call( this, value, radix, cultureSelector );
};

Globalize.prototype.culture = function( cultureSelector ) {
	return Globalize.culture.call( this, cultureSelector );
};

//
// public singleton functions
//

Globalize.addCultureInfo = function( cultureName, baseCultureName, info ) {

	var base = {},
		isNew = false;

	if ( typeof cultureName !== "string" ) {
		// cultureName argument is optional string. If not specified, assume info is first
		// and only argument. Specified info deep-extends current culture.
		info = cultureName;
		cultureName = this.culture().name;
		base = this.cultures[ cultureName ];
	} else if ( typeof baseCultureName !== "string" ) {
		// baseCultureName argument is optional string. If not specified, assume info is second
		// argument. Specified info deep-extends specified culture.
		// If specified culture does not exist, create by deep-extending default
		info = baseCultureName;
		isNew = ( this.cultures[ cultureName ] == null );
		base = this.cultures[ cultureName ] || this.cultures[ "default" ];
	} else {
		// cultureName and baseCultureName specified. Assume a new culture is being created
		// by deep-extending an specified base culture
		isNew = true;
		base = this.cultures[ baseCultureName ];
	}

	this.cultures[ cultureName ] = extend(true, {},
		base,
		info
	);
	// Make the standard calendar the current culture if it's a new culture
	if ( isNew ) {
		this.cultures[ cultureName ].calendar = this.cultures[ cultureName ].calendars.standard;
	}
};

Globalize.findClosestCulture = function( name ) {
	var match;
	if ( !name ) {
		return this.findClosestCulture( this.cultureSelector ) || this.cultures[ "default" ];
	}
	if ( typeof name === "string" ) {
		name = name.split( "," );
	}
	if ( isArray(name) ) {
		var lang,
			cultures = this.cultures,
			list = name,
			i, l = list.length,
			prioritized = [];
		for ( i = 0; i < l; i++ ) {
			name = trim( list[i] );
			var pri, parts = name.split( ";" );
			lang = trim( parts[0] );
			if ( parts.length === 1 ) {
				pri = 1;
			}
			else {
				name = trim( parts[1] );
				if ( name.indexOf("q=") === 0 ) {
					name = name.substr( 2 );
					pri = parseFloat( name );
					pri = isNaN( pri ) ? 0 : pri;
				}
				else {
					pri = 1;
				}
			}
			prioritized.push({ lang: lang, pri: pri });
		}
		prioritized.sort(function( a, b ) {
			return a.pri < b.pri ? 1 : -1;
		});

		// exact match
		for ( i = 0; i < l; i++ ) {
			lang = prioritized[ i ].lang;
			match = cultures[ lang ];
			if ( match ) {
				return match;
			}
		}

		// neutral language match
		for ( i = 0; i < l; i++ ) {
			lang = prioritized[ i ].lang;
			do {
				var index = lang.lastIndexOf( "-" );
				if ( index === -1 ) {
					break;
				}
				// strip off the last part. e.g. en-US => en
				lang = lang.substr( 0, index );
				match = cultures[ lang ];
				if ( match ) {
					return match;
				}
			}
			while ( 1 );
		}

		// last resort: match first culture using that language
		for ( i = 0; i < l; i++ ) {
			lang = prioritized[ i ].lang;
			for ( var cultureKey in cultures ) {
				var culture = cultures[ cultureKey ];
				if ( culture.language == lang ) {
					return culture;
				}
			}
		}
	}
	else if ( typeof name === "object" ) {
		return name;
	}
	return match || null;
};

Globalize.format = function( value, format, cultureSelector ) {
	culture = this.findClosestCulture( cultureSelector );
	if ( value instanceof Date ) {
		value = formatDate( value, format, culture );
	}
	else if ( typeof value === "number" ) {
		value = formatNumber( value, format, culture );
	}
	return value;
};

Globalize.localize = function( key, cultureSelector ) {
	return this.findClosestCulture( cultureSelector ).messages[ key ] ||
		this.cultures[ "default" ].messages[ key ];
};

Globalize.parseDate = function( value, formats, culture ) {
	culture = this.findClosestCulture( culture );

	var date, prop, patterns;
	if ( formats ) {
		if ( typeof formats === "string" ) {
			formats = [ formats ];
		}
		if ( formats.length ) {
			for ( var i = 0, l = formats.length; i < l; i++ ) {
				var format = formats[ i ];
				if ( format ) {
					date = parseExact( value, format, culture );
					if ( date ) {
						break;
					}
				}
			}
		}
	} else {
		patterns = culture.calendar.patterns;
		for ( prop in patterns ) {
			date = parseExact( value, patterns[prop], culture );
			if ( date ) {
				break;
			}
		}
	}

	return date || null;
};

Globalize.parseInt = function( value, radix, cultureSelector ) {
	return truncate( Globalize.parseFloat(value, radix, cultureSelector) );
};

Globalize.parseFloat = function( value, radix, cultureSelector ) {
	// radix argument is optional
	if ( typeof radix !== "number" ) {
		cultureSelector = radix;
		radix = 10;
	}

	var culture = this.findClosestCulture( cultureSelector );
	var ret = NaN,
		nf = culture.numberFormat;

	if ( value.indexOf(culture.numberFormat.currency.symbol) > -1 ) {
		// remove currency symbol
		value = value.replace( culture.numberFormat.currency.symbol, "" );
		// replace decimal seperator
		value = value.replace( culture.numberFormat.currency["."], culture.numberFormat["."] );
	}

	// trim leading and trailing whitespace
	value = trim( value );

	// allow infinity or hexidecimal
	if ( regexInfinity.test(value) ) {
		ret = parseFloat( value );
	}
	else if ( !radix && regexHex.test(value) ) {
		ret = parseInt( value, 16 );
	}
	else {

		// determine sign and number
		var signInfo = parseNegativePattern( value, nf, nf.pattern[0] ),
			sign = signInfo[ 0 ],
			num = signInfo[ 1 ];

		// #44 - try parsing as "(n)"
		if ( sign === "" && nf.pattern[0] !== "(n)" ) {
			signInfo = parseNegativePattern( value, nf, "(n)" );
			sign = signInfo[ 0 ];
			num = signInfo[ 1 ];
		}

		// try parsing as "-n"
		if ( sign === "" && nf.pattern[0] !== "-n" ) {
			signInfo = parseNegativePattern( value, nf, "-n" );
			sign = signInfo[ 0 ];
			num = signInfo[ 1 ];
		}

		sign = sign || "+";

		// determine exponent and number
		var exponent,
			intAndFraction,
			exponentPos = num.indexOf( "e" );
		if ( exponentPos < 0 ) exponentPos = num.indexOf( "E" );
		if ( exponentPos < 0 ) {
			intAndFraction = num;
			exponent = null;
		}
		else {
			intAndFraction = num.substr( 0, exponentPos );
			exponent = num.substr( exponentPos + 1 );
		}
		// determine decimal position
		var integer,
			fraction,
			decSep = nf[ "." ],
			decimalPos = intAndFraction.indexOf( decSep );
		if ( decimalPos < 0 ) {
			integer = intAndFraction;
			fraction = null;
		}
		else {
			integer = intAndFraction.substr( 0, decimalPos );
			fraction = intAndFraction.substr( decimalPos + decSep.length );
		}
		// handle groups (e.g. 1,000,000)
		var groupSep = nf[ "," ];
		integer = integer.split( groupSep ).join( "" );
		var altGroupSep = groupSep.replace( /\u00A0/g, " " );
		if ( groupSep !== altGroupSep ) {
			integer = integer.split( altGroupSep ).join( "" );
		}
		// build a natively parsable number string
		var p = sign + integer;
		if ( fraction !== null ) {
			p += "." + fraction;
		}
		if ( exponent !== null ) {
			// exponent itself may have a number patternd
			var expSignInfo = parseNegativePattern( exponent, nf, "-n" );
			p += "e" + ( expSignInfo[0] || "+" ) + expSignInfo[ 1 ];
		}
		if ( regexParseFloat.test(p) ) {
			ret = parseFloat( p );
		}
	}
	return ret;
};

Globalize.culture = function( cultureSelector ) {
	// setter
	if ( typeof cultureSelector !== "undefined" ) {
		this.cultureSelector = cultureSelector;
	}
	// getter
	return this.findClosestCulture( cultureSelector ) || this.culture[ "default" ];
};

}( this ));
/**
 * @class core
 * loader.js
 *
 * Youmin Ha <youmin.ha@samsung.com>
 *
 *
 */
/*
	Web UI scaling concept in Tizen Web UI

Generally, web applications must be designed to be showed acceptable on various size and resolution of screens, and web winsets have to be scaled well.  Tizen Web UI Framework supports various viewport settings, and Tizen Web UI widgets are designed to be scalable on various screen sizes.  In order to make web applications scalable on many devices which have different screen size, it is necessary to understand how mobile web browsers deal with screen resolution, and how Tizen Web UI Framework supports scaling for web applications.


* Viewport on mobile web browser

Viewport is an area showing web content on the browser.  Unlike desktop browsers, mobile browsers support logical viewport seting, which means that application can set viewport width/height and zoom level by itself.
The very important thing that to be remembered is that the viewport resolution in pixel is 'Logical', not physical.  For example, if the viewport width is set to 480 on a mobile device having 720px screen width, the viewport width is considered to 480px logically. All elements put on right side from 480px horizontal position will not be shown on the viewport.
Most mobile browsers set viewport with given content attribute with <meta name="viewport" content="..."> tag in <head> section in the application source html, whereas desktop browsers ignore the tag.
Detailed usage of viewport meta tag is found in here: http://www.w3.org/TR/mwabp/#bp-viewport


* Viewport setting by application developers

When developers write <meta name="viewport" content="..."> in the <head> section of the web application HTML file, Tizen Web UI Framework does not add another viewport meta tag, nor modify developer-defined viewport.


* Automatic viewport setting by Tizen Web UI Framework

If developers do not give a viewport meta tag, Tizen Web UI Framework automatically add a viewport meta tag with default viewport setting.


* Portrait/landscape mode


* Tizen Web UI widgets scaling


 */
( function ($, Globalize, window, undefined) {

	var tizen = {
		libFileName : "tizen-web-ui-fw(.min)?.js",

		frameworkData : {
			rootDir: '/usr/lib/tizen-web-ui-fw',
			version: '0.1',
			theme: "tizen-white",
			viewportWidth: "device-width",
			viewportScale: false,

			defaultFontSize: 22,
			minified: false,

			debug: false
		},

		log : {
			debug : function ( msg ) {
				if ( tizen.frameworkData.debug ) {
					console.log( msg );
				}
			},
			warn : function ( msg ) {
				console.warn( msg );
			},
			error : function ( msg ) {
				console.error( msg );
			},
			alert : function ( msg ) {
				window.alert( msg );
			}
		},

		util : {

			loadScriptSync : function ( scriptPath, successCB, errorCB ) {
				$.ajax( {
					url: scriptPath,
					dataType: 'script',
					async: false,
					crossDomain: false,
					success: successCB,
					error: function ( jqXHR, textStatus, errorThrown ) {
						if ( errorCB ) {
							errorCB( jqXHR, textStatus, errorThrown );
						} else {
							var ignoreStatusList = [ 404 ],  // 404: not found
								errmsg = ( 'Error while loading ' + scriptPath + '\n' + jqXHR.status + ':' + jqXHR.statusText );
							if ( -1 == $.inArray( jqXHR.status, ignoreStatusList ) ) {
								tizen.log.alert( errmsg );
							} else {
								tizen.log.warn( errmsg );
							}
						}
					}
				} );
			},
			isMobileBrowser: function ( ) {
				var mobileIdx = window.navigator.appVersion.indexOf("Mobile"),
					isMobile = -1 < mobileIdx;
				return isMobile;
			}
		},

		css : {
			cacheBust: ( document.location.href.match( /debug=true/ ) ) ?
					'?cacheBust=' + ( new Date( ) ).getTime( ) :
					'',
			addElementToHead : function ( elem ) {
				var head = document.getElementsByTagName( 'head' )[0];
				if ( head ) {
					$( head ).prepend( elem );
				}
			},
			makeLink : function ( href ) {
				var cssLink = document.createElement( 'link' );
				cssLink.setAttribute( 'rel', 'stylesheet' );
				cssLink.setAttribute( 'href', href );
				cssLink.setAttribute( 'name', 'tizen-theme' );
				return cssLink;
			},
			load: function ( path ) {
				var head = document.getElementsByTagName( 'head' )[0],
					cssLinks = head.getElementsByTagName( 'link' ),
					idx,
					l = null;
				// Find css link element
				for ( idx = 0; idx < cssLinks.length; idx++ ) {
					if ( cssLinks[idx].getAttribute( 'rel' ) != "stylesheet" ) {
						continue;
					}
					if ( cssLinks[idx].getAttribute( 'name' ) == "tizen-theme"
							|| cssLinks[idx].getAttribute( 'href' ) == path ) {
						l = cssLinks[idx];
						break;
					}
				}
				if ( l ) {	// Found the link element!
					if ( l.getAttribute( 'href' ) == path ) {
						tizen.log.warn( "Theme is already loaded. Skip theme loading in the framework." );
					} else {
						l.setAttribute( 'href', path );
					}
				} else {
					this.addElementToHead( this.makeLink( path ) );
				}
			}
		},

		getParams: function ( ) {
			/* Get data-* params from <script> tag, and set tizen.frameworkData.* values
			 * Returns true if proper <script> tag is found, or false if not.
			 */
			// Find current <script> tag element
			var scriptElems = document.getElementsByTagName( 'script' ),
				val = null,
				foundScriptTag = false,
				idx,
				elem,
				src,
				tokens,
				version_idx;

			function getTizenTheme( ) {
				var t = navigator.theme ? navigator.theme.split( ':' )[0] : null;
				if ( t ) {
					t = t.replace('-hd', '');
					if ( ! t.match( /^tizen-/ ) ) {
						t = 'tizen-' + t;
					}
				}
				return t;
			}

			for ( idx in scriptElems ) {
				elem = scriptElems[idx];
				src = elem.src ? elem.getAttribute( 'src' ) : undefined;
				if (src && src.match( this.libFileName )) {
					// Set framework data, only when they are given.
					tokens = src.split(/[\/\\]/);
					version_idx = -3;
					this.frameworkData.rootDir = ( elem.getAttribute( 'data-framework-root' )
						|| tokens.slice( 0, tokens.length + version_idx ).join( '/' )
						|| this.frameworkData.rootDir ).replace( /^file:(\/\/)?/, '' );
					this.frameworkData.version = elem.getAttribute( 'data-framework-version' )
						|| tokens[ tokens.length + version_idx ]
						|| this.frameworkData.version;
					this.frameworkData.theme = elem.getAttribute( 'data-framework-theme' )
						|| getTizenTheme( )
						|| this.frameworkData.theme;
					this.frameworkData.viewportWidth = elem.getAttribute( 'data-framework-viewport-width' )
						|| this.frameworkData.viewportWidth;
					this.frameworkData.viewportScale =
						"true" === elem.getAttribute( 'data-framework-viewport-scale' ) ? true
						: this.frameworkData.viewportScale;
					this.frameworkData.minified = src.search(/\.min\.js$/) > -1 ? true : false;
					this.frameworkData.debug = "true" === elem.getAttribute( 'data-framework-debug' ) ? true
						: this.frameworkData.debug;
					foundScriptTag = true;
					break;
				}
			}
			return foundScriptTag;
		},

		loadTheme: function ( theme ) {
			var themePath,
				cssPath,
				jsPath;

			if ( ! theme ) {
				theme = tizen.frameworkData.theme;
			}
			themePath = [
				tizen.frameworkData.rootDir,
				tizen.frameworkData.version,
				'themes',
				theme
			].join( '/' );

			jsPath = [ themePath, 'theme.js' ].join( '/' );

			if ( tizen.frameworkData.minified ) {
				cssPath = [themePath, 'tizen-web-ui-fw-theme.min.css'].join( '/' );
			} else {
				cssPath = [themePath, 'tizen-web-ui-fw-theme.css'].join( '/' );
			}
			tizen.css.load( cssPath );
			tizen.util.loadScriptSync( jsPath );
		},

		/** Load Globalize culture file, and set default culture.
		 *  @param[in]  language  (optional) Language code. ex) en-US, en, ko-KR, ko
		 *                        If language is not given, read language from html 'lang' attribute, 
		 *                        or from system setting.
		 *  @param[in]  cultureDic (optional) Dictionary having language code->
		 */
		loadGlobalizeCulture: function ( language, cultureDic ) {
			var self = this,
				cFPath,
				lang,
				mockJSXHR;

			function getLang ( language ) {
				var lang = language
						|| $( 'html' ).attr( 'lang' )
						|| window.navigator.language.split( '.' )[0]	// Webkit, Safari + workaround for Tizen
						|| window.navigator.userLanguage	// IE
						|| 'en',
					countryCode = null,
					countryCodeIdx = lang.lastIndexOf('-'),
					ignoreCodes = ['Cyrl', 'Latn', 'Mong'];	// Not country code!
				if ( countryCodeIdx != -1 ) {	// Found country code!
					countryCode = lang.substr( countryCodeIdx + 1 );
					if ( ignoreCodes.join( '-' ).indexOf( countryCode ) < 0 ) {
						// countryCode is not found from ignoreCodes.
						// Make countryCode to uppercase.
						lang = [ lang.substr( 0, countryCodeIdx ), countryCode.toUpperCase( ) ].join( '-' );
					}
				}
				// NOTE: 'en' to 'en-US', because globalize has no 'en' culture file.
				lang = lang == 'en' ? 'en-US' : lang;
				return lang;
			}

			function getNeutralLang ( lang ) {
				var neutralLangIdx = lang.lastIndexOf( '-' ),
					neutralLang;
				if ( neutralLangIdx != -1 ) {
					neutralLang = lang.substr( 0, neutralLangIdx );
				}
				return neutralLang;
			}

			function getCultureFilePath ( lang, cFDic ) {
				var cFPath = null;	// error value

				if ( "string" != typeof lang ) {
					return null;
				}
				if ( cFDic && cFDic[lang] ) {
					cFPath = cFDic[lang];
				} else {
					// Default Globalize culture file path
					cFPath = [
						self.frameworkData.rootDir,
						self.frameworkData.version,
						'js',
						'cultures',
						['globalize.culture.', lang, '.js'].join( '' ),
					].join( '/' );
				}
				return cFPath;
			}

			function printLoadError( cFPath, jqXHR ) {
				tizen.log.error( "Error " + jqXHR.status + ": " + jqXHR.statusText
						+ "::Culture file (" + cFPath + ") is failed to load.");
			}

			function loadCultureFile ( cFPath, errCB ) {
				function _successCB ( ) {
					tizen.log.debug( "Culture file (" + cFPath + ") is loaded successfully." );
				}
				function _errCB ( jqXHR, textStatus, err ) {
					if ( errCB ) {
						errCB( jqXHR, textStatus, err );
					} else {
						printLoadError( cFPath, jqXHR );
					}
				}

				if ( ! cFPath ) {	// Invalid cFPath -> Regard it as '404 Not Found' error.
					mockJSXHR = {
						status: 404,
						statusText: "Not Found"
					};
					_errCB( mockJSXHR, null, null );
				} else {
					$.ajax( {
						url: cFPath,
						dataType: 'script',
						cache: true,
						async: false,
						success: _successCB,
						error: _errCB
					} );
				}
			}

			lang = getLang( language );
			cFPath = getCultureFilePath( lang, cultureDic );
			loadCultureFile( cFPath,
				function ( jqXHR, textStatus, err ) {
					if ( jqXHR.status == 404 ) {
						// If culture file is not found, try once more with neutral lang.
						var nLang = getNeutralLang( lang ),
							ncFPath = getCultureFilePath( nLang, cultureDic );
						loadCultureFile( ncFPath, null );
					} else {
						printLoadError( cFPath, jqXHR );
					}
				} );

			return lang;
		},
		setGlobalize: function ( ) {
			var lang = this.loadGlobalizeCulture( );

			// Set culture
			// NOTE: It is not needed to set with neutral lang.
			//       Globalize automatically deals with it.
			Globalize.culture( lang );
		},
		/**
		 * Load custom globalize culture file
		 * Find current system language, and load appropriate culture file from given colture file list.
		 *
		 * @param[in]	cultureDic	collection of 'language':'culture file path' key-val pair.
		 * @example
		 * var myCultures = {
		 *	"en"    : "culture/en.js",
		 *	"fr"    : "culture/fr.js",
		 *	"ko-KR" : "culture/ko-KR.js"
		 * };
		 * loadCultomGlobalizeCulture( myCultures );
		 *
		 * ex) culture/fr.js
		 * -------------------------------
		 * Globalize.addCultureInfo( "fr", {
		 *   messages: {
		 *     "hello" : "bonjour",
		 *     "translate" : "traduire"
		 *   }
		 * } );
		 * -------------------------------
		 */
		loadCustomGlobalizeCulture: function ( cultureDic ) {
			tizen.loadGlobalizeCulture( null, cultureDic );
		},

		/** Set viewport meta tag for mobile devices.
		 *
		 * @param[in]	viewportWidth	viewport width. "device-width" is OK.
		 */
		setViewport: function ( viewportWidth ) {
			var meta = null,
				head,
				content;

			// Do nothing if viewport setting code is already in the code.
			$( "meta[name=viewport]" ).each( function ( ) {
				meta = this;
				return;
			});
			if ( meta ) {	// Found custom viewport!
				content = $( meta ).prop( "content" );
				viewportWidth = content.replace( /.*width=(device-width|\d+)\s*,?.*$/gi, "$1" );
				tizen.log.warn( "Viewport is set to '" + viewportWidth + "' in a meta tag. Framework skips viewport setting." );
			} else {
				// Create a meta tag
				meta = document.createElement( "meta" );
				if ( meta ) {
					meta.name = "viewport";
					content = [ "width=", viewportWidth, ", user-scalable=no" ].join( "" );
					if ( ! isNaN( viewportWidth ) ) {
						// Fix scale to 1.0, if viewport width is set to fixed value.
						// NOTE: Works wrong in Tizen browser!
						//content = [ content, ", initial-scale=1.0, maximum-scale=1.0" ].join( "" );
					}
					meta.content = content;
					tizen.log.debug( content );
					head = document.getElementsByTagName( 'head' ).item( 0 );
					head.insertBefore( meta, head.firstChild );
				}
			}
			return viewportWidth;
		},

		/**	Read body's font-size, scale it, and reset it.
		 *  param[in]	desired font-size / base font-size.
		 */
		scaleBaseFontSize: function ( themeDefaultFontSize, ratio ) {
			tizen.log.debug( "themedefaultfont size: " + themeDefaultFontSize + ", ratio: " + ratio );
			var scaledFontSize = Math.round( themeDefaultFontSize * ratio );

			$( 'html.ui-mobile' ).css( { 'font-size': scaledFontSize + "px" } );
			tizen.log.debug( 'html:font size is set to ' + scaledFontSize );
			$( document ).ready( function ( ) {
				$( '.ui-mobile' ).children( 'body' ).css( { 'font-size': scaledFontSize + "px" } );
			} );
		},

		setScaling: function ( ) {
			var viewportWidth = this.frameworkData.viewportWidth,
				themeDefaultFontSize = this.frameworkData.defaultFontSize, // comes from theme.js
				ratio = 1;

			// Keep original font size
			$( 'body' ).attr( 'data-tizen-theme-default-font-size', themeDefaultFontSize );

			// Legacy support: tizen.frameworkData.viewportScale
			if ( this.frameworkData.viewportScale == true ) {
				viewportWidth = "screen-width";
			}

			if ( "screen-width" == viewportWidth ) {
				viewportWidth = document.documentElement.clientWidth;
			}

			viewportWidth = this.setViewport( viewportWidth );	// If custom viewport setting exists, get viewport width
			if ( ! isNaN( viewportWidth ) ) {	// fixed width!
				ratio = parseFloat( viewportWidth / this.frameworkData.defaultViewportWidth );
			}
			this.scaleBaseFontSize( themeDefaultFontSize, ratio );
		}
	};

	function export2TizenNS ( $, tizen ) {
		if ( undefined == typeof $.tizen ) {
			$.tizen = { };
		}

		$.tizen.frameworkData = tizen.frameworkData;
		$.tizen.loadCustomGlobalizeCulture = tizen.loadCustomGlobalizeCulture;
		$.tizen.loadTheme = tizen.loadTheme;

		$.tizen.__tizen__ = tizen;	// for unit-test
	}

	export2TizenNS( $, tizen );

	tizen.getParams( );
	tizen.loadTheme( );
	tizen.setScaling( );	// Run after loadTheme(), for the default font size.
	tizen.setGlobalize( );

	// Turn off JQM's auto initialization option.
	// NOTE: This job must be done before domready.
	$.mobile.autoInitializePage = false;

	$(document).ready( function ( ) {
		$.mobile.initializePage( );
	});

} ( jQuery, window.Globalize, window ) );
(function($){$.tizen.frameworkData.pkgVersion="0.2.15";}(jQuery));
