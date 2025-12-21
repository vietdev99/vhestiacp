<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/list/redis/" class="button button-secondary">
				<i class="fas fa-arrow-left"></i><?= _("Back") ?>
			</a>
			<a
				class="button button-secondary data-controls js-confirm-action"
				href="/restart/service/?srv=redis-server&token=<?= $_SESSION["token"] ?>"
				data-confirm-title="<?= _("Restart") ?>"
				data-confirm-message="<?= _("Are you sure you want to restart Redis?") ?>"
			>
				<i class="fas fa-arrow-rotate-left icon-blue"></i><?= _("Restart") ?>
			</a>
		</div>
		<div class="toolbar-right">
			<span class="toolbar-status">
				<?php if ($redis_status === 'running') { ?>
					<i class="fas fa-circle-check icon-green"></i> <?= _("Running") ?>
				<?php } else { ?>
					<i class="fas fa-circle-minus icon-red"></i> <?= _("Stopped") ?>
				<?php } ?>
			</span>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<form id="main-form" method="post">
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		
		<div class="form-container">
			<h1 class="u-mb20">
				<i class="fas fa-bolt icon-red u-mr5"></i>
				<?= _("Redis Configuration") ?>
			</h1>
			
			<?php show_alert_message($_SESSION); ?>
			
			<p class="u-mb20">
				<i class="fas fa-info-circle icon-blue"></i>
				<?= _("Edit the Redis configuration file. Changes will take effect after saving.") ?>
			</p>
			
			<div class="u-mb20">
				<label for="v_config" class="form-label">
					<?= _("Configuration") ?>
					<span class="hint">/etc/redis/redis.conf</span>
				</label>
				<textarea 
					class="form-control" 
					name="v_config" 
					id="v_config" 
					rows="35"
					style="font-family: monospace; font-size: 13px;"
				><?= htmlspecialchars($v_config) ?></textarea>
			</div>
			
			<div class="form-buttons">
				<button type="submit" class="button">
					<i class="fas fa-floppy-disk"></i><?= _("Save") ?>
				</button>
			</div>
		</div>
		
	</form>

</div>
