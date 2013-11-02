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
	public static function MemberList(TeamManager $man, Team $team, $memberid = 0){
		$db = $man->db;
		$flds = "";
		$ljoin = "";
		
		foreach($man->fldExtTeamUserRole as $key => $value){
			$ljoin .= "
				LEFT JOIN ".$db->prefix.$key." ".$key." ON ur.teamid=".$key.".teamid
					AND ".$key.".userid=ur.userid
			";
				
			$far = explode(",", $value);
			foreach($far as $f){
				$flds .= " ,".$key.".".trim($f)." ";
			}
		}
		
		$arr = array();
		
		// этот пользователь в этом списке
		array_push($arr, "
			SELECT
				ur.userid as id,
				ur.ismember,
				ur.isadmin,
				ur.isjoinrequest,
				ur.isinvite,
				ur.reluserid,
				u.isvirtual
				".$flds."
			FROM ".$db->prefix."team_userrole ur
			INNER JOIN ".$db->prefix."user u ON u.userid=ur.userid
				".$ljoin."
			WHERE ur.userid=".bkint(Abricos::$user->id)." AND ur.teamid=".bkint($team->id)."
				AND (ur.ismember=1 OR ur.isjoinrequest=1 OR ur.isinvite=1) AND ur.isremove=0
			LIMIT 1
		");
		
		if ($team->role->IsAdmin()){
			// список пользователей которых пригласили или сделали запрос на 
			// вступление в группу
			// список доступен только админу группы
			array_push($arr, "
				SELECT 
					ur.userid as id,
					ur.ismember,
					ur.isadmin,
					ur.isjoinrequest,
					ur.isinvite,
					ur.reluserid,
					u.isvirtual
					".$flds."
				FROM ".$db->prefix."team_userrole ur
				INNER JOIN ".$db->prefix."user u ON u.userid=ur.userid
					".$ljoin."
				WHERE ur.userid<>".bkint(Abricos::$user->id)." AND ur.teamid=".bkint($team->id)." 
					AND ur.ismember=0 AND (ur.isjoinrequest=1 OR ur.isinvite=1) AND ur.isremove=0
			");
		}
		
		// публичный список пользователей
		array_push($arr, "
			SELECT
				ur.userid as id,
				ur.ismember,
				ur.isadmin,
				ur.isjoinrequest,
				ur.isinvite,
				ur.reluserid,
				u.isvirtual
				".$flds."
			FROM ".$db->prefix."team_userrole ur
			INNER JOIN ".$db->prefix."user u ON u.userid=ur.userid
				".$ljoin."
			WHERE ur.userid<>".bkint(Abricos::$user->id)." AND ur.teamid=".bkint($team->id)." 
				AND ur.ismember=1 
		");
		
		$sql = "
			SELECT 
				DISTINCT *
			FROM (
				".implode(" UNION ", $arr)."
			) urm
		";
		if ($memberid > 0){
			$sql .= "
				WHERE urm.id=".bkint($memberid)."
				LIMIT 1
			";
		}

		return $db->query_read($sql);
	}
	
	public static function Member(TeamManager $man, $team, $memberid){
		$rows = TeamMemberQuery::MemberList($man, $team, $memberid);
		return $man->db->fetch_array($rows);
	}
	
	public static function MemberInGroupList(Ab_Database $db, $teamid, $moduleName){
		$sql = "
			SELECT 
				mg.groupid as gid,
				mg.userid as uid
			FROM ".$db->prefix."team_membergroup g
			INNER JOIN ".$db->prefix."team_memberingroup mg ON g.groupid=mg.groupid
			WHERE g.teamid=".bkint($teamid)." AND g.module='".bkstr($moduleName)."' AND g.deldate=0
		";
		return $db->query_write($sql);
	}
	
	public static function MemberAddToGroup(Ab_Database $db, $groupid, $memberid){
		$sql = "
			INSERT IGNORE INTO ".$db->prefix."team_memberingroup (groupid, userid, dateline) VALUES (
				".bkint($groupid).",
				".bkint($memberid).",
				".TIMENOW."
			)
		";
		$db->query_write($sql);
	}
	
	public static function MemberRemoveFromGroup(Ab_Database $db, $groupid, $memberid){
		$sql = "
			DELETE FROM ".$db->prefix."team_memberingroup 
			WHERE groupid=".bkint($groupid)." AND userid=".bkint($memberid)."
		";
		$db->query_write($sql);
	}
	
	public static function MemberGroupList(Ab_Database $db, $teamid, $moduleName){
		$sql = "
			SELECT
				g.groupid as id,
				g.parentgroupid as pid,
				g.title as tl
			FROM ".$db->prefix."team_membergroup g
			WHERE g.teamid=".bkint($teamid)." AND g.module='".bkstr($moduleName)."' AND g.deldate=0
		";
		return $db->query_read($sql);
	}

	public static function MemberGroupAppend(Ab_Database $db, $teamid, $moduleName, $d){
		$sql = "
			INSERT INTO ".$db->prefix."team_membergroup (teamid, module, title, dateline) VALUES (
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
			UPDATE ".$db->prefix."team_membergroup
			SET title='".$d->tl."',
				upddate=".TIMENOW."
			WHERE teamid=".bkint($teamid)." AND module='".bkstr($moduleName)."' AND groupid=".bkint($memberGroupId)."
			LIMIT 1
		";
		$db->query_write($sql);
	}
	
	/**
	 * Пользователь userid просматривает группу teamid
	 * 
	 * @param Ab_Database $db
	 * @param integer $teamid
	 * @param integer $userid
	 */
	public static function UserTeamView(Ab_Database $db, $teamid){
		$sql = "
			INSERT INTO ".$db->prefix."team_userrole
			(teamid, userid, lastview, dateline, upddate) VALUES (
				".bkint($teamid).",
				".bkint(Abricos::$user->id).",
				".TIMENOW.",
				".TIMENOW.",
				".TIMENOW."
			) ON DUPLICATE KEY UPDATE
				lastview=".TIMENOW."
		";
		$db->query_write($sql);
	}

	/**
	 * Админ группы отправил приглашение на вступление пользователю userid
	 *
	 * @param Ab_Database $db
	 * @param integer $teamid
	 * @param integer $userid
	 */
	public static function MemberInviteSetWait(Ab_Database $db, $teamid, $userid, $adminid){
		$sql = "
			INSERT INTO ".$db->prefix."team_userrole
			(teamid, userid, reluserid, isinvite, dateline, upddate) VALUES (
				".bkint($teamid).",
				".bkint($userid).",
				".bkint($adminid).",
				1,
				".TIMENOW.",
				".TIMENOW."
			) ON DUPLICATE KEY UPDATE
				reluserid=".bkint($adminid).",
				isinvite=1
		";
		$db->query_write($sql);
	}
	
	public static function MemberInviteWaitCountByTeam(Ab_Database $db, $teamid){
		$sql = "
			SELECT 
				count(*) as cnt
			FROM ".$db->prefix."team_userrole
			WHERE teamid=".bkint($teamid)." AND ismember=0 AND isinvite=1
		";
		$row = $db->query_first($sql);
		return intval($row['cnt']);
	}
	
	public static function MemberInviteWaitCountByUser(Ab_Database $db, $userid){
		$sql = "
			SELECT 
				count(*) as cnt
			FROM ".$db->prefix."team_userrole
			WHERE reluserid=".bkint($userid)." AND ismember=0 AND isinvite=1
		";
		$row = $db->query_first($sql);
		return intval($row['cnt']);
	}
	
	/**
	 * Пользователь принял приглашение вступить в группу
	 *
	 * @param Ab_Database $db
	 * @param integer $teamid
	 * @param integer $userid
	 */
	public static function MemberInviteSetAccept(Ab_Database $db, $teamid, $userid){
		$sql = "
			UPDATE ".$db->prefix."team_userrole
			SET 
				isinvite=2,
				ismember=1
			WHERE teamid=".bkint($teamid)." AND userid=".bkint($userid)." 
				AND ismember=0
			LIMIT 1
		";
		$db->query_write($sql);
	}

	public static function MemberRemove(Ab_Database $db, $teamid, $userid){
		$sql = "
			UPDATE ".$db->prefix."team_userrole
			SET
				isremove=".(Abricos::$user->id == $userid ? 2 : 1).",
				ismember=0
			WHERE teamid=".bkint($teamid)." AND userid=".bkint($userid)."
			LIMIT 1
		";
		$db->query_write($sql);
	}
	
	/**
	 * Пользователь отклонил приглашение вступить в группу
	 * 
	 * @param Ab_Database $db
	 * @param integer $teamid
	 * @param integer $userid
	 */
	public static function MemberInviteSetReject(Ab_Database $db, $teamid, $userid){
		$sql = "
			UPDATE ".$db->prefix."team_userrole
			SET 
				isinvite=3,
				ismember=0
			WHERE teamid=".bkint($teamid)." AND userid=".bkint($userid)." 
				AND ismember=0
			LIMIT 1
		";
		$db->query_write($sql);
	}

	/**
	 * Пользователь userid сам запросил вступление в группу
	 *  
	 * @param Ab_Database $db
	 * @param integer $teamid
	 * @param integer $userid
	 */
	public static function MemeberJoinRequestSet(Ab_Database $db, $teamid, $userid){
		$sql = "
			INSERT INTO ".$db->prefix."team_userrole
			(teamid, userid, isjoinrequest, dateline, upddate) VALUES (
				".bkint($teamid).",
				".bkint($userid).",
				1,
				".TIMENOW.",
				".TIMENOW."
			) ON DUPLICATE KEY UPDATE
				isjoinrequest=1
		";
		$db->query_write($sql);
	}

	/**
	 * Пользователь userid стал членом группы teamid
	 * 
	 * @param Ab_Database $db
	 * @param integer $teamid
	 * @param integer $userid
	 */
	public static function UserSetMember(Ab_Database $db, $teamid, $userid){
		$sql = "
			INSERT INTO ".$db->prefix."team_userrole
			(teamid, userid, ismember, dateline, upddate) VALUES (
				".bkint($teamid).",
				".bkint($userid).",
				1,
				".TIMENOW.",
				".TIMENOW."
			) ON DUPLICATE KEY UPDATE
				ismember=1
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

	public static function UserByIds(Ab_Database $db, $ids){
		if (count($ids) == 0){ return; }
		
		$wh = array();
		for ($i=0; $i<count($ids); $i++){
			array_push($wh, "u.userid=".bkint($ids[$i]));
		}
		$sql = "
			SELECT
				u.userid as id,
				u.avatar as avt,
				u.username as unm,
				u.firstname as fnm,
				u.lastname as lnm,
				u.isvirtual as vrt
			FROM ".$db->prefix."user u
			WHERE ".implode(" OR ", $wh)."
		";
		return $db->query_read($sql);
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