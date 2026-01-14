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

	<h1 class="u-mb20"><?= _("Database Settings") ?></h1>
	<?php show_alert_message($_SESSION); ?>

	<!-- Database Tabs -->
	<div class="tabs u-mb20">
		<div class="tabs-list" role="tablist">
			<?php if ($v_has_mysql) { ?>
				<button class="tabs-tab <?php if ($v_active_tab === 'mysql') echo 'active'; ?>"
						type="button" role="tab"
						onclick="switchTab('mysql')"
						aria-selected="<?= $v_active_tab === 'mysql' ? 'true' : 'false' ?>">
					<i class="fas fa-database icon-blue"></i>
					<?= _("MariaDB / MySQL") ?>
					<?php if ($v_mysql_data["status"] === "running") { ?>
						<span class="badge badge-success-small"><i class="fas fa-circle"></i></span>
					<?php } else { ?>
						<span class="badge badge-danger-small"><i class="fas fa-circle"></i></span>
					<?php } ?>
				</button>
			<?php } ?>
			<?php if ($v_has_pgsql) { ?>
				<button class="tabs-tab <?php if ($v_active_tab === 'pgsql') echo 'active'; ?>"
						type="button" role="tab"
						onclick="switchTab('pgsql')"
						aria-selected="<?= $v_active_tab === 'pgsql' ? 'true' : 'false' ?>">
					<i class="fas fa-database icon-blue"></i>
					<?= _("PostgreSQL") ?>
					<?php if ($v_pgsql_data["status"] === "running") { ?>
						<span class="badge badge-success-small"><i class="fas fa-circle"></i></span>
					<?php } else { ?>
						<span class="badge badge-danger-small"><i class="fas fa-circle"></i></span>
					<?php } ?>
				</button>
			<?php } ?>
			<?php if ($v_has_mongodb) { ?>
				<button class="tabs-tab <?php if ($v_active_tab === 'mongodb') echo 'active'; ?>"
						type="button" role="tab"
						onclick="switchTab('mongodb')"
						aria-selected="<?= $v_active_tab === 'mongodb' ? 'true' : 'false' ?>">
					<i class="fas fa-leaf icon-green"></i>
					<?= _("MongoDB") ?>
					<?php if ($v_mongodb_data["status"] === "running") { ?>
						<span class="badge badge-success-small"><i class="fas fa-circle"></i></span>
					<?php } else { ?>
						<span class="badge badge-danger-small"><i class="fas fa-circle"></i></span>
					<?php } ?>
				</button>
			<?php } ?>
		</div>
	</div>

	<!-- Tab Content -->
	<form id="main-form" name="v_configure_database" method="post">
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="save" value="save">
		<input type="hidden" name="tab" id="current-tab" value="<?= htmlentities($v_active_tab) ?>">

		<!-- MySQL/MariaDB Tab -->
		<?php if ($v_has_mysql) { ?>
		<div class="tabs-panel <?php if ($v_active_tab === 'mysql') echo 'active'; ?>" id="tab-mysql" role="tabpanel">
			<div class="form-container form-container-wide">

				<!-- Status Bar -->
				<div class="db-status-bar u-mb20">
					<div class="db-status-item">
						<span class="form-label"><?= _("Status") ?>:</span>
						<?php if ($v_mysql_data["status"] === "running") { ?>
							<span class="badge badge-success"><i class="fas fa-circle-check"></i> <?= _("Running") ?></span>
						<?php } else { ?>
							<span class="badge badge-danger"><i class="fas fa-circle-minus"></i> <?= _("Stopped") ?></span>
						<?php } ?>
					</div>
					<div class="db-status-item">
						<span class="form-label"><?= _("Version") ?>:</span>
						<span><?= htmlentities($v_mysql_data["version"]) ?></span>
					</div>
					<div class="db-status-item">
						<a href="/phpmyadmin/" target="_blank" class="button button-secondary button-small">
							<i class="fas fa-external-link"></i> phpMyAdmin
						</a>
					</div>
				</div>

				<!-- Quick Settings -->
				<div class="u-mb20">
					<h2 class="u-mb10"><?= _("Quick Settings") ?></h2>
					<div class="form-row">
						<div class="form-col">
							<label for="mysql_max_connections" class="form-label">max_connections</label>
							<input type="text" class="form-control" name="mysql_max_connections" id="mysql_max_connections"
								   value="<?= htmlentities($v_mysql_data["CONFIG"]["max_connections"] ?? "") ?>">
						</div>
						<div class="form-col">
							<label for="mysql_max_user_connections" class="form-label">max_user_connections</label>
							<input type="text" class="form-control" name="mysql_max_user_connections" id="mysql_max_user_connections"
								   value="<?= htmlentities($v_mysql_data["CONFIG"]["max_user_connections"] ?? "") ?>">
						</div>
					</div>
					<div class="form-row">
						<div class="form-col">
							<label for="mysql_wait_timeout" class="form-label">wait_timeout</label>
							<input type="text" class="form-control" name="mysql_wait_timeout" id="mysql_wait_timeout"
								   value="<?= htmlentities($v_mysql_data["CONFIG"]["wait_timeout"] ?? "") ?>">
						</div>
						<div class="form-col">
							<label for="mysql_max_allowed_packet" class="form-label">max_allowed_packet</label>
							<input type="text" class="form-control" name="mysql_max_allowed_packet" id="mysql_max_allowed_packet"
								   value="<?= htmlentities($v_mysql_data["CONFIG"]["max_allowed_packet"] ?? "") ?>">
						</div>
					</div>
				</div>

				<!-- Configuration File -->
				<div class="u-mb20">
					<label for="v_config_mysql" class="form-label">
						<?= htmlentities($v_mysql_data["CONFIG"]["config_path"] ?? "/etc/mysql/my.cnf") ?>
					</label>
					<textarea class="form-control u-min-height400 u-allow-resize u-console"
							  name="v_config" id="v_config_mysql"><?= htmlentities($v_mysql_data["config_content"]) ?></textarea>
				</div>

				<!-- Backup Settings -->
				<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
					<h2 class="u-mb10"><?= _("Backup Settings") ?></h2>
					<div class="form-check u-mb10">
						<input class="form-check-input" type="checkbox" name="mysql_backup_enabled" id="mysql_backup_enabled">
						<label for="mysql_backup_enabled"><?= _("Enable automatic backups (mysqldump)") ?></label>
					</div>
					<div class="form-row">
						<div class="form-col">
							<label class="form-label"><?= _("Backup Schedule") ?></label>
							<select class="form-select" name="mysql_backup_schedule">
								<option value="daily"><?= _("Daily") ?></option>
								<option value="weekly"><?= _("Weekly") ?></option>
								<option value="monthly"><?= _("Monthly") ?></option>
							</select>
						</div>
						<div class="form-col">
							<label class="form-label"><?= _("Retention (days)") ?></label>
							<input type="number" class="form-control" name="mysql_backup_retention" value="7" min="1" max="365">
						</div>
					</div>
				</div>

				<div class="form-check u-mb10">
					<input class="form-check-input" type="checkbox" name="v_restart" id="v_restart_mysql" checked>
					<label for="v_restart_mysql"><?= _("Restart service after saving") ?></label>
				</div>
			</div>
		</div>
		<?php } ?>

		<!-- PostgreSQL Tab -->
		<?php if ($v_has_pgsql) { ?>
		<div class="tabs-panel <?php if ($v_active_tab === 'pgsql') echo 'active'; ?>" id="tab-pgsql" role="tabpanel">
			<div class="form-container form-container-wide">

				<!-- Status Bar -->
				<div class="db-status-bar u-mb20">
					<div class="db-status-item">
						<span class="form-label"><?= _("Status") ?>:</span>
						<?php if ($v_pgsql_data["status"] === "running") { ?>
							<span class="badge badge-success"><i class="fas fa-circle-check"></i> <?= _("Running") ?></span>
						<?php } else { ?>
							<span class="badge badge-danger"><i class="fas fa-circle-minus"></i> <?= _("Stopped") ?></span>
						<?php } ?>
					</div>
					<div class="db-status-item">
						<span class="form-label"><?= _("Version") ?>:</span>
						<span><?= htmlentities($v_pgsql_data["version"]) ?></span>
					</div>
					<div class="db-status-item">
						<a href="/phppgadmin/" target="_blank" class="button button-secondary button-small">
							<i class="fas fa-external-link"></i> phpPgAdmin
						</a>
					</div>
				</div>

				<!-- pg_hba.conf -->
				<div class="u-mb20">
					<label for="v_options_pgsql" class="form-label">
						<?= htmlentities($v_pgsql_data["CONFIG"]["pg_hba_path"] ?? "/etc/postgresql/pg_hba.conf") ?>
					</label>
					<textarea class="form-control u-min-height200 u-allow-resize u-console"
							  name="v_options" id="v_options_pgsql"><?= htmlentities($v_pgsql_data["options_content"]) ?></textarea>
				</div>

				<!-- postgresql.conf -->
				<div class="u-mb20">
					<label for="v_config_pgsql" class="form-label">
						<?= htmlentities($v_pgsql_data["CONFIG"]["config_path"] ?? "/etc/postgresql/postgresql.conf") ?>
					</label>
					<textarea class="form-control u-min-height400 u-allow-resize u-console"
							  name="v_config" id="v_config_pgsql"><?= htmlentities($v_pgsql_data["config_content"]) ?></textarea>
				</div>

				<!-- Backup Settings -->
				<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
					<h2 class="u-mb10"><?= _("Backup Settings") ?></h2>
					<div class="form-check u-mb10">
						<input class="form-check-input" type="checkbox" name="pgsql_backup_enabled" id="pgsql_backup_enabled">
						<label for="pgsql_backup_enabled"><?= _("Enable automatic backups (pg_dump)") ?></label>
					</div>
					<div class="form-row">
						<div class="form-col">
							<label class="form-label"><?= _("Backup Schedule") ?></label>
							<select class="form-select" name="pgsql_backup_schedule">
								<option value="daily"><?= _("Daily") ?></option>
								<option value="weekly"><?= _("Weekly") ?></option>
								<option value="monthly"><?= _("Monthly") ?></option>
							</select>
						</div>
						<div class="form-col">
							<label class="form-label"><?= _("Retention (days)") ?></label>
							<input type="number" class="form-control" name="pgsql_backup_retention" value="7" min="1" max="365">
						</div>
					</div>
				</div>

				<div class="form-check u-mb10">
					<input class="form-check-input" type="checkbox" name="v_restart" id="v_restart_pgsql" checked>
					<label for="v_restart_pgsql"><?= _("Restart service after saving") ?></label>
				</div>
			</div>
		</div>
		<?php } ?>

		<!-- MongoDB Tab -->
		<?php if ($v_has_mongodb) { ?>
		<div class="tabs-panel <?php if ($v_active_tab === 'mongodb') echo 'active'; ?>" id="tab-mongodb" role="tabpanel">
			<div class="form-container form-container-wide">

				<!-- Status Bar -->
				<div class="db-status-bar u-mb20">
					<div class="db-status-item">
						<span class="form-label"><?= _("Status") ?>:</span>
						<?php if ($v_mongodb_data["status"] === "running") { ?>
							<span class="badge badge-success"><i class="fas fa-circle-check"></i> <?= _("Running") ?></span>
						<?php } else { ?>
							<span class="badge badge-danger"><i class="fas fa-circle-minus"></i> <?= _("Stopped") ?></span>
						<?php } ?>
					</div>
					<div class="db-status-item">
						<span class="form-label"><?= _("Version") ?>:</span>
						<span><?= htmlentities($v_mongodb_data["version"]) ?></span>
					</div>
					<div class="db-status-item">
						<a href="/list/mongodb/" class="button button-secondary button-small">
							<i class="fas fa-leaf"></i> <?= _("MongoDB Databases") ?>
						</a>
					</div>
				</div>

				<!-- Configuration File -->
				<div class="u-mb20">
					<label for="v_config_mongodb" class="form-label"><?= htmlentities($v_mongodb_data["config_path"]) ?></label>
					<textarea class="form-control u-min-height400 u-allow-resize u-console"
							  name="v_config" id="v_config_mongodb"><?= htmlentities($v_mongodb_data["config_content"]) ?></textarea>
				</div>

				<!-- Advanced Configuration -->
				<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
					<h2 class="u-mb20"><?= _("Advanced Configuration") ?></h2>

					<!-- Cluster Mode -->
					<div class="u-mb20">
						<label for="v_cluster_mode" class="form-label"><?= _("Cluster Mode") ?></label>
						<select class="form-select" name="v_cluster_mode" id="v_cluster_mode" onchange="toggleClusterOptions()">
							<option value="standalone"><?= _("Standalone (Default)") ?></option>
							<option value="replicaset"><?= _("ReplicaSet") ?></option>
							<option value="sharding"><?= _("Sharding (Cluster)") ?></option>
						</select>
					</div>

					<!-- ReplicaSet Options -->
					<div id="replicaset_options" class="cluster-options" style="display:none; padding-left: 15px; border-left: 3px solid var(--color-text-link);">
						<div class="u-mb10">
							<label class="form-label"><?= _("Replica Set Name") ?></label>
							<input type="text" class="form-control" name="v_repl_name" value="rs0" placeholder="rs0">
						</div>
						<div class="u-mb10">
							<label class="form-label"><?= _("Node Role") ?></label>
							<select class="form-select" name="v_node_role">
								<option value="primary"><?= _("Primary") ?></option>
								<option value="secondary"><?= _("Secondary") ?></option>
								<option value="arbiter"><?= _("Arbiter") ?></option>
							</select>
						</div>

						<!-- Keyfile Authentication -->
						<div class="u-mb10" style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
							<label class="form-label"><?= _("Keyfile Authentication") ?></label>
							<div class="form-note u-mb10"><?= _("Keyfile is required for authentication between ReplicaSet members.") ?></div>

							<div class="u-mb10">
								<label class="form-label"><?= _("Keyfile Path") ?></label>
								<input type="text" class="form-control" name="v_keyfile_path" id="v_keyfile_path"
									   value="/var/lib/mongodb/keyfile" placeholder="/var/lib/mongodb/keyfile">
							</div>

							<div class="keyfile-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
								<button type="button" class="button button-secondary" onclick="generateKeyfile('replicaset')">
									<i class="fas fa-key icon-green"></i> <?= _("Generate Key") ?>
								</button>
								<label class="button button-secondary" style="cursor: pointer; margin: 0;">
									<i class="fas fa-upload icon-blue"></i> <?= _("Upload Key") ?>
									<input type="file" name="v_keyfile_upload" id="v_keyfile_upload_rs" style="display: none;"
										   onchange="uploadKeyfile(this, 'replicaset')">
								</label>
								<button type="button" class="button button-secondary" onclick="downloadKeyfile()">
									<i class="fas fa-download icon-purple"></i> <?= _("Download Key") ?>
								</button>
							</div>
							<div id="keyfile_status_rs" class="form-note u-mt10" style="display: none;"></div>
						</div>

						<!-- PBM Backup -->
						<div class="form-check u-mb10">
							<input class="form-check-input" type="checkbox" name="v_pbm_backup" id="v_pbm_backup" onchange="togglePbmOptions()">
							<label for="v_pbm_backup"><?= _("Enable Percona Backup (PBM)") ?></label>
						</div>

						<!-- PBM Options -->
						<div id="pbm_options" style="display:none; margin-left: 25px; margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
							<div class="u-mb10">
								<label class="form-label"><?= _("Backup Type") ?></label>
								<select class="form-select" name="v_pbm_type" id="v_pbm_type" onchange="toggleBackupTypeOptions()">
									<option value="logical"><?= _("Logical (mongodump)") ?></option>
									<option value="physical"><?= _("Physical (file copy)") ?></option>
									<option value="incremental"><?= _("Incremental + PITR") ?></option>
								</select>
								<div class="form-note" id="pbm_type_note"></div>
							</div>

							<div class="u-mb10" id="pbm_schedule_section">
								<label class="form-label"><?= _("Backup Schedule") ?></label>
								<div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
									<select class="form-select" name="v_pbm_schedule_type" id="v_pbm_schedule_type" style="width: auto;">
										<option value="daily"><?= _("Daily") ?></option>
										<option value="weekly"><?= _("Weekly") ?></option>
										<option value="interval"><?= _("Every X hours") ?></option>
									</select>
									<div id="schedule_time_picker" style="display: flex; gap: 5px; align-items: center;">
										<span><?= _("at") ?></span>
										<input type="time" class="form-control" name="v_pbm_time" value="02:00" style="width: auto;">
									</div>
								</div>
							</div>

							<div class="u-mb10">
								<label class="form-label"><?= _("Backup Retention (days)") ?></label>
								<input type="number" class="form-control" name="v_pbm_retention" value="7" min="1" max="365">
							</div>

							<div class="u-mb10">
								<label class="form-label"><?= _("Storage") ?></label>
								<select class="form-select" name="v_pbm_storage" id="v_pbm_storage" onchange="togglePbmStorage()">
									<option value="filesystem"><?= _("Local Filesystem") ?></option>
									<option value="s3"><?= _("Amazon S3 / Compatible") ?></option>
								</select>
							</div>

							<div id="pbm_storage_fs" class="u-mb10">
								<label class="form-label"><?= _("Backup Path") ?></label>
								<input type="text" class="form-control" name="v_pbm_path" value="/var/lib/pbm/backups">
							</div>

							<div id="pbm_storage_s3" style="display:none;">
								<div class="u-mb10">
									<label class="form-label"><?= _("S3 Endpoint") ?></label>
									<input type="text" class="form-control" name="v_pbm_s3_endpoint" placeholder="s3.amazonaws.com">
								</div>
								<div class="u-mb10">
									<label class="form-label"><?= _("S3 Bucket") ?></label>
									<input type="text" class="form-control" name="v_pbm_s3_bucket" placeholder="my-mongodb-backups">
								</div>
								<div class="u-mb10">
									<label class="form-label"><?= _("S3 Access Key") ?></label>
									<input type="text" class="form-control" name="v_pbm_s3_key">
								</div>
								<div class="u-mb10">
									<label class="form-label"><?= _("S3 Secret Key") ?></label>
									<input type="password" class="form-control" name="v_pbm_s3_secret">
								</div>
							</div>

							<div class="form-check u-mb10">
								<input class="form-check-input" type="checkbox" name="v_pbm_compression" id="v_pbm_compression" checked>
								<label for="v_pbm_compression"><?= _("Enable Compression") ?></label>
							</div>
						</div>
					</div>

					<!-- Sharding Options -->
					<div id="sharding_options" class="cluster-options" style="display:none; padding-left: 15px; border-left: 3px solid var(--icon-color-purple);">
						<div class="u-mb10">
							<label class="form-label"><?= _("Cluster Role") ?></label>
							<select class="form-select" name="v_shard_role">
								<option value="shardsvr"><?= _("Shard Server (Data)") ?></option>
								<option value="configsvr"><?= _("Config Server (Metadata)") ?></option>
								<option value="mongos"><?= _("Mongos Router") ?></option>
							</select>
						</div>
					</div>
				</div>

				<div class="form-check u-mb10">
					<input class="form-check-input" type="checkbox" name="v_restart" id="v_restart_mongodb" checked>
					<label for="v_restart_mongodb"><?= _("Restart service after saving") ?></label>
				</div>
			</div>
		</div>
		<?php } ?>

	</form>

