<?php
// Check if Mongo Express is installed
$mongo_express_installed = false;
$mongo_express_url = "";
if (file_exists("/usr/local/hestia/conf/hestia.conf")) {
	$conf = file_get_contents("/usr/local/hestia/conf/hestia.conf");
	if (preg_match("/MONGO_EXPRESS_SYSTEM='yes'/", $conf)) {
		$mongo_express_installed = true;
		if (preg_match("/MONGO_EXPRESS_PORT='(\d+)'/", $conf, $matches)) {
			$me_port = $matches[1];
		} else {
			$me_port = "8081";
		}
		$mongo_express_url = "http://" . $_SERVER['HTTP_HOST'] . ":" . $me_port;
		if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
			$mongo_express_url = "https://" . explode(":", $_SERVER['HTTP_HOST'])[0] . ":" . $me_port;
		}
	}
}
?>
<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/mongodb/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
			<?php if ($mongo_express_installed && !empty($mongo_express_url)) { ?>
			<a href="<?= htmlspecialchars($mongo_express_url) ?>/db/<?= htmlspecialchars($v_database) ?>/" target="_blank" class="button button-secondary">
				<i class="fas fa-leaf icon-green"></i><?= _("Open in Mongo Express") ?>
			</a>
			<?php } ?>
		</div>
		<div class="toolbar-buttons">
			<button type="submit" class="button" form="main-form">
				<i class="fas fa-floppy-disk icon-purple"></i><?= _("Save") ?>
			</button>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<form
		id="main-form"
		name="v_edit_mongodb"
		method="post"
	>
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="ok" value="Update">

		<div class="form-container">
			<h1 class="u-mb20"><?= _("Edit MongoDB Database") ?>: <?= htmlspecialchars($v_database) ?></h1>
			<?php show_alert_message($_SESSION); ?>
			
			<!-- Database Info Card -->
			<div class="info-card u-mb20">
				<h3><i class="fas fa-info-circle"></i> <?= _("Connection Information") ?></h3>
				<div class="info-grid">
					<div class="info-item">
						<label><?= _("Database") ?></label>
						<code><?= htmlspecialchars($v_database) ?></code>
					</div>
					<div class="info-item">
						<label><?= _("Username") ?></label>
						<code><?= htmlspecialchars($v_dbuser) ?></code>
					</div>
					<div class="info-item">
						<label><?= _("Host") ?></label>
						<code>localhost</code>
					</div>
					<div class="info-item">
						<label><?= _("Port") ?></label>
						<code>27017</code>
					</div>
				</div>
				
				<div class="u-mt15">
					<label><?= _("Connection String") ?></label>
					<div class="connection-string">
						<code id="conn-string">mongodb://<?= htmlspecialchars($v_dbuser) ?>:&lt;password&gt;@localhost:27017/<?= htmlspecialchars($v_database) ?>?authSource=<?= htmlspecialchars($v_database) ?></code>
						<button type="button" class="btn-copy" onclick="copyConnectionString()" title="<?= _("Copy") ?>">
							<i class="fas fa-copy"></i>
						</button>
					</div>
				</div>
				
				<?php if ($mongo_express_installed && !empty($mongo_express_url)) { ?>
				<div class="u-mt15">
					<a href="<?= htmlspecialchars($mongo_express_url) ?>/db/<?= htmlspecialchars($v_database) ?>/" target="_blank" class="button button-secondary button-small">
						<i class="fas fa-external-link"></i> <?= _("Manage in Mongo Express") ?>
					</a>
				</div>
				<?php } ?>
			</div>
			
			<!-- Password Change Section -->
			<div class="password-section">
				<h3><i class="fas fa-key"></i> <?= _("Change Password") ?></h3>
				
				<div class="u-mb10">
					<label for="v_password" class="form-label">
						<?= _("New Password") ?>
						<button type="button" title="<?= _("Generate") ?>" class="u-unstyled-button u-ml5 js-generate-password">
							<i class="fas fa-arrows-rotate icon-green"></i>
						</button>
					</label>
					<div class="u-pos-relative u-mb10">
						<input type="text" class="form-control js-password-input" name="v_password" id="v_password" placeholder="<?= _("Leave empty to keep current password") ?>">
						<div class="password-meter">
							<meter max="4" class="password-meter-input js-password-meter"></meter>
						</div>
					</div>
				</div>
				
				<?php require $_SERVER["HESTIA"] . "/web/templates/includes/password-requirements.php"; ?>
			</div>
		</div>

	</form>

</div>

<style>
.info-card {
	background: var(--color-bg-secondary);
	border: 1px solid var(--color-border);
	border-radius: 8px;
	padding: 20px;
}
.info-card h3 {
	margin: 0 0 15px 0;
	font-size: 1em;
	color: var(--color-text-primary);
}
.info-card h3 i {
	color: var(--color-primary);
	margin-right: 8px;
}
.info-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 15px;
}
.info-item {
	display: flex;
	flex-direction: column;
	gap: 5px;
}
.info-item label {
	font-size: 0.85em;
	color: var(--color-text-muted);
	font-weight: 500;
}
.info-item code {
	background: var(--color-bg-primary);
	padding: 8px 12px;
	border-radius: 4px;
	font-family: monospace;
	font-size: 0.9em;
	border: 1px solid var(--color-border);
}
.connection-string {
	display: flex;
	align-items: center;
	gap: 10px;
	margin-top: 5px;
}
.connection-string code {
	flex: 1;
	background: var(--color-bg-primary);
	padding: 10px 15px;
	border-radius: 4px;
	font-family: monospace;
	font-size: 0.85em;
	border: 1px solid var(--color-border);
	word-break: break-all;
}
.btn-copy {
	background: var(--color-primary);
	color: white;
	border: none;
	padding: 10px 15px;
	border-radius: 4px;
	cursor: pointer;
}
.btn-copy:hover {
	opacity: 0.9;
}
.password-section {
	background: var(--color-bg-secondary);
	border: 1px solid var(--color-border);
	border-radius: 8px;
	padding: 20px;
	margin-top: 20px;
}
.password-section h3 {
	margin: 0 0 15px 0;
	font-size: 1em;
	color: var(--color-text-primary);
}
.password-section h3 i {
	color: var(--color-warning);
	margin-right: 8px;
}
.button-small {
	padding: 8px 15px;
	font-size: 0.9em;
}
</style>

<script>
function copyConnectionString() {
	var connString = document.getElementById('conn-string').innerText;
	navigator.clipboard.writeText(connString).then(function() {
		alert('Connection string copied to clipboard!');
	}).catch(function(err) {
		// Fallback
		var textArea = document.createElement("textarea");
		textArea.value = connString;
		document.body.appendChild(textArea);
		textArea.select();
		document.execCommand('copy');
		document.body.removeChild(textArea);
		alert('Connection string copied to clipboard!');
	});
}
</script>
