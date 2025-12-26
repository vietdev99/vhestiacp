<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a class="button button-secondary button-back js-button-back" href="/list/server/">
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

	<form id="main-form" name="v_configure_server" method="post">
		<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
		<input type="hidden" name="save" value="save">

		<div class="form-container form-container-wide">
			<h1 class="u-mb20"><?= _("Configure Server") ?>: <?= $v_service_name ?></h1>
			<?php show_alert_message($_SESSION); ?>

			<!-- Status Bar -->
			<div class="u-mb20">
				<div class="service-status-bar">
					<span class="form-label"><?= _("Status") ?>:</span>
					<?php if ($v_status === 'running') { ?>
						<span class="badge badge-success"><i class="fas fa-circle-check"></i> <?= _("Running") ?></span>
					<?php } else { ?>
						<span class="badge badge-danger"><i class="fas fa-circle-minus"></i> <?= _("Stopped") ?></span>
					<?php } ?>
					<span class="u-ml20 form-label"><?= _("Version") ?>:</span>
					<span><?= htmlentities($v_version) ?></span>
				</div>
			</div>

			<!-- Credentials Panel -->
			<div class="credentials-panel u-mb20">
				<h3 class="credentials-title"><i class="fas fa-key"></i> <?= _("Connection Credentials") ?></h3>
				<div class="credentials-grid">
					<div class="credential-item">
						<span class="credential-label"><?= _("Host") ?></span>
						<div class="credential-value-wrap">
							<code class="credential-value" id="rmq-host"><?= htmlentities($rabbitmq_host) ?></code>
							<button type="button" class="copy-btn" onclick="copyValue('rmq-host')">
								<i class="fas fa-copy"></i>
							</button>
						</div>
					</div>
					<div class="credential-item">
						<span class="credential-label"><?= _("Port (AMQP)") ?></span>
						<div class="credential-value-wrap">
							<code class="credential-value" id="rmq-port"><?= htmlentities($rabbitmq_port) ?></code>
							<button type="button" class="copy-btn" onclick="copyValue('rmq-port')">
								<i class="fas fa-copy"></i>
							</button>
						</div>
					</div>
					<div class="credential-item">
						<span class="credential-label"><?= _("Username") ?></span>
						<div class="credential-value-wrap">
							<code class="credential-value" id="rmq-user"><?= htmlentities($rabbitmq_user) ?></code>
							<button type="button" class="copy-btn" onclick="copyValue('rmq-user')">
								<i class="fas fa-copy"></i>
							</button>
						</div>
					</div>
					<div class="credential-item">
						<span class="credential-label"><?= _("Password") ?></span>
						<div class="credential-value-wrap">
							<code class="credential-value password-hidden" id="rmq-pass"><?= htmlentities($rabbitmq_pass) ?></code>
							<button type="button" class="show-btn" onclick="togglePassword('rmq-pass', this)">
								<i class="fas fa-eye"></i>
							</button>
							<button type="button" class="copy-btn" onclick="copyValue('rmq-pass')">
								<i class="fas fa-copy"></i>
							</button>
						</div>
					</div>
					<div class="credential-item credential-item-full">
						<span class="credential-label"><?= _("Management UI") ?></span>
						<div class="credential-value-wrap">
							<a href="<?= htmlentities($rabbitmq_mgmt_url) ?>" target="_blank" class="mgmt-link">
								<i class="fas fa-external-link-alt"></i> <?= htmlentities($rabbitmq_mgmt_url) ?>
							</a>
						</div>
					</div>
					<div class="credential-item credential-item-full">
						<span class="credential-label"><?= _("Connection String") ?></span>
						<div class="credential-value-wrap">
							<code class="credential-value" id="rmq-connstr">amqp://<?= htmlentities($rabbitmq_user) ?>:****@<?= htmlentities($rabbitmq_host) ?>:<?= htmlentities($rabbitmq_port) ?>/</code>
							<button type="button" class="copy-btn" onclick="copyConnString()">
								<i class="fas fa-copy"></i>
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Config Editor -->
			<div class="u-mb20">
				<label for="v_config" class="form-label"><?= $v_config_path ?></label>
				<textarea class="form-control u-min-height400 u-allow-resize u-console js-advanced-textarea" name="v_config" id="v_config"><?= htmlentities($v_config) ?></textarea>
			</div>

			<div class="form-check u-mb20">
				<input class="form-check-input" type="checkbox" name="v_restart" id="v_restart" checked>
				<label for="v_restart">
					<?= _("Restart service after saving") ?>
				</label>
			</div>
		</div>

	</form>

