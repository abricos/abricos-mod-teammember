<?php 
/**
 * @package Abricos
 * @subpackage Team
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

require_once 'modules/team/includes/classesbrick.php';

class TeamMemberBrickBuilder extends TeamAppBrickBuilder{

	/**
	 * @var TeamMemberManager
	 */
	public $manager;
	
	public function GetBrickName(){
		$adr = Abricos::$adress;
		$lvl = $adr->level;
		$dir = $adr->dir;
		
		if ($lvl == 5){
			return 'memberlist';
		}
		
		$memberid = intval($dir[4]);
		
		if ($memberid > 0 && $memberid == $dir[4]){
			return 'memberview';
		}
		
		return '';
	}
}

?>