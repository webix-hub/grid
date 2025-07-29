//----------------
//    Mixins
//----------------.

export * from "./core/index";


//----------------
//    Helpers
//----------------

export * from "./webix/index";
export * from "./load/index";
export * from "./ui/index";

export {default as Date} from "./core/date";
export {default as Number} from "./core/number";
export {default as promise} from "./thirdparty/promiz";


//----------------
//    Locales
//----------------

export * from "./i18n/index";


//----------------
//    Widgets
//----------------

import "./views/baseview";
import "./views/baselayout";

import "./views/view";
import "./views/spacer";
import "./views/template";
import "./views/scrollview";
import "./views/layout";

import "./views/proxy";

import "./views/window";
import "./views/popup";

import "./views/toolbar";
import "./views/form";
import "./views/property";

import "./views/calendar";
import "./views/colorboard";
import "./views/colorselect";

import "./views/button";
import "./views/label";
import "./views/text";
import "./views/select";
import "./views/checkbox";
import "./views/radio";
import "./views/colorpicker";
import "./views/combo";
import "./views/counter";
import "./views/datepicker";
import "./views/icon";
import "./views/richselect";
import "./views/search";
import "./views/segmented";
import "./views/textarea";
import "./views/toggle";
import "./views/multiselect";
import "./views/multicombo";
import "./views/slider";
import "./views/rangeslider";
import "./views/timeboard";

import "./views/suggest";
import "./views/multisuggest";
import "./views/checksuggest";
import "./views/datasuggest";
import "./views/gridsuggest";
import "./views/mentionsuggest";

import "./views/daterange";
import "./views/daterangesuggest";
import "./views/daterangepicker";

import "./views/list";
import "./views/pager";

import "./views/menu";
import "./views/submenu";
import "./views/context";
import "./views/contextmenu";

import "./views/datatable";

import "./core/sparklines";

import "./views/filter";

//----------------
//  Debug console
//----------------

import "./views/debug";

import { ui } from "./ui";
import { extend } from "./webix/helpers";

const grid = function(config){
	const view = config.view;
	if (!view || view === "datatable") {
		const sconfig = extend({ view: "datatable" }, config);
		return ui(sconfig);
	}

	return ui.apply(this, [config]);
};
export { grid };