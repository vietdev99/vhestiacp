<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/haproxy/">
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

	<form
		id="main-form"
		name="v_edit_haproxy"
		method="post"
	>
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="ok" value="Update">

		<div class="form-container form-container-wide">
			<h1 class="u-mb20"><?= _("Configure HAProxy") ?></h1>
			<?php show_alert_message($_SESSION); ?>
			
			<div class="u-mb20">
				<div class="haproxy-status">
					<span class="form-label"><?= _("Service Status") ?>:</span>
					<?php if ($v_status === 'running') { ?>
						<span class="badge badge-success"><i class="fas fa-circle-check"></i> <?= _("Running") ?></span>
					<?php } else { ?>
						<span class="badge badge-danger"><i class="fas fa-circle-minus"></i> <?= _("Stopped") ?></span>
					<?php } ?>
					
					<a href="/restart/service/?srv=haproxy&token=<?= $_SESSION["token"] ?>" class="button button-secondary button-small u-ml10">
						<i class="fas fa-arrows-rotate"></i> <?= _("Restart") ?>
					</a>
				</div>
			</div>
			
			<div class="u-mb20">
				<h2 class="u-mb10"><?= _("Quick Settings") ?></h2>
				
				<div class="form-check u-mb10">
					<input type="checkbox" class="form-check-input" name="v_stats_enabled" id="v_stats_enabled" value="yes" <?= $v_stats_enabled === 'yes' ? 'checked' : '' ?>>
					<label class="form-check-label" for="v_stats_enabled">
						<?= _("Enable Stats Dashboard") ?>
					</label>
				</div>
				
				<?php if ($v_stats_enabled === 'yes') { ?>
					<div class="u-mb10">
						<p class="hint">
							<i class="fas fa-chart-bar"></i>
							<?= _("Stats Dashboard") ?>: 
							<a href="http://<?= $_SERVER["HTTP_HOST"] ?>:<?= htmlentities($v_stats_port) ?>/stats" target="_blank">
								http://<?= $_SERVER["HTTP_HOST"] ?>:<?= htmlentities($v_stats_port) ?>/stats
							</a>
						</p>
						<p class="hint">
							<i class="fas fa-user"></i> <?= _("Username") ?>: <?= htmlentities($v_stats_user) ?>
						</p>
					</div>
				<?php } ?>
			</div>
			
			<div class="u-mb10">
				<h2 class="u-mb10"><?= _("Configuration File") ?></h2>
				<p class="hint u-mb10">
					<i class="fas fa-info-circle"></i>
					<?= _("Edit the HAProxy configuration file directly. Changes will be validated before saving.") ?>
				</p>
				<label for="v_config" class="form-label">/etc/haproxy/haproxy.cfg</label>
				<textarea 
					class="form-control" 
					name="v_config" 
					id="v_config" 
					rows="30" 
					style="font-family: monospace; font-size: 13px;"
				><?= htmlentities($v_config) ?></textarea>
			</div>
			
			<div class="u-mt20">
				<div class="alert alert-warning">
					<i class="fas fa-exclamation-triangle"></i>
					<p>
						<strong><?= _("Port Conflicts:") ?></strong> <?= _("Nginx uses ports 80 and 443. If HAProxy needs these ports, you must stop Nginx first or use HAProxy on different ports (8080, 8443, 3000, etc).") ?>
					</p>
				</div>
				<div class="alert alert-info u-mt10">
					<i class="fas fa-info-circle"></i>
					<p><?= _("Configuration will be validated before saving. Check") ?> <code>journalctl -u haproxy -n 50</code> <?= _("if service fails to start.") ?></p>
				</div>
			</div>
		</div>

	</form>

</div>

<style>
.haproxy-status {
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
.button-small {
	padding: 5px 10px;
	font-size: 0.85em;
}
.form-container-wide {
	max-width: 1000px;
}
</style>
