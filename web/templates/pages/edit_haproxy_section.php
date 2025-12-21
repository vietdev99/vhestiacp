<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/haproxy/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<h1 class="form-title">
		<?php 
		$type = $section_type ?? 'frontend';
		$type_label = ucfirst($type);
		echo sprintf(_("Edit HAProxy %s: %s"), $type_label, htmlspecialchars($name)); 
		?>
	</h1>

	<?php show_alert_message($_SESSION); ?>

	<form
		x-data="{}"
		class="edit-form"
		method="post"
		name="v_edit_haproxy_section"
	>
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">

		<div class="form-container">
			<div class="form-container-main">
				
				<!-- Section Name -->
				<div class="form-group">
					<label for="v_name" class="form-label"><?= _("Name") ?></label>
					<input 
						type="text" 
						class="form-control" 
						name="v_name" 
						id="v_name" 
						value="<?= htmlspecialchars($name) ?>"
					>
					<small class="form-text"><?= _("Warning: Changing the name may break references from other sections.") ?></small>
				</div>

				<!-- Configuration -->
				<div class="form-group">
					<label for="v_config" class="form-label">
						<?= sprintf(_("%s Configuration"), $type_label) ?>
					</label>
					<textarea 
						class="form-control u-min-height300" 
						name="v_config" 
						id="v_config"
						rows="20"
						style="font-family: monospace; font-size: 13px;"
					><?= htmlspecialchars($frontend_config ?? $section_config ?? '') ?></textarea>
					<small class="form-text">
						<?= _("Enter the configuration options for this section (without the section header).") ?>
					</small>
				</div>

			</div>

			<!-- Sidebar -->
			<div class="form-container-sidebar">
				<div class="u-mb20">
					<button type="submit" class="button" name="save" value="save">
						<i class="fas fa-floppy-disk"></i><?= _("Save") ?>
					</button>
				</div>
				
				<div class="form-group">
					<h3><?= _("Help") ?></h3>
					<p class="u-text-muted">
						<?php if ($type === 'frontend') { ?>
							<?= _("Frontend sections define how HAProxy receives connections.") ?>
							<br><br>
							<strong><?= _("Common options:") ?></strong><br>
							<code>bind *:80</code> - <?= _("Listen on port") ?><br>
							<code>mode http</code> - <?= _("HTTP mode") ?><br>
							<code>default_backend name</code> - <?= _("Default backend") ?>
						<?php } elseif ($type === 'backend') { ?>
							<?= _("Backend sections define server pools that handle requests.") ?>
							<br><br>
							<strong><?= _("Common options:") ?></strong><br>
							<code>mode http</code> - <?= _("HTTP mode") ?><br>
							<code>balance roundrobin</code> - <?= _("Load balancing") ?><br>
							<code>server name ip:port</code> - <?= _("Backend server") ?>
						<?php } else { ?>
							<?= _("Listen sections combine frontend and backend in one.") ?>
							<br><br>
							<strong><?= _("Common options:") ?></strong><br>
							<code>bind *:port</code> - <?= _("Listen on port") ?><br>
							<code>mode http</code> - <?= _("HTTP mode") ?><br>
							<code>server name ip:port</code> - <?= _("Backend server") ?>
						<?php } ?>
					</p>
				</div>
			</div>
		</div>

	</form>

</div>

<style>
.form-title {
	margin-bottom: 20px;
}
.u-min-height300 {
	min-height: 300px;
}
</style>
