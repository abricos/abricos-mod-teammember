<?php 
/**
 * @package Abricos
 * @subpackage TeamMember
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */
require_once 'dbquery.php';

class TeamMemberManager extends TeamAppManager {
	
	/**
	 * @var TeamMember
	 */
	public $MemberClass			= TeamMember;
	public $MemberDetailClass	= TeamMemberDetail;
	public $MemberListClass		= TeamMemberList;
	
	public $fldExtMember		= array();
	public $fldExtMemberDetail	= array();
	
	/**
	 * @param Ab_ModuleManager $modManager
	 */
	public function __construct(Ab_ModuleManager $mman, $appName = ''){
		parent::__construct($mman, $appName);
		
		$this->TeamAppNavigatorClass	= TeamMemberNavigator;
	}
	
	public function IsAdminRole(){ return $this->modManager->IsAdminRole(); }
	public function IsWriteRole(){ return $this->modManager->IsWriteRole(); }
	public function IsViewRole(){ return $this->modManager->IsViewRole(); }
	
	/**
	 * @param array $d
	 * @return TeamMember
	 */
	public function NewMember($d){ 
		return new $this->MemberClass($d);
	}
	
	/**
	 * @param Team $team
	 * @return TeamDetail
	 */
	public function NewMemberDetail(TeamMember $member, $d){
		return new $this->MemberDetailClass($member, $d);
	}

	/**
	 * @return TeamMemberList
	 */
	public function NewMemberList(){ return new $this->MemberListClass(); }
	
	public function AJAXMethod($d){
		switch($d->do){
			
			case 'member':	 	return $this->MemberToAJAX($d->teamid, $d->memberid);
			case 'memberlist': 	return $this->MemberListToAJAX($d->teamid);
			case 'membersave': 	return $this->MemberSaveToAJAX($d->teamid, $d->savedata);
			case 'memberremove':return $this->MemberRemove($d->teamid, $d->memberid);
			
			case 'grouplist':	return $this->GroupListToAJAX($d->teamid);
			case 'groupsave': return $this->GroupSaveToAJAX($d->teamid, $d->savedata);
			case 'groupremove': return $this->GroupRemoveToAJAX($d->teamid, $d->groupid);
			
			case 'memberinviteact': return $this->MemberInviteAcceptToAJAX($d->teamid, $d->userid, $d->flag);
				
			case 'mynamesave': return $this->MyNameSave($d);
		}
		return parent::AJAXMethod($d);
	}
	
	/**
	 * @param integer $teamid
	 * @return Team
	 */
	public function Team($teamid){
		Abricos::GetModule('team')->GetManager();
		return TeamModuleManager::$instance->Team($teamid);
	}
	
	public function TeamExtendedDataToAJAX($teamid){
		$ret = parent::TeamExtendedDataToAJAX($teamid);
		
		$obj = $this->MemberListToAJAX($teamid);
		$ret->members = $obj->members;
		
		$obj = $this->GroupListToAJAX($teamid);
		$ret->groups = $obj->groups;
		
		$obj = $this->InGroupListToAJAX($teamid);
		$ret->ingroups = $obj->ingroups;
		
		return $ret;
	}
	
	/**
	 * Участник сообщества
	 *
	 * @param integer $teamid
	 * @param integer $memberid
	 * @return Member
	 */
	public function Member($teamid, $memberid){
	
		$team = $this->Team($teamid);
		if (empty($team)){
			return null;
		}
	
		$row = TeamMemberQuery::Member($this, $team, $memberid);
		if (empty($row)){
			return null;
		}
	
		$member = $this->NewMember($team, $row);
	
		$member->detail = $this->NewMemberDetail($member);
	
		return $member;
	}
	
	public function MemberToAJAX($teamid, $memberid){
		$member = $this->Member($teamid, $memberid);
	
		if (empty($member)){
			return null;
		}
	
		TeamUserManager::AddId($memberid);
	
		$ret = new stdClass();
		$ret->member = $member->ToAJAX();
	
		return $ret;
	}
	
	/**
	 * @param integer $teamid
	 * @return MemberList
	 */
	public function MemberList($teamid, $clearCache = false){
		$team = $this->Team($teamid);
	
		if (empty($team)){ return null; }
	
		$cacheName = "memberlist";
	
		if ($clearCache){
			$this->CacheClear($cacheName, $teamid);
		}
	
		$list = $this->Cache($cacheName, $teamid);
	
		if (!empty($list)){
			return $list;
		}
	
		$rows = TeamMemberQuery::MemberList($this, $team);
		$list = $this->NewMemberList();
		while (($d = $this->db->fetch_array($rows))){
			$member = $this->NewMember($d);
			$list->Add($member);
				
			TeamUserManager::AddId($member->id);
		}
		$this->CacheAdd($cacheName, $teamid, $list);
	
		return $list;
	}
	
