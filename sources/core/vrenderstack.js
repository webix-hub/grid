import { offset, insertBefore, remove } from "../webix/html";
import { copy, _to_array } from "../webix/helpers";
import base from "../views/view";
import { _event } from "../webix/htmlevents";

import DragControl from "../core/dragcontrol";

/*
	Renders collection of items on demand
*/
const VRenderStack = {
	$init: function() {
		this._htmlmap = {};
		_event(
			this._viewobj,
			"scroll",
			() => {
				this.render(null, null, "paint");
			}
		);
	},
	//return html container by its ID
	//can return undefined if container doesn't exists
	getItemNode: function(search_id) {
		return this._htmlmap && this._htmlmap[search_id];
	},
	/*change scrolling state of top level container, so related item will be in visible part*/
	showItem: function(id) {
		const index = this.data.getIndexById(id);
		if (index > -1) {
			const xList = this._settings.layout === "x";
			if (xList) {
				const left = index * this.type.width;
				const right = left + this.type.width;
				const scroll = this.getScrollState();
				const box = offset(this.$view);
				if (left < scroll.x) this.scrollTo(left, 0);
				else if (right > scroll.x + box.width)
					this.scrollTo(right - box.width, 0);
			} else {
				const top = index * this.type.height;
				const bottom = top + this.type.height;
				const scroll = this.getScrollState();
				const box = offset(this.$view);
				if (top < scroll.y) this.scrollTo(0, top);
				else if (bottom > scroll.y + box.height)
					this.scrollTo(0, bottom - box.height);
			}
		}
	},
	//update view after data update
	//when called without parameters - all view refreshed
	render: function(id, data, type) {
		if (!this.isVisible(this._settings.id) || this.$blockRender) return;

		const parent = this._renderobj || this._dataobj;

		const xList = this._settings.layout === "x";

		if (id) {
			if (type == "paint" || type == "update") {
				const cont = this.getItemNode(id); //get html element of updated item
				if (cont) {
					const t = (this._htmlmap[id] = this._toHTMLObject(data));
					t.style.position = "absolute";

					if (xList) {
						t.style.left = cont.style.left;
						t.style.top = 0;
					} else {
						t.style.width = "100%";
						t.style.top = cont.style.top;
						t.style.left = 0;
					}

					insertBefore(t, cont);
					remove(cont);
					return;
				}
				//updating not rendered yet item
				return;
			}
		}

		let isDrag,
			source,
			marked = this._marked_item_id;
		if (DragControl.active && type != "drag-end") {
			const context = DragControl.getContext();
			isDrag = this._init_drop_area && context.from === this; //move and order modes
			source = isDrag && _to_array(copy(context.source || []));
		}

		if (type != "paint" || isDrag) {
			//repaint all
			this._htmlmap = {};
			parent.innerHTML = "";
		}

		//full reset
		if (this.callEvent("onBeforeRender", [this.data])) {
			const count = this.data.count();
			const scroll = this.getScrollState();
			const box = offset(this._viewobj);

			let start;
			let end;
			if (xList) {
				start = Math.floor(scroll.x / this.type.width) - 2;
				end = Math.ceil((scroll.x + box.width) / this.type.width) + 2;
			} else {
				start = Math.floor(scroll.y / this.type.height) - 2;
				end = Math.ceil((scroll.y + box.height) / this.type.height) + 2;
			}

			start = Math.max(0, start);
			end = Math.min(count - 1, end + (isDrag ? source.length - 1 : 0));

			const html = [];
			for (let i = start; i <= end; i++) {
				const sid = this.data.order[i];
				if (isDrag && source.find(sid) !== -1) {
					if (sid == marked) marked = this.data.order[i + 1];
					continue;
				} else if (!this._htmlmap[sid]) {
					const item = this.data.getItem(sid);
					if (!item) {
						this._run_load_next({
							count: end - i + (this._settings.loadahead || 0),
							start: i,
						});
						break;
					}
					html.push(this._toHTML(item));
				} else {
					html.push(`<div webix_skip="true" ${this._id}="${sid}"></div>`);
				}
			}
			this._html.innerHTML = html.join("");

			if (this._init_drop_area && type == "drag-in") {
				// can be external
				const node = this._html.querySelector(`[${this._id}="${marked}"]`);
				if (node) {
					this._html.insertBefore(DragControl._dropHTML[0], node);
				} else this._html.appendChild(DragControl._dropHTML[0]);
			}

			parent.style.position = "relative";
			if (xList) {
				parent.style.width = count * this.type.width + "px";
				parent.style.height = "100%";
			} else {
				parent.style.height = count * this.type.height + "px";
			}

			const kids = this._html.childNodes;
			for (let i = kids.length - 1; i >= 0; i--) {
				const child = kids[i];
				if (child.getAttribute("webix_skip")) continue;

				const cid = child.getAttribute(this._id);
				if (cid) {
					child.style.position = "absolute";

					if (xList) {
						child.style.left = (start + i) * this.type.width + "px";
						child.style.top = 0;
					} else {
						child.style.width = "100%";
						child.style.top = (start + i) * this.type.height + "px";
						child.style.left = 0;
					}
					

					parent.appendChild(child);
					this._htmlmap[cid] = child;
				}
			}

			this.callEvent("onAfterRender", []);
		}
	},
	$setSize: function() {
		if (base.api.$setSize.apply(this, arguments)) {
			this.render(null, null, "paint");
		}
	},
	_run_load_next: function(conf) {
		const start = conf.start;
		const count = Math.max(
			conf.count,
			this._settings.datafetch || this._settings.loadahead || 0
		);
		if (this._maybe_loading_already(start, conf.count, {start, count})) return;
		this.loadNext(count, start);
	},
	_set_drop_area: function() {
		this.render(null, null, "drag-in");
	},
	_remove_drop_area: function() {
		remove(DragControl._dropHTML);
		this.render(null, null, "drag-out");
	},
};

export default VRenderStack;
