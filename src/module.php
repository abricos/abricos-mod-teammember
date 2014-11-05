<?php 
/**
 * @package Abricos
 * @subpackage TeamMember
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

class TeamMemberModule extends Ab_Module {

	public function __construct(){
		$this->version = "0.1.0";
		$this->name = "teammember";
		$this->takelink = "teammember";
		$this->permission = new TeamMemberPermission($this);
	}
	
	/**
	 * Получить менеджер
	 *
	 * @return TeamMemberModuleManager
	 */
	public function GetManager(){
		if (is_null($this->_manager)){
			require_once 'includes/manager.php';
			$this->_manager = new TeamMemberModuleManager($this);
		}
		return $this->_manager;
	}
}

class TeamMemberAction {
	const VIEW	= 10;
	const WRITE	= 30;
	const ADMIN	= 50;
}

class TeamMemberPermission extends Ab_UserPermission {

	public function TeamMemberPermission(TeamMemberModule $module){

		$defRoles = array(
			new Ab_UserRole(TeamMemberAction::VIEW, Ab_UserGroup::GUEST),
			new Ab_UserRole(TeamMemberAction::VIEW, Ab_UserGroup::REGISTERED),
			new Ab_UserRole(TeamMemberAction::VIEW, Ab_UserGroup::ADMIN),
				
			new Ab_UserRole(TeamMemberAction::WRITE, Ab_UserGroup::REGISTERED),
			new Ab_UserRole(TeamMemberAction::WRITE, Ab_UserGroup::ADMIN),
				
			new Ab_UserRole(TeamMemberAction::ADMIN, Ab_UserGroup::ADMIN),
		);
		parent::__construct($module, $defRoles);
	}

	public function GetRoles(){
		return array(
			TeamMemberAction::VIEW => $this->CheckAction(TeamMemberAction::VIEW),
			TeamMemberAction::WRITE => $this->CheckAction(TeamMemberAction::WRITE),
			TeamMemberAction::ADMIN => $this->CheckAction(TeamMemberAction::ADMIN)
		);
	}
}

Abricos::ModuleRegister(new TeamMemberModule());

?>