	public function MemberListToAJAX($teamid, $clearCache = false){
		$list = $this->MemberList($teamid, $clearCache);
		if (empty($list)){
			return null;
		}
	
		$ret = new stdClass();
		$ret->members = $list->ToAJAX();
	
		return $ret;
	}
	
	public function MemberSave($teamid, $d){
		$team = $this->Team($teamid);
	
		if (!$team->role->IsAdmin()){ // текущий пользователь не админ => нет прав
			return null;
		}
		$d->id = intval($d->id);
	
		if ($d->id == 0){ // Добавление участника
				
			if ($d->vrt == 1){ // Добавление виртуального участника
	
				$invite = $this->MemberNewInvite($team, $d->email, $d->fnm, $d->lnm, true);
	
				if (is_null($invite)){
					return null;
				}
				$d->id = $invite->user['id'];
	
			}else{
	
				// приглашение участника в группу по email
				$d->email = strtolower($d->email);
				if (!Abricos::$user->GetManager()->EmailValidate($d->email)){
					return null;
				}
				Abricos::GetModule('team')->GetManager();
				$rd = TeamModuleManager::$instance->UserFindByEmail($d->email);
	
				if (empty($rd)){
					return null;
				}
	
				if (!empty($rd->user) && $rd->user['id'] == $this->userid){
					if ($team->role->IsMember()){
						// уже участник группы
						// return null;
					}
					// добавляем себя в участники
					$d->id = $rd->user['id'];
				}else{
					// есть ли лимит на кол-во приглашений
					$ucfg = $this->UserConfig();
	
					if ($ucfg->inviteWaitLimit > -1 &&
							($ucfg->inviteWaitLimit - $ucfg->inviteWaitCount) < 1){
						// нужно подтвердить других участников, чтобы иметь возможность добавить еще
						return null;
					}
	
					if (empty($rd->user)){ // не найден такой пользователь в системе по емайл
						// сгенерировать учетку с паролем и выслать приглашение пользователю
						$invite = $this->MemberNewInvite($team, $d->email, $d->fnm, $d->lnm, false);
						if (is_null($invite)){
							return null;
						}
	
						// отправка уведомление
						$this->MemberNewInviteSendMail($team, $d->email, $d->fnm, $d->lnm, $invite);
	
						$d->id = $invite->user['id'];
					}else{
						// выслать приглашение существующему пользователю
						$d->id = $rd->user['id'];
	
						$member = $this->Member($teamid, $rd->user['id']);
	
						if (!empty($member) && $member->role->IsMember()){
							// этот пользователь уже участник группы
							sleep(1);
							return null;
						}
						// приглашение существующего пользователя в группу
						$this->MemberInvite($team, $d->id);
	
						// отправка уведомления
						$this->MemberInviteSendMail($team, $d->id);
					}
				}
			}
	
		}else{
				
		}
	
		$this->CacheClear($teamid);
	
		$memberid = $d->id;
	
		// сохранение группы пользователя
		$groupid = intval($d->groupid);
	
		$mgList = $this->MemberGroupList($teamid);
		$mg = $mgList->Get($groupid);
		if (empty($mg)){
			$groupid = 0;
		}
	
		$migList = $this->MemberInGroupList($teamid);
		$mig = $migList->GetByMemberId($memberid);
		$curgroupid = empty($mig) ? 0 : $mig->groupid;
	
		if ($groupid != $curgroupid){ // изменения по группе
				
			// удалить из текущей
			TeamMemberQuery::MemberRemoveFromGroup($this->db, $curgroupid, $memberid);
				
			// добавить в новую
			if ($groupid > 0){
				TeamMemberQuery::MemberAddToGroup($this->db, $groupid, $memberid);
			}
		}
	
		$this->TeamMemberCountRecalc($teamid);
	
		return $d->id;
	}
	
	public function MemberSaveToAJAX($teamid, $d){
		$memberid = $this->MemberSave($teamid, $d);
		if (empty($memberid)){
			return null;
		}
	
		$this->CacheClear($teamid);
	
		$ret = $this->MemberListToAJAX($teamid);
	
		$obj = $this->MemberToAJAX($teamid, $memberid);
		$ret->memberid = $memberid;
		$ret->member = $obj->member;
	
		return $ret;
	}
	
