<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/list/server/" class="button button-secondary">
				<i class="fas fa-arrow-left"></i><?= _("Back to Server") ?>
			</a>
			<?php if ($kafka_installed) { ?>
				<a
					class="button button-secondary data-controls js-confirm-action"
					href="/restart/service/?srv=kafka&token=<?= $_SESSION["token"] ?>"
					data-confirm-title="<?= _("Restart") ?>"
					data-confirm-message="<?= _("Are you sure you want to restart Kafka?") ?>"
				>
					<i class="fas fa-arrow-rotate-left icon-blue"></i><?= _("Restart") ?>
				</a>
			<?php } ?>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<?php if (!$kafka_installed) { ?>
		<div class="empty-state">
			<i class="fas fa-stream"></i>
			<h2><?= _("Apache Kafka is not installed") ?></h2>
			<p><?= _("Apache Kafka streaming platform is not installed on this server.") ?></p>
		</div>
	<?php } else { ?>
		
		<!-- Server Summary -->
		<div class="server-summary">
			<div class="server-summary-icon">
				<i class="fas fa-stream <?= $kafka_data['status'] === 'running' ? 'icon-green' : 'icon-red' ?>"></i>
			</div>
			<div class="server-summary-content">
				<h1 class="server-summary-title"><?= _("Apache Kafka") ?></h1>
				<ul class="server-summary-list">
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Status") ?></span>
						<span class="server-summary-list-value">
							<?php if ($kafka_data['status'] === 'running') { ?>
								<i class="fas fa-circle-check icon-green"></i> <?= _("Running") ?>
							<?php } else { ?>
								<i class="fas fa-circle-minus icon-red"></i> <?= _("Stopped") ?>
							<?php } ?>
						</span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Version") ?></span>
						<span class="server-summary-list-value"><?= htmlspecialchars($kafka_data['version'] ?? 'Unknown') ?></span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Cluster ID") ?></span>
						<span class="server-summary-list-value">
							<code style="font-size: 0.85em;"><?= htmlspecialchars($kafka_data['cluster_id'] ?? 'N/A') ?></code>
						</span>
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
						<h3><?= _("Kafka Broker") ?></h3>
					</div>
					<div class="service-info-body">
						<div class="info-row">
							<span class="info-label"><?= _("Bootstrap Server") ?></span>
							<span class="info-value">
								<code><?= htmlspecialchars($kafka_data['host'] ?? 'localhost') ?>:<?= htmlspecialchars($kafka_data['port'] ?? '9092') ?></code>
							</span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Host") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($kafka_data['host'] ?? 'localhost') ?></code></span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Port") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($kafka_data['port'] ?? '9092') ?></code></span>
						</div>
					</div>
				</div>

				<?php if (!empty($kafka_data['ui']) && $kafka_data['ui'] === 'yes') { ?>
				<div class="service-info-card">
					<div class="service-info-header">
						<i class="fas fa-globe"></i>
						<h3><?= _("Kafka UI") ?></h3>
						<?php if (!empty($kafka_data['ui_status'])) { ?>
							<span class="status-badge <?= $kafka_data['ui_status'] === 'running' ? 'status-green' : 'status-red' ?>">
								<?= $kafka_data['ui_status'] ?>
							</span>
						<?php } ?>
					</div>
					<div class="service-info-body">
						<?php 
						$ui_port = $kafka_data['ui_port'] ?? '8090';
						$server_host = $_SERVER["HTTP_HOST"];
						if (strpos($server_host, ':') !== false) {
							$server_host = explode(':', $server_host)[0];
						}
						$ui_url = "http://{$server_host}:{$ui_port}";
						?>
						<div class="info-row">
							<span class="info-label"><?= _("URL") ?></span>
							<span class="info-value">
								<a href="<?= $ui_url ?>" target="_blank" class="link-external">
									<?= $ui_url ?>
									<i class="fas fa-external-link-alt"></i>
								</a>
							</span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Username") ?></span>
							<span class="info-value"><code><?= htmlspecialchars($kafka_data['user'] ?? 'admin') ?></code></span>
						</div>
						<div class="info-row">
							<span class="info-label"><?= _("Password") ?></span>
							<span class="info-value">
								<code class="password-field" id="kafka-password"><?= str_repeat('•', 16) ?></code>
								<button type="button" class="btn-show-password" onclick="togglePassword('kafka-password', '<?= htmlspecialchars($kafka_data['password'] ?? '') ?>')">
									<i class="fas fa-eye"></i>
								</button>
							</span>
						</div>
						<div class="u-mt15">
							<a href="<?= $ui_url ?>" target="_blank" class="button button-secondary">
								<i class="fas fa-external-link-alt"></i> <?= _("Open Kafka UI") ?>
							</a>
						</div>
					</div>
				</div>
				<?php } ?>
			</div>
		</div>

		<!-- Quick Commands -->
		<div class="units-table-wrapper u-mt30">
			<h2 class="u-mb20"><i class="fas fa-terminal icon-orange"></i> <?= _("Quick Commands") ?></h2>
			
			<div class="code-block">
				<div class="code-header">
					<span><?= _("List Topics") ?></span>
					<button class="btn-copy" onclick="copyCommand(this, '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list')">
						<i class="fas fa-copy"></i>
					</button>
				</div>
				<pre>/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list</pre>
			</div>
			
			<div class="code-block">
				<div class="code-header">
					<span><?= _("Create Topic") ?></span>
					<button class="btn-copy" onclick="copyCommand(this, '/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic my-topic --partitions 1 --replication-factor 1')">
						<i class="fas fa-copy"></i>
					</button>
				</div>
				<pre>/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic my-topic --partitions 1 --replication-factor 1</pre>
			</div>
			
			<div class="code-block">
				<div class="code-header">
					<span><?= _("Console Producer") ?></span>
					<button class="btn-copy" onclick="copyCommand(this, '/opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic my-topic')">
						<i class="fas fa-copy"></i>
					</button>
				</div>
				<pre>/opt/kafka/bin/kafka-console-producer.sh --bootstrap-server localhost:9092 --topic my-topic</pre>
			</div>
			
			<div class="code-block">
				<div class="code-header">
					<span><?= _("Console Consumer") ?></span>
					<button class="btn-copy" onclick="copyCommand(this, '/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic my-topic --from-beginning')">
						<i class="fas fa-copy"></i>
					</button>
				</div>
				<pre>/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic my-topic --from-beginning</pre>
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
	flex: 1;
}

