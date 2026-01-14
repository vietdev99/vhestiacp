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
	<form id="main-form" name="v_add_rclone" method="post" x-data="rcloneForm()">
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="save" value="save">

		<div class="form-container form-container-wide">
			<h1 class="u-mb20"><?= _("Add Cloud Backup Remote") ?></h1>
			<?php show_alert_message($_SESSION); ?>

			<!-- Step 1: Choose Provider -->
			<div class="u-mb20">
				<label class="form-label"><?= _("Cloud Provider") ?></label>
				<div class="provider-grid">
					<label class="provider-option" :class="{ 'selected': provider === 'drive' }">
						<input type="radio" name="v_provider" value="drive" x-model="provider" style="display: none;">
						<i class="fab fa-google-drive fa-2x"></i>
						<span>Google Drive</span>
					</label>
					<label class="provider-option" :class="{ 'selected': provider === 's3' }">
						<input type="radio" name="v_provider" value="s3" x-model="provider" style="display: none;">
						<i class="fab fa-aws fa-2x"></i>
						<span>Amazon S3</span>
					</label>
					<label class="provider-option" :class="{ 'selected': provider === 'dropbox' }">
						<input type="radio" name="v_provider" value="dropbox" x-model="provider" style="display: none;">
						<i class="fab fa-dropbox fa-2x"></i>
						<span>Dropbox</span>
					</label>
					<label class="provider-option" :class="{ 'selected': provider === 'onedrive' }">
						<input type="radio" name="v_provider" value="onedrive" x-model="provider" style="display: none;">
						<i class="fab fa-microsoft fa-2x"></i>
						<span>OneDrive</span>
					</label>
					<label class="provider-option" :class="{ 'selected': provider === 'sftp' }">
						<input type="radio" name="v_provider" value="sftp" x-model="provider" style="display: none;">
						<i class="fas fa-server fa-2x"></i>
						<span>SFTP</span>
					</label>
					<label class="provider-option" :class="{ 'selected': provider === 's3compatible' }">
						<input type="radio" name="v_provider" value="s3compatible" x-model="provider" style="display: none;">
						<i class="fas fa-database fa-2x"></i>
						<span>S3 Compatible</span>
						<small>(MinIO, Wasabi, etc.)</small>
					</label>
				</div>
			</div>

			<!-- Remote Name -->
			<div class="u-mb20">
				<label for="v_name" class="form-label"><?= _("Remote Name") ?></label>
				<input type="text" class="form-control" name="v_name" id="v_name" x-model="remoteName" placeholder="my-backup" required pattern="[a-zA-Z0-9_-]+">
				<div class="form-note"><?= _("Only letters, numbers, underscores and hyphens allowed.") ?></div>
			</div>

			<!-- Google Drive / Dropbox / OneDrive - OAuth -->
			<div x-show="['drive', 'dropbox', 'onedrive'].includes(provider)" class="oauth-section u-mb20">
				<div class="alert alert-info u-mb10">
					<i class="fas fa-info-circle u-mr5"></i>
					<?= _("Since this is a headless server, you need to authorize on another machine and paste the token here.") ?>
				</div>

				<div class="u-mb10">
					<label class="form-label"><?= _("Step 1: Run on a machine with browser") ?></label>
					<div class="code-block">
						<code x-text="'rclone authorize ' + provider"></code>
						<button type="button" class="button button-secondary button-small" @click="copyCommand()">
							<i class="fas fa-copy"></i>
						</button>
					</div>
				</div>

				<div class="u-mb10">
					<label class="form-label"><?= _("Step 2: Paste the token JSON here") ?></label>
					<textarea class="form-control" name="v_token" x-model="token" rows="4" placeholder='{"access_token":"...", "token_type":"Bearer", ...}'></textarea>
				</div>

				<div class="u-mb10" x-show="provider === 'drive'">
					<label class="form-label"><?= _("Folder ID") ?> <span class="optional">(<?= _("Optional") ?>)</span></label>
					<input type="text" class="form-control" name="v_folder_id" placeholder="1ABC123xyz">
					<div class="form-note"><?= _("If you want to backup to a specific folder, enter its ID from the URL.") ?></div>
				</div>
			</div>

			<!-- S3 / S3 Compatible -->
			<div x-show="['s3', 's3compatible'].includes(provider)" class="s3-section u-mb20">
				<div class="u-mb10" x-show="provider === 's3compatible'">
					<label class="form-label"><?= _("Endpoint URL") ?></label>
					<input type="text" class="form-control" name="v_endpoint" placeholder="https://s3.example.com">
				</div>
				<div class="u-mb10" x-show="provider === 's3'">
					<label class="form-label"><?= _("Region") ?></label>
					<select class="form-select" name="v_region">
						<option value="us-east-1">US East (N. Virginia)</option>
						<option value="us-west-2">US West (Oregon)</option>
						<option value="eu-west-1">EU (Ireland)</option>
						<option value="ap-southeast-1">Asia Pacific (Singapore)</option>
						<option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
					</select>
				</div>
				<div class="u-mb10">
					<label class="form-label"><?= _("Access Key ID") ?></label>
					<input type="text" class="form-control" name="v_access_key" required>
				</div>
				<div class="u-mb10">
					<label class="form-label"><?= _("Secret Access Key") ?></label>
					<input type="password" class="form-control" name="v_secret_key" required>
				</div>
				<div class="u-mb10">
					<label class="form-label"><?= _("Bucket Name") ?></label>
					<input type="text" class="form-control" name="v_bucket" placeholder="my-backup-bucket" required>
				</div>
			</div>

			<!-- SFTP -->
			<div x-show="provider === 'sftp'" class="sftp-section u-mb20">
				<div class="u-mb10">
					<label class="form-label"><?= _("Host") ?></label>
					<input type="text" class="form-control" name="v_sftp_host" placeholder="backup.example.com">
				</div>
				<div class="u-mb10">
					<label class="form-label"><?= _("Port") ?></label>
					<input type="number" class="form-control" name="v_sftp_port" value="22">
				</div>
				<div class="u-mb10">
					<label class="form-label"><?= _("Username") ?></label>
					<input type="text" class="form-control" name="v_sftp_user">
				</div>
				<div class="u-mb10">
					<label class="form-label"><?= _("Authentication") ?></label>
					<select class="form-select" name="v_sftp_auth" x-model="sftpAuth">
						<option value="password"><?= _("Password") ?></option>
						<option value="key"><?= _("SSH Key") ?></option>
					</select>
				</div>
				<div class="u-mb10" x-show="sftpAuth === 'password'">
					<label class="form-label"><?= _("Password") ?></label>
					<input type="password" class="form-control" name="v_sftp_pass">
				</div>
				<div class="u-mb10" x-show="sftpAuth === 'key'">
					<label class="form-label"><?= _("Private Key Path") ?></label>
					<input type="text" class="form-control" name="v_sftp_key" placeholder="/root/.ssh/id_rsa">
				</div>
			</div>

			<!-- Backup Folders -->
			<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px;">
				<h2 class="u-mb10"><?= _("Folders to Backup") ?></h2>
				<div class="form-note u-mb10"><?= _("Select which folders to sync to this remote.") ?></div>

				<div id="folder-list">
					<template x-for="(folder, index) in folders" :key="index">
						<div class="folder-item u-mb10" style="display: flex; gap: 10px; align-items: center;">
							<input type="text" class="form-control" :name="'v_folders[' + index + '][local]'" x-model="folder.local" placeholder="/home/user/backup" style="flex: 1;">
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
					<input type="time" class="form-control" name="v_schedule_time" value="02:00" style="width: auto;">
					<div x-show="scheduleType === 'weekly'">
						<span><?= _("on") ?></span>
						<select class="form-select" name="v_schedule_weekday" style="width: auto;">
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
					<input type="number" class="form-control" name="v_schedule_interval" value="60" min="1" style="width: 80px;">
					<select class="form-select" name="v_schedule_unit" style="width: auto;">
						<option value="minutes"><?= _("minutes") ?></option>
						<option value="hours"><?= _("hours") ?></option>
					</select>
				</div>
			</div>

			<!-- Sync Options -->
			<div class="u-mb20" style="border-top: 1px solid #ddd; padding-top: 20px;">
				<h2 class="u-mb10"><?= _("Sync Options") ?></h2>

				<div class="form-check u-mb10">
					<input class="form-check-input" type="checkbox" name="v_delete_extra" id="v_delete_extra">
					<label for="v_delete_extra">
						<?= _("Delete files on remote that don't exist locally") ?>
						<span class="hint">- <?= _("Makes remote an exact mirror of local") ?></span>
					</label>
				</div>

				<div class="u-mb10">
					<label class="form-label"><?= _("Bandwidth limit") ?> <span class="optional">(<?= _("Optional") ?>)</span></label>
					<div style="display: flex; gap: 10px; align-items: center;">
						<input type="number" class="form-control" name="v_bandwidth" placeholder="0" style="width: 100px;">
						<span>MB/s</span>
						<span class="hint">(<?= _("0 = unlimited") ?>)</span>
					</div>
				</div>
			</div>

		</div>
	</form>
