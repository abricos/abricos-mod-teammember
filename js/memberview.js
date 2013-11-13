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
	
	var UID = Brick.env.user.id;
	var buildTemplate = this.buildTemplate;

	var MemberViewWidgetAbstract = function(container, teamid, memberid, cfg){
		cfg = L.merge({
			'override': null,
			'modName': null,
			'act': '',
			'param': ''
		}, cfg || {});
		MemberViewWidgetAbstract.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'widget',
			'override': cfg['override']
		}, teamid, memberid, cfg);
	};
	YAHOO.extend(MemberViewWidgetAbstract, Brick.mod.widget.Widget, {
		buildTData: function(teamid, memberid, cfg){
			return { 'uid': memberid };
		},
		init: function(teamid, memberid, cfg){
			this.cfg = cfg;
			this.teamid = teamid;
			this.memberid = memberid;
			
			this.taData = null;
			this.member = null;
			
			this._editor = null;
		},
		onLoad: function(teamid, memberid, cfg){
			var __self = this;
			Brick.mod.team.teamAppDataLoad(teamid, cfg['modName'], 'member', function(taData){
				__self.taData = taData;
				if (L.isValue(taData)){
					taData.manager.memberLoad(taData, memberid, function(member){
						__self.onLoadMember(member);
					});
				}else{
					__self.onLoadMember(null);
				}
			});
		},
		onLoadMember: function(member){
			this.member = member;
			this.render();
		},
		render: function(){

			var member = this.member;
			this.elHide('loading,nullitem,rlwrap');
			
			if (!L.isValue(member)){
				this.elShow('nullitem');
				return;
			}else{
				this.elShow('rlwrap');
			}

			var taData = this.taData, team = taData.team;

			this.elSetVisible('btns', team.role.isAdmin);
			
			this.gel('urlmemberlist').href = taData.navigator.memberListURI();

			var cfg = this.cfg,
				user = taData.manager.users.get(member.id),
				groupid = taData.inGroupList.getGroupId(member.id),
				group = taData.groupList.get(groupid);
			
			this.elSetHTML({
				'unm': user.getUserName(),
				'avatar': user.avatar180(),
				'grouptitle': L.isValue(group) ? group.title : ''
			});
			
			this.elHide('empstat,btnisjrq,infoisjrq');
			
			if (!member.role.isMember && (member.role.isJoinRequest || member.role.isInvite)){

				if (UID == member.id){
					new NS.MemberInviteActWidget(this.gel('empstat'), team, member, {
						'override': cfg['override']
					});
				}else{ // профиль смотрит админ
					if (member.role.isInvite){
						this.elShow('infoisjrq');
					}
				}
				this.elShow('empstat');
			}
			if (team.role.isAdmin){
				// предварительная прогрузка редакторов
				var __self = this, mcfg = taData.manager.cfg['memberEditor'];
				this.componentLoad(mcfg['module'], mcfg['component'], function(){
					mcfg = taData.manager.cfg['memberRemove'];
					__self.componentLoad(mcfg['module'], mcfg['component'], function(){
					}, {'hide': 'bbtns', 'show': 'edloading'});
				}, {'hide': 'bbtns', 'show': 'edloading'});
			}
		},		
		onClick: function(el, tp){
			switch(el.id){
			case tp['bempedit']: this.showMemberEditor(); return true;
			case tp['bempremove']: this.showMemberRemovePanel(); return true;
			}
			return false;
		},
		closeEditors: function(){
			if (L.isValue(this._editor)){ 
				this._editor.destroy();
				this._editor = null;
			}
			this.elShow('btns,view');
		},
		showMemberEditor: function(){
			this.closeEditors();
			
			this.elHide('btns,view');
			
			var __self = this, taData = this.taData, member = this.member,
				mcfg = taData.manager.cfg['memberEditor'];
			this._editor = new Brick.mod[mcfg['module']][mcfg['widget']](this.gel('editor'), taData.team.id, member.id, {
				'callback': function(act, member){
					__self.closeEditors();
					if (act == 'save'){
						if (L.isValue(member)){
							__self.member = member;
						}
						__self.renderDetail();
					}
				}
			});
		},
		showMemberRemovePanel: function(){
			var taData = this.taData, mcfg = taData.manager.cfg['memberRemove'];
			new Brick.mod[mcfg['module']][mcfg['panel']](taData, this.member, function(act){
				Brick.Page.reload(taData.navigator.memberListURI());
			});
		}
	});
	NS.MemberViewWidgetAbstract = MemberViewWidgetAbstract;
	
	var MemberInviteActWidget = function(container, taData, member, cfg){
		cfg = L.merge({
			'callback': null,
			'override': null
		}, cfg || {});
		
		MemberInviteActWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'inviteact',
			'override': cfg['override']
		}, taData, member, cfg);
	};
	YAHOO.extend(MemberInviteActWidget, Brick.mod.widget.Widget, {
		init: function(taData, member, cfg){
			this.taData = taData;
			this.member = member;
			this.cfg = cfg;
		},
		buildTData: function(taData, member, cfg){
			var author = taData.users.get(member.role.relUserId);
			if (L.isNull(author)){
				return {};
			}
			return {
				'uid': author.id,
				'unm': author.getUserName()
			};
		},
		render: function(){
			this.elSetDisabled('byes', false);
		},
		onClick: function(el, tp){
			switch(el.id){
			case tp['byes']: this.save(true); return true;
			case tp['bno']: this.save(false); return true;
			}
			return false;
		},
		renderTermStat: function(){
			this.elSetDisabled('byes', false);
		},
		save: function(flag){
			this.elHide('btns');
			this.elShow('loading');
			
			var taData = this.taData;
			
			var sd = {
				'teamid': taData.team.id,
				'userid': this.member.id,
				'flag': flag
			};
			taData.manager.memberInviteAccept(taData, sd, function(member){
				var pageReload = function(){
					var url = taData.navigator.memberListURI();
					if (L.isValue(member)){
						url = taData.navigator.memberListURI(member.id);
					}
					Brick.Page.reload("/bos/"+url);
				};
				pageReload();
			});
		}
	});
	NS.MemberInviteActWidget = MemberInviteActWidget;
	
};