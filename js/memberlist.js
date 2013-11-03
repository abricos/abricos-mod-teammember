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
	
	var BW = Brick.mod.widget.Widget;
	var buildTemplate = this.buildTemplate;
	
	var GroupListWidget = function(container, teamid, cfg){
		cfg = L.merge({
			'modName': null,
			'MemberListWidgetClass': NS.MemberListWidget,
			'override': null
		}, cfg || {});
		
		GroupListWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'grouplist',
			'override': cfg['override']
		}, teamid, cfg);
	};
	YAHOO.extend(GroupListWidget, BW, {
		init: function(teamid, cfg){
			this.teamid = teamid;
			this.cfg = cfg;
			
			this.team = null;
			this.teamAppData = null;
			
			this._editor = null;
			this._wList = [];
		},
		onLoad: function(teamid, cfg){
			var __self = this;
			Brick.mod.team.teamLoad(teamid, function(team){
				__self.onLoadTeam(team);
			});
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
			
			var __self = this;
			this.team.extended.load(this.cfg['modName'], 'member', function(appData){
				__self.teamAppData = appData;
				__self.render();
			});
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
			case tp['bgroupadd']: this.showGroupEditor(); return true;
			}

			var ws = this._wList;
			for (var i=0;i<ws.length;i++){
				if (ws[i].onClick(el)){ return true; }
			}

			return false;
		},
		render: function(){
			var team = this.team, taData = this.teamAppData;
			if (!L.isValue(taData)){ return; }
			
			this.elHide('loading');
			this.elShow('rlwrap');

			this.elSetVisible('btns', team.role.isAdmin);

			var __self = this, cfg = this.cfg;
			
			this._clearWS();

			var ws = this._wList;
			taData.groupList.foreach(function(group){
				ws[ws.length] = new NS.GroupRowWidget(__self.gel('list'), taData, group, {
					'override': cfg['override'],
					'onReloadList': function(){
						__self.reloadList();
					}
				});
			});

			for (var i=0;i<ws.length;i++){
				ws[i].render();
			}

			this.memberListWidget = new cfg['MemberListWidgetClass'](this.gel('emplist'), taData, {
				'groupid': 0
			});

			if (team.role.isAdmin){
				var mcfg = taData.manager.cfg['memberEditor'];
				this.componentLoad(mcfg['module'], mcfg['component'], function(){
				}, {'hide': 'bbtns', 'show': 'edloading'});
			}
		},
		closeEditors: function(){
			if (L.isNull(this._editor)){ return; }
			this._editor.destroy();
			this._editor = null;
			this.elShow('btns,list,emplist');
		},
		
		showGroupEditor: function(groupid){
			groupid = groupid || 0;
			this.closeEditors();
			var __self = this, taData = this.teamAppData, 
				mcfg = taData.manager.cfg['groupEditor'];
			var group = groupid==0 ? new NS.Group() : taData.groupList.get(groupid);
			
			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.elHide('btns,list,emplist');
				__self._editor = new Brick.mod[mcfg['module']][mcfg['widget']](__self.gel('editor'), taData, group, {
					'callback': function(act){
						__self.closeEditors();
						if (act == 'save'){ __self.render(); }
					}
				});
				
			}, {'hide': 'bbtns', 'show': 'edloading'});
		},
		showMemberEditor: function(memberid){
			this.closeEditors();
			
			var __self = this, taData = this.teamAppData, mcfg = taData.manager.cfg['memberEditor'];

			this.elHide('btns,list,emplist');
			
			this._editor = new Brick.mod[mcfg['module']][mcfg['widget']](this.gel('editor'), taData.team.id, memberid|0, {
				'callback': function(act, newMember){
					__self.closeEditors();
					
					if (act == 'save'){
						__self.render(); 
					}
				}
			});
		}
	});
	NS.GroupListWidget = GroupListWidget;

	var GroupRowWidget = function(container, teamAppData, group, cfg){
		cfg = L.merge({
			'onReloadList': null,
			'MemberListWidgetClass': NS.MemberListWidget,
			'override': null
		}, cfg || {});
		GroupRowWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'grouprow', 'isRowWidget': true,
			'override': cfg['override']
		}, teamAppData, group, cfg);
	};
	YAHOO.extend(GroupRowWidget, BW, {
		init: function(teamAppData, group, cfg){
			this.teamAppData = teamAppData;
			this.group = group;
			this.cfg = cfg;
			this._editor = null;
		},
		buildTData: function(teamAppData, group, cfg){
			return {'tl': group.title};
		},
		onClick: function(el, tp){
			var tp = this._TId['grouprow'];
			switch(el.id){
			case tp['bgroupedit']: this.showGroupEditor(); return true;
			case tp['bmemberadd']: this.showMemberEditor(); return true;
			}
			return false;
		},
		render: function(){
			var taData = this.teamAppData, group = this.group, cfg = this.cfg;
			
			this.elSetVisible('btns', taData.team.role.isAdmin);
			this.elSetHTML('grouptl', group.title);

			this.memberListWidget = new cfg['MemberListWidgetClass'](this.gel('emplist'), taData, {
				'groupid': group.id
			});
			
		},
		closeEditors: function(){
			if (L.isNull(this._editor)){ return; }
			this._editor.destroy();
			this._editor = null;
			this.elShow('btns,list,emplist');
		},
		showGroupEditor: function(){
			this.closeEditors();
			var __self = this, teamAppData = this.teamAppData, group = this.group,
				mcfg = teamAppData.manager.cfg['groupEditor'];
			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.elHide('btns,list,emplist');

				__self._editor = new Brick.mod[mcfg['module']][mcfg['widget']](__self.gel('editor'), teamAppData, group, {
					'callback': function(act){
						__self.closeEditors();
						if (act == 'save'){ __self.render(); }
					} 
				});
				
			}, {'hide': 'bbtns', 'show': 'edloading'});
		},
		showMemberEditor: function(memberid){
			memberid = memberid||0;
			this.closeEditors();
			
			var __self = this, teamAppData = this.teamAppData, group = this.group, 
				mcfg = teamAppData.manager.cfg['memberEditor'],
				member = memberid==0 ? new teamAppData.manager.MemberClass(team) : list.get(memberid);

			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.elHide('btns,list,view');
				
				__self._editor = new Brick.mod[mcfg['module']][mcfg['widget']](__self.gel('editor'), teamAppData, member, function(act, newMember){
					__self.closeEditors();
					
					if (act == 'save'){
						__self.render(); 
					}
				});
				__self._editor.groupSelectWidget.setValue(group.id);
			}, {'hide': 'bbtns', 'show': 'edloading'});
		}
		
	});
    NS.GroupRowWidget = GroupRowWidget;
    
	var MemberListRowWidget = function(container, teamAppData, member){
		MemberListRowWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'row,rowview,isinvite', 
			'isRowWidget': true
		}, teamAppData, member);
	};
	YAHOO.extend(MemberListRowWidget, Brick.mod.widget.Widget, {
		init: function(teamAppData, member){
			this.teamAppData = teamAppData;
			this.member = member;
		},
		render: function(){
			var taData = this.teamAppData, man = taData.manager, member = this.member,
				user = man.users.get(member.id);
			
			var TM = this._TM;
			
			this.elSetHTML('view', TM.replace('rowview', {
				'id': member.id,
				'avatar': user.avatar45(),
				'unm':  user.getUserName(),
				// 'urlview': team.navigator.memberViewURI(member.id),
				'isinvite': member.role.isInvite ? TM.replace('isinvite') : ""
			}));
		},
		onClick: function(el){
			return false;
		}
	});
    NS.MemberListRowWidget = MemberListRowWidget;

	var MemberListWidget = function(container, teamAppData, cfg){
		cfg = L.merge({
			'groupid': 0
		}, cfg || {});

		MemberListWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'list'
		}, teamAppData, cfg);
	};
	YAHOO.extend(MemberListWidget, Brick.mod.widget.Widget, {
		init: function(teamAppData, cfg){
			this.teamAppData = teamAppData;
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
		/*
		checkMemberInList: function(member){
			return true;
		},
		/**/
		render: function(){
			this._clearWS();
			var __self = this, cfg = this.cfg, ws = this._wList, 
				taData = this.teamAppData;

			taData.memberList.foreach(function(member){
				// if (!__self.checkMemberInList(member)){ return; }
				
				if (!member.role.isModMember){
					// участник не принадлежит этому модулю
					return;
				}
				
				
				if (!taData.memberInGroupList.checkMemberInGroup(member.id, cfg['groupid'])){
					// участник не проходит по фильтру данной группы
					return;
				}
				
				if (!member.role.isMember){
					if (!member.role.isInvite && !member.role.isJoinRequest){
						return;
					}
				}
				
				ws[ws.length] = new NS.MemberListRowWidget(__self.gel('list'), teamAppData, member);
 			});
			
			for (var i=0;i<ws.length;i++){
				ws[i].render();
			}
		}
	});
    NS.MemberListWidget = MemberListWidget;    
};