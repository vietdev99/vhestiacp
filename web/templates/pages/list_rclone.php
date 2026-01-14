<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/edit/user/?user=<?= htmlentities($user) ?>&token=<?= $_SESSION['token'] ?>">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<a href="/add/rclone/" class="button">
				<i class="fas fa-circle-plus icon-green"></i><?= _("Add Remote") ?>
			</a>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<h1 class="u-text-center u-hide-desktop u-mb20"><?= _("Cloud Backup (rclone)") ?></h1>

	<?php show_alert_message($_SESSION); ?>

	<div class="u-mb20">
		<div class="alert alert-info">
			<i class="fas fa-info-circle u-mr5"></i>
			<?= _("Configure cloud storage remotes to automatically backup your files. Supports Google Drive, Amazon S3, Dropbox, and more.") ?>
		</div>
	</div>

	<?php if (empty($data)) { ?>
		<div class="u-text-center u-mt40">
			<p class="u-mb20"><?= _("No cloud backup remotes configured yet.") ?></p>
			<a href="/add/rclone/" class="button">
				<i class="fas fa-circle-plus icon-green"></i><?= _("Add Your First Remote") ?>
			</a>
		</div>
	<?php } else { ?>
		<div class="units-table js-units-container">
			<div class="units-table-header">
				<div class="units-table-cell"><?= _("Name") ?></div>
				<div class="units-table-cell"><?= _("Type") ?></div>
				<div class="units-table-cell"><?= _("Status") ?></div>
				<div class="units-table-cell"><?= _("Folders") ?></div>
				<div class="units-table-cell"><?= _("Schedule") ?></div>
				<div class="units-table-cell"></div>
			</div>

			<?php
			foreach ($data as $key => $value) {
				$remote_name = $key;
				$remote_type = $value['TYPE'] ?? 'unknown';
				$connected = $value['CONNECTED'] ?? false;
				$folders = $value['FOLDERS'] ?? [];
				$schedule = $value['SCHEDULE'] ?? 'manual';
			?>
			<div class="units-table-row js-unit">
				<div class="units-table-cell units-table-heading-cell u-text-bold">
					<span class="u-hide-desktop"><?= _("Name") ?>:</span>
					<i class="fas fa-cloud icon-blue u-mr5"></i>
					<a href="/edit/rclone/?remote=<?= htmlentities($remote_name) ?>&token=<?= $_SESSION['token'] ?>">
						<?= htmlentities($remote_name) ?>
					</a>
				</div>
				<div class="units-table-cell">
					<span class="u-hide-desktop"><?= _("Type") ?>:</span>
					<?php
					$type_icons = [
						'drive' => '<i class="fab fa-google-drive icon-green"></i> Google Drive',
						's3' => '<i class="fab fa-aws icon-orange"></i> Amazon S3',
						'dropbox' => '<i class="fab fa-dropbox icon-blue"></i> Dropbox',
						'onedrive' => '<i class="fab fa-microsoft icon-blue"></i> OneDrive',
						'sftp' => '<i class="fas fa-server icon-purple"></i> SFTP',
						'ftp' => '<i class="fas fa-folder icon-orange"></i> FTP',
					];
					echo $type_icons[$remote_type] ?? '<i class="fas fa-cloud"></i> ' . htmlentities($remote_type);
					?>
				</div>
				<div class="units-table-cell">
					<span class="u-hide-desktop"><?= _("Status") ?>:</span>
					<?php if ($connected) { ?>
						<span class="badge badge-success"><i class="fas fa-check"></i> <?= _("Connected") ?></span>
					<?php } else { ?>
						<span class="badge badge-danger"><i class="fas fa-times"></i> <?= _("Disconnected") ?></span>
					<?php } ?>
				</div>
				<div class="units-table-cell">
					<span class="u-hide-desktop"><?= _("Folders") ?>:</span>
					<?= count($folders) ?> <?= _("folder(s)") ?>
				</div>
				<div class="units-table-cell">
					<span class="u-hide-desktop"><?= _("Schedule") ?>:</span>
					<?php
					if ($schedule === 'manual') {
						echo '<span class="hint">' . _("Manual") . '</span>';
					} else {
						echo htmlentities($schedule);
					}
					?>
				</div>
				<div class="units-table-cell">
					<ul class="units-table-row-actions">
						<li class="units-table-row-action shortcut-enter" data-key-action="href">
							<a class="units-table-row-action-link" href="/edit/rclone/?remote=<?= htmlentities($remote_name) ?>&token=<?= $_SESSION['token'] ?>" title="<?= _("Edit") ?>">
								<i class="fas fa-pencil icon-orange"></i>
								<span class="u-hide-desktop"><?= _("Edit") ?></span>
							</a>
						</li>
						<li class="units-table-row-action" data-key-action="js">
							<a class="units-table-row-action-link" href="#" onclick="runBackup('<?= htmlentities($remote_name) ?>')" title="<?= _("Run Now") ?>">
								<i class="fas fa-play icon-green"></i>
								<span class="u-hide-desktop"><?= _("Run Now") ?></span>
							</a>
						</li>
						<li class="units-table-row-action shortcut-delete" data-key-action="js">
							<a class="units-table-row-action-link data-controls js-confirm-action"
								href="/delete/rclone/?remote=<?= htmlentities($remote_name) ?>&token=<?= $_SESSION['token'] ?>"
								title="<?= _("Delete") ?>"
								data-confirm-title="<?= _("Delete") ?>"
								data-confirm-message="<?= sprintf(_("Are you sure you want to delete remote %s?"), $remote_name) ?>">
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

<script>
function runBackup(remoteName) {
	if (!confirm('<?= _("Run backup now for") ?> ' + remoteName + '?')) return;

	fetch('/api/rclone/backup.php?action=run&remote=' + encodeURIComponent(remoteName) + '&token=<?= $_SESSION["token"] ?>', {
		method: 'POST'
	})
	.then(r => r.json())
	.then(data => {
		if (data.success) {
			alert('<?= _("Backup started successfully!") ?>');
		} else {
			alert('<?= _("Error") ?>: ' + (data.error || 'Unknown error'));
		}
	})
	.catch(err => {
		alert('<?= _("Error starting backup") ?>');
	});
}
</script>

<style>
.badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 3px 10px;
	border-radius: 15px;
	font-size: 0.8em;
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