.status-badge {
	font-size: 0.75em;
	padding: 2px 8px;
	border-radius: 4px;
	text-transform: uppercase;
	font-weight: 600;
}

.status-green {
	background: rgba(34, 197, 94, 0.2);
	color: #22c55e;
}

.status-red {
	background: rgba(239, 68, 68, 0.2);
	color: #ef4444;
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

.code-block {
	background: var(--color-bg-secondary);
	border: 1px solid var(--color-border);
	border-radius: 8px;
	margin-bottom: 15px;
	overflow: hidden;
}

.code-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
	background: var(--color-bg-primary);
	border-bottom: 1px solid var(--color-border);
	font-weight: 500;
	font-size: 0.9em;
}

.code-block pre {
	margin: 0;
	padding: 15px;
	font-family: monospace;
	font-size: 0.85em;
	overflow-x: auto;
	white-space: pre-wrap;
	word-wrap: break-word;
}

.btn-copy {
	background: var(--color-bg-tertiary);
	border: 1px solid var(--color-border);
	color: var(--color-text-secondary);
	cursor: pointer;
	padding: 4px 10px;
	border-radius: 4px;
	font-size: 0.85em;
}

.btn-copy:hover {
	background: var(--color-bg-secondary);
	color: var(--color-text-primary);
}

.btn-copy.copied {
	background: var(--color-success);
	color: white;
	border-color: var(--color-success);
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

function copyCommand(button, text) {
	navigator.clipboard.writeText(text).then(function() {
		button.innerHTML = '<i class="fas fa-check"></i>';
		button.classList.add('copied');
		setTimeout(function() {
			button.innerHTML = '<i class="fas fa-copy"></i>';
			button.classList.remove('copied');
		}, 2000);
	});
}
</script>