</div>

<script>
var rmqPass = <?= json_encode($rabbitmq_pass) ?>;
var rmqUser = <?= json_encode($rabbitmq_user) ?>;
var rmqHost = <?= json_encode($rabbitmq_host) ?>;
var rmqPort = <?= json_encode($rabbitmq_port) ?>;

function copyValue(elementId) {
	var text = document.getElementById(elementId).textContent;
	navigator.clipboard.writeText(text).then(function() {
		showToast('Copied!');
	});
}

function copyConnString() {
	var connStr = 'amqp://' + rmqUser + ':' + rmqPass + '@' + rmqHost + ':' + rmqPort + '/';
	navigator.clipboard.writeText(connStr).then(function() {
		showToast('Connection string copied!');
	});
}

function togglePassword(elementId, btn) {
	var el = document.getElementById(elementId);
	if (el.classList.contains('password-hidden')) {
		el.classList.remove('password-hidden');
		btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
	} else {
		el.classList.add('password-hidden');
		btn.innerHTML = '<i class="fas fa-eye"></i>';
	}
}

function showToast(message) {
	var toast = document.createElement('div');
	toast.className = 'copy-toast';
	toast.textContent = message;
	document.body.appendChild(toast);
	setTimeout(function() { toast.remove(); }, 2000);
}
</script>

<style>
.service-status-bar {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 15px;
	background: var(--color-bg-secondary);
	border-radius: 8px;
}
.badge {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 5px 12px;
	border-radius: 20px;
	font-size: 0.85em;
	font-weight: 500;
}
.badge-success {
	background: rgba(40, 167, 69, 0.15);
	color: #28a745;
}
.badge-danger {
	background: rgba(220, 53, 69, 0.15);
	color: #dc3545;
}
.form-container-wide {
	max-width: 1000px;
}
.credentials-panel {
	background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
	border-radius: 12px;
	padding: 20px;
	box-shadow: 0 4px 15px rgba(255, 107, 53, 0.3);
}
.credentials-title {
	color: #fff;
	font-size: 1.1em;
	margin-bottom: 15px;
	padding-bottom: 10px;
	border-bottom: 1px solid rgba(255,255,255,0.2);
}
.credentials-title i {
	margin-right: 8px;
}
.credentials-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 15px;
}
.credential-item {
	background: rgba(0,0,0,0.2);
	padding: 12px 15px;
	border-radius: 8px;
}
.credential-item-full {
	grid-column: span 2;
}
.credential-label {
	display: block;
	color: rgba(255,255,255,0.7);
	font-size: 0.85em;
	margin-bottom: 5px;
}
.credential-value-wrap {
	display: flex;
	align-items: center;
	gap: 8px;
}
.credential-value {
	background: rgba(0,0,0,0.3);
	padding: 8px 12px;
	border-radius: 6px;
	color: #fff;
	font-family: monospace;
	flex: 1;
	word-break: break-all;
}
.password-hidden {
	-webkit-text-security: disc;
	text-security: disc;
}
.copy-btn, .show-btn {
	background: rgba(255,255,255,0.2);
	border: none;
	padding: 8px 10px;
	border-radius: 6px;
	color: #fff;
	cursor: pointer;
	transition: background 0.2s;
}
.copy-btn:hover, .show-btn:hover {
	background: rgba(255,255,255,0.3);
}
.mgmt-link {
	color: #fff;
	text-decoration: none;
	font-weight: 500;
}
.mgmt-link:hover {
	text-decoration: underline;
}
.copy-toast {
	position: fixed;
	bottom: 20px;
	right: 20px;
	background: #28a745;
	color: #fff;
	padding: 10px 20px;
	border-radius: 8px;
	z-index: 9999;
	animation: fadeInOut 2s ease;
}
@keyframes fadeInOut {
	0%, 100% { opacity: 0; }
	10%, 90% { opacity: 1; }
}
@media (max-width: 768px) {
	.credentials-grid {
		grid-template-columns: 1fr;
	}
	.credential-item-full {
		grid-column: span 1;
	}
}
</style>
