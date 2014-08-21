/*
@package Abricos
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'uprofile', files: ['users.js']},
		{name: 'team', files: ['editor.js']},
		{name: '{C#MODNAME}', files: ['groupeditor.js', 'lib.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var UID = Brick.env.user.id;
	var buildTemplate = this.buildTemplate;

	var MemberEditorWidget = function(container, teamid, memberid, cfg){
		cfg = L.merge({
			'modName': null,
			'callback': null,
			'override': null,
			'groupid': 0
		}, cfg || {});
		MemberEditorWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'widget', 
			'override': cfg['override']
		}, teamid, memberid, cfg);
	};
	YAHOO.extend(MemberEditorWidget, Brick.mod.widget.Widget, {
		init: function(teamid, memberid, cfg){
			this.teamid = teamid;
			this.memberid = memberid;
			this.cfg = cfg;

			this.taData = null;
			this.member = null;
			
			this.inviteWidget = null;
			this._isVirtual = false;
		},
		buildTData: function(teamid, memberid, cfg){
			return {'cledst':memberid==0?'edstnew': 'edstedit'};
		},
		onLoad: function(teamid, memberid, cfg){
			var __self = this;
			
			Brick.mod.team.teamAppDataLoad(teamid, cfg['modName'], 'member', function(taData){
				if (!L.isValue(taData)){
					__self.onLoadTeamAppData(null);
				}else{
					// запросить все приложения наследуемых от teammember
					// необходимо для выбора из списка участников добавленных в
					// другие приложения
					taData.manager.relatedModuleNameList(taData.team, function(related){
						if (related.length > 0){
							Brick.mod.team.teamAppDataLoad(teamid, related, 'member', function(){
								__self.onLoadTeamAppData(taData);
							});
						}else{
							__self.onLoadTeamAppData(taData);
						}
					});
				}
			});
		},
		onLoadTeamAppData: function(taData){
			this.taData = taData;
			
			if (!L.isValue(taData)){
				this.elHide('loading');
				this.elShow('nullitem');
				return;
			}
			
			var man = taData.manager;
			
			if (this.memberid == 0){
				var member = new man.MemberClass({
					'm': this.cfg['modName'],
					'dtl': {}
				});
				member.setTeamAppData(taData);
				this.onLoadMember(member);
			}else{
				var __self = this;
				man.memberLoad(taData, this.memberid, function(member){
					__self.onLoadMember(member);
				});
			}
		},
		onLoadMember: function(member){
			this.member = member;
			var taData = this.taData;
			
			if (!L.isValue(member)){
				this.elHide('loading');
				this.elShow('nullitem');
				return;
			}
			
			var cfg = this.cfg, groupid = cfg['groupid'];
			if (this.memberid == 0){
				var __self = this;
				this.inviteWidget = new NS.MemberInviteWidget(this.gel('invite'), taData, {
					'override': cfg['override'],
					'startCallback': function(eml){ },
					'finishCallback': function(eml, user, femp){
						__self.render();
					}
				});
				this.existJoinWidget = new NS.MemberExistingJoinWidget(this.gel('existjoin'), taData, {
					'override': cfg['override'],
					'callback': function(){
						__self.render();
					}
				});
			}else{
				groupid = taData.inGroupList.getGroupId(this.memberid);
			}
			this.groupSelectWidget = new NS.GroupSelectWidget(this.gel('groups'), taData, groupid);

			this.render();
		},
		onClick: function(el, tp){
			this.clearError();

			switch(el.id){
			case tp['bskip']: this.setVirtual(); return true;
			
			case tp['bcreate']:
			case tp['bsave']: this.save(); return true;
			case tp['bcancel']: this.cancel(); return true;
			}
			
			return false;
		},
		setVirtual: function(){
			this._isVirtual = true;
			this.render();
		},
		render: function(){
			
			var taData = this.taData;
			
			if (!L.isValue(taData)){ return; }
			
			this.elHide('loading');
			this.elShow('editor');
			
			var u = Brick.env.user;
			if (u.firstname.length == 0 || u.lastname.length == 0){
				var __self = this;
				var editor = new NS.MyNameEditorWidget(this.gel('mynameeditor'), this.taData, function(act){
					editor.destroy();
					if (act == 'cancel'){
						__self.cancel();
					}else{
						__self.render();
					}
				});
				this.elHide('profileok');
				return;
			}
			
			this.elShow('profileok');
			this.elHide('empinfo');
			
			var member = this.member;
			
			this.elDisable('userfname,userlname');
			
			if (member.id == 0){ // добавление сотрудника (приглашение)
				if (!this._isVirtual){
					
					var extMemberId = this.existJoinWidget.getValue();
					if (extMemberId > 0){
						this.elEnable('bcreate');
						this.elHide('bskip,invite,empunm');
						this.elShow('empinfo');
					}else{
						this.elDisable('bcreate');
						this.elShow('bskip,invite,empunm');
						this.elHide('empinfo');
					}
					
					var inv = this.inviteWidget.getValue();
					
					if (L.isNull(inv)){ // не осуществлен поиск пользователя по емайл 
						return; 
					}
					
					if (!L.isNull(inv) && !L.isNull(inv['member'])){
						return;
					}
					
					if (this.inviteWidget.availableInvite()>0){
						this.elEnable('bcreate');
						this.elHide('bskip');
					}
					this.elHide('existjoin');					
					this.elShow('empinfo');
					
					user = inv['user'];
					if (L.isNull(user)){ // новый пользователь 
						this.elEnable('userfname,userlname');
						return; 
					}
					
					this.elSetValue({
						'userfname': user['fnm'],
						'userlname': user['lnm']
					});
					if (user['id'] == UID){
						this.elEnable('userfname,userlname');
					}
				}else{
					this.elHide('bskip,invite,existjoin');
					this.elShow('empinfo');
					this.elEnable('bcreate,userfname,userlname');
				}
				
			}else{ // редактирование существующего
				this.elShow('empinfo');
				
				if (member.id == UID){
					this.elEnable('userfname,userlname');
				}
				var user = taData.manager.users.get(member.id);
				if (!L.isNull(user)){
					this.elSetValue({
						'userfname': user.firstName,
						'userlname': user.lastName
					});
				}
			}
		},
		clearError: function(){
			for (var i=0;i<10;i++){
				this.elHide('err'+i);
			}
		},
		showError: function(num){
			this.clearError();
			this.elShow('err'+num);
		},
		cancel: function(){
			NS.life(this.cfg['callback'], 'cancel');
		},
		getSaveData: function(){
			return sd = {
				'id': this.member.id,
				'teamid': this.taData.team.id,
				'groupid': this.groupSelectWidget.getValue(),
				'vrt': this._isVirtual ? 1 : 0,
				'fnm': this.gel('userfname').value,
				'lnm': this.gel('userlname').value
			};
		},
		save: function(){
			var sd = this.getSaveData();

			var inv = null;
			if (this.member.id == 0){
				if (!this._isVirtual){
					var extMemberId = this.existJoinWidget.getValue();
					if (extMemberId > 0){
						sd['extmemberid'] = extMemberId;
					}else {
						inv = this.inviteWidget.getValue();
						if (L.isNull(inv)){ return; }
						sd['email'] = inv['email'];
						
						if (L.isNull(inv['user']) && 
							(sd['fnm'].length == 0 || sd['lnm'].length == 0)){
							this.showError(0);
							return;
						}
					}
				}
			}
			
			this.elHide('btns');
			this.elShow('bloading');

			var __self = this;
			
			var taData = this.taData;
			taData.manager.memberSave(taData, sd, function(member){
				__self.elShow('btns');
				__self.elHide('bloading');
				NS.life(__self.cfg['callback'], 'save', member);
			});
		}
	});
	NS.MemberEditorWidget = MemberEditorWidget;	
	
	var MyNameEditorWidget = function(container, taData, callback){
		MyNameEditorWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'myname' 
		}, taData, callback);
	};
	YAHOO.extend(MyNameEditorWidget, Brick.mod.widget.Widget, {
		init: function(taData, callback){
			this.taData = taData;
			this.callback = callback;
			this.editor = null;
		},
		onLoad: function(){
			var u = Brick.env.user;
			this.elSetValue({
				'myfname': u.firstname,
				'mylname': u.lastname
			});
			
			var __self = this;
			E.on(this.gel('fields'), 'keypress', function(e){
				if (e.keyCode != 13){ return false; }
				__self.saveMyProfile();
				return true;
			});
		},
		onClick: function(el, tp){
			switch(el.id){
			case tp['bsave']: this.saveMyProfile(); return true;
			case tp['bcancel']: this.cancel(); return true;
			}
		},
		cancel: function(){
			NS.life(this.callback, 'cancel');
		},
		saveMyProfile: function(){
			var __self = this;
			this.elHide('mypbtns');
			this.elShow('myloading');
	
			this.taData.manager.ajax({
				'do': 'mynamesave',
				'firstname': this.gel('myfname').value,
				'lastname': this.gel('mylname').value
			}, function(d){
				__self.elShow('mypbtns');
				__self.elHide('myloading');

				if (!L.isNull(d)){ 
					var u = Brick.env.user;
					u.firstname = d['firstname'];
					u.lastname = d['lastname'];
				}
				
				NS.life(__self.callback, 'save');
			});
		}
	});
	NS.MyNameEditorWidget = MyNameEditorWidget;
	
	var MemberExistingJoinWidget = function(container, taData, cfg){
		cfg = L.merge({
			'callback': null,
			'override': null
		}, cfg || {});
		MemberExistingJoinWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'existjoin',
			'override': cfg['override']
		}, taData, cfg);
	};
	YAHOO.extend(MemberExistingJoinWidget, Brick.mod.widget.Widget, {
		init: function(taData, cfg){
			this.taData = taData;
			this.cfg = cfg;
		},
		onLoad: function(taData, cfg){
			
			var team = taData.team, memberList = new NS.MemberList();
			
			if (!L.isValue(taData.memberList.get(UID))){
				memberList.add(taData.newMember({
					'id': UID
				}));
			}
			
			team.extended.foreach(function(eTaData){
				if (taData == eTaData || eTaData.manager.appName != 'member'){
					return; 
				}
				eTaData.memberList.foreach(function(member){
					if (L.isValue(taData.memberList.get(member.id))
						|| L.isValue(memberList.get(member.id))){
						return;
					}
					memberList.add(member);
				});
			});
			
			var exc = [];
			this.selectWidget = new NS.MemberSelectWidget(this.gel('select'), memberList, {
				'exclude': exc,
				'onChange': function(){
					NS.life(cfg['callback']);
				}
			});
		},
		getValue: function(){
			return this.selectWidget.getValue();
		}
	});
	NS.MemberExistingJoinWidget = MemberExistingJoinWidget;
	
	var MemberInviteWidget = function(container, taData, cfg){
		cfg = L.merge({
			'startCallback': null,
			'finishCallback': null,
			'override': null
		}, cfg || {});
		MemberInviteWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'invite',
			'override': cfg['override']
		}, taData, cfg);
	};
	YAHOO.extend(MemberInviteWidget, Brick.mod.widget.Widget, {
		init: function(taData, cfg){
			this.taData = taData;
			this.cfg = cfg;
			this.value = null;
			this._isProcess = false;
		},
		availableInvite: function(){
			var ucfg  = this.taData.manager.initData;
			if (ucfg['inviteWaitLimit'] == -1){
				return 999;
			}
			return ucfg['inviteWaitLimit'] - ucfg['inviteWaitCount'];
		},
		buildTData: function(taData, cfg){
			return {
				'invcnt': this.availableInvite(),
				'waitcnt':  taData.manager.initData['inviteWaitCount']
			};
		},
		onLoad: function(taData, cfg){
			var __self = this;
			E.on(this.gel('email'), 'keyup', function(e){
				__self.emailValidate();
			});

			this.userFind = new NS.UserFindByEmail(
				function(eml){ __self._startCheckCallback(eml); },
				function(eml, user){ __self._finishCheckCallback(eml, user); }
			);
		},
		onClick: function(el, tp){
			switch(el.id){
			case tp['bfind']: this.find(); return true;
			}
		},
		onEnter: function(el, tp){
			switch(el.id){
			case tp['email']: this.find(); return true;
			}
		},
		find: function(){
			if (this._isProcess){ return; }
			this.userFind.find(this.gel('email').value);
		},
		emailValidate: function(){
			if (this._isProcess){ return; }
			if (NS.emailValidate(this.gel('email').value)){
				this.gel('bfind').disabled = "";
			}else{
				this.gel('bfind').disabled = "disabled";
			}
		},
		_startCheckCallback: function(eml){
			if (this._isProcess){ return; }
			this._isProcess = true;

			this.value = null;
			this.elDisable('bfind');
			this.elShow('emlld');
			this.gel('email').readonly = "readonly";
			NS.life(this.cfg['startCallback'], eml);
		},
		_finishCheckCallback: function(eml, user){
			this._isProcess = false;
			
			for (var i=0;i<10;i++){
				this.elSetHTML('resemail'+i, eml);
			}
			this.elEnable('bfind');
			this.gel('email').readonly = "";
			this.elHide('emlld,userfound,usernotfound,empfound,empnotfound');
			
			this.elShow('waitinfo');
			var member = null;
			
			if (L.isNull(user)){
				this.elShow('usernotfound');
			}else{
				this.elShow('userfound,next');
				
				member = this.team.memberList.get(user.id);
				
				if (L.isNull(member)){
					this.elShow('empnotfound');
					this.elSetValue({
						'username': user['unm']
					});
				}else{
					this.elShow('empfound');
				}
			}
			this.value = {
				'email': eml,
				'user': user,
				'member': member
			};
			NS.life(this.cfg['finishCallback'], eml, user, member);
		},
		getValue: function(){
			return this.value;
		}
	});
	NS.MemberInviteWidget = MemberInviteWidget;
	
	var UserFindByEmail = function(startCallback, finishCallback){
		this.init(startCallback, finishCallback);
	};
	UserFindByEmail.prototype = {
		init: function(startCallback, finishCallback){
			this.startCallback = startCallback;
			this.finishCallback = finishCallback;

			this._checkUserCache = {};
		},
		find: function(eml){
			if (!NS.emailValidate(eml)){
				return false;
			}
			this._findMethod(eml);
			return true;
		},
		_findMethod: function(eml){
			var chk = this._checkUserCache;
			if (chk[eml] && chk[eml]['isprocess']){
				// этот емайл сейчас уже находится в запросе
				return; 
			}
			
			NS.life(this.startCallback, eml);

			if (chk[eml] && chk[eml]['result']){
				NS.life(this.finishCallback, eml);
				return;
			}
			chk[eml] = { 'isprocess': true };

			var __self = this;

			Brick.ajax('{C#MODNAME}', {
				'data': {
					'do': 'userfindbyemail',
					'email': eml
				},
				'event': function(request){
					var d = request.data,
						user = null;
					if (!L.isNull(d)){
						eml = d['email'];
						user = d['user'];
					}
					chk[eml]['isprocess'] = false;
					chk[eml]['result'] = user;
					NS.life(__self.finishCallback, eml, user);
				}
			});
		}
	};
	NS.UserFindByEmail = UserFindByEmail;
	
	var MemberRemovePanel = function(team, member, callback){
		this.team = team;
		this.member = member;
		this.callback = callback;
		MemberRemovePanel.superclass.constructor.call(this, {fixedcenter: true});
	};
	YAHOO.extend(MemberRemovePanel, Brick.widget.Dialog, {
		initTemplate: function(){
			return buildTemplate(this, 'removepanel').replace('removepanel');
		},
		onClick: function(el){
			var tp = this._TId['removepanel'];
			switch(el.id){
			case tp['bcancel']: this.close(); return true;
			case tp['bremove']: this.remove(); return true;
			}
			return false;
		},
		remove: function(){
			var TM = this._TM, gel = function(n){ return  TM.getEl('removepanel.'+n); },
				__self = this;
			Dom.setStyle(gel('btns'), 'display', 'none');
			Dom.setStyle(gel('bloading'), 'display', '');
			this.team.memberRemove(this.team, this.member, function(){
				__self.close();
				NS.life(__self.callback);
			});
		}
	});
	NS.MemberRemovePanel = MemberRemovePanel;	
};