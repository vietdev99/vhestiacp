<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/server/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<a href="/list/mongodb/" class="button button-secondary">
				<i class="fas fa-leaf icon-green"></i><?= _("MongoDB Databases") ?>
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
				<div class="mongodb-status-bar">
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
            
            <!-- Advanced Configuration -->
            <div class="form-container u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
                <h2 class="u-mb20"><?= _("Advanced Configuration") ?></h2>
                
                <!-- Data Directory -->
                <div class="u-mb20">
                    <label for="v_datadir" class="form-label">
                        <?= _("Data Directory") ?> <span class="optional">(<?= _("Requires Service Restart") ?>)</span>
                    </label>
                    <input type="text" class="form-control" name="v_datadir" id="v_datadir" value="/var/lib/mongodb">
                    <div class="form-note"><?= _("Current data will be migrated automatically if changed.") ?></div>
                </div>

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
                <div id="replicaset_options" class="cluster-options" style="display:none; padding-left: 15px; border-left: 3px solid var(--color-primary);">
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
                    <div class="u-mb10" style="margin-top: 15px; padding: 15px; background: var(--color-bg-secondary); border-radius: 8px;">
                        <label class="form-label"><?= _("Keyfile Authentication") ?></label>
                        <div class="form-note u-mb10"><?= _("Keyfile is required for authentication between ReplicaSet members.") ?></div>

                        <div class="u-mb10">
                            <label class="form-label"><?= _("Keyfile Path") ?></label>
                            <input type="text" class="form-control" name="v_keyfile_path" id="v_keyfile_path" value="/var/lib/mongodb/keyfile" placeholder="/var/lib/mongodb/keyfile">
                        </div>

                        <div class="keyfile-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button type="button" class="button button-secondary" onclick="generateKeyfile('replicaset')">
                                <i class="fas fa-key icon-green"></i> <?= _("Generate Key") ?>
                            </button>
                            <label class="button button-secondary" style="cursor: pointer; margin: 0;">
                                <i class="fas fa-upload icon-blue"></i> <?= _("Upload Key") ?>
                                <input type="file" name="v_keyfile_upload" id="v_keyfile_upload_rs" style="display: none;" onchange="uploadKeyfile(this, 'replicaset')">
                            </label>
                            <button type="button" class="button button-secondary" onclick="downloadKeyfile()">
                                <i class="fas fa-download icon-purple"></i> <?= _("Download Key") ?>
                            </button>
                        </div>
                        <div id="keyfile_status_rs" class="form-note u-mt10" style="display: none;"></div>
                    </div>

                    <div class="form-check u-mb10">
                        <input class="form-check-input" type="checkbox" name="v_pbm_backup" id="v_pbm_backup" onchange="togglePbmOptions()">
                        <label for="v_pbm_backup"><?= _("Enable Percona Backup (PBM)") ?></label>
                    </div>

                    <!-- PBM Backup Options -->
                    <div id="pbm_options" style="display:none; margin-left: 25px; margin-top: 10px; padding: 15px; background: var(--color-bg-secondary); border-radius: 8px;">
                        <div class="u-mb10">
                            <label class="form-label"><?= _("Backup Type") ?></label>
                            <select class="form-select" name="v_pbm_type" id="v_pbm_type" onchange="toggleBackupTypeOptions()">
                                <option value="logical"><?= _("Logical (mongodump)") ?></option>
                                <option value="physical"><?= _("Physical (file copy)") ?></option>
                                <option value="incremental"><?= _("Incremental + PITR") ?></option>
                            </select>
                            <div class="form-note" id="pbm_type_note"></div>
                        </div>

                        <!-- Schedule for Logical/Physical -->
                        <div class="u-mb10" id="pbm_schedule_section">
                            <label class="form-label"><?= _("Backup Schedule") ?></label>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                                <select class="form-select" name="v_pbm_schedule_type" id="v_pbm_schedule_type" style="width: auto;" onchange="toggleScheduleOptions()">
                                    <option value="daily"><?= _("Daily") ?></option>
                                    <option value="weekly"><?= _("Weekly") ?></option>
                                    <option value="interval"><?= _("Every X hours") ?></option>
                                    <option value="custom"><?= _("Custom cron") ?></option>
                                </select>
                                <div id="schedule_time_picker" style="display: flex; gap: 5px; align-items: center;">
                                    <span><?= _("at") ?></span>
                                    <input type="time" class="form-control" name="v_pbm_time" id="v_pbm_time" value="02:00" style="width: auto;">
                                </div>
                                <div id="schedule_weekday" style="display: none;">
                                    <select class="form-select" name="v_pbm_weekday" style="width: auto;">
                                        <option value="0"><?= _("Sunday") ?></option>
                                        <option value="1"><?= _("Monday") ?></option>
                                        <option value="2"><?= _("Tuesday") ?></option>
                                        <option value="3"><?= _("Wednesday") ?></option>
                                        <option value="4"><?= _("Thursday") ?></option>
                                        <option value="5"><?= _("Friday") ?></option>
                                        <option value="6"><?= _("Saturday") ?></option>
                                    </select>
                                </div>
                                <div id="schedule_interval" style="display: none; align-items: center; gap: 5px;">
                                    <span><?= _("every") ?></span>
                                    <select class="form-select" name="v_pbm_interval" style="width: auto;">
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="6" selected>6</option>
                                        <option value="8">8</option>
                                        <option value="12">12</option>
                                    </select>
                                    <span><?= _("hours") ?></span>
                                </div>
                            </div>
                        </div>
                        <div class="u-mb10" id="pbm_custom_schedule" style="display:none;">
                            <label class="form-label"><?= _("Custom Cron Expression") ?></label>
                            <input type="text" class="form-control" name="v_pbm_cron" placeholder="0 2 * * *">
                            <div class="form-note"><?= _("Format: minute hour day month weekday") ?></div>
                        </div>

                        <!-- Schedule for Incremental (Base backup) -->
                        <div id="pbm_incremental_section" style="display:none;">
                            <div class="u-mb10">
                                <label class="form-label"><?= _("Base (Full) Backup Schedule") ?></label>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                                    <select class="form-select" name="v_pbm_base_type" style="width: auto;">
                                        <option value="weekly"><?= _("Weekly") ?></option>
                                        <option value="monthly"><?= _("Monthly") ?></option>
                                        <option value="daily"><?= _("Daily") ?></option>
                                    </select>
                                    <div style="display: flex; gap: 5px; align-items: center;">
                                        <span><?= _("at") ?></span>
                                        <input type="time" class="form-control" name="v_pbm_base_time" value="02:00" style="width: auto;">
                                    </div>
                                </div>
                                <div class="form-note"><?= _("Full backup is required periodically. Incremental changes are captured continuously between full backups.") ?></div>
                            </div>
                            <div class="u-mb10">
                                <label class="form-label"><?= _("PITR Oplog Slice Interval") ?></label>
                                <div style="display: flex; gap: 10px; align-items: center;">
                                    <select class="form-select" name="v_pitr_interval" style="width: auto;">
                                        <option value="1"><?= _("1 minute") ?></option>
                                        <option value="5"><?= _("5 minutes") ?></option>
                                        <option value="10" selected><?= _("10 minutes (recommended)") ?></option>
                                        <option value="30"><?= _("30 minutes") ?></option>
                                        <option value="60"><?= _("1 hour") ?></option>
                                    </select>
                                </div>
                                <div class="form-note"><?= _("How often to save oplog slices. Smaller = more granular recovery but more storage.") ?></div>
                            </div>
                            <div class="alert alert-info u-mb10">
                                <i class="fas fa-info-circle u-mr5"></i>
                                <?= _("Incremental mode automatically enables Point-in-Time Recovery (PITR). You can restore to any second between backups.") ?>
                            </div>
                        </div>

                        <div class="u-mb10">
                            <label class="form-label"><?= _("Backup Retention (days)") ?></label>
                            <input type="number" class="form-control" name="v_pbm_retention" value="7" min="1" max="365">
                            <div class="form-note"><?= _("How long to keep backup snapshots. Old backups will be automatically deleted.") ?></div>
                        </div>
                        <div class="u-mb10" id="pitr_retention_section">
                            <label class="form-label"><?= _("PITR Oplog Retention (days)") ?></label>
                            <input type="number" class="form-control" name="v_pitr_retention" value="3" min="1" max="30">
                            <div class="form-note"><?= _("How long to keep oplog slices for point-in-time recovery. Recovery is only possible within this window.") ?></div>
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

                        <!-- PITR only for Physical backup -->
                        <div id="pbm_pitr_section">
                            <div class="form-check u-mb10">
                                <input class="form-check-input" type="checkbox" name="v_pbm_pitr" id="v_pbm_pitr" onchange="togglePitrOptions()">
                                <label for="v_pbm_pitr">
                                    <?= _("Enable PITR (Point-in-Time Recovery)") ?>
                                    <span class="hint">- <?= _("Capture oplog for point-in-time restore") ?></span>
                                </label>
                            </div>
                            <div id="pitr_options" style="display: none; margin-left: 25px;">
                                <div class="u-mb10">
                                    <label class="form-label"><?= _("Oplog Slice Interval") ?></label>
                                    <select class="form-select" name="v_pitr_physical_interval" style="width: auto;">
                                        <option value="1"><?= _("1 minute") ?></option>
                                        <option value="5"><?= _("5 minutes") ?></option>
                                        <option value="10" selected><?= _("10 minutes (recommended)") ?></option>
                                        <option value="30"><?= _("30 minutes") ?></option>
                                        <option value="60"><?= _("1 hour") ?></option>
                                    </select>
                                    <div class="form-note"><?= _("How often to save oplog slices for point-in-time recovery.") ?></div>
                                </div>
                            </div>
                        </div>

                        <div class="form-check u-mb10">
                            <input class="form-check-input" type="checkbox" name="v_pbm_compression" id="v_pbm_compression" checked>
                            <label for="v_pbm_compression"><?= _("Enable Compression") ?></label>
                        </div>

                        <div class="alert alert-warning u-mb10">
                            <i class="fas fa-lightbulb u-mr5"></i>
                            <strong><?= _("Tip") ?>:</strong> <?= _("In a ReplicaSet, PBM automatically runs backup on a Secondary node to avoid impacting Primary performance. You only need to configure backup on one node - PBM coordinates across the cluster.") ?>
                        </div>
                    </div>
                </div>

                <!-- Sharding Options -->
                <div id="sharding_options" class="cluster-options" style="display:none; padding-left: 15px; border-left: 3px solid var(--color-accent);">
                    <div class="u-mb10">
                        <label class="form-label"><?= _("Cluster Role") ?></label>
                        <select class="form-select" name="v_shard_role">
                             <option value="shardsvr"><?= _("Shard Server (Data)") ?></option>
                             <option value="configsvr"><?= _("Config Server (Metadata)") ?></option>
                             <option value="mongos"><?= _("Mongos Router") ?></option>
                         </select>
                    </div>

                    <!-- Keyfile Authentication for Sharding -->
                    <div class="u-mb10" style="margin-top: 15px; padding: 15px; background: var(--color-bg-secondary); border-radius: 8px;">
                        <label class="form-label"><?= _("Keyfile Authentication") ?></label>
                        <div class="form-note u-mb10"><?= _("Keyfile is required for authentication between sharded cluster members.") ?></div>

                        <div class="u-mb10">
                            <label class="form-label"><?= _("Keyfile Path") ?></label>
                            <input type="text" class="form-control" name="v_keyfile_path_shard" id="v_keyfile_path_shard" value="/var/lib/mongodb/keyfile" placeholder="/var/lib/mongodb/keyfile">
                        </div>

                        <div class="keyfile-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button type="button" class="button button-secondary" onclick="generateKeyfile('sharding')">
                                <i class="fas fa-key icon-green"></i> <?= _("Generate Key") ?>
                            </button>
                            <label class="button button-secondary" style="cursor: pointer; margin: 0;">
                                <i class="fas fa-upload icon-blue"></i> <?= _("Upload Key") ?>
                                <input type="file" name="v_keyfile_upload_shard" id="v_keyfile_upload_shard" style="display: none;" onchange="uploadKeyfile(this, 'sharding')">
                            </label>
                            <button type="button" class="button button-secondary" onclick="downloadKeyfile()">
                                <i class="fas fa-download icon-purple"></i> <?= _("Download Key") ?>
                            </button>
                        </div>
                        <div id="keyfile_status_shard" class="form-note u-mt10" style="display: none;"></div>
                    </div>
                </div>
            </div>

            <script>
                function toggleClusterOptions() {
                    const mode = document.getElementById('v_cluster_mode').value;
                    document.getElementById('replicaset_options').style.display = (mode === 'replicaset') ? 'block' : 'none';
                    document.getElementById('sharding_options').style.display = (mode === 'sharding') ? 'block' : 'none';
                }

                function togglePbmOptions() {
                    const enabled = document.getElementById('v_pbm_backup').checked;
                    document.getElementById('pbm_options').style.display = enabled ? 'block' : 'none';
                    if (enabled) toggleBackupTypeOptions();
                }

                function togglePbmStorage() {
                    const storage = document.getElementById('v_pbm_storage').value;
                    document.getElementById('pbm_storage_fs').style.display = (storage === 'filesystem') ? 'block' : 'none';
                    document.getElementById('pbm_storage_s3').style.display = (storage === 's3') ? 'block' : 'none';
                }

                function toggleBackupTypeOptions() {
                    const type = document.getElementById('v_pbm_type').value;
                    const noteEl = document.getElementById('pbm_type_note');
                    const scheduleSection = document.getElementById('pbm_schedule_section');
                    const customSchedule = document.getElementById('pbm_custom_schedule');
                    const incrementalSection = document.getElementById('pbm_incremental_section');
                    const pitrSection = document.getElementById('pbm_pitr_section');
                    const pitrRetention = document.getElementById('pitr_retention_section');

                    // Update note based on type
                    const notes = {
                        'logical': '<?= _("Slower but compatible across MongoDB versions. Good for migration.") ?>',
                        'physical': '<?= _("Faster backup/restore. Requires same MongoDB version for restore.") ?>',
                        'incremental': '<?= _("Continuous oplog capture for point-in-time recovery to any second.") ?>'
                    };
                    noteEl.textContent = notes[type] || '';

                    if (type === 'incremental') {
                        // Incremental: hide normal schedule, show incremental section, hide PITR checkbox, show PITR retention
                        scheduleSection.style.display = 'none';
                        customSchedule.style.display = 'none';
                        incrementalSection.style.display = 'block';
                        pitrSection.style.display = 'none';
                        pitrRetention.style.display = 'block';
                    } else if (type === 'logical') {
                        // Logical: show schedule, hide incremental section, hide PITR (not supported), hide PITR retention
                        scheduleSection.style.display = 'block';
                        incrementalSection.style.display = 'none';
                        pitrSection.style.display = 'none';
                        pitrRetention.style.display = 'none';
                    } else {
                        // Physical: show schedule, hide incremental section, show PITR option
                        scheduleSection.style.display = 'block';
                        incrementalSection.style.display = 'none';
                        pitrSection.style.display = 'block';
                        // PITR retention visibility depends on checkbox
                        togglePitrOptions();
                    }
                }

                // Schedule options toggle
                function toggleScheduleOptions() {
                    const type = document.getElementById('v_pbm_schedule_type').value;
                    const timePicker = document.getElementById('schedule_time_picker');
                    const weekday = document.getElementById('schedule_weekday');
                    const interval = document.getElementById('schedule_interval');
                    const customSchedule = document.getElementById('pbm_custom_schedule');

                    // Reset all
                    timePicker.style.display = 'none';
                    weekday.style.display = 'none';
                    interval.style.display = 'none';
                    customSchedule.style.display = 'none';

                    switch (type) {
                        case 'daily':
                            timePicker.style.display = 'flex';
                            break;
                        case 'weekly':
                            timePicker.style.display = 'flex';
                            weekday.style.display = 'block';
                            break;
                        case 'interval':
                            interval.style.display = 'flex';
                            break;
                        case 'custom':
                            customSchedule.style.display = 'block';
                            break;
                    }
                }

                // PITR options toggle
                function togglePitrOptions() {
                    const enabled = document.getElementById('v_pbm_pitr').checked;
                    document.getElementById('pitr_options').style.display = enabled ? 'block' : 'none';
                    document.getElementById('pitr_retention_section').style.display = enabled ? 'block' : 'none';
                }

                // Initialize on page load
                document.addEventListener('DOMContentLoaded', function() {
                    toggleBackupTypeOptions();
                    toggleScheduleOptions();
                });

                // Keyfile Management Functions
                function generateKeyfile(mode) {
                    const statusEl = document.getElementById(mode === 'sharding' ? 'keyfile_status_shard' : 'keyfile_status_rs');
                    const pathEl = document.getElementById(mode === 'sharding' ? 'v_keyfile_path_shard' : 'v_keyfile_path');
                    const keyfilePath = pathEl.value || '/var/lib/mongodb/keyfile';

                    statusEl.style.display = 'block';
                    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <?= _("Generating keyfile...") ?>';
                    statusEl.className = 'form-note u-mt10';

                    fetch('/api/mongodb/keyfile.php?action=generate&token=<?= $_SESSION["token"] ?>', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'path=' + encodeURIComponent(keyfilePath)
                    })
                    .then(r => {
                        if (!r.ok) {
                            return r.text().then(text => { throw new Error(text || r.statusText); });
                        }
                        return r.json();
                    })
                    .then(data => {
                        if (data.success) {
                            statusEl.innerHTML = '<i class="fas fa-check-circle icon-green"></i> ' + data.message;
                        } else {
                            statusEl.innerHTML = '<i class="fas fa-exclamation-circle icon-red"></i> ' + (data.error || 'Failed');
                        }
                    })
                    .catch(err => {
                        console.error('Keyfile error:', err);
                        statusEl.innerHTML = '<i class="fas fa-exclamation-circle icon-red"></i> ' + (err.message || '<?= _("Error generating keyfile") ?>');
                    });
                }

                function uploadKeyfile(input, mode) {
                    const statusEl = document.getElementById(mode === 'sharding' ? 'keyfile_status_shard' : 'keyfile_status_rs');
                    const pathEl = document.getElementById(mode === 'sharding' ? 'v_keyfile_path_shard' : 'v_keyfile_path');
                    const keyfilePath = pathEl.value || '/var/lib/mongodb/keyfile';

                    if (!input.files || !input.files[0]) return;

                    const file = input.files[0];
                    const formData = new FormData();
                    formData.append('keyfile', file);
                    formData.append('path', keyfilePath);

                    statusEl.style.display = 'block';
                    statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <?= _("Uploading keyfile...") ?>';
                    statusEl.className = 'form-note u-mt10';

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

                    // Reset file input
                    input.value = '';
                }

                function downloadKeyfile() {
                    const mode = document.getElementById('v_cluster_mode').value;
                    const pathEl = document.getElementById(mode === 'sharding' ? 'v_keyfile_path_shard' : 'v_keyfile_path');
                    const keyfilePath = pathEl.value || '/var/lib/mongodb/keyfile';

                    window.location.href = '/api/mongodb/keyfile.php?action=download&path=' + encodeURIComponent(keyfilePath) + '&token=<?= $_SESSION["token"] ?>';
                }
            </script>

			
			<div class="form-check u-mb20">
				<input class="form-check-input" type="checkbox" name="v_restart" id="v_restart" checked>
				<label for="v_restart">
					<?= _("Restart service after saving") ?>
				</label>
			</div>
		</div>

	</form>

</div>

<style>
.mongodb-status-bar {
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
