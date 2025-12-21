<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/add/mongodb/" class="button button-secondary js-button-create">
				<i class="fas fa-circle-plus icon-green"></i><?= _("Add Database") ?>
			</a>
			<?php if (!empty($mongo_express_installed) && !empty($mongo_express_url)) { ?>
			<a href="<?= htmlspecialchars($mongo_express_url) ?>" target="_blank" class="button button-secondary">
				<i class="fas fa-leaf icon-green"></i><?= _("Mongo Express") ?>
			</a>
			<?php } ?>
		</div>
		<div class="toolbar-right">
			<div class="toolbar-search">
				<form action="/search/" method="get">
					<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
					<input type="search" class="form-control js-search-input" name="q" value="<? echo isset($_GET['q']) ? htmlspecialchars($_GET['q']) : '' ?>" title="<?= _("Search") ?>">
					<button type="submit" class="toolbar-input-submit" title="<?= _("Search") ?>">
						<i class="fas fa-magnifying-glass"></i>
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<h1 class="u-text-center u-hide-desktop u-mt20 u-pr30 u-mb20 u-pl30"><?= _("MongoDB Databases") ?></h1>

	<?php if (empty($data)) { ?>
		<div class="empty-state">
			<i class="fas fa-leaf"></i>
			<h2><?= _("No MongoDB databases found") ?></h2>
			<p><?= _("Click the button above to add your first MongoDB database.") ?></p>
			<?php if (!empty($mongo_express_installed)) { ?>
			<p class="u-mt10">
				<a href="<?= htmlspecialchars($mongo_express_url) ?>" target="_blank" class="button button-secondary">
					<i class="fas fa-external-link"></i> <?= _("Open Mongo Express") ?>
				</a>
			</p>
			<?php } ?>
		</div>
	<?php } else { ?>
		
		<?php if (!empty($mongo_express_installed) && !empty($mongo_express_url)) { ?>
		<div class="mongo-express-banner u-mb20">
			<div class="mongo-express-info">
				<i class="fas fa-leaf icon-green"></i>
				<span><?= _("Mongo Express is available for database management") ?></span>
			</div>
			<a href="<?= htmlspecialchars($mongo_express_url) ?>" target="_blank" class="button button-small">
				<i class="fas fa-external-link"></i> <?= _("Open Mongo Express") ?>
			</a>
		</div>
		<?php } ?>
		
		<div class="units-table js-units-container">
			<div class="units-table-header">
				<div class="units-table-cell">
					<input type="checkbox" class="js-toggle-all-checkbox" title="<?= _("Select all") ?>">
				</div>
				<div class="units-table-cell"><?= _("Database") ?></div>
				<div class="units-table-cell"></div>
				<div class="units-table-cell u-text-center"><?= _("Collections") ?></div>
				<div class="units-table-cell u-text-center"><?= _("Users") ?></div>
				<div class="units-table-cell u-text-center"><?= _("Size") ?></div>
				<div class="units-table-cell u-text-center"><?= _("Date") ?></div>
			</div>

			<!-- Begin MongoDB database list item loop -->
			<?php
				$i = 0;
				foreach ($data as $key => $value) {
					++$i;
					$collections = isset($value['COLLECTIONS']) ? $value['COLLECTIONS'] : 0;
					$users = isset($value['USERS']) ? $value['USERS'] : 0;
					$size = isset($value['SIZE']) ? $value['SIZE'] : 0;
					$date = isset($value['DATE']) ? $value['DATE'] : '-';
			?>
			<div class="units-table-row js-unit"
				data-sort-name="<?= strtolower($key) ?>"
				data-sort-size="<?= $size ?>">
				<div class="units-table-cell">
					<div>
						<input id="check<?= $i ?>" class="js-unit-checkbox" type="checkbox" title="<?= _("Select") ?>" name="database[]" value="<?= $key ?>">
						<label for="check<?= $i ?>" class="u-hide-desktop"><?= _("Select") ?></label>
					</div>
				</div>
				<div class="units-table-cell units-table-heading-cell u-text-bold">
					<span class="u-hide-desktop"><?= _("Database") ?>:</span>
					<i class="fas fa-leaf icon-green u-mr5"></i>
					<a href="/edit/mongodb/?database=<?= $key ?>&token=<?= $_SESSION["token"] ?>" title="<?= _("Edit") ?>: <?= $key ?>">
						<?= $key ?>
					</a>
				</div>
				<div class="units-table-cell">
					<ul class="units-table-row-actions">
						<li class="units-table-row-action shortcut-enter" data-key-action="href">
							<a
								class="units-table-row-action-link"
								href="/edit/mongodb/?database=<?= $key ?>&token=<?= $_SESSION["token"] ?>"
								title="<?= _("Edit") ?>"
							>
								<i class="fas fa-pencil icon-orange"></i>
								<span class="u-hide-desktop"><?= _("Edit") ?></span>
							</a>
						</li>
						<?php if (!empty($mongo_express_installed) && !empty($mongo_express_url)) { ?>
						<li class="units-table-row-action">
							<a
								class="units-table-row-action-link"
								href="<?= htmlspecialchars($mongo_express_url) ?>/db/<?= $key ?>/"
								target="_blank"
								title="<?= _("Open in Mongo Express") ?>"
							>
								<i class="fas fa-external-link icon-green"></i>
								<span class="u-hide-desktop"><?= _("Mongo Express") ?></span>
							</a>
						</li>
						<?php } ?>
						<li class="units-table-row-action shortcut-delete" data-key-action="js">
							<a
								class="units-table-row-action-link data-controls js-confirm-action"
								href="/delete/mongodb/?database=<?= $key ?>&token=<?= $_SESSION["token"] ?>"
								title="<?= _("Delete") ?>"
								data-confirm-title="<?= _("Delete") ?>"
								data-confirm-message="<?= sprintf(_("Are you sure you want to delete database %s?"), $key) ?>"
							>
								<i class="fas fa-trash icon-red"></i>
								<span class="u-hide-desktop"><?= _("Delete") ?></span>
							</a>
						</li>
					</ul>
				</div>
				<div class="units-table-cell u-text-bold u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Collections") ?>:</span>
					<?= $collections ?>
				</div>
				<div class="units-table-cell u-text-bold u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Users") ?>:</span>
					<?= $users ?>
				</div>
				<div class="units-table-cell u-text-bold u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Size") ?>:</span>
					<?= humanize_usage_size($size) ?> <?= humanize_usage_measure($size) ?>
				</div>
				<div class="units-table-cell u-text-bold u-text-center-desktop">
					<span class="u-hide-desktop"><?= _("Date") ?>:</span>
					<?= $date ?>
				</div>
			</div>
			<?php } ?>
		</div>
	<?php } ?>

</div>

<style>
.empty-state {
	text-align: center;
	padding: 80px 20px;
}
.empty-state i {
	font-size: 5em;
	color: var(--color-text-muted);
	margin-bottom: 20px;
}
.empty-state h2 {
	margin-bottom: 10px;
	font-weight: 500;
}
.empty-state p {
	color: var(--color-text-muted);
}
.mongo-express-banner {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	background: linear-gradient(135deg, #4ade8022 0%, #22c55e22 100%);
	border: 1px solid #22c55e44;
	border-radius: 8px;
}
.mongo-express-info {
	display: flex;
	align-items: center;
	gap: 10px;
}
.mongo-express-info i {
	font-size: 1.2em;
}
.button-small {
	padding: 6px 12px;
	font-size: 0.9em;
}
</style>
