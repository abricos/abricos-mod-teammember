<?php
/**
 * Схема таблиц данного модуля.
 * 
 * @package Abricos
 * @subpackage TeamMember
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author  Alexander Kuzmin <roosit@abricos.org>
 */

$charset = "CHARACTER SET 'utf8' COLLATE 'utf8_general_ci'";
$updateManager = Ab_UpdateManager::$current; 
$db = Abricos::$db;
$pfx = $db->prefix;

if ($updateManager->isInstall()){
	Abricos::GetModule('teammember')->permission->Install();
	
	/**
	 * Участник приложения сообщества
	 */
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."teammember (
			`teammemberid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор группы',
			`teamid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Сообщество',
			`userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Пользователь',
			`module` varchar(25) NOT NULL DEFAULT '' COMMENT 'Приложение (модуль)',
				
			`dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата создания',
			`deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',
			`upddate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата обновления',
	
			PRIMARY KEY  (`teammemberid`),
			KEY `teammember` (`teamid`, `userid`, `module`, `deldate`)
		)".$charset
	);
	
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."teammember_group (
			`groupid` int(10) unsigned NOT NULL auto_increment COMMENT 'Идентификатор группы',
			`parentgroupid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Родитель',
				
			`teamid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Сообщество',
			`module` varchar(25) NOT NULL DEFAULT '' COMMENT 'Модуль создатель',
			
			`title` varchar(50) NOT NULL DEFAULT '' COMMENT 'Название',
			`descript` TEXT NOT NULL  COMMENT 'Описание',

			`dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата создания',
			`deldate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата удаления',
			`upddate` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата обновления',
	
			PRIMARY KEY  (`groupid`),
			KEY membergroup (`teamid`, `module`, `deldate`)
		)".$charset
	);
	
	$db->query_write("
		CREATE TABLE IF NOT EXISTS ".$pfx."teammember_ingroup (
			`groupid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Группа',
			`userid` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Сообщество',
	
			`dateline` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'Дата создания',
	
			UNIQUE KEY `ingroup` (`groupid`, `userid`)
		)".$charset
	);

}

?>