<?php
/**
 * @package Abricos
 * @subpackage Team
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

class TeamMemberQuery {
	
	/**
	 * Список участников группы
	 * 
	 * @param Ab_Database $db
	 * @param integer $teamid
	 * @param boolean $isAdmin
	 */
	public static function MemberList(TeamMemberManager $man, Team $team, $userid = 0){
		$db = $man->db;
		$flds = "";
		$ljoin = "";
		
		foreach($man->fldExtMember as $key => $value){
			$ljoin .= "
				LEFT JOIN ".$db->prefix.$key." ".$key." ON ur.teamid=".$key.".teamid
					AND ".$key.".userid=ur.userid
			";
				
			$far = explode(",", $value);
			foreach($far as $f){
				$flds .= " ,".$key.".".trim($f)." ";
			}
		}
		
		$sql = "
			SELECT
				m.teammemberid as id,
				m.teamid as tid,
				m.userid as uid,
				m.module as m,
				ur.ismember,
				ur.isadmin,
				ur.isjoinrequest,
				ur.isinvite,
				ur.reluserid,
				u.isvirtual
				".$flds."
			FROM ".$db->prefix."teammember m
			INNER JOIN ".$db->prefix."user u ON m.userid=u.userid
			INNER JOIN ".$db->prefix."team_userrole ur 
				ON m.teamid=ur.teamid AND m.userid=ur.userid
			".$ljoin."
			WHERE m.module='".bkstr($man->moduleName)."'
				AND m.teamid=".bkint($team->id)." 
				AND m.deldate=0
				AND ur.isremove=0
		";
		if ($team->role->IsAdmin()){
			// админу доступен весь список
		}else if ($team->role->IsMember()){
			// участнику сообщества доступны только участники
			$sql .= "
				AND ur.ismember=1
			";
		}else if ($man->userid > 0){
			// не участнику в список добавить самого участника, возможно он находится
			// в статусе ожидающего подверждения вступления в сообщество
			$sql .= "
				AND (
					ur.ismember=1
					OR
					(ur.ismember=0 AND ur.userid=".bkint($man->userid)." AND (ur.isjoinrequest=1 OR ur.isinvite=1))
				)			
			";	
		}else{
			// всем остальным доступны только участники
			$sql .= "
				AND ur.ismember=1 
			";
		}

		if ($userid > 0){
			$sql .= "
				AND m.userid=".bkint($userid)."
				LIMIT 1
			";
		}

		return $db->query_read($sql);
	}
	
	public static function Member(TeamMemberManager $man, $team, $userid){
		$rows = TeamMemberQuery::MemberList($man, $team, $userid);
		return $man->db->fetch_array($rows);
	}
	
	public static function RelatedModuleList(Ab_Database $db, $teamid){
		$sql = "
			SELECT
				DISTINCT
				m.module as m
			FROM ".$db->prefix."teammember m
			WHERE m.teamid=".bkint($team->id)."
		";
		
		return $db->query_read($sql);		
	}
	
	public static function MemberInGroupList(Ab_Database $db, $teamid, $moduleName){
		$sql = "
			SELECT 
				mg.groupid as gid,
				mg.userid as uid
			FROM ".$db->prefix."teammember_group g
			INNER JOIN ".$db->prefix."teammember_ingroup mg ON g.groupid=mg.groupid
			WHERE g.teamid=".bkint($teamid)." AND g.module='".bkstr($moduleName)."' AND g.deldate=0
		";
		return $db->query_write($sql);
	}
	
	public static function MemberAddToGroup(Ab_Database $db, $groupid, $userid){
		$sql = "
			INSERT IGNORE INTO ".$db->prefix."teammember_ingroup (groupid, userid, dateline) VALUES (
				".bkint($groupid).",
				".bkint($userid).",
				".TIMENOW."
			)
		";
		$db->query_write($sql);
	}
	
	public static function MemberRemoveFromGroup(Ab_Database $db, $groupid, $userid){
		$sql = "
			DELETE FROM ".$db->prefix."teammember_ingroup 
			WHERE groupid=".bkint($groupid)." AND userid=".bkint($userid)."
		";
		$db->query_write($sql);
	}
	
	public static function MemberGroupList(Ab_Database $db, $teamid, $moduleName){
		$sql = "
			SELECT
				g.groupid as id,
				g.parentgroupid as pid,
				g.title as tl
			FROM ".$db->prefix."teammember_group g
			WHERE g.teamid=".bkint($teamid)." AND g.module='".bkstr($moduleName)."' AND g.deldate=0
		";
		return $db->query_read($sql);
	}

	public static function MemberGroupAppend(Ab_Database $db, $teamid, $moduleName, $d){
		$sql = "
			INSERT INTO ".$db->prefix."teammember_group (teamid, module, title, dateline) VALUES (
				".bkint($teamid).",
				'".$moduleName."',
				'".$d->tl."',
				".TIMENOW."
			)
		";
		$db->query_write($sql);
		return $db->insert_id();
	}
	
	public static function MemberGroupUpdate(Ab_Database $db, $teamid, $moduleName, $memberGroupId, $d){
		$sql = "
			UPDATE ".$db->prefix."teammember_group
			SET title='".$d->tl."',
				upddate=".TIMENOW."
			WHERE teamid=".bkint($teamid)." AND module='".bkstr($moduleName)."' AND groupid=".bkint($memberGroupId)."
			LIMIT 1
		";
		$db->query_write($sql);
	}
	
	public static function UserByEmail(Ab_Database $db, $email){
		$sql = "
			SELECT
				u.userid as id,
				u.avatar as avt,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm
			FROM ".$db->prefix."user u
			WHERE u.email='".bkstr($email)."'
			LIMIT 1
		";
		return $db->query_first($sql);
	}

	public static function MyNameUpdate(Ab_Database $db, $userid, $d){
		$sql = "
			UPDATE ".$db->prefix."user
			SET
				firstname='".$d->firstname."',
				lastname='".$d->lastname."'
			WHERE userid=".bkint($userid)."
			LIMIT 1
		";
		$db->query_write($sql);
	}
	

}


?>