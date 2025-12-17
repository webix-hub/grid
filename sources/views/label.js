import {getTextSize} from "../webix/html";
import {protoUI} from "../ui/core";
import {$active} from "../webix/skin";

import button from "../views/button";

const api = {
	name:"label",
	defaults:{
		template:"<div class='webix_el_box' style='width:#awidth#px;height:#aheight#px;line-height:#cheight#px'>#label#</div>"
	},
	$skin:function(){
		button.api.$skin.call(this);

		this.defaults.height = $active.inputHeight;
	},
	focus:function(){ return false; },
	_getBox:function(){
		return this._dataobj.firstChild;
	},
	setHTML:function(html){
		this._settings.label = html;
		this.refresh();
	},
	setValue: function(value){
		this._settings.label = value;
		button.api.setValue.apply(this,arguments);
	},
	$setValue:function(value){
		this._dataobj.firstChild.innerHTML = value;
	},
	$render:function(config){
		if (config.align === "right")
			this._dataobj.firstChild.style.textAlign = "right";
	},
	getInputNode() {
		return this._dataobj.firstChild;
	},
	_set_inner_size:false,
	_set_default_css:function(){},
	_calc_size:function(config){
		config = config || this._settings;
		if (config.autowidth){
			const toolbarCss = this.queryView("toolbar", "parent") ? " webixtoolbarlabel" : "";
			const label = `<div class="webix_el_box ${toolbarCss}">${config.label}</div>`;
			config.width = getTextSize(label, `webix_control webix_el_label ${config.css||""}`).width;
		}
	}
};

const view = protoUI(api, button.view);
export default {api, view};