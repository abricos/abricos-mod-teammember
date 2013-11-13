<?php
/**
 * @package Abricos
 * @subpackage Team
 * @license http://www.gnu.org/copyleft/gpl.html GNU/GPL, see LICENSE.php
 * @author Alexander Kuzmin <roosit@abricos.org>
 */

$brick = Brick::$builder->brick;
$p = &$brick->param->param;

$url = $p['url'];

$bld = $p['builder'];
$man = $bld->manager;
$team = $bld->team;

$brick->content = Brick::ReplaceVarByData($brick->content, array(
	"url" => Brick::ReplaceVarByData($url, array(
		'teammod' => !empty($team->parentModule) ? $team->parentModule : $team->module,
		'teamid' => $team->id,
		'appmodname' => $man->moduleName,
		'userid' => $p['userid']
	))
));

?>