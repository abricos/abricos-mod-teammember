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
			case 'membermodulename': return $this->MemberModuleName($d->teamid, $d->memberid);
		}
		return null;
	}
	
	public function MemberModuleName($memberid){
		if (!$this->IsViewRole()){ return null; }
	
		return TeamMemberQuery::MemberModuleName($this->db, $memberid);
	}
	

}

?>