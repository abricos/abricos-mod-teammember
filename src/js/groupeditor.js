/*
@package Abricos
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: '{C#MODNAME}', files: ['lib.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;

	var buildTemplate = this.buildTemplate;
	
	var GroupSelectWidget = function(container, taData, value){
		this.init(container, taData, value);
	};
	GroupSelectWidget.prototype = {
		init: function(container, taData, value){
			this.container = container;
			this.taData = taData;
			this._value = value;
			
			buildTemplate(this, 'select,option');
			this.render();
		},
		getValue: function(){
			return this._TM.getEl('select.id').value;
		},
		setValue: function(value){
			this._value = value;
			this._TM.getEl('select.id').value = value;
		},
		render: function(){
			var TM = this._TM, value = this._value;

			var lst = "";
			this.taData.groupList.foreach(function(group){
				lst += TM.replace('option',{
					'id': group.id,
					'tl': group.title
				});
			});

			this.container.innerHTML = TM.replace('select', {'rows': lst});
			this.setValue(value);
		}		
	};
	NS.GroupSelectWidget = GroupSelectWidget;
	
	var GroupEditorWidget = function(container, taData, group, cfg){
		cfg = L.merge({
			'callback': null
		}, cfg || {});
		GroupEditorWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'widget' 
		}, taData, group, cfg);
	};
	YAHOO.extend(GroupEditorWidget, Brick.mod.widget.Widget, {
		init: function(taData, group, cfg){
			this.taData = taData;
			this.group = group;
			this.cfg = cfg;
		},
		buildTData: function(taData, group, cfg){
			return {'cledst':group.id==0?'edstnew':'edstedit'};
		},
		onClick: function(el, tp){
			switch(el.id){
			case tp['bcreate']:
			case tp['bsave']: this.save(); return true;
			case tp['bcancel']: this.cancel(); return true;
			}
			return false;
		},
		onEnter: function(el, tp){
			switch(el.id){
			case tp['title']: this.save(); return true;
			}
		},
		render: function(){
			this.gel('title').value = this.group.title;
		},
		cancel: function(){
			NS.life(this.cfg['callback'], 'cancel');
		},
		save: function(){
			var __self = this, taData = this.taData, group = this.group;
			var sd = {
				'id': group.id,
				'teamid': taData.team.id,
				'tl': this.gel('title').value
			};
			
			taData.manager.groupSave(taData, sd, function(group){
				NS.life(__self.cfg['callback'], 'save', group);
			});
		}		
	});
	NS.GroupEditorWidget = GroupEditorWidget;	
	
	var GroupEditorPanel = function(taData, group, callback){
		this.taData = taData;
		this.group = group;
		this.callback = callback;

		GroupEditorPanel.superclass.constructor.call(this, {
			'width': '700px'
		});
	};
	YAHOO.extend(GroupEditorPanel, Brick.widget.Dialog, {
		initTemplate: function(){
			return buildTemplate(this, 'panel').replace('panel');
		},
		onLoad: function(){
			var __self = this;
			this.widget = new GroupEditorWidget(this._TM.getEl('panel.widget'), this.taData, this.group, function(act, group){
				__self.close();
				NS.life(__self.callback, act, group);
			});
		}
	});
    NS.GroupEditorPanel = GroupEditorPanel;


};