<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/server/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<a href="/list/server/" class="button button-secondary">
				<i class="fas fa-server icon-maroon"></i><?= _("Services") ?>
			</a>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<h1 class="u-mb20">
		<i class="fas fa-puzzle-piece"></i>
		<?= _("Package Manager") ?>
	</h1>

	<?php show_alert_message($_SESSION); ?>

	<p class="u-mb30 hint">
		<?= _("Install or uninstall system packages. Some packages may require server restart to take effect.") ?>
	</p>

	<?php if (empty($packages)): ?>
		<div class="alert alert-info">
			<i class="fas fa-info-circle"></i>
			<?= _("Unable to load package list. Please check system configuration.") ?>
		</div>
	<?php else: ?>
		<?php foreach ($packages as $cat_id => $category): ?>
			<div class="package-category u-mb30">
				<h2 class="package-category-title">
					<i class="fas <?= $category_icons[$cat_id] ?? 'fa-box' ?> <?= $category_colors[$cat_id] ?? '' ?>"></i>
					<?= htmlentities($category["name"]) ?>
				</h2>

				<div class="package-grid">
					<?php foreach ($category["packages"] as $pkg_id => $pkg): ?>
						<div class="package-card <?= $pkg["installed"] ? 'package-installed' : 'package-not-installed' ?>">
							<div class="package-card-header">
								<div class="package-icon">
									<i class="fas fa-<?= htmlentities($pkg["icon"]) ?>"></i>
								</div>
								<div class="package-info">
									<h3 class="package-name"><?= htmlentities($pkg["name"]) ?></h3>
									<p class="package-desc"><?= htmlentities($pkg["description"]) ?></p>
								</div>
							</div>

							<div class="package-card-footer">
								<div class="package-status">
									<?php if ($pkg["installed"]): ?>
										<?php if ($pkg["status"] === "running"): ?>
											<span class="badge badge-success">
												<i class="fas fa-circle-check"></i> <?= _("Running") ?>
											</span>
										<?php elseif (!empty($pkg["service"])): ?>
											<span class="badge badge-warning">
												<i class="fas fa-circle-pause"></i> <?= _("Stopped") ?>
											</span>
										<?php else: ?>
											<span class="badge badge-info">
												<i class="fas fa-check"></i> <?= _("Installed") ?>
											</span>
										<?php endif; ?>
									<?php else: ?>
										<span class="badge badge-secondary">
											<i class="fas fa-circle-minus"></i> <?= _("Not Installed") ?>
										</span>
									<?php endif; ?>
								</div>

								<div class="package-actions">
									<?php if ($pkg["installed"]): ?>
										<a
											class="button button-danger button-small data-controls js-confirm-action"
											href="/uninstall/package/?package=<?= urlencode($pkg_id) ?>&token=<?= $_SESSION["token"] ?>"
											data-confirm-title="<?= _("Uninstall") ?> <?= htmlentities($pkg["name"]) ?>"
											data-confirm-message="<?= sprintf(_("Are you sure you want to uninstall %s? This action cannot be undone and may remove associated data."), htmlentities($pkg["name"])) ?>"
										>
											<i class="fas fa-trash"></i> <?= _("Uninstall") ?>
										</a>
									<?php else: ?>
										<a
											class="button button-primary button-small data-controls js-confirm-action"
											href="/install/package/?package=<?= urlencode($pkg_id) ?>&token=<?= $_SESSION["token"] ?>"
											data-confirm-title="<?= _("Install") ?> <?= htmlentities($pkg["name"]) ?>"
											data-confirm-message="<?= sprintf(_("Do you want to install %s? This may take a few minutes."), htmlentities($pkg["name"])) ?>"
										>
											<i class="fas fa-download"></i> <?= _("Install") ?>
										</a>
									<?php endif; ?>
								</div>
							</div>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		<?php endforeach; ?>
	<?php endif; ?>

</div>

<style>
.package-category {
	margin-bottom: 30px;
}

.package-category-title {
	font-size: 1.3em;
	font-weight: 600;
	margin-bottom: 15px;
	padding-bottom: 10px;
	border-bottom: 2px solid var(--color-border);
}

.package-category-title i {
	margin-right: 10px;
}

.package-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 20px;
}

.package-card {
	background: var(--color-bg-secondary);
	border-radius: 12px;
	padding: 20px;
	border: 2px solid transparent;
	transition: all 0.2s ease;
}

.package-card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.package-installed {
	border-color: rgba(40, 167, 69, 0.3);
}

.package-not-installed {
	border-color: var(--color-border);
}

.package-card-header {
	display: flex;
	gap: 15px;
	margin-bottom: 15px;
}

.package-icon {
	width: 50px;
	height: 50px;
	border-radius: 10px;
	background: var(--color-primary);
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.5em;
	flex-shrink: 0;
}

.package-installed .package-icon {
	background: #28a745;
}

.package-not-installed .package-icon {
	background: #6c757d;
}

.package-info {
	flex: 1;
	min-width: 0;
}

.package-name {
	font-size: 1.1em;
	font-weight: 600;
	margin: 0 0 5px 0;
	color: var(--color-text);
}

.package-desc {
	font-size: 0.9em;
	color: var(--color-text-secondary);
	margin: 0;
}

.package-card-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-top: 15px;
	border-top: 1px solid var(--color-border);
}

.package-status .badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 5px 10px;
	border-radius: 20px;
	font-size: 0.85em;
	font-weight: 500;
}

.badge-success {
	background: rgba(40, 167, 69, 0.15);
	color: #28a745;
}

.badge-warning {
	background: rgba(255, 193, 7, 0.15);
	color: #d39e00;
}

.badge-info {
	background: rgba(23, 162, 184, 0.15);
	color: #17a2b8;
}

.badge-secondary {
	background: rgba(108, 117, 125, 0.15);
	color: #6c757d;
}

.badge-danger {
	background: rgba(220, 53, 69, 0.15);
	color: #dc3545;
}

.package-actions .button-small {
	padding: 6px 12px;
	font-size: 0.85em;
}

.button-primary {
	background: var(--color-primary);
	color: #fff;
	border: none;
}

.button-primary:hover {
	background: var(--color-primary-dark);
}

.button-danger {
	background: #dc3545;
	color: #fff;
	border: none;
}

.button-danger:hover {
	background: #c82333;
}

@media (max-width: 768px) {
	.package-grid {
		grid-template-columns: 1fr;
	}

	.package-card-footer {
		flex-direction: column;
		gap: 10px;
	}

	.package-actions {
		width: 100%;
	}

	.package-actions .button {
		width: 100%;
		justify-content: center;
	}
}
</style>
