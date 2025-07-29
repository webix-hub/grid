import slider from "../views/slider";
import {offset} from "../webix/html";
import {protoUI} from "../ui/core";
import {uid, isArray, isUndefined} from "../webix/helpers";


// #include ui/slider.js

const api = {
	name:"rangeslider",
	$cssName:"slider webix_rangeslider",
	defaults:{
		separator: ",",
		min: 0,
		max: 100,
		value: [20,80],
		template:function(obj, common){
			var id = "x" + uid();
			common._handle_id = [id+"_0",id+"_1"];

			var aria = "role='slider' aria-label='"+obj.label+(obj.title?(" "+obj.title(obj)):"")+"' aria-valuemax='"+obj.max+"' aria-valuemin='"+obj.min+"' tabindex='0'";
			var handles = "<div class='webix_slider_handle webix_slider_handle_0' "+/*@attr*/"webix_disable_drag"+"='true' id='"+common._handle_id[0]+"' "+aria+" aria-valuenow='"+obj.value[0]+"'>&nbsp;</div>";
			handles += "<div class='webix_slider_handle webix_slider_handle_1' "+/*@attr*/"webix_disable_drag"+"='true' id='"+common._handle_id[1]+"' "+aria+" aria-valuenow='"+obj.value[1]+"'>&nbsp;</div>";

			var title = "<div class='webix_slider_title"+(obj.moveTitle?" webix_slider_move":"")+"'"+(!obj.moveTitle && obj.vertical?(" style='line-height:"+(obj.aheight-common._sliderPadding-obj.inputPadding*2)+"px;'"):"")+">&nbsp;</div>";
			if(obj.moveTitle)
				title = "<div class='webix_slider_title_box'>"+(title+title)+"</div>";
			
			var parts = "<div class='webix_slider_right'>&nbsp;</div><div class='webix_slider_left'></div>";
			var html = "";
			if(obj.vertical) html = "<div class='webix_slider_box'>"+parts+handles+"</div>"+title;
			else html = title+"<div class='webix_slider_box'>"+parts+handles+"</div>";
			return common.$renderInput(obj, html, id);
		}
	},
	$prepareValue:function(value){
		const min = this._settings.min;

		if(!isArray(value)){
			value = (value||"").toString().split(this._settings.separator);
		}

		value[0] = parseFloat(value[0]);
		value[0] = isNaN(value[0]) ? min : this._safeValue(value[0]);

		if(value.length < 2)
			value[1] = value[0];
		else{
			value[1] = parseFloat(value[1]);
			value[1] = isNaN(value[1]) ? value[0] : this._safeValue(value[1]);
		}
		if(value[0]>value[1]) [value[0], value[1]] = [value[1], value[0]];
		return value;
	},
	_get_slider_handle:function(index){
		index = index && index>=0?index:0;
		return this.$view.querySelector(".webix_slider_handle_"+(index||0));
	},
	_get_left_pos: function(size,index){
		var config, max, value;

		config = this._settings;
		max = config.max - config.min;
		value = config.value[index]%config.step?(Math.round(config.value[index]/config.step)*config.step):config.value[index];
		value =  this._safeValue(value);
		return Math.ceil((size - this._sliderPadding*2) * (value-config.min) / max);
	},
	_set_left_pos:function(size, left, vertical){
		var pos = this._sliderPadding + left - (this._sliderHandleWidth / 2 *(vertical?-1:1));
		pos = vertical? size-pos:pos;
		return pos+"px";
	},
	_set_value_pos:function(size, left, length, vertical){
		var pos = left+this._sliderPadding + 2 * this._sliderBorder;
		if(vertical) pos = size-pos-length;
		return pos + "px";
	},
	_set_inner_size:function(){
		var config, handle0, handle1,
			left0, left1, max, length, parentBox,
			sizeStr, size, cornerStr;

		handle0 =this._get_slider_handle(0);
		handle1 = this._get_slider_handle(1);
		config = this._settings;

		if(!isArray(config.value)){
			this.define("value", config.value);
		}

		if (handle0){
			sizeStr = config.vertical?"height":"width";
			cornerStr = config.vertical?"top":"left";
			
			size = config.vertical?this._content_height:this._get_input_width(config);
			max = size - this._sliderPadding * 2 - 2 * this._sliderBorder;
			
			left0 = this._get_left_pos(size, 0);
			left1 = this._get_left_pos(size, 1);
			length = left1 - left0;

			handle0.style[cornerStr] = this._set_left_pos(size, left0, config.vertical);
			handle1.style[cornerStr] = this._set_left_pos(size, left1, config.vertical);
			
			parentBox = handle0.parentNode;
			parentBox.style[sizeStr] = size+"px";
			parentBox.firstChild.style[sizeStr] = max + "px";
			parentBox.childNodes[1].style[sizeStr] = length + "px";
			parentBox.childNodes[1].style[cornerStr] = this._set_value_pos(size, left0, length, config.vertical);

			this._set_title(handle0, [left0, left1], max, cornerStr);
		}
	},
	_title_hidden:0,
	_hide_title:function(title, index){
		if(!isUndefined(this._title_hidden))
			title[this._title_hidden].style.visibility = "visible";
		if(!isUndefined(index)){
			title[index].style.visibility = "hidden";
			this._title_hidden = index;
		}
	},
	_set_title:function(handle0, left, max, cornerStr){
		var config = this._settings;
		if (this._settings.title){
			var box = handle0.parentNode;
			var sibling = config.vertical?"nextSibling":"previousSibling";

			if(!config.moveTitle)
				box[sibling].innerHTML = this._settings.title(this._settings, this);
			else{ //two independent titles
				var title = box[sibling].childNodes;
				var pos = [];
				for(let i = 0; i<2; i++)
					pos.push(this._set_title_n(title[i], config.value[i], left[i], max, cornerStr, i));

				//correct for overlapping titles
				var diff = config.vertical? (pos[0]-pos[1]-this._sliderHandleWidth) : (pos[1]-pos[0]);
				var sizeStr  = config.vertical?"clientHeight":"clientWidth";

				

				if(title[0][sizeStr]/2+title[1][sizeStr]/2 > diff)
					this._hide_title(title, isUndefined(this._activeIndex) ? 0 : (this._activeIndex ? 0 : 1));
				else
					this._hide_title(title);

				//set position
				for(let i = 0; i<2; i++)
					title[i].style[cornerStr] = pos[i]+ "px";
			}
		}
	},
	_set_title_n:function(title, value, left, max, cornerStr, index){
		title.innerHTML = this._settings.title({value:value}, this);
		var half = title.clientWidth/2;
		var pos = 0;
		
		if(this._settings.vertical)
			pos = max-left-this._sliderHandleWidth/2-(index?this._sliderPadding:0)+2 * this._sliderBorder;
		else{
			pos = left + this._sliderHandleWidth/2 + 2*this._sliderBorder - half;
			pos = (half>left) ? (half-left+pos): pos;//left/top text is to small
			pos = (index && half+left>max)?(pos-half+(max-left)):pos;//right/bottom text is too large
		}
		return pos;
	},
	_set_value_now:function(){
		for(var i=0; i<2; i++){
			this._get_slider_handle(i).setAttribute("aria-valuenow", this._settings.value[i]);
		}
	},
	_mouse_down_process: function(e){
		var trg = e.target;
		var match =  /webix_slider_handle_(\d)/.exec(trg.className);
		this._activeIndex = match?parseInt(match[1],10):-1;

		if(match)
			this._set_handle_active(this._activeIndex);
	},
	$compareValue:function(oldvalue, value){
		value = this.$prepareValue(value);
		return oldvalue[0] === value[0] && oldvalue[1] === value[1];
	},
	$getValue:function(){
		var value = this._settings.value;
		return this._settings.stringResult?value.join(this._settings.separator):value;
	},
	_set_handle_active: function(index){
		var hActive = this._get_slider_handle(index);
		var h = this._get_slider_handle(1-index);
		if(hActive.className.indexOf("webix_slider_active") == -1)
			hActive.className += " webix_slider_active";
		h.className = h.className.replace(" webix_slider_active","");
		hActive.focus();
	},
	_get_value_from_pos:function(pos){
		var config = this._settings;
		var value = config.value;
		//10 - padding of slider box
		var max = config.max - config.min;
		var ax = config.vertical?"y":"x";

		var left = offset(this._get_slider_handle().parentNode)[ax];
		var newvalue = Math.ceil((pos-left) * max / (config.vertical?this._content_height:this._get_input_width(config)));
		newvalue = Math.round((newvalue + 1*config.min)/config.step) * config.step;
		if(config.vertical)
			newvalue = max-newvalue;

		var index = null;
		var pos0 = offset(this._get_slider_handle(0))[ax];
		var pos1 = offset(this._get_slider_handle(1))[ax];

		if(pos0==pos1 && (config.value[0] == config.min || config.value[0] == config.max) ){
			this._activeIndex = index = (config.value[0] == config.min?1:0);
			this._set_handle_active(index);
		}
		else{
			if(this._activeIndex >=0){
				index = this._activeIndex;
			}else{
				if(pos0==pos1){
					index = (pos < pos0?0:1);
				}
				else{
					var dist0 = Math.abs(pos0-pos);
					var dist1 = Math.abs(pos1-pos);
					index = dist0<dist1?0:1;
					this._activeIndex = index;
				}
			}
		}


		if(index){
			value[index] = this._safeValue(newvalue, value[0], config.max);
		}
		else{
			value[index] = this._safeValue(newvalue, config.min, value[1]);
		}

		return value;
	}
};


const view = protoUI(api,  slider.view);
export default {api, view};