	/**
	 * Зарегистрировать нового пользователя
	 *
	 * Если пользователь виртуальный, то его можно будет пригласить позже.
	 * Виртаульный пользователь необходим для того, чтобы можно было работать с
	 * его учеткой как с реальным пользователем. Допустим, создается список сотрудников
	 * компании. Выяснять их существующие емайлы или регить новые - процесс длительный,
	 * а работать в системе уже нужно сейчас. Поэтому сначало создается виртуальный
	 * пользователь, а уже потом, если будет он переводиться в статус реального
	 * с формированием пароля и отправкой приглашения.
	 *
	 * @param string $email
	 * @param string $fname Имя
	 * @param string $lname Фамилия
	 * @param boolean $isVirtual True-виртуальный пользователь
	 */
	protected function MemberNewInvite(Team $team, $email, $fname, $lname, $isVirtual = false){
	
		Abricos::GetModule('invite');
		$manInv = InviteModule::$instance->GetManager();
	
		// зарегистрировать пользователя (будет сгенерировано имя и пароль)
		$invite = $manInv->UserRegister($this->moduleName, $email, $fname, $lname, $isVirtual);
	
		if ($invite->error == 0){
			if ($isVirtual){
				// виртуальному пользователю сразу ставим статус подвержденного свою учетку
				TeamMemberQuery::UserSetMember($this->db, $team->id, $invite->user['id']);
			}else{
				// пометка пользователя флагом приглашенного
				// (система ожидает подтверждение от пользователя)
				TeamMemberQuery::MemberInviteSetWait($this->db, $team->id, $invite->user['id'], $this->userid);
			}
		}
	
		return $invite;
	}
	
	/**
	 * Отправка приглашения новому участнику
	 *
	 * @param Team $team
	 * @param unknown_type $email
	 * @param unknown_type $fname
	 * @param unknown_type $lname
	 * @param unknown_type $invite
	 */
	protected function MemberNewInviteSendMail(Team $team, $email, $fname, $lname, $invite){
		$inu = $invite->user;
	
		$repd = array(
				"author" => TeamUserManager::Get($this->userid)->UserNameBuild(),
				"teamtitle" => $team->title,
				"username" => $fname." ".$lname,
				"inviteurl" =>  $invite->URL."/".$this->Navigator()->MemberView($team->id, $inu['id'], $this->moduleName),
				"login" => $inu['login'],
				"password" => $inu['password'],
				"email" => $email,
				"teamurl" => $this->Navigator(true)->TeamView($team->id),
				"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
		);
	
		$brick = Brick::$builder->LoadBrickS($this->moduleName, 'templates', null, null);
		if (empty($brick)
				|| empty($brick->param->var['mbrinvitesubject'])
				|| empty($brick->param->var['mbrinvitebody'])){
				
			$brick = Brick::$builder->LoadBrickS("team", 'templates', null, null);
		}
		$v = &$brick->param->var;
	
		$subject = Brick::ReplaceVarByData($v['mbrinvitesubject'], $repd);
		$body = Brick::ReplaceVarByData($v['mbrinvitebody'], $repd);
	
		Abricos::Notify()->SendMail($email, $subject, $body);
	}
	
	/**
	 * Пригласить существуюищего пользователя
	 *
	 * @param Team $team
	 * @param integer $userid
	 */
	protected function MemberInvite(Team $team, $userid){
		$user = TeamUserManager::Get($userid);
	
		if (empty($user)){
			return null;
		}
		// TODO: необходимо запрашивать разрешение на приглашение пользователя
		// пометка пользователя флагом приглашенного
		TeamMemberQuery::MemberInviteSetWait($this->db, $team->id, $userid, $this->userid);
	
		return $userid;
	}
	
	/**
	 * Отправить приглашение на вступление существующему пользователю
	 *
	 * @param Team $team
	 * @param integer $userid
	 */
	protected function MemberInviteSendMail(Team $team, $userid){
	
		$userEml = UserQueryExt::User($this->db, $userid);
	
		$host = $_SERVER['HTTP_HOST'] ? $_SERVER['HTTP_HOST'] : $_ENV['HTTP_HOST'];
	
		$repd = array(
				"author" => TeamUserManager::Get($this->userid)->UserNameBuild(),
				"teamtitle" => $team->title,
				"username" => TeamUserManager::Get($userid)->UserNameBuild(),
				"inviteurl" => $this->Navigator(true)->MemberView($team->id, $userid, $this->moduleName),
				"email" => $userEml['email'],
				"teamurl" => $this->Navigator(true)->TeamView($team->id),
				"sitename" => Brick::$builder->phrase->Get('sys', 'site_name')
		);
	
		$brick = Brick::$builder->LoadBrickS($this->moduleName, 'templates', null, null);
		if (empty($brick)
				|| empty($brick->param->var['mbraddsubject'])
				|| empty($brick->param->var['mbraddbody'])){
	
			$brick = Brick::$builder->LoadBrickS("team", 'templates', null, null);
		}
		$v = &$brick->param->var;
	
		$subject = Brick::ReplaceVarByData($v['mbraddsubject'], $repd);
		$body = Brick::ReplaceVarByData($v['mbraddbody'], $repd);
	
		Abricos::Notify()->SendMail($d->email, $subject, $body);
	}
	
