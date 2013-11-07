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
			
			var man = this.manager, team = this.team,
				dList = d['members']['list'];
			
			for (var i=0; i<dList.length; i++){
				var di = dList[i],
					curMember = this.memberList.get(di['id']);
				if (L.isValue(curMember)){
					curMember.update(di);
				}else{
					var member = new man.MemberClass(di);
					member.setTeam(team);
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
	

	var Member = function(d){
		Brick.console(d);
		d = L.merge({
			'm': '',
			'tid': 0,
			'uid': 0,
			'role': { }
		}, d || {});
		
		d['role'] = L.merge({
			'id': d['uid']
		}, d['role'] || {});
		
		this.manager = MemberManager.get(d['m']);
		
		Member.superclass.constructor.call(this, d);
	};
	YAHOO.extend(Member, SysNS.Item, {
		init: function(d){
			this.team = null;
			this.navigator = null;
			this.detail = null;
			
			this.manager = MemberManager.get(d['m']);
			
			Member.superclass.init.call(this, d);
		},		
		update: function(d){
			this.module		= d['m'];
			this.teamid		= d['tid']|0;
			this.userid		= d['uid']|0;
			
			this.role 		= new NSTM.TeamUserRole(d['role']);
			
			/*
			if (this.id > 0){
				_ETMODULENAMECACHE[this.id|0] = this.module;
			}
			/**/
			
			if (L.isValue(d['dtl'])){
				this.detail = new this.manager.MemberDetailClass(d['dtl']);
			}
		},
		setTeam: function(team){
			this.team = team;
			this.navigator = new this.manager['NavigatorClass'](this);
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
		update: function(d){
			// this.address = d['adr'];
		}
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
	
	var Navigator = function(member){
		this.init(member);
	};
	Navigator.prototype = {
		init: function(member){
			this.member = member;
		},
		URI: function(){
			return this.member.team.navigator.URI()+this.member.module+'/';
		},
		memberList: function(){
			return this.URI()+'memberlist/TeamMemberListWidget/';
		},
		memberView: function(){
			return this.URI()+'memberview/TeamMemberViewWidget/'+this.member.id+'/';
		}
	};
	NS.Navigator = Navigator;
		
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
	
	var MemberManager = function(modname, callback, cfg){
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
		
		MemberManager.superclass.constructor.call(this, modname, callback, cfg);
	};
	YAHOO.extend(MemberManager, Brick.mod.team.TeamAppManager, {
		init: function(callback, cfg){
			MemberManager.superclass.init.call(this, callback, cfg);
			
			this.cfg = cfg;
			
			this.MemberClass		= cfg['MemberClass'];
			this.MemberDetailClass	= cfg['MemberDetailClass'];
			this.NavigatorClass		= cfg['NavigatorClass'];
			
			this._cacheMember = {};
		},
		
		/*

		_updateMember: function(team, d){
			if (!(L.isValue(d) && L.isValue(d['member']))){
				return null;
			}
			var member = new this.MemberClass(d['member']);
			member.setTeam(team);
			return member;
		},
		
		memberLoad: function(memberid, callback, cfg){
			cfg = L.merge({
				'reload': false
			}, cfg || {});
			
			var __self = this,
				member = this._cacheMember[memberid];
			
			if (L.isValue(member) && L.isValue(member.detail) && !cfg['reload']){
				NS.life(callback, member, member.team);
				return;
			}			
			
			this.ajax({
				'do': 'member',
				'memberid': memberid
			}, function(d){
				
				if (!L.isValue(d) || !L.isValue(d['member'])){
					NS.life(callback, null, null);
					return;
				}
				Brick.mod.team.teamLoad(d['member']['tid'], function(team){
					var member = null;
					if (L.isValue(team)){
						member = __self._updateMember(team, d);
						__self._cacheMember[memberid] = member;
					}
					NS.life(callback, member, team);
				});
			});			
		},
		
		memberSave: function(teamid, sd, callback){
			var __self = this;
			this.ajax({
				'do': 'membersave',
				'teamid': teamid,
				'savedata': sd
			}, function(d){
				var member = __self._updateMember(d);
				NS.life(callback, member);
			});
		},

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