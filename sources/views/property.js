import base from "../views/view";
import AutoTooltip from "../core/autotooltip";
import EditAbility from "../core/editability";
import MapCollection from "../core/mapcollection";
import MouseEvents from "../core/mouseevents";
import Scrollable from "../core/scrollable";
import SingleRender from "../core/singlerender";
import AtomDataLoader from "../core/atomdataloader";
import EventSystem from "../core/eventsystem";
import {locate, createCss} from "../webix/html";
import {protoUI} from "../ui/core";
import template from "../webix/template";
import {$active} from "../webix/skin";
import {uid, extend, clone, isUndefined} from "../webix/helpers";
import {addCss, removeCss} from "../webix/html";
import RenderStack from "../core/renderstack";
import CodeParser from "../core/codeparser";
import editors from "../webix/editors";

const api = {
	name:"property",
	$init:function(){
		this._contentobj.className+=" webix_property";
		this._contentobj.setAttribute("role", "listbox");
		this._destroy_with_me = [];

		this.attachEvent("onAfterEditStart", function(id){
			var node = this.getItemNode(id);
			addCss(node, "webix_focused");
		});
		this.attachEvent("onAfterEditStop", function(id, editor){
			var node = this.getItemNode(editor.config.id);
			removeCss(node, "webix_focused");
		});

		if (!this.types){
			this.types = { "default" : this.type };
			this.type.name = "default";
		}
		this.type = clone(this.type);
	},
	defaults:{
		nameWidth:100,
		editable:true
	},
	on_render:{
		password: editors.password.masterFormat,
		checkbox:function(value){
			return "<input type='checkbox' class='webix_property_check' "+(value?"checked":"")+">";
		},
		color:function(value){
			const margin = (this.type.height - 20) / 2;
			return "<div class='webix_property_col_ind' style='margin-top:"+margin+"px;background-color:"+(value||"#FFFFFF")+";'></div>" + value;
		}
	},
	on_edit:{
		label:false
	},
	_id:/*@attr*/"webix_f_id",
	on_click:{
		webix_property_check:function(ev){
			const id = this.locate(ev);
			const item = this.getItem(id);
			this.callEvent("onCheck", [id, item.value = !item.value]);
			return false;
		}
	},
	on_dblclick:{
	},
	registerType:function(name, data){
		if (!isUndefined(data.template))
			this.on_render[name] = data.template;
		if (!isUndefined(data.editor))
			this.on_edit[name] = data.editor;
		if (!isUndefined(data.click))
			for (var key in data.click)
				this.on_click[key] = data.click[key];
	},
	elements_setter:function(data){
		this._idToLine = {};
		for(var i =0; i < data.length; i++){
			var line = data[i];
			if (line.type == "multiselect")
				line.optionslist = true;

			//line.type 	= 	line.type||"label";
			line.id 	=	line.id||uid();
			line.label 	=	line.label||"";
			line.value 	=	isUndefined(line.value) ? (line.type == "checkbox" ? false : "") : line.value;
			this._idToLine[line.id] = i;
			this._map_options(data[i]);
		}
		return data;
	},
	showItem:function(id){
		RenderStack.showItem.call(this, id);
	},
	item_setter:function(value){
		return this.type_setter(value);
	},
	type_setter:function(value){
		return RenderStack.type_setter.call(this, value);
	},
	locate:function(){
		return locate(arguments[0], this._id);
	},
	getItemNode:function(id){
		return this._dataobj.childNodes[this._idToLine[id]];
	},
	getItem:function(id){
		return this._settings.elements[this._idToLine[id]];
	},
	_get_editor_type:function(id){
		var type = this.getItem(id).type;
		if (type == "checkbox") return "inline-checkbox";
		var alter_type = this.on_edit[type];
		return (alter_type === false)?false:(alter_type||type);
	},
	_get_edit_config:function(id){
		return this.getItem(id);
	},
	_find_cell_next:function(start, check , direction){
		let row = this._idToLine[start.id];
		let order = this._settings.elements;
		
		if (direction){
			for (let i=row+1; i<order.length; i++){
				if (check.call(this, order[i].id))
					return order[i].id;
			}
		} else {
			for (let i=row-1; i>=0; i--){
				if (check.call(this, order[i].id))
					return order[i].id;
			}
		}

		return null;
	},
	updateItem:function(key, data){
		const line = this.getItem(key);
		if (line)
			extend(line, data||{}, true);
		this.refresh();
	},
	_cellPosition:function(id){
		var html = this.getItemNode(id);
		return {
			left:html.offsetLeft+this._settings.nameWidth,
			top:html.offsetTop,
			height:html.firstChild.offsetHeight,
			width:this._data_width,
			parent:this._contentobj
		};
	},
	_clear:function(){
		var lines = this._settings.elements;
		for (var i=0; i<lines.length; i++)
			lines[i].value = "";
	},
	clear:function(){
		this._clear();
		this._props_dataset = {};
		this.refresh();
	},
	setValues:function(data, update){
		if (this._settings.complexData)
			data = CodeParser.collapseNames(data, "", {}, (v) => isUndefined(this._idToLine[v]));

		if(!update) this._clear();
		for(var key in data){
			var line = this.getItem(key);
			if (line)
				line.value = data[key];
		}

		this._props_dataset = data;
		this.refresh();
	},
	getValues:function(){
		var data = clone(this._props_dataset||{});
		for (var i = 0; i < this._settings.elements.length; i++) {
			var line = this._settings.elements[i];
			if (line.type != "label")
				data[line.id] = line.value;
		}

		if (this._settings.complexData)
			data = CodeParser.expandNames(data);

		return data;
	},
	refresh:function(){
		this.render();
	},
	$setSize:function(x,y){
		if (base.api.$setSize.call(this, x, y)){
			this._data_width = this._content_width - this._settings.nameWidth;
			this.render();
		}
	},
	$getSize:function(dx,dy){
		if (this._settings.autoheight){
			var count = this._settings.elements.length;
			this._settings.height = Math.max(this.type.height*count, this._settings.minHeight||0);
		}
		return base.api.$getSize.call(this, dx, dy);
	},
	_toHTML:function(){
		const html = [];
		const els = this._settings.elements;
		if (els) {
			const height = `height:${this.type.height}px;line-height:${this.type.height}px;`;
			for (let i=0; i<els.length; i++){
				const data = els[i];
				if (data.css && typeof data.css == "object")
					data.css = createCss(data.css);

				const pre = "<div "+/*@attr*/"webix_f_id"+"=\""+data.id+"\""+(data.type!=="label"?"role=\"option\" tabindex=\"0\"":"")+" class=\"webix_property_line "+(data.css||"")+"\">";
				if (data.type == "label")
					html[i] = pre+"<div class='webix_property_label_line' style='"+height+"'>"+data.label+"</div></div>";
				else {
					const render = this.on_render[data.type];
					const post = "<div class='webix_property_label' style='"+height+"width:"+this._settings.nameWidth+"px'>"+data.label+"</div><div class='webix_property_value' style='"+height+"width:"+this._data_width+"px'>";

					let content;
					const value = data.value;
					const options = data.collection || data.options;
					if(options){
						if (data.format) {
							const item = value ? options.getItem(value) : null;
							content = data.format(item ? item.value : value);
						}
						else
							content = data.template(data, this.type, value, data);
					} else if(data.format){
						content = data.format(value);
					} else
						content = value;
					if (render)
						content = render.call(this, value, data);
					html[i] = pre+post+content+"</div></div>";
				}
			}
		}
		return html.join("");
	},
	type:{
		height:24,
		templateStart:template(""),
		templateEnd:template("</div>")
	},
	$skin: function(){
		this.type.height = $active.propertyItemHeight;
	}
};


const view = protoUI(api, AutoTooltip, EditAbility, MapCollection, MouseEvents, Scrollable, SingleRender, AtomDataLoader, EventSystem, base.view);
export default {api, view};