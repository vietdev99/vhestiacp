<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/list/server/" class="button button-secondary">
				<i class="fas fa-arrow-left"></i><?= _("Back to Server") ?>
			</a>
			<?php if ($redis_installed) { ?>
				<a href="/edit/server/redis/" class="button button-secondary">
					<i class="fas fa-pencil icon-orange"></i><?= _("Edit Config") ?>
				</a>
				<a
					class="button button-secondary data-controls js-confirm-action"
					href="/restart/service/?srv=redis-server&token=<?= $_SESSION["token"] ?>"
					data-confirm-title="<?= _("Restart") ?>"
					data-confirm-message="<?= _("Are you sure you want to restart Redis?") ?>"
				>
					<i class="fas fa-arrow-rotate-left icon-blue"></i><?= _("Restart") ?>
				</a>
			<?php } ?>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<?php if (!$redis_installed) { ?>
		<div class="empty-state">
			<i class="fas fa-database"></i>
			<h2><?= _("Redis is not installed") ?></h2>
			<p><?= _("Redis in-memory cache is not installed on this server.") ?></p>
		</div>
	<?php } else { ?>
		
		<!-- Server Summary -->
		<div class="server-summary">
			<div class="server-summary-icon">
				<i class="fas fa-bolt <?= $redis_data['status'] === 'running' ? 'icon-green' : 'icon-red' ?>"></i>
			</div>
			<div class="server-summary-content">
				<h1 class="server-summary-title"><?= _("Redis In-Memory Cache") ?></h1>
				<ul class="server-summary-list">
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Status") ?></span>
						<span class="server-summary-list-value">
							<?php if ($redis_data['status'] === 'running') { ?>
								<i class="fas fa-circle-check icon-green"></i> <?= _("Running") ?>
							<?php } else { ?>
								<i class="fas fa-circle-minus icon-red"></i> <?= _("Stopped") ?>
							<?php } ?>
						</span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Version") ?></span>
						<span class="server-summary-list-value"><?= htmlspecialchars($redis_data['version'] ?? 'Unknown') ?></span>
					</li>
					<?php if (!empty($redis_data['memory'])) { ?>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Memory Used") ?></span>
						<span class="server-summary-list-value"><?= htmlspecialchars($redis_data['memory']) ?></span>
					</li>
					<?php } ?>
					<?php if (!empty($redis_data['clients'])) { ?>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Connected Clients") ?></span>
						<span class="server-summary-list-value"><?= htmlspecialchars($redis_data['clients']) ?></span>
					</li>
					<?php } ?>
				</ul>
			</div>
		</div>

		<?php show_alert_message($_SESSION); ?>

		<!-- Connection Info -->
		<div class="units-table-wrapper">
			<h2 class="u-mb20"><i class="fas fa-plug icon-blue"></i> <?= _("Connection Information") ?></h2>
			
			<div class="service-info-grid">
				<div class="service-info-card">
					<div class="service-info-header">
						<i class="fas fa-server"></i>
						<h3><?= _("Redis Connection") ?></h3>
					</div>
					<div class="service-info-body">
						<div class="info-row">
							<span class="info-label"><?= _("Host") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($redis_data['host'] ?? '127.0.0.1') ?></code></span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Port") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($redis_data['port'] ?? '6379') ?></code></span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Password") ?></span>
							<span class="info-value">
								<code class="password-field" id="redis-password"><?= str_repeat('•', 16) ?></code>
								<button type="button" class="btn-show-password" onclick="togglePassword('redis-password', '<?= htmlspecialchars($redis_data['password'] ?? '') ?>')">
									<i class="fas fa-eye"></i>
								</button>
							</span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Config File") ?></span>
							<span class="info-value"><code>/etc/redis/redis.conf</code></span>
						</div>
					</div>
				</div>

				<div class="service-info-card">
					<div class="service-info-header">
						<i class="fas fa-code"></i>
						<h3><?= _("Connection Examples") ?></h3>
					</div>
					<div class="service-info-body">
						<div class="code-example">
							<div class="code-label">PHP</div>
							<pre>$redis = new Redis();
$redis->connect('<?= $redis_data['host'] ?? '127.0.0.1' ?>', <?= $redis_data['port'] ?? '6379' ?>);
$redis->auth('YOUR_PASSWORD');</pre>
						</div>
						<div class="code-example u-mt10">
							<div class="code-label">CLI</div>
							<pre>redis-cli -h <?= $redis_data['host'] ?? '127.0.0.1' ?> -p <?= $redis_data['port'] ?? '6379' ?> -a YOUR_PASSWORD</pre>
						</div>
					</div>
				</div>
			</div>
		</div>

	<?php } ?>

</div>

<style>
.service-info-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
	gap: 20px;
}

.service-info-card {
	background: var(--color-bg-secondary);
	border: 1px solid var(--color-border);
	border-radius: 8px;
	overflow: hidden;
}

.service-info-header {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 15px 20px;
	background: var(--color-bg-primary);
	border-bottom: 1px solid var(--color-border);
}

.service-info-header i {
	font-size: 1.2em;
	color: var(--color-text-secondary);
}

.service-info-header h3 {
	margin: 0;
	font-size: 1em;
	font-weight: 600;
}

.service-info-body {
	padding: 20px;
}

.info-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border-light);
}

.info-row:last-child {
	border-bottom: none;
}

.info-label {
	font-weight: 500;
	color: var(--color-text-secondary);
}

.info-value {
	display: flex;
	align-items: center;
	gap: 8px;
}

.info-value code {
	padding: 4px 8px;
	background: var(--color-bg-primary);
	border-radius: 4px;
	font-family: monospace;
}

.password-field {
	min-width: 150px;
}

.btn-show-password {
	background: none;
	border: none;
	color: var(--color-text-secondary);
	cursor: pointer;
	padding: 4px 8px;
}

.btn-show-password:hover {
	color: var(--color-text-primary);
}

.code-example {
	background: var(--color-bg-primary);
	border-radius: 4px;
	overflow: hidden;
}

.code-label {
	padding: 5px 10px;
	background: var(--color-bg-tertiary);
	font-size: 0.8em;
	font-weight: 600;
	color: var(--color-text-secondary);
}

.code-example pre {
	margin: 0;
	padding: 10px;
	font-size: 0.85em;
	overflow-x: auto;
}
</style>

<script>
function togglePassword(elementId, password) {
	var elem = document.getElementById(elementId);
	if (elem.textContent.indexOf('•') !== -1) {
		elem.textContent = password;
	} else {
		elem.textContent = '•'.repeat(password.length);
	}
}
</script>
