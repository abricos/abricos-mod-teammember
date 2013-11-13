/* 
@package Abricos
*/

var Component = new Brick.Component();
Component.requires = { 
	mod:[
        {name: 'uprofile', files: ['users.js']},
        {name: 'team', files: ['lib.js']}
	]
};
Component.entryPoint = function(NS){

	var Dom = YAHOO.util.Dom,
		L = YAHOO.lang;

	var NSTM = Brick.mod.team;
	var UP = Brick.mod.uprofile;
	var SysNS = Brick.mod.sys;
	
	NS.life = NSTM.life;

	this.buildTemplate({}, '');
	
	NS.emailValidate = function(email) { 
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	    return re.test(email);
	};
	
	var Member = function(d){
		d = L.merge({
			'm': '',
			'tid': 0,
			'role': { }
		}, d || {});
		
		d['role'] = L.merge({
			'id': d['uid']
		}, d['role'] || {});
		
		Member.superclass.constructor.call(this, d);
	};
	YAHOO.extend(Member, SysNS.Item, {
		init: function(d){
			this.taData = null;
			this.detail = null;
			
			this.manager = NSTM.app.get(d['m'], 'member');
			
			Member.superclass.init.call(this, d);
		},		
		update: function(d){
			this.module		= d['m'];
			this.teamid		= d['tid']|0;
			
			this.role 		= new NSTM.TeamUserRole(d['role']);
			
			if (L.isValue(d['dtl'])){
				this.detail = new this.manager.MemberDetailClass(d['dtl']);
			}
		},
		setTeamAppData: function(taData){
			this.taData = taData;
		}
	});
	NS.Member = Member;
	
	var MemberDetail = function(d){
		d = L.merge({
			// 'dsc': ''
		}, d || {});
		this.init(d);
	};
	MemberDetail.prototype = {
		init: function(d){
			this.update(d);
		},
		update: function(d){ }
	};
	NS.MemberDetail = MemberDetail;
	
	var MemberList = function(d){
		MemberList.superclass.constructor.call(this, d, Member);
	};
	YAHOO.extend(MemberList, SysNS.ItemList, {});
	NS.MemberList = MemberList;
	
	var Group = function(d){
		d = L.merge({
			'tl': '',
			'pid': 0
		}, d || {});
		Group.superclass.constructor.call(this, d);
	};
	YAHOO.extend(Group, SysNS.Item, {
		update: function(d){
			this.parentid = d['pid']|0;
			this.title = d['tl'];
		}
	});
	NS.Group = Group;

	var GroupList = function(d){
		GroupList.superclass.constructor.call(this, d, Group);
	};
	YAHOO.extend(GroupList, SysNS.ItemList, {});
	NS.GroupList = GroupList;
	
	var InGroup = function(d){
		d = L.merge({
			'gid': 0,
			'uid': 0
		}, d || {});
		InGroup.superclass.constructor.call(this, d);
	};
	YAHOO.extend(InGroup, SysNS.Item, {
		update: function(d){
			this.groupid = d['gid']|0;
			this.memberid = d['uid']|0;
		}
	});
	NS.InGroup = InGroup;

	var InGroupList = function(d){
		InGroupList.superclass.constructor.call(this, d, InGroup);
	};
	YAHOO.extend(InGroupList, SysNS.ItemList, {
		getGroupId: function(memberid){
			var groupid = 0;
			this.foreach(function(mig){
				if (mig.memberid == memberid){
					groupid = mig.groupid;
					return true;
				}
			});
			return groupid;
		},
		checkInGroup: function(memberid, groupid){
			var mgid = this.getGroupId(memberid);
			return mgid == groupid;
		}
	});
	NS.InGroupList = InGroupList;
	
	var InitData = function(manager, d){
		d = L.merge({
			'iwCount': 0,
			'iwLimit': 0
		}, d || {});
		InitData.superclass.constructor.call(this, manager, d);
	};
	YAHOO.extend(InitData, NSTM.TeamAppInitData, {
		update: function(d){
			this.inviteWaitCount = d['iwCount']|0;
			this.inviteWaitLimit = d['iwLimit']|0;
		}
	});
	NS.InitData = InitData;
	
	// Данные сообщества
	var TeamExtendedData = function(team, manager, d){
		d = L.merge({
			'members': null,
			'groups': null,
			'ingroups': null
		}, d || {});
		TeamExtendedData.superclass.constructor.call(this, team, manager, d);
	};
	YAHOO.extend(TeamExtendedData, NSTM.TeamExtendedData, {
		init: function(team, manager, d){
			
			this.memberList = new NS.MemberList();
			this.groupList = new NS.GroupList();
			this.inGroupList = new NS.InGroupList();
			
			TeamExtendedData.superclass.init.call(this, team, manager, d);
		},
		update: function(d){
			TeamExtendedData.superclass.update.call(this, d);
			
			this.updateMemberList(d);
			this.updateGroupList(d);
			this.updateInGroupList(d);
		},
		updateMemberList: function(d){
			if (!L.isValue(d) || !L.isValue(d['members']) 
				|| !L.isArray(d['members']['list'])){
				return;
			}
			
			var man = this.manager,
				dList = d['members']['list'];
			
			for (var i=0; i<dList.length; i++){
				var di = dList[i],
					curMember = this.memberList.get(di['id']);
				if (L.isValue(curMember)){
					curMember.update(di);
				}else{
					var member = new man.MemberClass(di);
					member.setTeamAppData(this);
					this.memberList.add(member);
				}
			}
		},
		updateGroupList: function(d){
			if (!L.isValue(d) || !L.isValue(d['groups']) 
					|| !L.isArray(d['groups']['list'])){
				return;
			}

			var dList = d['groups']['list'];
			for (var i=0; i<dList.length; i++){
				var di = dList[i],
					curGroup = this.groupList.get(di['id']);
				
				if (L.isValue(curGroup)){
					curGroup.update(di);
				}else{
					this.groupList.add(new NS.Group(di));
				}
			}
		},
		updateInGroupList: function(d){
			if (!L.isValue(d) || !L.isValue(d['ingroups']) 
					|| !L.isArray(d['ingroups']['list'])){
				return;
			}
			var dList = d['ingroups']['list'];
			for (var i=0; i<dList.length; i++){
				this.inGroupList.add(new NS.InGroup(dList[i]));
			}
		}
	});
	NS.TeamExtendedData = TeamExtendedData;
	
	var Navigator = function(taData){
		Navigator.superclass.constructor.call(this, taData);
	};
	YAHOO.extend(Navigator, NSTM.TeamAppNavigator, {
		memberViewURI: function(userid){
			return this.URI()+'memberview/MemberViewWidget/'+userid+'/';
		},
		memberListURI: function(){
			return this.URI()+'memberlist/GroupListWidget/';
		}
	});
	NS.Navigator = Navigator;
	
	var MemberManager = function(modName, callback, cfg){
		cfg = L.merge({
			'TeamExtendedDataClass':TeamExtendedData,
			'MemberClass':			Member,
			'MemberDetailClass':	MemberDetail,
			'NavigatorClass':		Navigator,
			'InitDataClass':		InitData
		}, cfg || {});
		
		// специализированный виджеты в перегруженном модуле
		cfg['groupEditor'] = L.merge({
			'module': '{C#MODNAME}',
			'component': 'groupeditor',
			'widget': 'GroupEditorWidget'
		}, cfg['groupEditor'] || {});

		cfg['memberEditor'] = L.merge({
			'module': '{C#MODNAME}',
			'component': 'membereditor',
			'widget': 'MemberEditorWidget'
		}, cfg['memberEditor'] || {});
		
		cfg['memberRemove'] = L.merge({
			'module': '{C#MODNAME}',
			'component': 'membereditor',
			'panel': 'MemberRemovePanel'
		}, cfg['memberEditor'] || {});
		
		MemberManager.superclass.constructor.call(this, modName, 'member', callback, cfg);
	};
	YAHOO.extend(MemberManager, Brick.mod.team.TeamAppManager, {
		init: function(callback, cfg){
			MemberManager.superclass.init.call(this, callback, cfg);
			
			this.cfg = cfg;
			
			this.MemberClass		= cfg['MemberClass'];
			this.MemberDetailClass	= cfg['MemberDetailClass'];
			
			this._cacheMember = {};
		},
		
		memberLoad: function(taData, userid, callback){
			var member = taData.memberList.get(userid);

			if (!L.isValue(member)){
				NS.life(callback, null);
				return;
			}
			
			if (L.isValue(member) && L.isValue(member.detail)){
				NS.life(callback, member);
				return;
			}
			
			this.ajax({
				'do': 'member',
				'teamid': taData.team.id,
				'userid': userid
			}, function(d){
				if (L.isValue(d) && L.isValue(d['member'])){
					member.update(d['member']);
				}
				NS.life(callback, member);
			});
		},
		memberSave: function(taData, sd, callback){
			this.ajax({
				'do': 'membersave',
				'teamid': taData.team.id,
				'savedata': sd
			}, function(d){
				taData.update(d);
				var member = null;
				if (L.isValue(d)){
					member = taData.memberList.get(d['memberid']);
				}
				NS.life(callback, member);
			});
		},
		memberInviteAccept: function(taData, userid, flag, callback){
			this.ajax({
				'do': 'memberinviteact',
				'teamid': taData.team.id,
				'userid': userid,
				'flag': flag ? 1 : 0
			}, function(d){
				taData.update(d);
				var member = null;
				if (L.isValue(d)){
					member = taData.memberList.get(d['memberid']);
				}
				NS.life(callback, member);
			});
		},
		/*
		memberRemove: function(team, memberid, callback){
			this.ajax({
				'do': 'memberremove',
				'teamid': team.id,
				'memberid': memberid
			}, function(d){
				NS.life(callback);
			});
		},
		/**/
		groupSave: function(taData, sd, callback){
			this.ajax({
				'do': 'groupsave',
				'teamid': taData.team.id,
				'savedata': sd
			}, function(d){
				taData.updateGroupList(d);
				var group = null;
				if (L.isValue(d) && d['groupid'] > 0){
					group = taData.groupList.get(d['groupid']);
				}
				NS.life(callback, group);
			});
		},
		groupRemove: function(team, groupid, callback){
			/*
			var __self = this;
			this.ajax({
				'do': 'groupremove',
				'teamid': team.id,
				'groupid': groupid
			}, function(d){
				__self._updateGroupList(team, d);
				NS.life(callback);
			});
			/**/
		}
		
	});
	NS.MemberManager = MemberManager;
	
};