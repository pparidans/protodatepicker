/**
 * protodatepicker.js - MooTools Datepicker class port to Prototype
 * @version 1.16
 * 
 * by MonkeyPhysics.com, port by Paridans.org
 *
 * Source/Documentation available at:
 * http://www.monkeyphysics.com/mootools/script/2/datepicker
 * 
 * Prototype port Source/Documentation:
 * http://paridans.org/projects/protodatepicker
 * --
 * 
 * Smoothly animating, very configurable and easy to install.
 * No Ajax, pure Javascript. 4 skins available out of the box.
 * 
 * --
 *
 * Requires Prototype 1.6.1+ & Scripty2 2.0.0_a1+
 *
 * --
 * Some Rights Reserved
 * http://creativecommons.org/licenses/by-sa/3.0/
 * 
 */

var DatePicker = Class.create({
	
	//Implements: Options,
	
	// working date, which we will keep modifying to render the calendars
	d: '',
	
	// just so that we need not request it over and over
	today: '',
	
	// current user-choice in date object format
	choice: {}, 
	
	// size of body, used to animate the sliding
	bodysize: {}, 
	
	// to check availability of next/previous buttons
	limit: {}, 
	
	// element references:
	attachTo: null,    // selector for target inputs
	picker: null,      // main datepicker container
	slider: null,      // slider that contains both oldContents and newContents, used to animate between 2 different views
	oldContents: null, // used in animating from-view to new-view
	newContents: null, // used in animating from-view to new-view
	input: null,       // original input element (used for input/output)
	visual: null,      // visible input (used for rendering)
	
	options: { 
		pickerClass: 'datepicker',
		days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
		dayShort: 2,
		monthShort: 3,
		startDay: 1, // Sunday (0) through Saturday (6) - be aware that this may affect your layout, since the days on the right might have a different margin
		timePicker: false,
		timePickerOnly: false,
		yearPicker: true,
		yearsPerPage: 20,
		format: 'd-m-Y',
		allowEmpty: false,
		inputOutputFormat: 'U', // default to unix timestamp
		animationDuration: 0.2,	// Default Scripty2 duration, this speed is based on the value Mac OS X uses for interface effects.
		useFadeInOut: !Prototype.Browser.IE, // dont animate fade-in/fade-out for IE
		startView: 'month', // allowed values: {time, month, year, decades}
		positionOffset: { x: 0, y: 0 },
		minDate: null, // { date: '[date-string]', format: '[date-string-interpretation-format]' }
		maxDate: null, // same as minDate
		debug: false,
		toggleElements: null,
		
		// and some event hooks:
		onShow: Prototype.emptyFunction,   // triggered when the datepicker pops up
		onClose: Prototype.emptyFunction,  // triggered after the datepicker is closed (destroyed)
		onSelect: Prototype.emptyFunction  // triggered when a date is selected
	},
	
	initialize: function(attachTo, options) {
		this.attachTo = attachTo;
		//this.setOptions(options).attach();
		Object.extend(this.options, options || { });
		this.attach();
		if (this.options.timePickerOnly) {
			this.options.timePicker = true;
			this.options.startView = 'time';
		}
		this.formatMinMaxDates();
		//document.addEvent('mousedown', this.close.bind(this));
		document.observe("mousedown", this.close.bind(this));
	},
	
	formatMinMaxDates: function() {
		if (this.options.minDate && this.options.minDate.format) {
			this.options.minDate = this.unformat(this.options.minDate.date, this.options.minDate.format);
		}
		if (this.options.maxDate && this.options.maxDate.format) {
			this.options.maxDate = this.unformat(this.options.maxDate.date, this.options.maxDate.format);
			this.options.maxDate.setHours(23);
			this.options.maxDate.setMinutes(59);
			this.options.maxDate.setSeconds(59);
		}
	},
	
	attach: function() {
		// toggle the datepicker through a separate element?
		//if ($chk(this.options.toggleElements)) {
		if(this.options.toggleElements || this.options.toggleElements === 0) {
			var togglers = $$(this.options.toggleElements);
			document.observe('keydown', function(e) {
				if (e.keyCode == Event.KEY_TAB) {
					this.close(null, true);
				}
			}.bind(this));
		};
		
		// attach functionality to the inputs		
		$$(this.attachTo).each(function(item, index) {
			
			// never double attach
			if (item.getStorage().datepicker) return;
			
			// determine starting value(s)
			if ($F(item) || $F(item) === 0) {
				var init_clone_val = this.format(new Date(this.unformat($F(item), this.options.inputOutputFormat)), this.options.format);
			} else if (!this.options.allowEmpty) {
				var init_clone_val = this.format(new Date(), this.options.format);
			} else {
				var init_clone_val = '';
			}
			
			// create clone
			var display = item.getStyle('display');
			var clone = item
			.setStyle({ display: this.options.debug ? display : 'none' })
			.store('datepicker', true) // to prevent double attachment...
			.clone()
			.store('datepicker', true) // ...even for the clone (!)
			.writeAttribute('name', false)    // secure clean (form)submission
			.writeAttribute("id", false)		// secure uniq identifier
			.setStyle({ display: display })
			.writeAttribute('value', init_clone_val);
			item.insert({ after: clone });
			
			// events
			if (this.options.toggleElements || this.options.toggleElements === 0) {
				togglers[index]
					.setStyle({ cursor: 'pointer' })
					.observe('click', function(e) {
						this.onFocus(item, clone);
					}.bind(this));
				clone.observe('blur', function() {
					item.set('value', clone.get('value'));
				});
			} else {
				clone.observe('keydown', function(e) {
					if (this.options.allowEmpty && (e.key == "delete" || e.key == "backspace")) {
						item.set('value', '');
						e.target.set('value', '');
						this.close(null, true);
					} else if (e.key == "tab") {
						this.close(null, true);
					} else {
						e.stop();
					}
				}.bind(this))
				.observe('focus', function(e) {
					this.onFocus(item, clone);
				}.bind(this));
			}
		}.bind(this));
	},
	
	onFocus: function(original_input, visual_input) {
		var init_visual_date, offset = visual_input.cumulativeOffset(), dim = visual_input.getDimensions();
		
		if ($F(original_input) || $F(original_input) === 0) {
			init_visual_date = this.unformat($F(original_input), this.options.inputOutputFormat).valueOf();
		} else {
			init_visual_date = new Date();
			if ( (this.options.maxDate || this.options.maxDate === 0) && init_visual_date.valueOf() > this.options.maxDate.valueOf()) {
				init_visual_date = new Date(this.options.maxDate.valueOf());
			}
			if ( (this.options.minDate || this.options.minDate === 0) && init_visual_date.valueOf() < this.options.minDate.valueOf()) {
				init_visual_date = new Date(this.options.minDate.valueOf());
			}
		}
		
		this.show({ left: (offset.left + this.options.positionOffset.x)+"px", top: (offset.top + dim.height + this.options.positionOffset.y)+"px" }, init_visual_date);
		this.input = original_input;
		this.visual = visual_input;
		this.options.onShow();
	},
	
	dateToObject: function(d) {
		return {
			year: d.getFullYear(),
			month: d.getMonth(),
			day: d.getDate(),
			hours: d.getHours(),
			minutes: d.getMinutes(),
			seconds: d.getSeconds()
		};
	},
	
	dateFromObject: function(values) {
		var d = new Date();
		d.setDate(1);
		['year', 'month', 'day', 'hours', 'minutes', 'seconds'].each(function(type) {
			var v = values[type];
			if (!(v || v === 0)) return;
			switch (type) {
				case 'day': d.setDate(v); break;
				case 'month': d.setMonth(v); break;
				case 'year': d.setFullYear(v); break;
				case 'hours': d.setHours(v); break;
				case 'minutes': d.setMinutes(v); break;
				case 'seconds': d.setSeconds(v); break;
			}
		});
		return d;
	},
	
	show: function(position, timestamp) {
		this.formatMinMaxDates();
		if (timestamp || timestamp === 0) {
			this.d = new Date(timestamp);
		} else {
			this.d = new Date();
		}
		this.today = new Date();
		this.choice = this.dateToObject(this.d);
		this.mode = (this.options.startView == 'time' && !this.options.timePicker) ? 'month' : this.options.startView;
		this.render();
		this.picker.setStyle(position);
	},
	
	render: function(fx) {
		if (!(this.picker || this.picker === 0)) {
			this.constructPicker();
		} else {
			// swap contents so we can fill the newContents again and animate
			var o = this.oldContents;
			this.oldContents = this.newContents;
			this.newContents = o;
			this.newContents.update();
		this.oldContents.setStyle({ visibility: "hidden" });
		this.newContents.setStyle({ visibility: "visible" });
		}
		
		// remember current working date
		var startDate = new Date(this.d.getTime());
		
		// intially assume both left and right are allowed
		this.limit = { right: false, left: false };
		
		// render! booty!
		if (this.mode == 'decades') {
			this.renderDecades();
		} else if (this.mode == 'year') {
			this.renderYear();
		} else if (this.mode == 'time') {
			this.renderTime();
			this.limit = { right: true, left: true }; // no left/right in timeview
		} else {
			this.renderMonth();
		}
		
		this.picker.down('.previous').setStyle({ visibility: this.limit.left ? 'hidden' : 'visible' });
		this.picker.down('.next').setStyle({ visibility: this.limit.right ? 'hidden' : 'visible' });
		this.picker.down('.titleText').setStyle({ cursor: this.allowZoomOut() ? 'pointer' : 'default' });
		
		// restore working date
		this.d = startDate;
		
		// if ever the opacity is set to '0' it was only to have us fade it in here
		// refer to the constructPicker() function, which instantiates the picker at opacity 0 when fading is desired
		if (this.picker.getStyle('opacity') == 0) {
			//this.picker.tween('opacity', 0, 1);
			this.picker.morph("opacity: 1", { duration: this.options.animationDuration });
		}
		
		// animate
		if (fx || fx === 0) this.fx(fx);
	},
	
	fx: function(fx) {
		if (fx == 'right') {
			this.oldContents.setStyle({ left: "0px", opacity: 1 });
			this.newContents.setStyle({ left: this.bodysize.width+"px", opacity: 1 });
			this.slider.setStyle({ left: "0px" }).morph('left: '+(-this.bodysize.width)+"px", { duration: this.options.animationDuration, transition: "easeInOutExpo" });
		} else if (fx == 'left') {
			this.oldContents.setStyle({ left: this.bodysize.width+"px", opacity: 1 });
			this.newContents.setStyle({ left: "0px", opacity: 1 });
			this.slider.setStyle({ left: (-this.bodysize.width)+"px" }).morph('left: 0px', { duration: this.options.animationDuration, transition: "easeInOutExpo" });
		} else if (fx == 'fade') {
			this.slider.setStyle({ left: "0px" });
			//this.oldContents.setStyle('left', 0).set('tween', { duration: this.options.animationDuration / 2 }).tween('opacity', 1, 0);
			this.oldContents.setStyle({ left: "0px" }).morph("opacity: 0", { duration: (this.options.animationDuration / 2) });
			//this.newContents.setStyle({ opacity: 0, left: 0}).set('tween', { duration: this.options.animationDuration }).tween('opacity', 0, 1);
			this.newContents.setStyle({ opacity: 0, left: "0px"}).morph("opacity: 1", { duration: this.options.animationDuration });
		}
	},
	
	constructPicker: function() {
		this.picker = new Element('div', { 'class': this.options.pickerClass });
		document.body.insert(this.picker);
		if (this.options.useFadeInOut) {
			//this.picker.setStyle('opacity', 0).set('tween', { duration: this.options.animationDuration });
			this.picker.setStyle({ opacity: 0 }).morph("opacity: 1", { duration: this.options.animationDuration });
		}
		
		var h = new Element('div', { 'class': 'header' });
		this.picker.insert(h);
		var titlecontainer = new Element('div', { 'class': 'title' });
		h.insert(titlecontainer);
		h.insert(new Element('div', { 'class': 'previous' }).observe('click', this.previous.bind(this)).update('«'));
		h.insert(new Element('div', { 'class': 'next' }).observe('click', this.next.bind(this)).update('»'));
		h.insert(new Element('div', { 'class': 'closeButton' }).observe('click', this.close.bindAsEventListener(this, true)).update('x'));
		titlecontainer.insert(new Element('span', { 'class': 'titleText' }).observe('click', this.zoomOut.bind(this)));
		
		var b = new Element('div', { 'class': 'body' });
		this.picker.insert(b);
		//this.bodysize = b.getSize();
		this.bodysize = b.getDimensions();
		this.slider = new Element('div').setStyle({ position: 'absolute', top: 0, left: "0px", width: (2 * this.bodysize.width)+"px", height: this.bodysize.height+"px" });
		//.set('tween', { duration: this.options.animationDuration, transition: Fx.Transitions.Quad.easeInOut })
		//.inject(b);
		b.insert(this.slider);
		this.oldContents = new Element('div').setStyle({ position: 'absolute', top: 0, left: this.bodysize.width+"px", width: this.bodysize.width+"px", height: this.bodysize.height+"px" });
		this.slider.insert(this.oldContents);
		this.newContents = new Element('div').setStyle({ position: 'absolute', top: 0, left: "0px", width: this.bodysize.width+"px", height: this.bodysize.height+"px" });
		this.slider.insert(this.newContents);
	},
	
	renderTime: function() {
		var container = new Element('div', { 'class': 'time' });
		this.newContents.insert(container);
		
		if (this.options.timePickerOnly) {
			this.picker.down('.titleText').update('Select a time');
		} else {
			this.picker.down('.titleText').update(this.format(this.d, 'j M, Y'));
		}
		
		container.insert(new Element('input', { type: 'text', 'class': 'hour' })
			.writeAttribute('value', this.leadZero(this.d.getHours()))
			.observe("mousewheel", function(e) {
				var i = e.element(), v = parseInt($F(i), 10);
				i.focus();
				if (e.wheel > 0) {
					v = (v < 23) ? v + 1 : 0;
				} else {
					v = (v > 0) ? v - 1 : 23;
				}
				i.writeAttribute('value', this.leadZero(v));
				e.stop();
			}.bind(this))
			.writeAttribute('maxlength', 2)
		);
			
		container.insert(new Element('input', { type: 'text', 'class': 'minutes' })
			.writeAttribute('value', this.leadZero(this.d.getMinutes()))
			.observe("mousewheel", function(e) {
				var i = e.element(), v = parseInt($F(i), 10);
				i.focus();
				if (e.wheel > 0) {
					v = (v < 59) ? v + 1 : 0;
				} else {
					v = (v > 0) ? v - 1 : 59;
				}
				i.writeAttribute('value', this.leadZero(v));
				e.stop();
			}.bind(this))
			.writeAttribute('maxlength', 2)
		);
		
		container.insert(new Element('div', { 'class': 'separator' }).update(':'));
		
		container.insert(new Element('input', { type: 'submit', value: 'OK', 'class': 'ok' })
			.observe("click", function(e) {
				e.stop();
				//this.select($merge(this.dateToObject(this.d), { hours: this.picker.getElement('.hour').get('value').toInt(), minutes: $F(this.picker.down('.minutes')).toInt() }));
				this.select(Object.extend(this.dateToObject(this.d), { hours: parseInt($F(this.picker.down('.hour')), 10), minutes: parseInt($F(this.picker.down('.minutes')), 10) }));
			}.bind(this))
			.writeAttribute('maxlength', 2)
		);
	},
	
	renderMonth: function() {
		var month = this.d.getMonth();
		
		this.picker.down('.titleText').update(this.options.months[month] + ' ' + this.d.getFullYear());
		
		this.d.setDate(1);
		while (this.d.getDay() != this.options.startDay) {
			this.d.setDate(this.d.getDate() - 1);
		}
		
		var container = new Element('div', { 'class': 'days' });
		this.newContents.insert(container);
		var titles = new Element('div', { 'class': 'titles' });
		container.insert(titles);
		var d, i, classes, e, weekcontainer;

		for (d = this.options.startDay; d < (this.options.startDay + 7); d++) {
			titles.insert(new Element('div', { 'class': 'title day day' + (d % 7) }).update(this.options.days[(d % 7)].substring(0,this.options.dayShort)));
		}
		
		var available = false;
		var t = this.today.toDateString();
		var currentChoice = this.dateFromObject(this.choice).toDateString();
		
		for (i = 0; i < 42; i++) {
			classes = [];
			classes.push('day');
			classes.push('day'+this.d.getDay());
			if (this.d.toDateString() == t) classes.push('today');
			if (this.d.toDateString() == currentChoice) classes.push('selected');
			if (this.d.getMonth() != month) classes.push('otherMonth');
			
			if (i % 7 == 0) {
				weekcontainer = new Element('div', { 'class': 'week week'+(Math.floor(i/7)) });
				container.insert(weekcontainer);
			}
			
			e = new Element('div', { 'class': classes.join(' ') }).update(this.d.getDate());
			weekcontainer.insert(e);
			if (this.limited('date')) {
				e.addClassName('unavailable');
				if (available) {
					this.limit.right = true;
				} else if (this.d.getMonth() == month) {
					this.limit.left = true;
				}
			} else {
				available = true;
				e.observe('click', function(e, d) {
					if (this.options.timePicker) {
						this.d.setDate(d.day);
						this.d.setMonth(d.month);
						this.mode = 'time';
						this.render('fade');
					} else {
						this.select(d);
					}
				}.bindAsEventListener(this, { day: this.d.getDate(), month: this.d.getMonth(), year: this.d.getFullYear() }));
			}
			this.d.setDate(this.d.getDate() + 1);
		}
		if (!available) this.limit.right = true;
	},
	
	renderYear: function() {
		var month = this.today.getMonth();
		var thisyear = this.d.getFullYear() == this.today.getFullYear();
		var selectedyear = this.d.getFullYear() == this.choice.year;
		
		this.picker.down('.titleText').update(this.d.getFullYear());
		this.d.setMonth(0);
		
		var i, e;
		var available = false;
		var container = new Element('div', { 'class': 'months' });
		this.newContents.insert(container);
		
		for (i = 0; i <= 11; i++) {
			e = new Element('div', { 'class': 'month month'+(i+1)+(i == month && thisyear ? ' today' : '')+(i == this.choice.month && selectedyear ? ' selected' : '') })
			.update(this.options.monthShort ? this.options.months[i].substring(0, this.options.monthShort) : this.options.months[i]);
			container.insert(e);
			
			if (this.limited('month')) {
				e.addClassName('unavailable');
				if (available) {
					this.limit.right = true;
				} else {
					this.limit.left = true;
				}
			} else {
				available = true;
				e.observe('click', function(e, d) {
					this.d.setDate(1);
					this.d.setMonth(d);
					this.mode = 'month';
					this.render('fade');
				}.bindAsEventListener(this, i));
			}
			this.d.setMonth(i);
		}
		if (!available) this.limit.right = true;
	},
	
	renderDecades: function() {
		// start neatly at interval (eg. 1980 instead of 1987)
		while (this.d.getFullYear() % this.options.yearsPerPage > 0) {
			this.d.setFullYear(this.d.getFullYear() - 1);
		}

		this.picker.down('.titleText').update(this.d.getFullYear() + '-' + (this.d.getFullYear() + this.options.yearsPerPage - 1));
		
		var i, y, e;
		var available = false;
		var container = new Element('div', { 'class': 'years' });
		this.newContents.insert(container);
		
		if ((this.options.minDate || this.options.minDate === 0) && this.d.getFullYear() <= this.options.minDate.getFullYear()) {
			this.limit.left = true;
		}
		
		for (i = 0; i < this.options.yearsPerPage; i++) {
			y = this.d.getFullYear();
			e = new Element('div', { 'class': 'year year' + i + (y == this.today.getFullYear() ? ' today' : '') + (y == this.choice.year ? ' selected' : '') }).update(y);
			container.insert(e);
			
			if (this.limited('year')) {
				e.addClassName('unavailable');
				if (available) {
					this.limit.right = true;
				} else {
					this.limit.left = true;
				}
			} else {
				available = true;
				e.observe('click', function(e, d) {
					this.d.setFullYear(d);
					this.mode = 'year';
					this.render('fade');
				}.bindAsEventListener(this, y));
			}
			this.d.setFullYear(this.d.getFullYear() + 1);
		}
		if (!available) {
			this.limit.right = true;
		}
		if ((this.options.maxDate || this.options.maxDate === 0) && this.d.getFullYear() >= this.options.maxDate.getFullYear()) {
			this.limit.right = true;
		}
	},
	
	limited: function(type) {
		var cs = (this.options.minDate || this.options.minDate === 0);
		var ce = (this.options.maxDate || this.options.maxDate === 0);
		if (!cs && !ce) return false;
		
		switch (type) {
			case 'year':
				return (cs && this.d.getFullYear() < this.options.minDate.getFullYear()) || (ce && this.d.getFullYear() > this.options.maxDate.getFullYear());
				
			case 'month':
				// todo: there has got to be an easier way...?
				var ms = parseInt(('' + this.d.getFullYear() + this.leadZero(this.d.getMonth())), 10);
				return cs && ms < parseInt(('' + this.options.minDate.getFullYear() + this.leadZero(this.options.minDate.getMonth())), 10)
					|| ce && ms > parseInt(('' + this.options.maxDate.getFullYear() + this.leadZero(this.options.maxDate.getMonth())), 10)
				
			case 'date':
				return (cs && this.d < this.options.minDate) || (ce && this.d > this.options.maxDate);
		}
	},
	
	allowZoomOut: function() {
		if (this.mode == 'time' && this.options.timePickerOnly) return false;
		if (this.mode == 'decades') return false;
		if (this.mode == 'year' && !this.options.yearPicker) return false;
		return true;
	},
	
	zoomOut: function() {
		if (!this.allowZoomOut()) return;
		if (this.mode == 'year') {
			this.mode = 'decades';
		} else if (this.mode == 'time') {
			this.mode = 'month';
		} else {
			this.mode = 'year';
		}
		this.render('fade');
	},
	
	previous: function() {
		if (this.mode == 'decades') {
			this.d.setFullYear(this.d.getFullYear() - this.options.yearsPerPage);
		} else if (this.mode == 'year') {
			this.d.setFullYear(this.d.getFullYear() - 1);
		} else if (this.mode == 'month') {
			this.d.setMonth(this.d.getMonth() - 1);
		}
		this.render('left');
	},
	
	next: function() {
		if (this.mode == 'decades') {
			this.d.setFullYear(this.d.getFullYear() + this.options.yearsPerPage);
		} else if (this.mode == 'year') {
			this.d.setFullYear(this.d.getFullYear() + 1);
		} else if (this.mode == 'month') {
			this.d.setMonth(this.d.getMonth() + 1);
		}
		this.render('right');
	},
	
	close: function(e, force) {
		if (!$(this.picker)) return;
		var clickOutside = ((e || e === 0) && e.element() != this.picker && !e.element().descendantOf(this.picker) && e.element() != this.visual);
		if (force || clickOutside) {
			if (this.options.useFadeInOut) {
				//this.picker.set('tween', { duration: this.options.animationDuration / 2, onComplete: this.destroy.bind(this) }).tween('opacity', 1, 0);
				this.picker.morph("opacity: 0", { duration: this.options.animationDuration / 2, after: this.destroy.bind(this) });
			} else {
				this.destroy();
			}
		}
	},
	
	destroy: function() {
		this.picker.remove();
		this.picker = null;
		this.options.onClose();
	},
	
	select: function(values) {
		this.choice = Object.extend(this.choice, values);
		var d = this.dateFromObject(this.choice);
		this.input.writeAttribute('value', this.format(d, this.options.inputOutputFormat));
		this.visual.writeAttribute('value', this.format(d, this.options.format));
		this.options.onSelect(d);
		this.close(null, true);
	},
	
	leadZero: function(v) {
		return v < 10 ? '0'+v : v;
	},
	
	format: function(t, format) {
		var f = '';
		var h = t.getHours();
		var m = t.getMonth();
		
		for (var i = 0; i < format.length; i++) {
			switch(format.charAt(i)) {
				case '\\': i++; f+= format.charAt(i); break;
				case 'y': f += (100 + t.getYear() + '').substring(1); break
				case 'Y': f += t.getFullYear(); break;
				case 'm': f += this.leadZero(m + 1); break;
				case 'n': f += (m + 1); break;
				case 'M': f += this.options.months[m].substring(0,this.options.monthShort); break;
				case 'F': f += this.options.months[m]; break;
				case 'd': f += this.leadZero(t.getDate()); break;
				case 'j': f += t.getDate(); break;
				case 'D': f += this.options.days[t.getDay()].substring(0,this.options.dayShort); break;
				case 'l': f += this.options.days[t.getDay()]; break;
				case 'G': f += h; break;
				case 'H': f += this.leadZero(h); break;
				case 'g': f += (h % 12 ? h % 12 : 12); break;
				case 'h': f += this.leadZero(h % 12 ? h % 12 : 12); break;
				case 'a': f += (h > 11 ? 'pm' : 'am'); break;
				case 'A': f += (h > 11 ? 'PM' : 'AM'); break;
				case 'i': f += this.leadZero(t.getMinutes()); break;
				case 's': f += this.leadZero(t.getSeconds()); break;
				case 'U': f += Math.floor(t.valueOf() / 1000); break;
				default:  f += format.charAt(i);
			}
		}
		return f;
	},
	
	unformat: function(t, format) {
		var d = new Date();
		var a = {};
		var c, m;
		t = t.toString();
		
		for (var i = 0; i < format.length; i++) {
			c = format.charAt(i);
			switch(c) {
				case '\\': r = null; i++; break;
				case 'y': r = '[0-9]{2}'; break;
				case 'Y': r = '[0-9]{4}'; break;
				case 'm': r = '0[1-9]|1[012]'; break;
				case 'n': r = '[1-9]|1[012]'; break;
				case 'M': r = '[A-Za-z]{'+this.options.monthShort+'}'; break;
				case 'F': r = '[A-Za-z]+'; break;
				case 'd': r = '0[1-9]|[12][0-9]|3[01]'; break;
				case 'j': r = '[1-9]|[12][0-9]|3[01]'; break;
				case 'D': r = '[A-Za-z]{'+this.options.dayShort+'}'; break;
				case 'l': r = '[A-Za-z]+'; break;
				case 'G': 
				case 'H': 
				case 'g': 
				case 'h': r = '[0-9]{1,2}'; break;
				case 'a': r = '(am|pm)'; break;
				case 'A': r = '(AM|PM)'; break;
				case 'i': 
				case 's': r = '[012345][0-9]'; break;
				case 'U': r = '-?[0-9]+$'; break;
				default:  r = null;
			}
			
			if (r || r === 0) {
				m = t.match('^'+r);
				if (m || m === 0) {
					a[c] = m[0];
					t = t.substring(a[c].length);
				} else {
					if (this.options.debug) alert("Fatal Error in DatePicker\n\nUnexpected format at: '"+t+"' expected format character '"+c+"' (pattern '"+r+"')");
					return d;
				}
			} else {
				t = t.substring(1);
			}
		}
		
		for (c in a) {
			var v = a[c];
			switch(c) {
				case 'y': d.setFullYear(v < 30 ? 2000 + parseInt(v, 10) : 1900 + parseInt(v, 10)); break; // assume between 1930 - 2029
				case 'Y': d.setFullYear(v); break;
				case 'm':
				case 'n': d.setMonth(v - 1); break;
				// FALL THROUGH NOTICE! "M" has no break, because "v" now is the full month (eg. 'February'), which will work with the next format "F":
				case 'M': v = this.options.months.filter(function(item, index) { return item.substring(0,this.options.monthShort) == v }.bind(this))[0];
				case 'F': d.setMonth(this.options.months.indexOf(v)); break;
				case 'd':
				case 'j': d.setDate(v); break;
				case 'G': 
				case 'H': d.setHours(v); break;
				case 'g': 
				case 'h': if (a['a'] == 'pm' || a['A'] == 'PM') { d.setHours(v == 12 ? 0 : parseInt(v, 10) + 12); } else { d.setHours(v); } break;
				case 'i': d.setMinutes(v); break;
				case 's': d.setSeconds(v); break;
				case 'U': d = new Date(parseInt(v, 10) * 1000);
			}
		};
		
		return d;
	}
});