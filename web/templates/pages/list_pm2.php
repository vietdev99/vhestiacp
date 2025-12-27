<?php
$pm2_installed = $GLOBALS['pm2_installed'] ?? false;
$pm2_data = $GLOBALS['pm2_data'] ?? [];
$is_admin = $GLOBALS['is_admin'] ?? false;
$user_count = count($pm2_data['users'] ?? []);
?>

<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="<?= $is_admin ? '/list/server/' : '/list/web/' ?>" class="button button-secondary">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
			<?php if ($pm2_installed) { ?>
				<button type="button" class="button button-secondary" onclick="refreshPm2()">
					<i class="fas fa-sync icon-green"></i><?= _("Refresh") ?>
				</button>
			<?php } ?>
		</div>
		<?php if ($pm2_installed && !empty($pm2_data['users'])) { ?>
			<div class="toolbar-right">
				<form x-data x-bind="BulkEdit" action="/bulk/pm2/" method="post">
					<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
					<select class="form-select" name="action">
						<option value=""><?= _("Apply to selected") ?></option>
						<option value="restart"><?= _("Restart") ?></option>
						<option value="stop"><?= _("Stop") ?></option>
						<option value="delete"><?= _("Delete") ?></option>
					</select>
					<button type="submit" class="toolbar-input-submit" title="<?= _("Apply to selected") ?>">
						<i class="fas fa-arrow-right"></i>
					</button>
				</form>
			</div>
		<?php } ?>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<h1 class="u-text-center u-mb20">
		<i class="fas fa-cubes icon-green u-mr10"></i><?= _("PM2 Process Manager") ?>
	</h1>

	<?php if (!$pm2_installed) { ?>
		<div class="alert alert-info">
			<i class="fas fa-info-circle"></i>
			<?= _("PM2 is not installed on this system.") ?>
			<br><br>
			<strong><?= _("To install PM2:") ?></strong>
			<pre style="background: #1a1a2e; padding: 15px; border-radius: 5px; margin-top: 10px;">npm install -g pm2</pre>
		</div>
	<?php } elseif (empty($pm2_data['users']) || array_sum(array_map('count', $pm2_data['users'])) === 0) { ?>
		<div class="alert alert-info">
			<i class="fas fa-info-circle"></i>
			<?= $is_admin ? _("No PM2 processes are currently running on this system.") : _("You have no PM2 processes running.") ?>
		</div>
	<?php } else { ?>

		<?php foreach ($pm2_data['users'] as $username => $processes): ?>
			<?php if (empty($processes)) continue; ?>

			<div class="pm2-user-section u-mb30">
				<?php if ($is_admin || $user_count > 1): ?>
					<h2 class="u-mb15">
						<i class="fas fa-user icon-blue u-mr5"></i>
						<?= htmlspecialchars($username) ?>
						<span class="badge badge-info u-ml10"><?= count($processes) ?> <?= _("processes") ?></span>
					</h2>
				<?php endif; ?>

				<div class="units-table js-units-container">
					<div class="units-table-header">
						<div class="units-table-cell">
							<input type="checkbox" class="js-toggle-all-checkbox" title="<?= _("Select all") ?>">
						</div>
						<div class="units-table-cell u-text-center"><?= _("ID") ?></div>
						<div class="units-table-cell"><?= _("Name") ?></div>
						<div class="units-table-cell"></div>
						<div class="units-table-cell u-text-center"><?= _("Status") ?></div>
						<div class="units-table-cell u-text-center"><?= _("CPU") ?></div>
						<div class="units-table-cell u-text-center"><?= _("Memory") ?></div>
						<div class="units-table-cell u-text-center"><?= _("Uptime") ?></div>
						<div class="units-table-cell u-text-center"><?= _("Restarts") ?></div>
					</div>

					<?php foreach ($processes as $proc): ?>
						<?php
						$pm_id = $proc['pm_id'] ?? 0;
						$name = $proc['name'] ?? 'unknown';
						$status = $proc['pm2_env']['status'] ?? 'unknown';
						$memory = $proc['monit']['memory'] ?? 0;
						$cpu = $proc['monit']['cpu'] ?? 0;
						$pm_uptime = $proc['pm2_env']['pm_uptime'] ?? 0;
						$restart_time = $proc['pm2_env']['restart_time'] ?? 0;
						$exec_mode = $proc['pm2_env']['exec_mode'] ?? 'fork';
						$script = $proc['pm2_env']['pm_exec_path'] ?? '';
						$cwd = $proc['pm2_env']['pm_cwd'] ?? '';

						// Format memory
						if ($memory > 1024 * 1024 * 1024) {
							$mem_str = number_format($memory / (1024 * 1024 * 1024), 1) . ' GB';
						} elseif ($memory > 1024 * 1024) {
							$mem_str = number_format($memory / (1024 * 1024), 1) . ' MB';
						} elseif ($memory > 1024) {
							$mem_str = number_format($memory / 1024, 1) . ' KB';
						} else {
							$mem_str = $memory . ' B';
						}

						// Format uptime
						if ($pm_uptime > 0) {
							$diff = (time() * 1000 - $pm_uptime) / 1000;
							if ($diff > 86400) {
								$uptime_str = floor($diff / 86400) . 'd';
							} elseif ($diff > 3600) {
								$uptime_str = floor($diff / 3600) . 'h';
							} elseif ($diff > 60) {
								$uptime_str = floor($diff / 60) . 'm';
							} else {
								$uptime_str = floor($diff) . 's';
							}
						} else {
							$uptime_str = '-';
						}

						// Status styling
						$status_class = 'suspended';
						$status_icon = 'fa-circle-minus icon-red';
						if ($status === 'online') {
							$status_class = 'active';
							$status_icon = 'fa-circle-check icon-green';
						} elseif ($status === 'stopping') {
							$status_icon = 'fa-circle-pause icon-orange';
						}
						?>

						<div class="units-table-row <?php if ($status !== 'online') echo 'disabled'; ?> js-unit"
							data-sort-name="<?= strtolower($name) ?>"
							data-sort-memory="<?= $memory ?>"
							data-sort-cpu="<?= $cpu ?>">
							<div class="units-table-cell">
								<div>
									<input id="check-<?= $username ?>-<?= $pm_id ?>" class="js-unit-checkbox" type="checkbox"
										title="<?= _("Select") ?>" name="process[]" value="<?= htmlspecialchars($username) ?>:<?= $pm_id ?>">
									<label for="check-<?= $username ?>-<?= $pm_id ?>" class="u-hide-desktop"><?= _("Select") ?></label>
								</div>
							</div>
							<div class="units-table-cell u-text-center u-text-bold">
								<span class="u-hide-desktop"><?= _("ID") ?>:</span>
								<?= $pm_id ?>
							</div>
							<div class="units-table-cell units-table-heading-cell u-text-bold">
								<span class="u-hide-desktop"><?= _("Name") ?>:</span>
								<i class="fas <?= $status_icon ?> u-mr5"></i>
								<a href="javascript:void(0)" onclick="showPm2Details('<?= htmlspecialchars($username) ?>', <?= $pm_id ?>)" title="<?= _("View Details") ?>">
									<?= htmlspecialchars($name) ?>
								</a>
								<br>
								<small class="u-text-muted"><?= htmlspecialchars(basename($script)) ?></small>
							</div>
							<div class="units-table-cell">
								<ul class="units-table-row-actions">
									<li class="units-table-row-action" data-key-action="js">
										<a class="units-table-row-action-link" href="javascript:void(0)"
											onclick="showPm2Logs('<?= htmlspecialchars($username) ?>', <?= $pm_id ?>)"
											title="<?= _("Logs") ?>">
											<i class="fas fa-file-lines icon-blue"></i>
											<span class="u-hide-desktop"><?= _("Logs") ?></span>
										</a>
									</li>
									<li class="units-table-row-action" data-key-action="js">
										<a class="units-table-row-action-link data-controls js-confirm-action"
											href="/restart/pm2/?user=<?= urlencode($username) ?>&id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
											title="<?= _("Restart") ?>"
											data-confirm-title="<?= _("Restart") ?>"
											data-confirm-message="<?= sprintf(_("Restart PM2 process %s?"), $name) ?>">
											<i class="fas fa-arrow-rotate-left icon-green"></i>
											<span class="u-hide-desktop"><?= _("Restart") ?></span>
										</a>
									</li>
									<?php if ($status === 'online') { ?>
										<li class="units-table-row-action" data-key-action="js">
											<a class="units-table-row-action-link data-controls js-confirm-action"
												href="/stop/pm2/?user=<?= urlencode($username) ?>&id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
												title="<?= _("Stop") ?>"
												data-confirm-title="<?= _("Stop") ?>"
												data-confirm-message="<?= sprintf(_("Stop PM2 process %s?"), $name) ?>">
												<i class="fas fa-stop icon-orange"></i>
												<span class="u-hide-desktop"><?= _("Stop") ?></span>
											</a>
										</li>
									<?php } else { ?>
										<li class="units-table-row-action" data-key-action="js">
											<a class="units-table-row-action-link data-controls js-confirm-action"
												href="/start/pm2/?user=<?= urlencode($username) ?>&id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
												title="<?= _("Start") ?>"
												data-confirm-title="<?= _("Start") ?>"
												data-confirm-message="<?= sprintf(_("Start PM2 process %s?"), $name) ?>">
												<i class="fas fa-play icon-green"></i>
												<span class="u-hide-desktop"><?= _("Start") ?></span>
											</a>
										</li>
									<?php } ?>
									<li class="units-table-row-action shortcut-delete" data-key-action="js">
										<a class="units-table-row-action-link data-controls js-confirm-action"
											href="/delete/pm2/?user=<?= urlencode($username) ?>&id=<?= $pm_id ?>&token=<?= $_SESSION["token"] ?>"
											title="<?= _("Delete") ?>"
											data-confirm-title="<?= _("Delete") ?>"
											data-confirm-message="<?= sprintf(_("Delete PM2 process %s? This action cannot be undone."), $name) ?>">
											<i class="fas fa-trash icon-red"></i>
											<span class="u-hide-desktop"><?= _("Delete") ?></span>
										</a>
									</li>
								</ul>
							</div>
							<div class="units-table-cell u-text-center">
								<span class="u-hide-desktop"><?= _("Status") ?>:</span>
								<span class="badge <?= $status === 'online' ? 'badge-success' : 'badge-danger' ?>">
									<?= htmlspecialchars($status) ?>
								</span>
							</div>
							<div class="units-table-cell u-text-bold u-text-center-desktop">
								<span class="u-hide-desktop"><?= _("CPU") ?>:</span>
								<?= number_format($cpu, 1) ?>%
							</div>
							<div class="units-table-cell u-text-bold u-text-center-desktop">
								<span class="u-hide-desktop"><?= _("Memory") ?>:</span>
								<?= $mem_str ?>
							</div>
							<div class="units-table-cell u-text-bold u-text-center-desktop">
								<span class="u-hide-desktop"><?= _("Uptime") ?>:</span>
								<?= $uptime_str ?>
							</div>
							<div class="units-table-cell u-text-bold u-text-center-desktop">
								<span class="u-hide-desktop"><?= _("Restarts") ?>:</span>
								<?= $restart_time ?>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		<?php endforeach; ?>

	<?php } ?>

