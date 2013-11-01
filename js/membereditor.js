/*
@package Abricos
@license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
*/

var Component = new Brick.Component();
Component.requires = {
	mod:[
		{name: 'uprofile', files: ['users.js']},
		{name: 'team', files: ['mgroupeditor.js', 'editor.js']}
	]
};
Component.entryPoint = function(NS){
	
	var Dom = YAHOO.util.Dom,
		E = YAHOO.util.Event,
		L = YAHOO.lang;
	
	var UID = Brick.env.user.id;
	var buildTemplate = this.buildTemplate;

	var MemberEditorWidget = function(container, team, member, callback, cfg){
		cfg = L.merge({
			'override': null
		}, cfg || {});
		MemberEditorWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'widget', 
			'override': cfg['override']
		}, team, member, callback, cfg);
	};
	YAHOO.extend(MemberEditorWidget, Brick.mod.widget.Widget, {
		init: function(team, member, callback, cfg){
			this.team = team;
			this.member = member;
			this.callback = callback;
			this.cfg = cfg;
			this.inviteWidget = null;
			this._isVirtual = false;
		},
		buildTData: function(team, member, callback, cfg){
			return {'cledst':member.id==0?'edstnew': 'edstedit'};
		},
		onLoad: function(team, member, callback, cfg){
			if (member.id == 0){
				var __self = this;
				this.inviteWidget = new NS.MemberInviteWidget(this.gel('invite'), team, {
					'override': cfg['override'],
					'startCallback': function(eml){ },
					'finishCallback': function(eml, user, femp){
						__self.render();
					}
				});
				this.existJoinWidget = new NS.MemberExistingJoinWidget(this.gel('existjoin'), team, {
					'override': cfg['override'],
					'callback': function(){
						__self.render();
					}
				});
			}
			var groupid = team.memberInGroupList.getMemberGroupId(member.id);
			this.groupSelectWidget = new NS.MemberGroupSelectWidget(this.gel('groups'), team, groupid);
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
			
			this.elHide('loading');
			this.elShow('editor');
			
			var u = Brick.env.user;
			if (u.firstname.length == 0 || u.lastname.length == 0){
				var __self = this;
				var editor = new NS.MyNameEditorWidget(this.gel('mynameeditor'), this.team, function(act){
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
				var user = this.team.manager.users.get(member.id);
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
			NS.life(this.callback, 'cancel');
		},
		getSaveData: function(){
			return sd = {
				'id': this.member.id,
				'teamid': this.team.id,
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
			
			this.team.manager.memberSave(this.team, sd, function(member){
				__self.elShow('btns');
				__self.elHide('bloading');
				NS.life(__self.callback, 'save', member);
			});
		}
	});
	NS.MemberEditorWidget = MemberEditorWidget;	
	
	var MyNameEditorWidget = function(container, team, callback){
		MyNameEditorWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'myname' 
		}, team, callback);
	};
	YAHOO.extend(MyNameEditorWidget, Brick.mod.widget.Widget, {
		init: function(team, callback){
			this.team = team;
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
			
			this.team.manager.ajax({
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
	
	var MemberExistingJoinWidget = function(container, team, cfg){
		cfg = L.merge({
			'callback': null,
			'override': null
		}, cfg || {});
		MemberExistingJoinWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'existjoin',
			'override': cfg['override']
		}, team, cfg);
	};
	YAHOO.extend(MemberExistingJoinWidget, Brick.mod.widget.Widget, {
		init: function(team, cfg){
			this.team = team;
			this.cfg = cfg;
		},
		onLoad: function(team, cfg){
			var gMemberList = NS.Team.globalMemberList.get(team.id);
			
			var exc = [];
			team.memberList.foreach(function(member){
				if (!member.role.isModMember){ return; }
				exc[exc.length] = member.id;
			});
			this.selectWidget = new NS.MemberSelectWidget(this.gel('select'), gMemberList, {
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
	
	var MemberInviteWidget = function(container, team, cfg){
		cfg = L.merge({
			'startCallback': null,
			'finishCallback': null,
			'override': null
		}, cfg || {});
		MemberInviteWidget.superclass.constructor.call(this, container, {
			'buildTemplate': buildTemplate, 'tnames': 'invite',
			'override': cfg['override']
		}, team, cfg);
	};
	YAHOO.extend(MemberInviteWidget, Brick.mod.widget.Widget, {
		init: function(team, cfg){
			this.team = team;
			this.cfg = cfg;
			this.value = null;
			this._isProcess = false;
		},
		availableInvite: function(){
			var ucfg  = this.team.manager.userConfig;
			if (ucfg['inviteWaitLimit'] == -1){
				return 999;
			}
			return ucfg['inviteWaitLimit'] - ucfg['inviteWaitCount'];
		},
		buildTData: function(team, cfg){
			return {
				'invcnt': this.availableInvite(),
				'waitcnt':  this.team.manager.userConfig['inviteWaitCount']
			};
		},
		onLoad: function(team, cfg){
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