</div>

<style>
/* Tabs */
.tabs-list {
	display: flex;
	gap: 5px;
	border-bottom: 2px solid #ddd;
	padding-bottom: 0;
	margin-bottom: 0;
	flex-wrap: wrap;
}

.tabs-tab {
	padding: 12px 20px;
	border: none;
	background: #f5f5f5;
	border-radius: 8px 8px 0 0;
	cursor: pointer;
	font-size: 0.95rem;
	font-weight: 500;
	color: #666;
	display: flex;
	align-items: center;
	gap: 8px;
	transition: all 0.2s;
}

.tabs-tab:hover {
	background: #e8e8e8;
	color: #333;
}

.tabs-tab.active {
	background: #fff;
	color: var(--color-text-link);
	border: 2px solid #ddd;
	border-bottom-color: #fff;
	margin-bottom: -2px;
}

.tabs-panel {
	display: none;
	padding-top: 20px;
}

.tabs-panel.active {
	display: block;
}

/* Database Status Bar */
.db-status-bar {
	display: flex;
	align-items: center;
	gap: 20px;
	padding: 15px;
	background: #f8f9fa;
	border-radius: 8px;
	flex-wrap: wrap;
}

.db-status-item {
	display: flex;
	align-items: center;
	gap: 8px;
}