</div>

<!-- PM2 Details Modal -->
<div id="pm2-details-modal" class="modal" style="display: none;">
	<div class="modal-content" style="max-width: 800px;">
		<div class="modal-header">
			<h3><i class="fas fa-cubes icon-green u-mr10"></i><span id="pm2-details-title">PM2 Process Details</span></h3>
			<button type="button" class="modal-close" onclick="closePm2Modal('pm2-details-modal')">&times;</button>
		</div>
		<div class="modal-body" id="pm2-details-body">
			<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>
		</div>
	</div>
</div>

<!-- PM2 Logs Modal -->
<div id="pm2-logs-modal" class="modal" style="display: none;">
	<div class="modal-content" style="max-width: 1000px; max-height: 80vh;">
		<div class="modal-header">
			<h3><i class="fas fa-file-lines icon-blue u-mr10"></i><span id="pm2-logs-title">PM2 Logs</span></h3>
			<button type="button" class="modal-close" onclick="closePm2Modal('pm2-logs-modal')">&times;</button>
		</div>
		<div class="modal-body" id="pm2-logs-body" style="max-height: 60vh; overflow-y: auto;">
			<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading logs...</div>
		</div>
		<div class="modal-footer">
			<button type="button" class="button button-secondary" onclick="refreshPm2Logs()">
				<i class="fas fa-sync"></i> <?= _("Refresh") ?>
			</button>
			<button type="button" class="button button-secondary" onclick="closePm2Modal('pm2-logs-modal')">
				<?= _("Close") ?>
			</button>
		</div>
	</div>
