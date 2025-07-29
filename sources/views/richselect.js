import {protoUI, $$} from "../ui/core";
import {$active} from "../webix/skin";
import {isUndefined} from "../webix/helpers";
import {assert} from "../webix/debug";
import {preventEvent} from "../webix/html";

import text from "./text";


const api = {
	name:"richselect",
	defaults:{
		template:function(obj,common){
			return common._render_div_block(obj, common);
		},
		popupWidth:200,
		icon: "wxi-menu-down"
	},
	$onBlur:function(){
		const text = this.getText();
		if (this._settings.text == text || (isUndefined(this._settings.text) && !text))
			return;

		const suggest = this.getPopup();
		//handle clicks on suggest items
		if (suggest.$view.contains(document.activeElement)) 
			return;

		const newValues = this.config.newValues;
		const nodeValue = this.getInputNode().value;
		const list = this.getList();

		let value;
		if(newValues){
			value = list.find(obj => suggest.getItemText(obj.id) == nodeValue, true);
			if(value)
				value = value.id;
			else if(nodeValue)
				value = list.add({ value:nodeValue });
		}
		else
			value = suggest.getSuggestion(nodeValue);

		const oldvalue = this.getValue();

		//non-empty value that differs from old value and matches filtering rule
		if (value && value!=oldvalue && !(nodeValue==="" && suggest.getItemText(value)!==""))
			this.setValue(value, "user");
		else if (nodeValue === "")
			this.setValue("", "user");
		else if (this._revertValue)
			this._revertValue();
	},
	suggest_setter:function(value, prop, config){
		return this.options_setter(value, prop, config);
	},
	options_setter:function(value, prop, config){
		if (this._settings.suggest) $$(this._settings.suggest).destructor();
		// optionWidth may not be accessible yet at this point due to how the settings are applied
		if (!this._settings.optionWidth && (config && config.optionWidth)) this.define("optionWidth", config.optionWidth);

		value = this._suggest_config ? this._suggest_config(value, config) : value;

		const suggest = (this._settings.popup = this._settings.options = this._settings.suggest = text.api.suggest_setter.call(this, value));
		const list = $$(suggest).getList();
		if (list)
			list.attachEvent("onAfterLoad", () => this._reset_value());

		return suggest;
	},
	getList: function(){
		var suggest = $$(this._settings.suggest);
		assert(suggest, "Input doesn't have a list");
		return suggest.getList();
	},
	_reset_value:function(){
		const value = this._settings.value;
		if(value){
			// update value only for unchanged input
			if(this.getInputNode() && (this._settings.text === this.getText() || isUndefined(this._settings.text)))
				this.$setValue(value);
			if(this.getPopup().isVisible())
				this.getPopup()._show_selection();
		}
	},
	$skin:function(){
		text.api.$skin.call(this);

		this.defaults.inputPadding = $active.inputPadding;
	},
	$render:function(obj){
		this.$setValue(obj.value);
	},
	getInputNode: function(){
		return this._dataobj.getElementsByTagName("DIV")[1];
	},
	getPopup: function(){
		return $$(this._settings.popup);
	},
	getText:function(){
		var value = this._settings.value,
			node = this.getInputNode();
		if(!node)
			return value?this.getPopup().getItemText(value):"";
		if (isUndefined(node.value)){
			if (node.firstChild && node.firstChild.className === "webix_placeholder")
				return "";
			return node.innerHTML;
		}
		return node.value;
	},
	$prepareValue:function(value){
		if (value && value.id)
			return value;			//don't convert new items

		return text.api.$prepareValue.call(this, value);
	},
	$setValue:function(value){
		let text = value;

		const popup = this.getPopup();
		if (popup)
			text = popup.getItemText(value);

		if (value && value.id){ //add new value
			const list = popup.getList();
			const exists = list.exists(value.id);

			// add new item only when item with such id doesn't exists yet
			if (!exists) list.add(value);

			text = popup.getItemText(value.id);

			// in case of dynamic list, we can't add extra items
			// to not interfere with dynamic loading
			if (list._settings.dynamic && !exists)
				list.remove(value.id);

			this._settings.value = this.$prepareValue(value.id);
		}

		const node = this.getInputNode();
		if (isUndefined(node.value))
			node.innerHTML = text || this._get_div_placeholder();
		else 
			node.value = text = text.replace(/<[^>]*>/g,"");

		this._settings.text = text;
		this._toggleClearIcon(text);
	},
	getValue:function(){
		return this._settings.value||"";
	},
	_ignoreLabelClick:function(ev){
		if (ev.type) {
			this.focus();
			preventEvent(ev);
		}
	}
};

const view = protoUI(api, text.view);
export default {api, view};