/* Badges */
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

.badge-success-small,
.badge-danger-small {
	font-size: 0.6em;
	padding: 0;
}

.badge-success-small {
	color: #28a745;
}

.badge-danger-small {
	color: #dc3545;
}

/* Form Layout */
.form-container-wide {
	max-width: 1000px;
}

.form-row {
	display: flex;
	gap: 20px;
	margin-bottom: 15px;
	flex-wrap: wrap;
}

.form-col {
	flex: 1;
	min-width: 200px;
}

.button-small {
	padding: 6px 12px;
	font-size: 0.85rem;
}

/* Cluster options */
.cluster-options {
	margin-top: 15px;
	padding: 15px;
	background: #fafafa;
	border-radius: 8px;
}
</style>

<script>
function switchTab(tab) {
	// Update hidden input
	document.getElementById('current-tab').value = tab;

	// Update URL without reload
	const url = new URL(window.location);
	url.searchParams.set('tab', tab);
	window.history.pushState({}, '', url);

	// Update tab buttons
	document.querySelectorAll('.tabs-tab').forEach(btn => {
		btn.classList.remove('active');
		btn.setAttribute('aria-selected', 'false');
	});
	event.target.closest('.tabs-tab').classList.add('active');
	event.target.closest('.tabs-tab').setAttribute('aria-selected', 'true');

	// Update tab panels
	document.querySelectorAll('.tabs-panel').forEach(panel => {
		panel.classList.remove('active');
	});
	document.getElementById('tab-' + tab).classList.add('active');
}