</div>

<script>
function rcloneForm() {
	return {
		provider: 'drive',
		remoteName: '',
		token: '',
		sftpAuth: 'password',
		folders: [{ local: '', remote: '' }],
		scheduleType: 'daily',

		addFolder() {
			this.folders.push({ local: '', remote: '' });
		},

		removeFolder(index) {
			this.folders.splice(index, 1);
		},

		copyCommand() {
			const cmd = 'rclone authorize ' + this.provider;
			navigator.clipboard.writeText(cmd).then(() => {
				alert('<?= _("Command copied to clipboard!") ?>');
			});
		}
	}
}
</script>

<style>
.provider-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: 15px;
}
.provider-option {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 20px 15px;
	border: 2px solid var(--color-border);
	border-radius: 10px;
	cursor: pointer;
	transition: all 0.2s;
	text-align: center;
}
.provider-option:hover {
	border-color: var(--color-primary);
	background: var(--color-bg-secondary);
}
.provider-option.selected {
	border-color: var(--color-primary);
	background: rgba(var(--color-primary-rgb), 0.1);
}
.provider-option small {
	font-size: 0.75em;
	color: var(--color-text-secondary);
}
.code-block {
	display: flex;
	align-items: center;
	gap: 10px;
	background: #1e1e1e;
	color: #d4d4d4;
	padding: 10px 15px;
	border-radius: 5px;
	font-family: monospace;
}
.code-block code {
	flex: 1;
}
.button-small {
	padding: 5px 10px;
	font-size: 0.85em;
}
.form-container-wide {
	max-width: 800px;
}
</style>