</div>

<style>
.pm2-user-section {
	background: var(--card-background);
	border-radius: 8px;
	padding: 20px;
	box-shadow: var(--box-shadow);
}

.badge {
	display: inline-block;
	padding: 3px 8px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 600;
}

.badge-success {
	background: var(--color-green);
	color: white;
}

.badge-danger {
	background: var(--color-red);
	color: white;
}

.badge-info {
	background: var(--color-blue);
	color: white;
}

/* Modal styles */
.modal {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.7);
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
}

.modal-content {
	background: var(--card-background);
	border-radius: 10px;
	width: 90%;
	max-height: 90vh;
	overflow: hidden;
	box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px 20px;
	border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
	margin: 0;
	font-size: 18px;
}

.modal-close {
	background: none;
	border: none;
	font-size: 24px;
	cursor: pointer;
	color: var(--text-color);
	line-height: 1;
}

.modal-close:hover {
	color: var(--color-red);
}

.modal-body {
	padding: 20px;
	overflow-y: auto;
}

.modal-footer {
	padding: 15px 20px;
	border-top: 1px solid var(--border-color);
	text-align: right;
}

.modal-footer .button {
	margin-left: 10px;
}

.loading {
	text-align: center;
	padding: 40px;
	color: var(--text-muted);
}

