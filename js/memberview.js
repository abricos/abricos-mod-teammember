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
			'modName': 'team',
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
			
			this.team = null;
			this.member = null;
			
			this._editor = null;
		},
		onLoad: function(teamid, memberid, cfg){
			var __self = this, Manager = Brick.mod.team.Manager;
			Manager.teamLoad(teamid, function(team){
				Manager.init(cfg['modName'], function(man){
					man.memberLoad(team, memberid, function(member){
						__self.onLoadTeam(team, member);
					});
				});
			});
		},
		onLoadTeam: function(team, member){
			this.team = team;
			this.member = member;

			this.renderDetail();
		},
		renderDetail: function(){
			this.elHide('loading,nullitem,rlwrap');

			var team = this.team, member = this.member;
			if (!L.isValue(member)){
				this.elShow('nullitem');
			}else{
				this.elShow('rlwrap');
			}
			
			if (L.isNull(team) || L.isNull(member)){ return; }

			this.elSetVisible('btns', team.role.isAdmin);
			
			this.gel('urlmemberlist').href = team.navigator.memberListURI();

			var cfg = this.cfg,
				user = team.manager.users.get(member.id),
				groupid = team.memberInGroupList.getGroupId(member.id),
				group = team.groupList.get(groupid);
			
			this.elSetHTML({
				'unm': user.getUserName(),
				'avatar': user.avatar180(),
				'grouptitle': L.isValue(group) ? group.title : ''
			});
			
			this.elHide('empstat,btnisjrq,infoisjrq');
			if (!member.role.isMember && (member.role.isJoinRequest || member.role.isInvite)){

				var cUserId = UID;
				if (!L.isNull(team.manager.invite)){
					cUserId = team.manager.invite['user']['id'];
				}
				
				if (cUserId == member.id){
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
		},		
		onClick: function(el, tp){
			switch(el.id){
			case tp['bempedit']: this.showMemberEditor(); return true;
			case tp['bempremove']: this.showMemberRemovePanel(); return true;
			}
			return false;
		},
		closeEditors: function(){
			if (L.isNull(this._editor)){ return; }
			this._editor.destroy();
			this._editor = null;
			this.elShow('btns,list,view');
		},
		showMemberEditor: function(){
			this.closeEditors();
			
			var __self = this, mcfg = this.team.manager.cfg['memberEditor'];

			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				__self.showMemberEditorMethod();
			}, {'hide': 'bbtns', 'show': 'edloading'});
		},
		showMemberEditorMethod: function(){
			this.elHide('btns,list,view');

			var __self = this, mcfg = this.team.manager.cfg['memberEditor'];
			this._editor = new Brick.mod[mcfg['module']][mcfg['widget']](this.gel('editor'), this.team, this.member, function(act, member){
				__self.closeEditors();
				if (act == 'save'){
					if (L.isValue(member)){
						__self.member = member;
					}
					__self.renderDetail();
				}
			});
		},
		showMemberRemovePanel: function(){
			this.closeEditors();
			
			var mcfg = this.team.manager.cfg['memberRemove'];
			this.componentLoad(mcfg['module'], mcfg['component'], function(){
				new new Brick.mod[mcfg['module']][mcfg['panel']](team, member, function(act){
					Brick.Page.reload(NS.navigator.company.depts.view(team.id));
				});
			}, {'hide': 'bbtns', 'show': 'edloading'});
		}
	});
	NS.MemberViewWidgetAbstract = MemberViewWidgetAbstract;
	
	var MemberInviteActWidget = function(container, team, member, cfg){
		cfg = L.merge({
			'callback': null,
			'override': null
		}, cfg || {});
		
		MemberInviteActWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'inviteact',
			'override': cfg['override']
		}, team, member, cfg);
	};
	YAHOO.extend(MemberInviteActWidget, Brick.mod.widget.Widget, {
		init: function(team, member, cfg){
			this.team = team;
			this.member = member;
			this.cfg = cfg;
		},
		buildTData: function(teamid, member, cfg){
			var author = Brick.mod.uprofile.viewer.users.get(member.role.relUserId);
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
			
			var team = this.team;
			
			var sd = {
				'teamid': team.id,
				'userid': this.member.id,
				'flag': flag
			};
			team.manager.memberInviteAccept(team, sd, function(member){

				var pageReload = function(){
					var url = team.navigator.memberListURI();
					if (L.isValue(member)){
						url = team.navigator.memberListURI(member.id);
					}
					Brick.Page.reload("/bos/"+url);
				};
				pageReload();
			});
		}
	});
	NS.MemberInviteActWidget = MemberInviteActWidget;
	
};