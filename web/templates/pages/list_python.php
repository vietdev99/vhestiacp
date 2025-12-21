<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary" href="/list/web/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">
	<h1 class="u-text-center u-hide-desktop u-mb20"><?= _("Python Applications") ?></h1>

	<?php if (empty($python_processes)) { ?>
		<div class="alert alert-info">
			<i class="fas fa-info-circle"></i>
			<p>
				<?= _("No Python/Gunicorn/Uvicorn processes running.") ?><br><br>
				<?= _("To run a Python app with Gunicorn, SSH into your server and run:") ?><br>
				<code>gunicorn myapp:app --bind 127.0.0.1:8000 --daemon</code><br><br>
				<?= _("Or create a systemd service for auto-start.") ?>
			</p>
		</div>
	<?php } else { ?>
		<div class="units-table js-units-container">
			<div class="units-table-header">
				<div class="units-table-cell"><?= _("PID") ?></div>
				<div class="units-table-cell"><?= _("Name") ?></div>
				<div class="units-table-cell"><?= _("Type") ?></div>
				<div class="units-table-cell"><?= _("Status") ?></div>
				<div class="units-table-cell"><?= _("Memory") ?></div>
				<div class="units-table-cell"></div>
			</div>

			<?php foreach ($python_processes as $process) { 
				$pid = $process['pid'] ?? 0;
				$name = $process['name'] ?? 'unknown';
				$type = $process['type'] ?? 'process';
				$status = $process['status'] ?? 'unknown';
				$memory = $process['memory'] ?? 0;
				
				$status_running = in_array($status, ['running', 'active']);
				$status_icon = $status_running ? 'fa-circle-check icon-green' : 'fa-circle-minus icon-red';
			?>
			<div class="units-table-row <?php if (!$status_running) echo 'disabled'; ?> js-unit">
				<div class="units-table-cell u-text-bold">
					<span class="u-hide-desktop"><?= _("PID") ?>:</span>
					<?= htmlspecialchars($pid) ?>
				</div>
				<div class="units-table-cell units-table-heading-cell u-text-bold">
					<span class="u-hide-desktop"><?= _("Name") ?>:</span>
					<i class="fas <?= $status_icon ?> u-mr5"></i>
					<?= htmlspecialchars($name) ?>
				</div>
				<div class="units-table-cell">
					<span class="u-hide-desktop"><?= _("Type") ?>:</span>
					<span class="badge badge-<?= $type === 'systemd' ? 'primary' : 'secondary' ?>">
						<?= htmlspecialchars($type) ?>
					</span>
				</div>
				<div class="units-table-cell">
					<span class="u-hide-desktop"><?= _("Status") ?>:</span>
					<span class="badge badge-<?= $status_running ? 'success' : 'danger' ?>">
						<?= htmlspecialchars($status) ?>
					</span>
				</div>
				<div class="units-table-cell u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Memory") ?>:</span>
					<?= $memory ?> MB
				</div>
				<div class="units-table-cell">
					<ul class="units-table-row-actions">
						<?php if ($type === 'systemd') { ?>
						<li class="units-table-row-action">
							<a class="units-table-row-action-link js-confirm-action"
							   href="/restart/python-service/?name=<?= urlencode($name) ?>&token=<?= $_SESSION["token"] ?>"
							   data-confirm-title="<?= _("Restart") ?>"
							   data-confirm-message="<?= sprintf(_("Are you sure you want to restart %s?"), htmlspecialchars($name)) ?>"
							   title="<?= _("Restart") ?>">
								<i class="fas fa-arrows-rotate icon-green"></i>
								<span class="u-hide-desktop"><?= _("Restart") ?></span>
							</a>
						</li>
						<?php if ($status_running) { ?>
						<li class="units-table-row-action">
							<a class="units-table-row-action-link js-confirm-action"
							   href="/stop/python-service/?name=<?= urlencode($name) ?>&token=<?= $_SESSION["token"] ?>"
							   data-confirm-title="<?= _("Stop") ?>"
							   data-confirm-message="<?= sprintf(_("Are you sure you want to stop %s?"), htmlspecialchars($name)) ?>"
							   title="<?= _("Stop") ?>">
								<i class="fas fa-stop icon-orange"></i>
								<span class="u-hide-desktop"><?= _("Stop") ?></span>
							</a>
						</li>
						<?php } else { ?>
						<li class="units-table-row-action">
							<a class="units-table-row-action-link js-confirm-action"
							   href="/start/python-service/?name=<?= urlencode($name) ?>&token=<?= $_SESSION["token"] ?>"
							   data-confirm-title="<?= _("Start") ?>"
							   data-confirm-message="<?= sprintf(_("Are you sure you want to start %s?"), htmlspecialchars($name)) ?>"
							   title="<?= _("Start") ?>">
								<i class="fas fa-play icon-green"></i>
								<span class="u-hide-desktop"><?= _("Start") ?></span>
							</a>
						</li>
						<?php } ?>
						<?php } else { ?>
						<li class="units-table-row-action">
							<a class="units-table-row-action-link js-confirm-action"
							   href="/stop/python-process/?pid=<?= $pid ?>&token=<?= $_SESSION["token"] ?>"
							   data-confirm-title="<?= _("Kill Process") ?>"
							   data-confirm-message="<?= sprintf(_("Are you sure you want to kill process %d?"), $pid) ?>"
							   title="<?= _("Kill") ?>">
								<i class="fas fa-skull icon-red"></i>
								<span class="u-hide-desktop"><?= _("Kill") ?></span>
							</a>
						</li>
						<?php } ?>
					</ul>
				</div>
			</div>
			<?php } ?>
		</div>
	<?php } ?>
</div>

<style>
.badge {
	display: inline-block;
	padding: 4px 10px;
	border-radius: 12px;
	font-size: 0.8em;
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
.badge-primary {
	background: rgba(0, 123, 255, 0.15);
	color: #007bff;
}
.badge-secondary {
	background: rgba(108, 117, 125, 0.15);
	color: #6c757d;
}
</style>
