<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/list/server/" class="button button-secondary">
				<i class="fas fa-arrow-left"></i><?= _("Back to Server") ?>
			</a>
			<?php if ($rabbitmq_installed) { ?>
				<a
					class="button button-secondary data-controls js-confirm-action"
					href="/restart/service/?srv=rabbitmq-server&token=<?= $_SESSION["token"] ?>"
					data-confirm-title="<?= _("Restart") ?>"
					data-confirm-message="<?= _("Are you sure you want to restart RabbitMQ?") ?>"
				>
					<i class="fas fa-arrow-rotate-left icon-blue"></i><?= _("Restart") ?>
				</a>
			<?php } ?>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<?php if (!$rabbitmq_installed) { ?>
		<div class="empty-state">
			<i class="fas fa-envelope"></i>
			<h2><?= _("RabbitMQ is not installed") ?></h2>
			<p><?= _("RabbitMQ message broker is not installed on this server.") ?></p>
		</div>
	<?php } else { ?>
		
		<!-- Server Summary -->
		<div class="server-summary">
			<div class="server-summary-icon">
				<i class="fas fa-envelope <?= $rabbitmq_data['status'] === 'running' ? 'icon-green' : 'icon-red' ?>"></i>
			</div>
			<div class="server-summary-content">
				<h1 class="server-summary-title"><?= _("RabbitMQ Message Broker") ?></h1>
				<ul class="server-summary-list">
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Status") ?></span>
						<span class="server-summary-list-value">
							<?php if ($rabbitmq_data['status'] === 'running') { ?>
								<i class="fas fa-circle-check icon-green"></i> <?= _("Running") ?>
							<?php } else { ?>
								<i class="fas fa-circle-minus icon-red"></i> <?= _("Stopped") ?>
							<?php } ?>
						</span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Version") ?></span>
						<span class="server-summary-list-value"><?= htmlspecialchars($rabbitmq_data['version'] ?? 'Unknown') ?></span>
					</li>
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
						<h3><?= _("AMQP Connection") ?></h3>
					</div>
					<div class="service-info-body">
						<div class="info-row">
							<span class="info-label"><?= _("Host") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($rabbitmq_data['host'] ?? 'localhost') ?></code></span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Port") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($rabbitmq_data['port'] ?? '5672') ?></code></span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Username") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($rabbitmq_data['user'] ?? 'admin') ?></code></span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Password") ?></span>
							<span class="info-value">
								<code class="password-field" id="amqp-password"><?= str_repeat('•', 16) ?></code>
								<button type="button" class="btn-show-password" onclick="togglePassword('amqp-password', '<?= htmlspecialchars($rabbitmq_data['password'] ?? '') ?>')">
									<i class="fas fa-eye"></i>
								</button>
							</span>
						</div>
					</div>
				</div>

				<?php if (!empty($rabbitmq_data['management']) && $rabbitmq_data['management'] === 'yes') { ?>
				<div class="service-info-card">
					<div class="service-info-header">
						<i class="fas fa-globe"></i>
						<h3><?= _("Management UI") ?></h3>
					</div>
					<div class="service-info-body">
						<?php 
						$mgmt_port = $rabbitmq_data['management_port'] ?? '15672';
						$server_host = $_SERVER["HTTP_HOST"];
						if (strpos($server_host, ':') !== false) {
							$server_host = explode(':', $server_host)[0];
						}
						$mgmt_url = "http://{$server_host}:{$mgmt_port}";
						?>
						<div class="info-row">
							<span class="info-label"><?= _("URL") ?></span>
							<span class="info-value">
								<a href="<?= $mgmt_url ?>" target="_blank" class="link-external">
									<?= $mgmt_url ?>
									<i class="fas fa-external-link-alt"></i>
								</a>
							</span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Port") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($mgmt_port) ?></code></span>
						</div>
						<div class="u-mt15">
							<a href="<?= $mgmt_url ?>" target="_blank" class="button button-secondary">
								<i class="fas fa-external-link-alt"></i> <?= _("Open Management UI") ?>
							</a>
						</div>
					</div>
				</div>
				<?php } ?>
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

.link-external {
	color: var(--color-link);
	text-decoration: none;
}

.link-external:hover {
	text-decoration: underline;
}

.link-external i {
	font-size: 0.8em;
	margin-left: 4px;
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
