<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/server/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
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

	<form id="main-form" name="v_configure_server" method="post">
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="save" value="save">

		<div class="form-container form-container-wide">
			<h1 class="u-mb20"><?= _("Configure Server") ?>: <?= $v_service_name ?></h1>
			<?php show_alert_message($_SESSION); ?>

			<!-- Status Bar -->
			<div class="u-mb20">
				<div class="service-status-bar">
					<span class="form-label"><?= _("Status") ?>:</span>
					<?php if ($v_status === 'running') { ?>
						<span class="badge badge-success"><i class="fas fa-circle-check"></i> <?= _("Running") ?></span>
					<?php } else { ?>
						<span class="badge badge-danger"><i class="fas fa-circle-minus"></i> <?= _("Stopped") ?></span>
					<?php } ?>
					<span class="u-ml20 form-label"><?= _("Version") ?>:</span>
					<span><?= htmlentities($v_version) ?></span>
				</div>
			</div>

			<!-- Connection Info Panel -->
			<div class="info-panel u-mb20">
				<h3 class="info-panel-title"><i class="fas fa-plug"></i> <?= _("Connection Information") ?></h3>
				<div class="info-panel-content">
					<div class="info-row">
						<span class="info-label"><?= _("Bootstrap Servers") ?>:</span>
						<code class="info-value" id="kafka-bootstrap"><?= htmlentities($kafka_bootstrap) ?></code>
						<button type="button" class="copy-btn" onclick="copyToClipboard(document.getElementById('kafka-bootstrap').textContent)">
							<i class="fas fa-copy"></i>
						</button>
					</div>
					<div class="info-row">
						<span class="info-label"><?= _("Zookeeper Connect") ?>:</span>
						<code class="info-value" id="zk-connect"><?= htmlentities($zookeeper_connect) ?></code>
						<button type="button" class="copy-btn" onclick="copyToClipboard(document.getElementById('zk-connect').textContent)">
							<i class="fas fa-copy"></i>
						</button>
					</div>
					<div class="info-row">
						<span class="info-label"><?= _("Kafka UI") ?>:</span>
						<a href="<?= htmlentities($kafka_ui_url) ?>" target="_blank" class="info-link">
							<?= htmlentities($kafka_ui_url) ?> <i class="fas fa-external-link-alt"></i>
						</a>
					</div>
				</div>
			</div>

			<!-- Config Editor -->
			<div class="u-mb20">
				<label for="v_config" class="form-label"><?= $v_config_path ?></label>
				<textarea class="form-control u-min-height600 u-allow-resize u-console js-advanced-textarea" name="v_config" id="v_config"><?= htmlentities($v_config) ?></textarea>
			</div>

			<div class="form-check u-mb20">
				<input class="form-check-input" type="checkbox" name="v_restart" id="v_restart" checked>
				<label for="v_restart">
					<?= _("Restart service after saving") ?>
				</label>
			</div>
		</div>

	</form>

</div>

<script>
function copyToClipboard(text) {
	navigator.clipboard.writeText(text).then(function() {
		var toast = document.createElement('div');
		toast.className = 'copy-toast';
		toast.textContent = 'Copied!';
		document.body.appendChild(toast);
		setTimeout(function() { toast.remove(); }, 2000);
	});
}
</script>

<style>
.service-status-bar {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 15px;
	background: var(--color-bg-secondary);
	border-radius: 8px;
}
.badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 5px 12px;
	border-radius: 20px;
	font-size: 0.85em;
	font-weight: 500;
}
.badge-success {
	background: rgba(40, 167, 69, 0.15);
	color: #28a745;
}
.badge-danger {
	background: rgba(220, 53, 69, 0.15);
	color: #dc3545;
}
.form-container-wide {
	max-width: 1000px;
}
.info-panel {
	background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
	border-radius: 12px;
	padding: 20px;
	border: 1px solid rgba(255,255,255,0.1);
}
.info-panel-title {
	color: #fff;
	font-size: 1.1em;
	margin-bottom: 15px;
	padding-bottom: 10px;
	border-bottom: 1px solid rgba(255,255,255,0.1);
}
.info-panel-title i {
	margin-right: 8px;
	color: #00d4aa;
}
.info-panel-content {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.info-row {
	display: flex;
	align-items: center;
	gap: 10px;
}
.info-label {
	color: #888;
	min-width: 160px;
}
.info-value {
	background: rgba(0,0,0,0.3);
	padding: 8px 15px;
	border-radius: 6px;
	color: #00d4aa;
	font-family: monospace;
}
.info-link {
	color: #4dabf7;
	text-decoration: none;
}
.info-link:hover {
	color: #74c0fc;
}
.copy-btn {
	background: rgba(255,255,255,0.1);
	border: none;
	padding: 8px 12px;
	border-radius: 6px;
	color: #fff;
	cursor: pointer;
	transition: background 0.2s;
}
.copy-btn:hover {
	background: rgba(255,255,255,0.2);
}
.copy-toast {
	position: fixed;
	bottom: 20px;
	right: 20px;
	background: #28a745;
	color: #fff;
	padding: 10px 20px;
	border-radius: 8px;
	animation: fadeInOut 2s ease;
}
@keyframes fadeInOut {
	0%, 100% { opacity: 0; }
	10%, 90% { opacity: 1; }
}
</style>
