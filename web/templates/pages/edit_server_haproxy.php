<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/server/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<a href="/list/haproxy/" class="button button-secondary">
				<i class="fas fa-network-wired icon-purple"></i><?= _("HAProxy Status") ?>
			</a>
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
			
			<div class="u-mb20">
				<div class="haproxy-status-bar">
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
			
			<div class="alert alert-warning">
				<i class="fas fa-exclamation-triangle"></i>
				<p><?= _("Configuration will be validated before saving. Invalid configuration will be rejected.") ?></p>
			</div>
		</div>

	</form>

</div>

<style>
.haproxy-status-bar {
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
</style>
