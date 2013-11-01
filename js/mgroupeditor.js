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
	
	var MemberGroupSelectWidget = function(container, team, value){
		this.init(container, team, value);
	};
	MemberGroupSelectWidget.prototype = {
		init: function(container, team, value){
			this.container = container;
			this.team = team;
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
			this.team.memberGroupList.foreach(function(group){
				lst += TM.replace('option',{
					'id': group.id,
					'tl': group.title
				});
			});

			this.container.innerHTML = TM.replace('select', {'rows': lst});
			this.setValue(value);
		}		
	};
	NS.MemberGroupSelectWidget = MemberGroupSelectWidget;
	
	var MemberGroupEditorWidget = function(container, team, group, callback){
		MemberGroupEditorWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'widget' 
		}, team, group, callback);
	};
	YAHOO.extend(MemberGroupEditorWidget, Brick.mod.widget.Widget, {
		init: function(team, group, callback){
			this.team = team;
			this.group = group;
			this.callback = callback;
		},
		buildTData: function(team, group){
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
			NS.life(this.callback, 'cancel');
		},
		save: function(){
			var __self = this, team = this.team, group = this.group;
			var sd = {
				'id': group.id,
				'teamid': team.id,
				'tl': this.gel('title').value
			};
			
			team.manager.memberGroupSave(team, sd, function(group){
				NS.life(__self.callback, 'save', group);
			});
		}		
	});
	NS.MemberGroupEditorWidget = MemberGroupEditorWidget;	
	
	var MemberGroupEditorPanel = function(team, group, callback){
		this.team = team;
		this.group = group;
		this.callback = callback;

		MemberGroupEditorPanel.superclass.constructor.call(this, {
			'width': '700px'
		});
	};
	YAHOO.extend(MemberGroupEditorPanel, Brick.widget.Dialog, {
		initTemplate: function(){
			return buildTemplate(this, 'panel').replace('panel');
		},
		onLoad: function(){
			var __self = this;
			this.widget = new MemberGroupEditorWidget(this._TM.getEl('panel.widget'), this.team, this.group, function(act, group){
				__self.close();
				NS.life(__self.callback, act, group);
			});
		}
	});
    NS.MemberGroupEditorPanel = MemberGroupEditorPanel;


};