.pm2-info-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 15px;
}

.pm2-info-item {
	padding: 10px;
	background: var(--input-background);
	border-radius: 5px;
}

.pm2-info-item label {
	display: block;
	font-size: 12px;
	color: var(--text-muted);
	margin-bottom: 5px;
}

.pm2-info-item span {
	font-weight: 600;
}

.pm2-logs-container {
	background: #1a1a2e;
	color: #e0e0e0;
	padding: 15px;
	border-radius: 5px;
	font-family: monospace;
	font-size: 13px;
	white-space: pre-wrap;
	word-break: break-all;
	max-height: 500px;
	overflow-y: auto;
}

.pm2-logs-container .log-line {
	padding: 2px 0;
	border-bottom: 1px solid rgba(255,255,255,0.05);
}

.pm2-logs-container .log-error {
	color: #ff6b6b;
}

.pm2-logs-container .log-warn {
	color: #ffd93d;
}

.pm2-logs-container .log-info {
	color: #6bcb77;
}
</style>

<script>
let currentLogUser = '';
let currentLogId = 0;

function refreshPm2() {
	window.location.reload();
}

function showPm2Details(user, id) {
	document.getElementById('pm2-details-modal').style.display = 'flex';
	document.getElementById('pm2-details-title').textContent = 'Process Details - ID: ' + id;
	document.getElementById('pm2-details-body').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

	fetch('/api/pm2/details/?user=' + encodeURIComponent(user) + '&id=' + id + '&token=<?= $_SESSION["token"] ?>')
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				document.getElementById('pm2-details-body').innerHTML = '<div class="alert alert-danger">' + data.error + '</div>';
				return;
			}

			const proc = data.process;
			const env = proc.pm2_env || {};
			const monit = proc.monit || {};

			let html = '<div class="pm2-info-grid">';
			html += '<div class="pm2-info-item"><label>Name</label><span>' + (proc.name || '-') + '</span></div>';
			html += '<div class="pm2-info-item"><label>PM2 ID</label><span>' + (proc.pm_id || 0) + '</span></div>';
			html += '<div class="pm2-info-item"><label>Status</label><span>' + (env.status || '-') + '</span></div>';
			html += '<div class="pm2-info-item"><label>Exec Mode</label><span>' + (env.exec_mode || '-') + '</span></div>';
			html += '<div class="pm2-info-item"><label>CPU</label><span>' + (monit.cpu || 0).toFixed(1) + '%</span></div>';
			html += '<div class="pm2-info-item"><label>Memory</label><span>' + formatBytes(monit.memory || 0) + '</span></div>';
			html += '<div class="pm2-info-item"><label>Restarts</label><span>' + (env.restart_time || 0) + '</span></div>';
			html += '<div class="pm2-info-item"><label>Uptime</label><span>' + formatUptime(env.pm_uptime) + '</span></div>';
			html += '</div>';

			html += '<hr style="margin: 20px 0; border-color: var(--border-color);">';

			html += '<div class="pm2-info-item" style="margin-bottom: 10px;"><label>Script Path</label><span style="word-break: break-all;">' + (env.pm_exec_path || '-') + '</span></div>';
			html += '<div class="pm2-info-item" style="margin-bottom: 10px;"><label>Working Directory</label><span style="word-break: break-all;">' + (env.pm_cwd || '-') + '</span></div>';
			html += '<div class="pm2-info-item" style="margin-bottom: 10px;"><label>Interpreter</label><span>' + (env.exec_interpreter || 'node') + '</span></div>';
			html += '<div class="pm2-info-item" style="margin-bottom: 10px;"><label>PID</label><span>' + (proc.pid || '-') + '</span></div>';

			if (env.pm_out_log_path) {
				html += '<div class="pm2-info-item" style="margin-bottom: 10px;"><label>Out Log</label><span style="word-break: break-all;">' + env.pm_out_log_path + '</span></div>';
			}
			if (env.pm_err_log_path) {
				html += '<div class="pm2-info-item" style="margin-bottom: 10px;"><label>Error Log</label><span style="word-break: break-all;">' + env.pm_err_log_path + '</span></div>';
			}

			document.getElementById('pm2-details-body').innerHTML = html;
		})
		.catch(err => {
			document.getElementById('pm2-details-body').innerHTML = '<div class="alert alert-danger">Error loading details: ' + err.message + '</div>';
		});
}

