<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/rclone/">
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
	<form id="main-form" name="v_edit_rclone" method="post" x-data="rcloneEditForm()">
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="save" value="save">

		<div class="form-container form-container-wide">
			<h1 class="u-mb20"><?= _("Edit Cloud Backup Remote") ?>: <?= htmlentities($v_name) ?></h1>
			<?php show_alert_message($_SESSION); ?>

			<!-- Remote Info -->
			<div class="u-mb20">
				<div class="alert alert-secondary">
					<i class="fas fa-info-circle u-mr5"></i>
					<strong><?= _("Provider") ?>:</strong>
					<?php
					$type_labels = [
						'drive' => 'Google Drive',
						's3' => 'Amazon S3',
						'dropbox' => 'Dropbox',
						'onedrive' => 'OneDrive',
						'sftp' => 'SFTP',
					];
					echo $type_labels[$v_provider] ?? htmlentities($v_provider);
					?>
				</div>
			</div>

			<!-- Backup Folders -->
			<div class="u-mb20">
				<h2 class="u-mb10"><?= _("Folders to Backup") ?></h2>
				<div class="form-note u-mb10"><?= _("Configure which local folders to sync to the remote.") ?></div>

				<div id="folder-list">
					<template x-for="(folder, index) in folders" :key="index">
						<div class="folder-item u-mb10" style="display: flex; gap: 10px; align-items: center;">
							<input type="text" class="form-control" :name="'v_folders[' + index + '][local]'" x-model="folder.local" placeholder="/home/<?= htmlentities($user) ?>/backup" style="flex: 1;">
							<span><i class="fas fa-arrow-right"></i></span>
							<input type="text" class="form-control" :name="'v_folders[' + index + '][remote]'" x-model="folder.remote" placeholder="/backup" style="flex: 1;">
							<button type="button" class="button button-secondary button-small" @click="removeFolder(index)" x-show="folders.length > 1">
								<i class="fas fa-times icon-red"></i>
							</button>
						</div>
					</template>
				</div>
				<button type="button" class="button button-secondary" @click="addFolder()">
					<i class="fas fa-plus icon-green"></i> <?= _("Add Folder") ?>
				</button>
			</div>

			<!-- Schedule -->
			<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
				<h2 class="u-mb10"><?= _("Backup Schedule") ?></h2>

				<div class="u-mb10">
					<label class="form-label"><?= _("Run backup") ?></label>
					<select class="form-select" name="v_schedule_type" x-model="scheduleType" style="width: auto;">
						<option value="manual"><?= _("Manually only") ?></option>
						<option value="hourly"><?= _("Every hour") ?></option>
						<option value="daily"><?= _("Daily") ?></option>
						<option value="weekly"><?= _("Weekly") ?></option>
						<option value="custom"><?= _("Custom interval") ?></option>
					</select>
				</div>

				<div x-show="scheduleType === 'daily' || scheduleType === 'weekly'" class="u-mb10" style="display: flex; gap: 10px; align-items: center;">
					<span><?= _("at") ?></span>
					<input type="time" class="form-control" name="v_schedule_time" x-model="scheduleTime" style="width: auto;">
					<div x-show="scheduleType === 'weekly'">
						<span><?= _("on") ?></span>
						<select class="form-select" name="v_schedule_weekday" x-model="scheduleWeekday" style="width: auto;">
							<option value="0"><?= _("Sunday") ?></option>
							<option value="1"><?= _("Monday") ?></option>
							<option value="2"><?= _("Tuesday") ?></option>
							<option value="3"><?= _("Wednesday") ?></option>
							<option value="4"><?= _("Thursday") ?></option>
							<option value="5"><?= _("Friday") ?></option>
							<option value="6"><?= _("Saturday") ?></option>
						</select>
					</div>
				</div>

				<div x-show="scheduleType === 'custom'" class="u-mb10" style="display: flex; gap: 10px; align-items: center;">
					<span><?= _("every") ?></span>
					<input type="number" class="form-control" name="v_schedule_interval" x-model="scheduleInterval" min="1" style="width: 80px;">
					<select class="form-select" name="v_schedule_unit" x-model="scheduleUnit" style="width: auto;">
						<option value="minutes"><?= _("minutes") ?></option>
						<option value="hours"><?= _("hours") ?></option>
					</select>
				</div>
			</div>

			<!-- Sync Options -->
			<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
				<h2 class="u-mb10"><?= _("Sync Options") ?></h2>

				<div class="form-check u-mb10">
					<input class="form-check-input" type="checkbox" name="v_delete_extra" id="v_delete_extra" <?= $v_delete_extra ? 'checked' : '' ?>>
					<label for="v_delete_extra">
						<?= _("Delete files on remote that don't exist locally") ?>
						<span class="hint">- <?= _("Makes remote an exact mirror of local") ?></span>
					</label>
				</div>

				<div class="u-mb10">
					<label class="form-label"><?= _("Bandwidth limit") ?> <span class="optional">(<?= _("Optional") ?>)</span></label>
					<div style="display: flex; gap: 10px; align-items: center;">
						<input type="number" class="form-control" name="v_bandwidth" value="<?= htmlentities($v_bandwidth) ?>" placeholder="0" style="width: 100px;">
						<span>MB/s</span>
						<span class="hint">(<?= _("0 = unlimited") ?>)</span>
					</div>
				</div>
			</div>

			<!-- Run Now -->
			<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
				<h2 class="u-mb10"><?= _("Manual Backup") ?></h2>
				<button type="button" class="button button-secondary" onclick="runBackupNow()">
					<i class="fas fa-play icon-green"></i> <?= _("Run Backup Now") ?>
				</button>
				<span id="backup-status" class="u-ml10"></span>
			</div>

		</div>
	</form>
</div>

<script>
function rcloneEditForm() {
	return {
		folders: <?= json_encode(!empty($v_folders) ? $v_folders : [["local" => "", "remote" => ""]]) ?>,
		scheduleType: '<?= htmlentities($v_schedule_type) ?>',
		scheduleTime: '<?= htmlentities($v_schedule_time) ?>',
		scheduleWeekday: '<?= htmlentities($v_schedule_weekday) ?>',
		scheduleInterval: <?= intval($v_schedule_interval) ?>,
		scheduleUnit: '<?= htmlentities($v_schedule_unit) ?>',

		addFolder() {
			this.folders.push({ local: '', remote: '' });
		},

		removeFolder(index) {
			this.folders.splice(index, 1);
		}
	}
}

function runBackupNow() {
	const statusEl = document.getElementById('backup-status');
	statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <?= _("Starting backup...") ?>';

	fetch('/api/rclone/backup.php?action=run&remote=<?= urlencode($v_name) ?>&token=<?= $_SESSION["token"] ?>', {
		method: 'POST'
	})
	.then(r => r.json())
	.then(data => {
		if (data.success) {
			statusEl.innerHTML = '<span class="hint" style="color: green;"><i class="fas fa-check"></i> ' + data.message + '</span>';
		} else {
			statusEl.innerHTML = '<span class="hint" style="color: red;"><i class="fas fa-times"></i> ' + (data.error || 'Error') + '</span>';
		}
	})
	.catch(err => {
		statusEl.innerHTML = '<span class="hint" style="color: red;"><i class="fas fa-times"></i> <?= _("Error starting backup") ?></span>';
	});
}
</script>

<style>
.form-container-wide {
	max-width: 800px;
}
.button-small {
	padding: 5px 10px;
	font-size: 0.85em;
}
</style>