function toggleClusterOptions() {
	const mode = document.getElementById('v_cluster_mode').value;
	document.getElementById('replicaset_options').style.display = (mode === 'replicaset') ? 'block' : 'none';
	document.getElementById('sharding_options').style.display = (mode === 'sharding') ? 'block' : 'none';
}

function togglePbmOptions() {
	const enabled = document.getElementById('v_pbm_backup').checked;
	document.getElementById('pbm_options').style.display = enabled ? 'block' : 'none';
}

function togglePbmStorage() {
	const storage = document.getElementById('v_pbm_storage').value;
	document.getElementById('pbm_storage_fs').style.display = (storage === 'filesystem') ? 'block' : 'none';
	document.getElementById('pbm_storage_s3').style.display = (storage === 's3') ? 'block' : 'none';
}

function toggleBackupTypeOptions() {
	const type = document.getElementById('v_pbm_type').value;
	const noteEl = document.getElementById('pbm_type_note');
	const notes = {
		'logical': '<?= _("Slower but compatible across MongoDB versions. Good for migration.") ?>',
		'physical': '<?= _("Faster backup/restore. Requires same MongoDB version for restore.") ?>',
		'incremental': '<?= _("Continuous oplog capture for point-in-time recovery to any second.") ?>'
	};
	noteEl.textContent = notes[type] || '';
}

