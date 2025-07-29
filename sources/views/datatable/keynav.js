import {bind, extend} from "../../webix/helpers";
import {addCss, removeCss} from "../../webix/html";
import {assert} from "../../webix/debug";


// #include core/keynav.js

const Mixin = {
	$init:function(config){
		this.attachEvent("onAfterScroll", this._set_focusable_item);
		this.attachEvent("onFocus", function(){
			addCss(this.$view, "webix_dtable_focused");
		});
		this.attachEvent("onBlur", function(){
			removeCss(this.$view,"webix_dtable_focused");
		});
		//open selected node in tree-like tables
		if(config.select != "column" && (this.open || this._subViewStorage))
			this.attachEvent("onEnter", function(){
				let sel = this.getSelectedId(true);
				if(sel.length == 1 && !(this.getEditor && this.getEditor())){
					const node = this.getItemNode(sel[0]);
					sel = sel[0].row;
					if(this.config.select == "row" || (node.querySelector(".webix_tree_open") || node.querySelector(".webix_tree_close"))){
						if(this.isBranchOpen(sel)) this.close(sel);
						else this.open(sel);
					}
				}
			});
	},
	_set_focusable_item:function(){
		var sel = this._getVisibleSelection();
		if(!sel){
			var node =  this._dataobj.querySelector(".webix_cell");
			if(node)
				node.setAttribute("tabindex", "0");
		}
	},
	_getVisibleSelection:function(){
		const sel = this.getSelectedId(true);
		for(let i = 0; i<sel.length; i++){
			if(sel[i].column && this.isColumnVisible(sel[i].column))
				return this.getItemNode(sel[i]);
		}
		return null;
	},
	moveSelection:function(mode, details, focus){
		if(this._settings.disabled) return;
		details = details || {};

		//get existing selection as array
		var t = this.getSelectedId(true);
		var index = t.length-1;
		var preserve = this._settings.multiselect || this._settings.areaselect ? details.shift : false;

		//change defaults in case of multiselection
		if(t.length>1 && this._settings.select !=="cell"){
			t = t.sort(bind(function(a, b){
				if(this.getIndexById(a.row)>this.getIndexById(b.row) || this.getColumnIndex(a.column)>this.getColumnIndex(b.column)) return 1;
				else return -1;
			}, this));
			if (mode == "up" || mode == "left" || mode =="top" || mode =="pgup")
				index = 0;
		}
		
		if (index < 0 && this.count()){ //no selection
			if (mode == "down" || mode == "right") mode = "top";
			else if (mode == "up" || mode == "left") mode = "bottom";
			else return;
			index = 0;
			t =  [{ row:1, column:1 }];
		}

		if (index>=0){
			var row = t[index].row;
			var column = t[index].column;

			//delay render for smooth navigation
			const cell = {};
			this._delayRender(focus !== false ? cell : false);

			if (mode == "top" || mode == "bottom") {
				if (row) {
					// first/last row setting
					if (mode == "top")
						row = this.data.getFirstId();
					else if (mode == "bottom")
						row = this.data.getLastId();
				}
				if (column) {
					// first/last column setting
					index = 0;
					if (mode == "bottom")
						index = this.config.columns.length - 1;
					column = this.columnId(index);
				}
			}else if (t.length == 1 && details.ctrl && !details.shift && (mode == "up" || mode== "down"|| mode == "left" || mode== "right")) {
				const res = this._getNextCtrlSelection(t[0], mode);
				row = res.row;
				column = res.column;
			} else if (mode == "up" || mode== "down" || mode == "pgup" || mode == "pgdown"){
				if (row){
					//it seems row's can be seleted
					let index = this.getIndexById(row);
					let step = 1;
					if(mode == "pgup" || mode == "pgdown")
						step = this._pager ? this._pager.config.size : this.getVisibleCount();

					//get new selection row
					if (mode == "up" || mode == "pgup") {
						index -= step;
						this._nav_dir = "up";
					}
					else if (mode == "down" || mode == "pgdown") {
						index += step;
						this._nav_dir = "down";
					} 
					//check that we in valid row range
					if (index <0) index=0;
					if (index >=this.data.order.length) index=this.data.order.length-1;
					details.step = step;
					row = this.getIdByIndex(index);
					
					// row is not visible yet (paging and/or dynamic loading)
					if (!row) {
						this.showItemByIndex(index);
						this._sel_ctx = { cell, index, column, mode, details, preserve, dir: this._nav_dir };
					}
				}
			} else if (mode == "right" || mode == "left"){
				if (column && this.config.select != "row"){
					//it seems column's can be selected
					let index = this.getColumnIndex(column);
					//get new selected column
					if (mode == "right") index++;
					else if (mode == "left") index--;
					//check that result column index is in valid range
					if (index<0) index = 0;
					if (index>=this.config.columns.length) index = this.config.columns.length-1;

					column = this.columnId(index);
				} else if ((this.open || this._subViewStorage) && mode == "right"){
					return this.open ? this.open(row) : this.openSub(row);
				} else if ((this.close || this._subViewStorage) && mode == "left"){
					return this.close ? this.close(row) : this.closeSub(row);
				}
			} else {
				assert(false, "Not supported selection moving mode");
				return;
			}

			this._moveSelection(cell, { row, column }, mode, details, preserve);
		}

		return false;
	},
	_moveSelection(cell, pos, mode, details, preserve) {
		const { row, column } = pos;
		if (row){
			cell.row = row;
			cell.column = column;
			this.callEvent("onMoveSelection", [cell, mode, details]);
			this.showCell(cell.row, cell.column);

			if(!this.select){ //switch on cell or row selection by default
				extend(this, this._selections._commonselect, true);
				this._settings.select = (this.open || this._subViewStorage?"row":"cell");
				extend(this, this._selections[this._settings.select], true);
			}

			if(preserve && this._settings.select == "area"){
				var last = this._selected_areas[this._selected_areas.length-1];
				this._extendAreaRange(cell, last, mode, details);
			}
			else
				this._select(cell, preserve);			
		}
	},
	_getNextCtrlSelection: function(cell, mode){
		const {row, column} = cell,
			dir = (mode == "up" || mode == "left")?-1:1,
			isRowArr = (mode == "up" || mode == "down"),
			arr = isRowArr ? this.data.order : this._columns.map(c => c.id),
			id = isRowArr ? row : column;

		let i = isRowArr ? this.getIndexById(row) : this.getColumnIndex(column);
		const last = dir > 0 ? arr.length - 1 : 0;

		let emptyId, prevId, next;

		while(!next && arr[i]){
			const iId = arr[i];
			let r = isRowArr ? iId : row;
			let c = isRowArr ? column : iId;
			let value = this.$getExportValue? this.$getExportValue(r, c,  {}): this.getItem(r)[c];
			if(iId != id && emptyId && value)
				next = iId;
			else if(!value){
				if(prevId && prevId != id)
					next = prevId;
				emptyId = iId;
			}
			if(i == last && !next)
				next = iId;
			prevId = value ? iId : null;
			i += dir;
		}
		return isRowArr ? {row: next, column} : {row, column: next};
	}
};


export default Mixin;
