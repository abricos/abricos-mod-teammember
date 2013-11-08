<?php
/**
 * @package Abricos
 * @subpackage TeamMember
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

require_once 'classes.php';
require_once 'dbquery.php';

class TeamMemberModuleManager extends Ab_ModuleManager {
	
	/**
	 * @var TeamMemberModule
	 */
	public $module = null;
	
	/**
	 * @var TeamMemberModuleManager
	 */
	public static $instance = null; 
	
	public function __construct(TeamMemberModule $module){
		parent::__construct($module);
		
		TeamMemberModuleManager::$instance = $this;
	}
	
	public function IsAdminRole(){
		return $this->IsRoleEnable(TeamMemberAction::ADMIN);
	}
	
	public function IsWriteRole(){
		if ($this->IsAdminRole()){ return true; }
		return $this->IsRoleEnable(TeamMemberAction::WRITE);
	}
	
	public function IsViewRole(){
		if ($this->IsWriteRole()){ return true; }
		return $this->IsRoleEnable(TeamMemberAction::VIEW);
	}
	
	public function AJAX($d){
		switch($d->do){
			case 'userfindbyemail': return $this->UserFindByEmail($d->email);
			case 'membermodulename': return $this->MemberModuleName($d->teamid, $d->memberid);
		}
		return null;
	}
	
	public function MemberModuleName($memberid){
		if (!$this->IsViewRole()){ return null; }
	
		return TeamMemberQuery::MemberModuleName($this->db, $memberid);
	}
	
	/**
	 * Поиск пользователя по email
	 */
	public function UserFindByEmail($email){
		
		$ret = new stdClass();
		$ret->email = $email;
		$ret->user = null;
	
		if (!$this->IsWriteRole()){
			sleep(5);
			return $ret;
		}
		if (!$this->IsAdminRole()){
			sleep(1);
		}
	
		if (!Abricos::$user->GetManager()->EmailValidate($email)){
			return $ret;
		}
	
		$user = TeamMemberQuery::UserByEmail($this->db, $email);
		if (!empty($user)){
			$ret->user = $user;
		}
	
		return $ret;
	}
	
}

?>