<?php 
/**
 * @package Abricos
 * @subpackage Team
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

require_once 'modules/team/includes/classesbrick.php';

class TeamMemberBrickBuilder extends TeamAppBrickBuilder {

	/**
	 * @var TeamMemberManager
	 */
	public $manager;
	
	public function GetBrickInfo(){
		$adr = Abricos::$adress;
		$lvl = $adr->level;
		$dir = $adr->dir;
		
		$bkInfo = new TeamAppBrickInfo("teammember");

		if ($lvl == 4){
			return $bkInfo->SetName('memberlist');
		}
		
		$userid = intval($dir[4]);
		
		if ($userid > 0 && $userid == $dir[4]){
			return $bkInfo->Set('memberview', array(
				"userid" => $userid
			));
		}
		
		return null;
	}
}

?>