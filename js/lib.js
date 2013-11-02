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

	var UP = Brick.mod.uprofile;
	var SysNS = Brick.mod.sys;

	this.buildTemplate({}, '');
	
	var _MBMODULENAMECACHE = {};
	
	// Дополнительные данные сообщества
	/*
	var AppData = function(d){
		d = L.merge({
			'members': null,
			'groups': null,
			'ingroups': null
		}, d || {});
		AppData.superclass.constructor.call(this, d);
	};
	YAHOO.extend(AppData, SysNS.Item, {
		init: function(d){
			
			this.memberList = null;
			this.memberGroupList = null;
			this.memberInGroup = null;
			
			AppData.superclass.init.call(this, d);
		}
	});
	NS.AppData = AppData;
	/**/

	var Member = function(d){
		d = L.merge({
			'm': '',
			'tid': 0,
			'uid': 0
		}, d || {});
		
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
			
			if (this.id > 0){
				_ETMODULENAMECACHE[this.id|0] = this.module;
			}
			
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
	
	var MemberGroup = function(d){
		d = L.merge({
			'tl': '',
			'pid': 0
		}, d || {});
		MemberGroup.superclass.constructor.call(this, d);
	};
	YAHOO.extend(MemberGroup, SysNS.Item, {
		update: function(d){
			this.parentid = d['pid']|0;
			this.title = d['tl'];
		}
	});
	NS.MemberGroup = MemberGroup;

	var MemberGroupList = function(d){
		MemberGroupList.superclass.constructor.call(this, d, MemberGroup);
	};
	YAHOO.extend(MemberGroupList, SysNS.ItemList, {});
	NS.MemberGroupList = MemberGroupList;
	
	var MemberInGroup = function(d){
		d = L.merge({
			'gid': 0,
			'uid': 0
		}, d || {});
		MemberInGroup.superclass.constructor.call(this, d);
	};
	YAHOO.extend(MemberInGroup, SysNS.Item, {
		update: function(d){
			this.groupid = d['gid']|0;
			this.memberid = d['uid']|0;
		}
	});
	NS.MemberInGroup = MemberInGroup;

	var MemberInGroupList = function(d){
		MemberInGroupList.superclass.constructor.call(this, d, MemberInGroup);
	};
	YAHOO.extend(MemberInGroupList, SysNS.ItemList, {
		getMemberGroupId: function(memberid){
			var groupid = 0;
			this.foreach(function(mig){
				if (mig.memberid == memberid){
					groupid = mig.groupid;
					return true;
				}
			});
			return groupid;
		},
		checkMemberInGroup: function(memberid, groupid){
			var mgid = this.getMemberGroupId(memberid);
			return mgid == groupid;
		}
	});
	NS.MemberInGroupList = MemberInGroupList;
	
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
		
	var MemberManager = function(modname, callback, cfg){
		cfg = L.merge({
			'MemberClass':			Member,
			'MemberDetailClass':	MemberDetail,
			'MemberListClass':		MemberList,
			'NavigatorClass':		Navigator
		}, cfg || {});
		
		// специализированный виджеты в перегруженном модуле
		cfg['memberGroupEditor'] = L.merge({
			'module': '{C#MODNAME}',
			'component': 'mgroupeditor',
			'widget': 'MemberGroupEditorWidget'
		}, cfg['memberGroupEditor'] || {});

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
			this.MemberListClass	= cfg['MemberListClass'];
			this.NavigatorClass		= cfg['NavigatorClass'];
			
			this._cacheMember = {};
		},
		/*
		ajax: function(d, callback){
			d = d || {};
			d['tm'] = Math.round((new Date().getTime())/1000);
			if (this._loadInitData){
				d['initdata'] = true;
			}
			var __self = this;
			Brick.ajax(this.modname, {
				'data': d,
				'event': function(request){
					var d = L.isValue(request) && L.isValue(request.data) ? request.data : null,
						result = L.isValue(d) ? (d.result ? d.result : null) : null;
					
					if (L.isValue(d)){
						if (L.isValue(d['users'])){
							__self.users.update(d['users']);
						}
						if (L.isValue(d['initdata'])){
							__self._loadInitData = false;
							__self.onLoadInitData(d['initdata']);
						}
					}
					
					NS.life(callback, result);
				}
			});
		},
		
		onLoadInitData: function(d){ },
		/**/
		
		/*
		_updateMemberGroupList: function(team, d){
			if (!L.isValue(d) || !L.isValue(d['membergroups']) || !L.isArray(d['membergroups']['list'])){
				return null;
			}
				
			var list = team.memberGroupList = new NS.MemberGroupList();
			
			var dList = d['membergroups']['list'];
			for (var i=0; i<dList.length; i++){
				list.add(new NS.MemberGroup(dList[i]));
			}
			return list;
		},

		_updateMemberInGroupList: function(team, d){
			if (!L.isValue(d) || !L.isValue(d['memberingroups']) || !L.isArray(d['memberingroups']['list'])){
				return null;
			}
				
			var list = team.memberInGroupList = new NS.MemberInGroupList();
			
			var dList = d['memberingroups']['list'];
			for (var i=0; i<dList.length; i++){
				list.add(new NS.MemberInGroup(dList[i]));
			}
			return list;
		},
		/**/
		
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
		
		_updateMemberList: function(team, d){
			if (!L.isValue(d) || !L.isValue(d['members']) || !L.isArray(d['members']['list'])){
				return null;
			}
			var list = new this.MemberListClass();
			
			var dList = d['members']['list'];
			for (var i=0; i<dList.length; i++){
				var member = new this.MemberClass(dList[i]);
				member.setTeam(team);
				list.add(member);
			}
			return list;
		},
		
		memberListLoad: function(teamid, callback){
			var __self = this;
		
			Brick.mod.team.teamLoad(teamid, function(team){
				if (!L.isValue(team)){
					NS.life(callback, null, null);
				}else{
					__self.ajax({
						'do': 'memberlist',
						'teamid': teamid
					}, function(d){
						var list = __self._updateMemberList(team, d);
						NS.life(callback, list, team);
					});
				}
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
		}
		
	});
	NS.MemberManager = MemberManager;
	
};