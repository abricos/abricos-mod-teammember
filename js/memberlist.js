/*
@package Abricos
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: '{C#MODNAME}', files: ['memberview.js']}
	]
};
Component.entryPoint = function(NS){

	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var NSTM = Brick.mod.team;
	var BW = Brick.mod.widget.Widget;
	var buildTemplate = this.buildTemplate;
	
	var MemberGroupListWidget = function(container, teamid, cfg){
		cfg = L.merge({
			'modName': 'team',
			'MemberListWidgetClass': NS.MemberListWidget,
			'override': null
		}, cfg || {});
		
		MemberGroupListWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'grouplist',
			'override': cfg['override']
		}, teamid, cfg);
	};
	YAHOO.extend(MemberGroupListWidget, BW, {
		init: function(teamid, cfg){
			this.teamid = teamid;
			this.cfg = cfg;
			
			this.team = null;
			
			this._editor = null;
			this._wList = [];
		},
		onLoad: function(teamid, cfg){
			var __self = this;
			Brick.mod.team.teamLoad(teamid, function(team){
				__self.onLoadTeam(team);
			}, cfg['modName']);
		},
		onLoadTeam: function(team){
			this.team = team;
			
			this.elHide('loading,rlwrap,nullitem');
			
			if (!L.isValue(team)){
				this.elShow('nullitem');
				return;
			}
			this.reloadList();
		},
		reloadList: function(){
			this.elShow('loading');
			this.elHide('rlwrap');
			
			this.team.extended.load(this.cfg['modName'], 'member', function(extData){
Brick.console(extData);				
			});
			
			/*
			var __self = this;
			this.team.manager.memberListLoad(this.team, function(list){
				__self.render();
			});
			/**/
		},
		_clearWS: function(){
			var ws = this._wList;
			for (var i=0;i<ws.length;i++){
				ws[i].destroy();
			}
			this._wList = [];
		},
		onClick: function(el, tp){
			
			switch(el.id){
			case tp['bmemberadd']: this.showMemberEditor(); return true;
			case tp['bgroupadd']: this.showMemberGroupEditor(); return true;
			}

			var ws = this._wList;
			for (var i=0;i<ws.length;i++){
				if (ws[i].onClick(el)){ return true; }
			}

			return false;
		},
		render: function(){
			var team = this.team;
			if (!L.isValue(team) || !L.isValue(team.memberGroupList)){ return; }
						
			this.elSetVisible('btns', team.role.isAdmin);

			var __self = this, cfg = this.cfg;
			
			this._clearWS();

			var ws = this._wList;
			team.memberGroupList.foreach(function(group){
				ws[ws.length] = new NS.MemberGroupRowWidget(__self.gel('list'), team, group, {
					'override': cfg['override'],
					'onReloadList': function(){
						__self.reloadList();
					}
				});
			});

			for (var i=0;i<ws.length;i++){
				ws[i].render();
			}

			this.memberListWidget = new cfg['MemberListWidgetClass'](this.gel('emplist'), team, {
				'groupid': 0
			});
		},
		closeEditors: function(){
			if (L.isNull(this._editor)){ return; }
			this._editor.destroy();
			this._editor = null;
			this.elShow('btns,list,emplist');
		},
		
		showMemberGroupEditor: function(groupid){
			groupid = groupid || 0;
			this.closeEditors();
			var __self = this, team = this.team, 
				mcfg = team.manager.cfg['memberGroupEditor'];
			var group = groupid==0 ? new NS.MemberGroup() : team.memberGroupList.get(groupid);
			
			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.elHide('btns,list,emplist');
				__self._editor = new Brick.mod[mcfg['module']][mcfg['widget']](__self.gel('editor'), team, group, function(act){
					__self.closeEditors();
					if (act == 'save'){ __self.render(); }
				});
				
			}, {'hide': 'bbtns', 'show': 'edloading'});
		},
		showMemberEditor: function(memberid){
			
			memberid = memberid||0;
			this.closeEditors();
			
			var __self = this, team = this.team, mcfg = this.team.manager.cfg['memberEditor'],
				member = memberid==0 ? new team.manager.MemberClass(team) : list.get(memberid);

			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.elHide('btns,list,emplist');
				
				__self._editor = new Brick.mod[mcfg['module']][mcfg['widget']](__self.gel('editor'), team, member, function(act, newMember){
					__self.closeEditors();
					
					if (act == 'save'){
						__self.render(); 
					}
				});
			}, {'hide': 'bbtns', 'show': 'edloading'});
		}
	});
	NS.MemberGroupListWidget = MemberGroupListWidget;

	var MemberGroupRowWidget = function(container, team, group, cfg){
		cfg = L.merge({
			'onReloadList': null,
			'MemberListWidgetClass': NS.MemberListWidget,
			'override': null
		}, cfg || {});
		MemberGroupRowWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'grouprow', 'isRowWidget': true,
			'override': cfg['override']
		}, team, group, cfg);
	};
	YAHOO.extend(MemberGroupRowWidget, BW, {
		init: function(team, group, cfg){
			this.team = team;
			this.group = group;
			this.cfg = cfg;
			this._editor = null;
		},
		buildTData: function(team, group, cfg){
			return {'tl': group.title};
		},
		onClick: function(el, tp){
			var tp = this._TId['grouprow'];
			switch(el.id){
			case tp['bgroupedit']: this.showMemberGroupEditor(); return true;
			case tp['bmemberadd']: this.showMemberEditor(); return true;
			}
			return false;
		},
		render: function(){
			var team = this.team, group = this.group, cfg = this.cfg;
			
			this.elSetVisible('btns', team.role.isAdmin);
			this.elSetHTML('grouptl', group.title);

			this.memberListWidget = new cfg['MemberListWidgetClass'](this.gel('emplist'), team, {
				'groupid': group.id
			});
		},
		closeEditors: function(){
			if (L.isNull(this._editor)){ return; }
			this._editor.destroy();
			this._editor = null;
			this.elShow('btns,list,emplist');
		},
		showMemberGroupEditor: function(){
			this.closeEditors();
			var __self = this, team = this.team, group = this.group,
				mcfg = team.manager.cfg['memberGroupEditor'];
			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.elHide('btns,list,emplist');

				__self._editor = new Brick.mod[mcfg['module']][mcfg['widget']](__self.gel('editor'), team, group, function(act){
					__self.closeEditors();
					if (act == 'save'){ __self.render(); }
				});
				
			}, {'hide': 'bbtns', 'show': 'edloading'});
		},
		showMemberEditor: function(memberid){
			memberid = memberid||0;
			this.closeEditors();
			
			var __self = this, team = this.team, group = this.group, 
				mcfg = this.team.manager.cfg['memberEditor'],
				member = memberid==0 ? new team.manager.MemberClass(team) : list.get(memberid);

			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.elHide('btns,list,view');
				
				__self._editor = new Brick.mod[mcfg['module']][mcfg['widget']](__self.gel('editor'), team, member, function(act, newMember){
					__self.closeEditors();
					
					if (act == 'save'){
						__self.render(); 
					}
				});
				__self._editor.groupSelectWidget.setValue(group.id);
			}, {'hide': 'bbtns', 'show': 'edloading'});
		}
		
	});
    NS.MemberGroupRowWidget = MemberGroupRowWidget;
    
	var MemberListRowWidget = function(container, team, member){
		MemberListRowWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'row,rowview,isinvite', 
			'isRowWidget': true
		}, team, member);
	};
	YAHOO.extend(MemberListRowWidget, Brick.mod.widget.Widget, {
		init: function(team, member){
			this.team = team;
			this.member = member;
		},
		render: function(){
			var team = this.team, member = this.member,
				user = team.manager.users.get(member.id);
			
			var TM = this._TM;
			
			this.elSetHTML('view', TM.replace('rowview', {
				'id': member.id,
				'avatar': user.avatar45(),
				'unm':  user.getUserName(),
				'urlview': team.navigator.memberViewURI(member.id),
				'isinvite': member.role.isInvite ? TM.replace('isinvite') : ""
			}));
		},
		onClick: function(el){
			return false;
		}
	});
    NS.MemberListRowWidget = MemberListRowWidget;

	var MemberListWidget = function(container, team, cfg){
		cfg = L.merge({
			'groupid': 0
		}, cfg || {});

		MemberListWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'list'
		}, team, cfg);
	};
	YAHOO.extend(MemberListWidget, Brick.mod.widget.Widget, {
		init: function(team, cfg){
			this.team = team;
			this.cfg = cfg;
			this._wList = [];
		},
		destroy: function(){
			this._clearWS();
			MemberListWidget.superclass.destroy.call(this);
		},
		_clearWS: function(){
			var ws = this._wList;
			for (var i=0;i<ws.length;i++){
				ws[i].destroy();
			}
		},
		onClick: function(el, tp){
			var ws = this._wList;
			for (var i=0;i<ws.length;i++){
				if (ws[i].onClick(el)){ return true; }
			}
			return false;
		},
		checkMemberInList: function(member){
			return true;
		},
		render: function(){
			this._clearWS();
			var __self = this, cfg = this.cfg, ws = this._wList, team = this.team;

			team.memberList.foreach(function(member){
				if (!__self.checkMemberInList(member)){ return; }
				
				if (!member.role.isModMember){
					// участник не принадлежит этому модулю
					return;
				}
				
				if (!team.memberInGroupList.checkMemberInGroup(member.id, cfg['groupid'])){
					// участник не проходит по фильтру данной группы
					return;
				}
				
				if (!member.role.isMember){
					if (!member.role.isInvite && !member.role.isJoinRequest){
						return;
					}
				}
				
				ws[ws.length] = new NS.MemberListRowWidget(__self.gel('list'), team, member);
 			});
			
			for (var i=0;i<ws.length;i++){
				ws[i].render();
			}
		}
	});
    NS.MemberListWidget = MemberListWidget;    
};