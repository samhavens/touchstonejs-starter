var React = require('react/addons');

// Enable React Touch Events
React.initializeTouchEvents(true);

function getTouchProps(touch) {
	if (!touch) return {};
	return {
		pageX: touch.pageX,
		pageY: touch.pageY,
		clientX: touch.clientX,
		clientY: touch.clientY
	};
}

/**
* Tappable Component
* ==================
*/

module.exports = React.createClass({
	
	displayName: 'Tappable',
	
	propTypes: {
		
		component: React.PropTypes.any,              // component to create
		disabled: React.PropTypes.bool,              // optional but common element attribute
		className: React.PropTypes.string,           // optional className
		classBase: React.PropTypes.string,           // base for generated classNames
		
		moveThreshold: React.PropTypes.number,       // pixels to move before cancelling tap
		pressDelay: React.PropTypes.number,          // ms to wait before detecting a press
		pressMoveThreshold: React.PropTypes.number,  // pixels to move before cancelling press
		preventDefault: React.PropTypes.bool,        // whether to preventDefault on all events
		stopPropagation: React.PropTypes.bool,       // whether to stopPropagation on all events
		
		onTap: React.PropTypes.func,                 // fires when a tap is detected
		onPress: React.PropTypes.func,               // fires when a press is detected
		onTouchStart: React.PropTypes.func,          // pass-through touch event
		onTouchMove: React.PropTypes.func,           // pass-through touch event
		onTouchEnd: React.PropTypes.func,            // pass-through touch event
		onMouseDown: React.PropTypes.func,           // pass-through mouse event
		onMouseUp: React.PropTypes.func,             // pass-through mouse event
		onMouseMove: React.PropTypes.func,           // pass-through mouse event
		onMouseOut: React.PropTypes.func             // pass-through mouse event
		
	},
	
	getDefaultProps: function() {
		return {
			component: 'span',
			classBase: 'Tappable',
			moveThreshold: 100,
			pressDelay: 1000,
			pressMoveThreshold: 5
		};
	},
	
	getInitialState: function() {
		return {
			isActive: false,
			touchActive: false
		};
	},
	
	componentWillUnmount: function() {
		this.cleanupScrollDetection();
		this.cancelPressDetection();
	},
	
	processEvent: function(event) {
		if (this.props.preventDefault) event.preventDefault();
		if (this.props.stopPropagation) event.stopPropagation();
	},
	
	onTouchStart: function(event) {
		clearTimeout(this._blockTimeout);
		if (this.props.onTouchStart && this.props.onTouchStart(event) === false) return;
		this.processEvent(event);
		this._blockMouseEvents = true;
		this._initialTouch = this._lastTouch = getTouchProps(event.touches[0]);
		this.initScrollDetection();
		this.initPressDetection(this.endTouch);
		this.setState({
			isActive: true
		});
	},
	
	initScrollDetection: function() {
		this._scrollParents = [];
		this._scrollPos = { top: 0, left: 0 };
		var node = this.getDOMNode();
		while (node) {
			if (node.scrollHeight > node.offsetHeight || node.scrollWidth > node.offsetWidth) {
				this._scrollParents.push(node);
				this._scrollPos.top += node.scrollTop;
				this._scrollPos.left += node.scrollLeft;
			}
			node = node.parentNode;
		}
	},
	
	calculateMovement: function(touch) {
		return {
			x: Math.abs(touch.clientX - this._initialTouch.clientX),
			y: Math.abs(touch.clientY - this._initialTouch.clientY)
		};
	},
	
	detectScroll: function() {
		var currentScrollPos = { top: 0, left: 0 };
		for (var i = 0; i < this._scrollParents.length; i++) {
			currentScrollPos.top += this._scrollParents[i].scrollTop;
			currentScrollPos.left += this._scrollParents[i].scrollLeft;
		}
		return !(currentScrollPos.top === this._scrollPos.top && currentScrollPos.left === this._scrollPos.left);
	},
	
	cleanupScrollDetection: function() {
		this._scrollParents = undefined;
		this._scrollPos = undefined;
	},
	
	initPressDetection: function(callback) {
		if (!this.props.onPress) return;
		this._pressTimeout = setTimeout(function() {
			this.props.onPress();
			callback();
		}.bind(this), this.props.pressDelay);
	},
	
	cancelPressDetection: function() {
		clearTimeout(this._pressTimeout);
	},
	
	onTouchMove: function(event) {
		if (!this._initialTouch) return;
		this.processEvent(event);
		if (this.detectScroll()) {
			return this.endTouch(event);
		}
		this.props.onTouchMove && this.props.onTouchMove(event);
		this._lastTouch = getTouchProps(event.touches[0]);
		var movement = this.calculateMovement(this._lastTouch);
		if (movement.x > this.props.pressMoveThreshold || movement.y > this.props.pressMoveThreshold) {
			this.cancelPressDetection();
		}
		if (movement.x > this.props.moveThreshold || movement.y > this.props.moveThreshold) {
			if (this.state.isActive) {
				this.setState({
					isActive: false
				});
			}
		} else {
			if (!this.state.isActive) {
				this.setState({
					isActive: true
				});
			}
		}
	},
	
	onTouchEnd: function(event) {
		if (!this._initialTouch) return;
		this.processEvent(event);
		var movement = this.calculateMovement(this._lastTouch);
		if (movement.x <= this.props.moveThreshold && movement.y <= this.props.moveThreshold) {
			this.props.onTap && this.props.onTap(event);
		}
		this.endTouch(event);
	},
	
	endTouch: function() {
		this.cancelPressDetection();
		this.props.onTouchEnd && this.props.onTouchEnd(event);
		this._initialTouch = null;
		this._lastTouch = null;
		this.setState({
			isActive: false
		});
	},
	
	onMouseDown: function(event) {
		if (this._blockMouseEvents) {
			this._blockMouseEvents = false;
			return;
		}
		if (this.props.onMouseDown && this.props.onMouseDown(event) === false) return;
		this.processEvent(event);
		this.initPressDetection(this.endMouseEvent);
		this._mouseDown = true;
		this.setState({
			isActive: true
		});
	},
	
	onMouseMove: function(event) {
		if (this._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseMove && this.props.onMouseMove(event);
	},
	
	onMouseUp: function(event) {
		if (this._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseUp && this.props.onMouseUp(event);
		this.props.onTap && this.props.onTap(event);
		this.endMouseEvent();
	},
	
	onMouseOut: function(event) {
		if (this._blockMouseEvents || !this._mouseDown) return;
		this.processEvent(event);
		this.props.onMouseOut && this.props.onMouseOut(event);
		this.endMouseEvent();
	},
	
	endMouseEvent: function() {
		this.cancelPressDetection();
		this._mouseDown = false;
		this.setState({
			isActive: false
		});
	},
	
	render: function() {
		
		var className = this.props.classBase + (this.state.isActive ? '-active' : '-inactive');
		if (this.props.className) {
			className += ' ' + this.props.className;
		}
		
		var style = {
			WebkitTapHighlightColor: 'rgba(0,0,0,0)',
			WebkitTouchCallout: 'none',
			WebkitUserSelect: 'none',
			KhtmlUserSelect: 'none',
			MozUserSelect: 'none',
			msUserSelect: 'none',
			userSelect: 'none',
			cursor: 'pointer'
		};
		return React.createElement(this.props.component, {
			disabled: this.props.disabled,
			style: style,
			className: className,
			onTouchStart: this.onTouchStart,
			onTouchMove: this.onTouchMove,
			onTouchEnd: this.onTouchEnd,
			onMouseDown: this.onMouseDown,
			onMouseMove: this.onMouseMove,
			onMouseUp: this.onMouseUp,
			onMouseOut: this.onMouseOut
		}, this.props.children);
		
	}
	
});