	/**
	 * Принять/отказать приглашение пользователя в сообещство
	 *
	 * @param integer $teamid
	 * @param integer $memberid
	 * @param boolean $flag TRUE-принять, FALSE-отказать
	 */
	public function MemberInviteAccept($teamid, $memberid, $flag){
		$member = $this->Member($teamid, $memberid);
	
		if (empty($member) || $member->id != $this->userid){
			return null;
		}
	
		if ($flag){
			TeamMemberQuery::MemberInviteSetAccept($this->db, $teamid, $memberid);
		}else{
			TeamMemberQuery::MemberInviteSetReject($this->db, $teamid, $memberid);
		}
	
		$this->TeamMemberCountRecalc($teamid);
	
		$this->CacheClear($teamid);
	
		return $memberid;
	}
	
	public function MemberInviteAcceptToAJAX($teamid, $memberid, $flag){
		$memberid = $this->MemberInviteAccept($teamid, $memberid, $flag);
	
		return $this->MemberToAJAX($teamid, $memberid);
	}
	
	public function MemberRemove($teamid, $memberid){
		$team = $this->Team($teamid);
		if (empty($team) || !$team->role->IsAdmin()){
			return null;
		}
	
		TeamMemberQuery::MemberRemove($this->db, $teamid, $memberid);
	
		$this->TeamMemberCountRecalc($teamid);
	
		return true;
	}
	
	/**
	 * Список групп участников
	 * @param integer $teamid
	 * @return MemberGroup
	 */
	public function GroupList($teamid, $clearCache = false){
		$team = $this->Team($teamid);
		if (empty($team)){
			return null;
		}
	
		$cacheName = "mglist";
	
		if ($clearCache){
			$this->CacheClear($teamid, $cacheName);
		}
		$list = $this->Cache($teamid, $cacheName);
	
		if (!empty($list)){
			return $list;
		}
			
		$list = new TeamMemberGroupList();
		$rows = TeamMemberQuery::MemberGroupList($this->db, $teamid, $this->moduleName);
		while (($d = $this->db->fetch_array($rows))){
			$list->Add(new TeamMemberGroup($d));
		}
	
		$this->CacheAdd($teamid, $cacheName, $list);
	
		return $list;
	}
	
	public function GroupListToAJAX($teamid){
		$list = $this->GroupList($teamid);
		if (empty($list)){
			return null;
		}
	
		$ret = new stdClass();
		$ret->groups = $list->ToAJAX();
	
		return $ret;
	}
	
	public function GroupSave($teamid, $d){
		$team = $this->Team($teamid);
		if (empty($team) || !$team->role->IsAdmin()){
			return null;
		}
	
		$utmf = Abricos::TextParser(true);
		$d->tl = $utmf->Parser($d->tl);
	
		if (empty($d->tl)){
			return null;
		}
	
		if ($d->id == 0){
			$d->id = TeamMemberQuery::MemberGroupAppend($this->db, $teamid, $this->moduleName, $d);
		}else{
			TeamMemberQuery::MemberGroupUpdate($this->db, $teamid, $this->moduleName, $d->id, $d);
		}
	
		$this->CacheClear($teamid);
	
		return $d->id;
	}
	
	public function GroupSaveToAJAX($teamid, $d){
		$groupid = $this->GroupSave($teamid, $d);
		if (empty($groupid)){
			return null;
		}
	
		$ret = $this->GroupListToAJAX($teamid);
		$ret->groupid = $groupid;
	
		return $ret;
	}
	
	public function InGroupList($teamid, $clearCache = false){
		$team = $this->Team($teamid);
		if (empty($team)){ return null; }
	
		$cacheName = "miglist";
	
		if ($clearCache){
			$this->CacheClear($cacheName, $teamid);
		}
	
		$list = $this->Cache($cacheName, $teamid);
	
		if (!empty($list)){ return $list; }
	
		$list = new TeamMemberInGroupList();
		$rows = TeamMemberQuery::MemberInGroupList($this->db, $teamid, $this->moduleName);
		while (($d = $this->db->fetch_array($rows))){
			$list->Add(new TeamMemberInGroup($d));
		}
		$this->CacheAdd($cacheName, $teamid, $list);
		return $list;
	}
	
	public function InGroupListToAJAX($teamid){
		$list = $this->InGroupList($teamid);
		if (empty($list)){ return null; }
	
		$ret = new stdClass();
		$ret->ingroups = $list->ToAJAX();
	
		return $ret;
	}
		

}


?>