function generateKeyfile(mode) {
	const statusEl = document.getElementById('keyfile_status_rs');
	const pathEl = document.getElementById('v_keyfile_path');
	const keyfilePath = pathEl.value || '/var/lib/mongodb/keyfile';

	statusEl.style.display = 'block';
	statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <?= _("Generating keyfile...") ?>';

	fetch('/api/mongodb/keyfile.php?action=generate&token=<?= $_SESSION["token"] ?>', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: 'path=' + encodeURIComponent(keyfilePath)
	})
	.then(r => r.json())
	.then(data => {
		if (data.success) {
			statusEl.innerHTML = '<i class="fas fa-check-circle icon-green"></i> ' + data.message;
		} else {
			statusEl.innerHTML = '<i class="fas fa-exclamation-circle icon-red"></i> ' + (data.error || 'Failed');
		}
	})
	.catch(err => {
		statusEl.innerHTML = '<i class="fas fa-exclamation-circle icon-red"></i> <?= _("Error generating keyfile") ?>';
	});
}

function uploadKeyfile(input, mode) {
	const statusEl = document.getElementById('keyfile_status_rs');
	const pathEl = document.getElementById('v_keyfile_path');
	const keyfilePath = pathEl.value || '/var/lib/mongodb/keyfile';

	if (!input.files || !input.files[0]) return;

	const formData = new FormData();
	formData.append('keyfile', input.files[0]);
	formData.append('path', keyfilePath);

	statusEl.style.display = 'block';
	statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <?= _("Uploading keyfile...") ?>';

	fetch('/api/mongodb/keyfile.php?action=upload&token=<?= $_SESSION["token"] ?>', {
		method: 'POST',
		body: formData
	})
	.then(r => r.json())
	.then(data => {
		if (data.success) {
			statusEl.innerHTML = '<i class="fas fa-check-circle icon-green"></i> ' + data.message;
		} else {
			statusEl.innerHTML = '<i class="fas fa-exclamation-circle icon-red"></i> ' + (data.error || 'Failed');
		}
	})
	.catch(err => {
		statusEl.innerHTML = '<i class="fas fa-exclamation-circle icon-red"></i> <?= _("Error uploading keyfile") ?>';
	});

	input.value = '';
}

function downloadKeyfile() {
	const pathEl = document.getElementById('v_keyfile_path');
	const keyfilePath = pathEl.value || '/var/lib/mongodb/keyfile';
	window.location.href = '/api/mongodb/keyfile.php?action=download&path=' + encodeURIComponent(keyfilePath) + '&token=<?= $_SESSION["token"] ?>';
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
	toggleBackupTypeOptions();
});
</script>
