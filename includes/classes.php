<?php 
/**
 * @package Abricos
 * @subpackage TeamMember
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

require_once 'modules/team/includes/classesapp.php';
require_once 'classesman.php';

class TeamMemberNavigator extends TeamAppNavigator { }

/**
 * Данные приложения сообщества
 */
/*
class TeamMemberAppData extends AbricosItem {
	public $memberList;
	public $memberGroupList;
	public $memberInGroupList;

}
/**/

class TeamMember extends AbricosItem {

	public $teamid;
	public $userid;
	public $module;
	
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


class TeamMemberGroup extends TeamItem {

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
class TeamMemberGroupList extends TeamItemList { }

class MemberInGroup extends  TeamItem {
	private static $_id = 1;
	public $groupid;
	public $memberid;

	public function __construct($d){
		$this->id = MemberInGroup::$_id++;
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

class TeamMemberInGroupList extends TeamItemList {

	/**
	 * @return MemberInGroup
	 */
	public function GetByIndex($i){
		return parent::GetByIndex($i);
	}

	/**
	 * Проверка существование пользователя в группе
	 * @param integer $userid
	 * @return MemberInGroup
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