function showPm2Logs(user, id) {
	currentLogUser = user;
	currentLogId = id;

	document.getElementById('pm2-logs-modal').style.display = 'flex';
	document.getElementById('pm2-logs-title').textContent = 'PM2 Logs - ID: ' + id;
	loadPm2Logs();
}

function loadPm2Logs() {
	document.getElementById('pm2-logs-body').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading logs...</div>';

	fetch('/api/pm2/logs/?user=' + encodeURIComponent(currentLogUser) + '&id=' + currentLogId + '&token=<?= $_SESSION["token"] ?>&lines=200')
		.then(response => response.json())
		.then(data => {
			if (data.error) {
				document.getElementById('pm2-logs-body').innerHTML = '<div class="alert alert-danger">' + data.error + '</div>';
				return;
			}

			let html = '<div class="pm2-logs-container">';

			if (data.out_logs && data.out_logs.length > 0) {
				html += '<div style="color: #6bcb77; margin-bottom: 10px; font-weight: bold;">--- STDOUT ---</div>';
				data.out_logs.forEach(line => {
					html += '<div class="log-line">' + escapeHtml(line) + '</div>';
				});
			}

			if (data.err_logs && data.err_logs.length > 0) {
				html += '<div style="color: #ff6b6b; margin: 15px 0 10px 0; font-weight: bold;">--- STDERR ---</div>';
				data.err_logs.forEach(line => {
					html += '<div class="log-line log-error">' + escapeHtml(line) + '</div>';
				});
			}

			if ((!data.out_logs || data.out_logs.length === 0) && (!data.err_logs || data.err_logs.length === 0)) {
				html += '<div style="color: var(--text-muted);">No logs available</div>';
			}

			html += '</div>';
			document.getElementById('pm2-logs-body').innerHTML = html;

			// Scroll to bottom
			const container = document.querySelector('.pm2-logs-container');
			if (container) {
				container.scrollTop = container.scrollHeight;
			}
		})
		.catch(err => {
			document.getElementById('pm2-logs-body').innerHTML = '<div class="alert alert-danger">Error loading logs: ' + err.message + '</div>';
		});
}

function refreshPm2Logs() {
	loadPm2Logs();
}

function closePm2Modal(modalId) {
	document.getElementById(modalId).style.display = 'none';
}

function formatBytes(bytes) {
	if (bytes > 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
	if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	if (bytes > 1024) return (bytes / 1024).toFixed(1) + ' KB';
	return bytes + ' B';
}

function formatUptime(pm_uptime) {
	if (!pm_uptime) return '-';
	const diff = (Date.now() - pm_uptime) / 1000;
	if (diff > 86400) return Math.floor(diff / 86400) + 'd';
	if (diff > 3600) return Math.floor(diff / 3600) + 'h';
	if (diff > 60) return Math.floor(diff / 60) + 'm';
	return Math.floor(diff) + 's';
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

// Close modal on escape key
document.addEventListener('keydown', function(e) {
	if (e.key === 'Escape') {
		closePm2Modal('pm2-details-modal');
		closePm2Modal('pm2-logs-modal');
	}
});

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
	modal.addEventListener('click', function(e) {
		if (e.target === this) {
			this.style.display = 'none';
		}
	});
});
</script>
