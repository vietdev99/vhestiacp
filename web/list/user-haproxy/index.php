<?php
$TAB = "HAPROXY_USER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check if HAProxy is enabled on server
if (empty($_SESSION["HAPROXY_SYSTEM"]) || $_SESSION["HAPROXY_SYSTEM"] !== "yes") {
	header("Location: /");
	exit();
}

// Get user's HAProxy configuration (frontends + backends)
// Note: $user is already quoted by quoteshellarg() in main.php
$frontends = [];
$backends = [];
$output = [];
exec(HESTIA_CMD . "v-list-user-haproxy " . $user . " json", $output, $return_var);
if ($return_var === 0 && !empty($output)) {
	$data = json_decode(implode('', $output), true);
	if (is_array($data)) {
		$frontends = $data['frontends'] ?? [];
		$backends = $data['backends'] ?? [];
	}
}

// Make variables available globally for template
$GLOBALS['frontends'] = $frontends;
$GLOBALS['backends'] = $backends;

// Render page
render_page($user, $TAB, "list_user_haproxy");

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
