<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/nodejs/">
				<i class="fas fa-arrow-left icon-blue"></i><?= _("Back") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<a class="button button-secondary" href="/view/pm2-log/?id=<?= $id ?>&name=<?= urlencode($name) ?>&token=<?= $_SESSION["token"] ?>">
				<i class="fas fa-arrows-rotate icon-green"></i><?= _("Refresh") ?>
			</a>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">
	<div class="form-container form-container-wide">
		<h1 class="u-mb20">
			<i class="fab fa-node-js icon-green"></i>
			<?= _("PM2 Logs") ?>: <?= htmlspecialchars($name) ?> (ID: <?= $id ?>)
		</h1>
		
		<div class="u-mb20">
			<pre class="log-viewer"><?= htmlspecialchars($logs) ?></pre>
		</div>
		
		<p class="hint">
			<?= _("Showing last 100 lines. For real-time logs, use SSH:") ?>
			<code>pm2 logs <?= $id ?></code>
		</p>
	</div>
</div>

<style>
.log-viewer {
	background: #1e1e1e;
	color: #d4d4d4;
	padding: 15px;
	border-radius: 8px;
	font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	font-size: 12px;
	line-height: 1.5;
	overflow-x: auto;
	max-height: 600px;
	overflow-y: auto;
	white-space: pre-wrap;
	word-wrap: break-word;
}
.form-container-wide {
	max-width: 1200px;
}
</style>
