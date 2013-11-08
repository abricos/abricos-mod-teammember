<?php 
/**
 * @package Abricos
 * @subpackage TeamMember
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

require_once 'modules/team/includes/classes.php';
require_once 'modules/team/includes/classesapp.php';
require_once 'classesman.php';

class TeamMemberNavigator extends TeamAppNavigator { 
	
	public function MemberView(Team $team, $userid){
		$url = $this->URL($team);
		return $url."u_".$userid;
	}
	
}

class TeamMemberInitData extends TeamAppInitData {
	/**
	 * Количество не подтвержденных приглашений
	 * @var integer
	 */
	public $inviteWaitCount = 0;
	
	/**
	 * Лимит не подтвержденных приглашений
	 * @var integer
	 */
	public $inviteWaitLimit = 0;
	
	public function ToAJAX(){
		$ret = parent::ToAJAX();
		
		$ret->iwCount = $this->inviteWaitCount;
		$ret->iwLimit = $this->inviteWaitLimit;

		return $ret;
	}
}

class TeamMember extends AbricosItem {

	public $teamid;
	public $userid;
	public $module;
	
	/**
	 * Роль пользователя в сообществе
	 * @var TeamUserRole
	 */
	public $role;
	
	/**
	 * @var TeamMemberDetail
	 */
	public $detail = null;
	
	public function __construct($d){
		parent::__construct($d);
		
		$this->teamid = intval($d['tid']);
		$this->userid = intval($d['uid']);
		$this->module = strval($d['m']);
	}
	
	public function ToAJAX(){
		$ret = parent::ToAJAX();
		$ret->tid	= $this->teamid;
		$ret->uid	= $this->userid;
		$ret->m		= $this->module;

		$ret->role = $this->role->ToAJAX();
		
		if (!empty($this->detail)){
			$ret->dtl = $this->detail->ToAJAX();
		}
		
		return $ret;
	}
}

class TeamMemberDetail {

	public $member;

	public function __construct(TeamMember $member, $d){
		$this->member = $member;
	}

	public function ToAJAX(){
		$ret = new stdClass();

		return $ret;
	}
}


class TeamMemberList extends AbricosList { }


class TeamMemberGroup extends AbricosItem {

	public $title;

	public function __construct($d){
		parent::__construct($d);
		$this->title = strval($d['tl']);
	}

	public function ToAJAX(){
		$ret = parent::ToAJAX();
		$ret->tl = $this->title;
		return $ret;
	}
}
class TeamMemberGroupList extends AbricosList { }

class TeamMemberInGroup extends  AbricosItem {
	private static $_id = 1;
	public $groupid;
	public $memberid;

	public function __construct($d){
		$this->id = TeamMemberInGroup::$_id++;
		$this->memberid = intval($d['uid']);
		$this->groupid = intval($d['gid']);
	}

	public function ToAJAX(){
		$ret = parent::ToAJAX();
		$ret->uid = $this->memberid;
		$ret->gid = $this->groupid;
		return $ret;
	}
}

class TeamMemberInGroupList extends AbricosList {

	/**
	 * @return TeamMemberInGroup
	 */
	public function GetByIndex($i){
		return parent::GetByIndex($i);
	}

	/**
	 * Проверка существование пользователя в группе
	 * @param integer $userid
	 * @return TeamMemberInGroup
	 */
	public function GetByMemberId($memberid){
		for ($i=0;$i<$this->Count();$i++){
			$item = $this->GetByIndex($i);
			if ($item->memberid == $memberid){
				return $item;
			}
		}
		return null;
	}
}



?>