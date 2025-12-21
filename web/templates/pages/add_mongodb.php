<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/mongodb/">
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

	<form
		id="main-form"
		name="v_add_mongodb"
		method="post"
	>
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="ok" value="Add">

		<div class="form-container">
			<h1 class="u-mb20"><?= _("Add MongoDB Database") ?></h1>
			<?php show_alert_message($_SESSION); ?>
			
			<p class="hint u-mb20">
				<?= sprintf(_("Prefix %s will be automatically added to database name and database user"), "<span class=\"u-text-bold\">" . $user_plain . "_</span>") ?>
			</p>
			
			<div class="u-mb10">
				<label for="v_database" class="form-label"><?= _("Database") ?></label>
				<input type="text" class="form-control" name="v_database" id="v_database" value="<?= htmlentities(trim($v_database, "'")) ?>" required>
			</div>
			
			<div class="u-mb10">
				<label for="v_dbuser" class="form-label">
					<?= _("Username") ?>
				</label>
				<input type="text" class="form-control" name="v_dbuser" id="v_dbuser" value="<?= htmlentities(trim($v_dbuser, "'")) ?>" required>
			</div>
			
			<div class="u-mb10">
				<label for="v_password" class="form-label">
					<?= _("Password") ?>
					<button type="button" title="<?= _("Generate") ?>" class="u-unstyled-button u-ml5 js-generate-password">
						<i class="fas fa-arrows-rotate icon-green"></i>
					</button>
				</label>
				<div class="u-pos-relative u-mb10">
					<input type="text" class="form-control js-password-input" name="v_password" id="v_password" required>
					<div class="password-meter">
						<meter max="4" class="password-meter-input js-password-meter"></meter>
					</div>
				</div>
			</div>
			
			<?php require $_SERVER["HESTIA"] . "/web/templates/includes/password-requirements.php"; ?>
			
			<div class="u-mt20">
				<p class="hint">
					<i class="fas fa-info-circle"></i>
					<?= _("MongoDB databases are accessible on localhost:27017") ?>
				</p>
			</div>
		</div>

	</form>

</div>
