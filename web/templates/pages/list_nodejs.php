<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary" href="/list/web/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<a class="button button-secondary js-confirm-action" 
			   href="/restart/pm2/?id=all&token=<?= $_SESSION["token"] ?>"
			   data-confirm-title="<?= _("Restart All") ?>"
			   data-confirm-message="<?= _("Are you sure you want to restart all PM2 processes?") ?>">
				<i class="fas fa-arrows-rotate icon-green"></i><?= _("Restart All") ?>
			</a>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">
	<h1 class="u-text-center u-hide-desktop u-mb20"><?= _("Node.js Applications") ?></h1>

	<?php if (empty($pm2_processes)) { ?>
		<div class="alert alert-info">
			<i class="fas fa-info-circle"></i>
			<p>
				<?= _("No PM2 processes running.") ?><br><br>
				<?= _("To create a Node.js app, SSH into your server and run:") ?><br>
				<code>pm2 start app.js --name "my-app"</code><br>
				<code>pm2 save</code>
			</p>
		</div>
	<?php } else { ?>
		<div class="units-table js-units-container">
			<div class="units-table-header">
				<div class="units-table-cell"><?= _("ID") ?></div>
				<div class="units-table-cell"><?= _("Name") ?></div>
				<div class="units-table-cell"><?= _("Status") ?></div>
				<div class="units-table-cell"><?= _("CPU") ?></div>
				<div class="units-table-cell"><?= _("Memory") ?></div>
				<div class="units-table-cell"><?= _("Uptime") ?></div>
				<div class="units-table-cell"><?= _("Restarts") ?></div>
				<div class="units-table-cell"></div>
			</div>

			<?php foreach ($pm2_processes as $process) { 
				$pm_id = $process['pm_id'] ?? $process['pm2_env']['pm_id'] ?? 0;
				$name = $process['name'] ?? 'unknown';
				$status = $process['pm2_env']['status'] ?? 'unknown';
				$cpu = $process['monit']['cpu'] ?? 0;
				$memory = isset($process['monit']['memory']) ? round($process['monit']['memory'] / 1024 / 1024, 1) : 0;
				$uptime = $process['pm2_env']['pm_uptime'] ?? 0;
				$restarts = $process['pm2_env']['restart_time'] ?? 0;
				
				// Calculate uptime
				if ($uptime > 0) {
					$uptime_seconds = (time() * 1000 - $uptime) / 1000;
					if ($uptime_seconds < 60) {
						$uptime_str = round($uptime_seconds) . 's';
					} elseif ($uptime_seconds < 3600) {
						$uptime_str = round($uptime_seconds / 60) . 'm';
					} elseif ($uptime_seconds < 86400) {
						$uptime_str = round($uptime_seconds / 3600, 1) . 'h';
					} else {
						$uptime_str = round($uptime_seconds / 86400, 1) . 'd';
					}
				} else {
					$uptime_str = '-';
				}
				
				$status_class = ($status === 'online') ? 'active' : 'suspended';
				$status_icon = ($status === 'online') ? 'fa-circle-check icon-green' : 'fa-circle-minus icon-red';
			?>
			<div class="units-table-row <?php if ($status !== 'online') echo 'disabled'; ?> js-unit">
				<div class="units-table-cell u-text-bold">
					<span class="u-hide-desktop"><?= _("ID") ?>:</span>
					<?= htmlspecialchars($pm_id) ?>
				</div>
				<div class="units-table-cell units-table-heading-cell u-text-bold">
					<span class="u-hide-desktop"><?= _("Name") ?>:</span>
					<i class="fas <?= $status_icon ?> u-mr5"></i>
					<?= htmlspecialchars($name) ?>
				</div>
				<div class="units-table-cell">
					<span class="u-hide-desktop"><?= _("Status") ?>:</span>
					<span class="badge badge-<?= $status === 'online' ? 'success' : 'danger' ?>">
						<?= htmlspecialchars($status) ?>
					</span>
				</div>
				<div class="units-table-cell u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("CPU") ?>:</span>
					<?= $cpu ?>%
				</div>
				<div class="units-table-cell u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Memory") ?>:</span>
					<?= $memory ?> MB
				</div>
				<div class="units-table-cell u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Uptime") ?>:</span>
					<?= $uptime_str ?>
				</div>
				<div class="units-table-cell u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Restarts") ?>:</span>
					<?= $restarts ?>
				</div>
				<div class="units-table-cell">
					<ul class="units-table-row-actions">
						<li class="units-table-row-action">
							<a class="units-table-row-action-link"
							   href="/view/pm2-log/?id=<?= $pm_id ?>&name=<?= urlencode($name) ?>&token=<?= $_SESSION["token"] ?>"
							   title="<?= _("View Logs") ?>">
								<i class="fas fa-file-lines icon-blue"></i>
								<span class="u-hide-desktop"><?= _("Logs") ?></span>
							</a>
						</li>
						<li class="units-table-row-action">
							<a class="units-table-row-action-link js-confirm-action"
							   href="/restart/pm2/?id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
							   data-confirm-title="<?= _("Restart") ?>"
							   data-confirm-message="<?= sprintf(_("Are you sure you want to restart %s?"), htmlspecialchars($name)) ?>"
							   title="<?= _("Restart") ?>">
								<i class="fas fa-arrows-rotate icon-green"></i>
								<span class="u-hide-desktop"><?= _("Restart") ?></span>
							</a>
						</li>
						<?php if ($status === 'online') { ?>
						<li class="units-table-row-action">
							<a class="units-table-row-action-link js-confirm-action"
							   href="/stop/pm2/?id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
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
							   href="/start/pm2/?id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
							   data-confirm-title="<?= _("Start") ?>"
							   data-confirm-message="<?= sprintf(_("Are you sure you want to start %s?"), htmlspecialchars($name)) ?>"
							   title="<?= _("Start") ?>">
								<i class="fas fa-play icon-green"></i>
								<span class="u-hide-desktop"><?= _("Start") ?></span>
							</a>
						</li>
						<?php } ?>
						<li class="units-table-row-action">
							<a class="units-table-row-action-link js-confirm-action"
							   href="/delete/pm2/?id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
							   data-confirm-title="<?= _("Delete") ?>"
							   data-confirm-message="<?= sprintf(_("Are you sure you want to delete %s?"), htmlspecialchars($name)) ?>"
							   title="<?= _("Delete") ?>">
								<i class="fas fa-trash icon-red"></i>
								<span class="u-hide-desktop"><?= _("Delete") ?></span>
							</a>
						</li>
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
</style>
