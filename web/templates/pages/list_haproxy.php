<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/list/server/" class="button button-secondary">
				<i class="fas fa-arrow-left"></i><?= _("Back to Server") ?>
			</a>
			<?php if ($haproxy_installed) { ?>
				<a href="/edit/server/haproxy/" class="button button-secondary">
					<i class="fas fa-gear icon-orange"></i><?= _("Configure") ?>
				</a>
				<a
					class="button button-secondary data-controls js-confirm-action"
					href="/restart/service/?srv=haproxy&token=<?= $_SESSION["token"] ?>"
					data-confirm-title="<?= _("Restart") ?>"
					data-confirm-message="<?= _("Are you sure you want to restart HAProxy?") ?>"
				>
					<i class="fas fa-arrow-rotate-left icon-blue"></i><?= _("Restart") ?>
				</a>
			<?php } ?>
		</div>
		<div class="toolbar-buttons">
			<?php if ($haproxy_installed) { ?>
				<button type="button" class="button button-secondary" onclick="showAddFrontend()">
					<i class="fas fa-circle-plus icon-green"></i><?= _("Add Frontend") ?>
				</button>
				<button type="button" class="button button-secondary" onclick="showAddBackend()">
					<i class="fas fa-circle-plus icon-blue"></i><?= _("Add Backend") ?>
				</button>
			<?php } ?>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<?php if (!$haproxy_installed) { ?>
		<div class="empty-state">
			<i class="fas fa-network-wired"></i>
			<h2><?= _("HAProxy is not installed") ?></h2>
			<p><?= _("HAProxy load balancer is not installed on this server.") ?></p>
			<a href="/add/haproxy/" class="button">
				<i class="fas fa-circle-plus"></i>
				<?= _("Install HAProxy") ?>
			</a>
		</div>
	<?php } else { ?>
		
		<!-- Server Summary -->
		<div class="server-summary">
			<div class="server-summary-icon">
				<i class="fas fa-network-wired <?= $haproxy_data['STATUS'] === 'running' ? 'icon-green' : 'icon-red' ?>"></i>
			</div>
			<div class="server-summary-content">
				<h1 class="server-summary-title"><?= _("HAProxy Load Balancer") ?></h1>
				<ul class="server-summary-list">
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Status") ?></span>
						<span class="server-summary-list-value">
							<?php if ($haproxy_data['STATUS'] === 'running') { ?>
								<i class="fas fa-circle-check icon-green"></i> <?= _("Running") ?>
							<?php } else { ?>
								<i class="fas fa-circle-minus icon-red"></i> <?= _("Stopped") ?>
							<?php } ?>
						</span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Version") ?></span>
						<span class="server-summary-list-value"><?= htmlspecialchars($haproxy_data['VERSION'] ?? 'Unknown') ?></span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Config File") ?></span>
						<span class="server-summary-list-value">/etc/haproxy/haproxy.cfg</span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Frontends") ?></span>
						<span class="server-summary-list-value"><?= count($frontends) ?></span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Backends") ?></span>
						<span class="server-summary-list-value"><?= count($backends) ?></span>
					</li>
					<li class="server-summary-item">
						<span class="server-summary-list-label"><?= _("Listen Sections") ?></span>
						<span class="server-summary-list-value"><?= count($listens) ?></span>
					</li>
				</ul>
			</div>
		</div>

		<?php show_alert_message($_SESSION); ?>

		<!-- Stats Section (if exists) -->
		<?php if ($stats_info) { 
			$stats_port = '8404';
			$stats_uri = '/stats';
			$stats_user = '';
			$stats_pass = '';
			
			// Extract port from bind
			if (!empty($stats_info['bind'])) {
				foreach ($stats_info['bind'] as $bind) {
					if (preg_match('/:(\d+)/', $bind, $m)) {
						$stats_port = $m[1];
						break;
					}
				}
			}
			
			// Get URI
			if (!empty($stats_info['stats_uri'])) {
				$stats_uri = $stats_info['stats_uri'];
			}
			
			// Get auth
			if (!empty($stats_info['stats_auth'])) {
				$auth_parts = explode(':', $stats_info['stats_auth']);
				$stats_user = $auth_parts[0] ?? '';
				$stats_pass = $auth_parts[1] ?? '';
			}
			
			$stats_url = "http://{$server_host}:{$stats_port}{$stats_uri}";
		?>
		<div class="haproxy-card stats-card">
			<div class="haproxy-card-header">
				<h3><i class="fas fa-chart-bar icon-purple"></i> <?= _("Stats Dashboard") ?></h3>
				<a href="<?= $stats_url ?>" target="_blank" class="button button-small">
					<i class="fas fa-external-link"></i> <?= _("Open Stats") ?>
				</a>
			</div>
			<div class="haproxy-card-body">
				<div class="stats-info-grid">
					<div class="stats-info-item">
						<label><?= _("URL") ?></label>
						<div class="stats-value">
							<a href="<?= $stats_url ?>" target="_blank"><?= $stats_url ?></a>
						</div>
					</div>
					<div class="stats-info-item">
						<label><?= _("Port") ?></label>
						<div class="stats-value"><code><?= $stats_port ?></code></div>
					</div>
					<div class="stats-info-item">
						<label><?= _("Username") ?></label>
						<div class="stats-value"><code><?= htmlspecialchars($stats_user) ?></code></div>
					</div>
					<div class="stats-info-item">
						<label><?= _("Password") ?></label>
						<div class="stats-value">
							<code class="password-hidden" id="stats-pass"><?= str_repeat('•', strlen($stats_pass)) ?></code>
							<button type="button" class="btn-show-pass" onclick="togglePassword('stats-pass', '<?= htmlspecialchars($stats_pass) ?>')">
								<i class="fas fa-eye"></i>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
		<?php } ?>

		<div class="haproxy-sections">
			
			<!-- Frontends -->
			<div class="haproxy-section">
				<div class="section-header">
					<h2><i class="fas fa-globe icon-blue"></i> <?= _("Frontends") ?></h2>
				</div>
				<?php if (empty($frontends)) { ?>
					<p class="u-text-muted"><?= _("No frontends configured") ?></p>
				<?php } else { ?>
					<?php foreach ($frontends as $name => $data) { ?>
					<div class="haproxy-card">
						<div class="haproxy-card-header">
							<h3><i class="fas fa-broadcast-tower icon-blue"></i> <?= htmlspecialchars($name) ?></h3>
							<div class="haproxy-card-actions">
								<button type="button" class="button button-small button-secondary" onclick="editFrontend('<?= htmlspecialchars($name) ?>')">
									<i class="fas fa-pencil"></i>
								</button>
								<button type="button" class="button button-small button-danger" onclick="confirmDelete('frontend', '<?= htmlspecialchars($name) ?>')">
									<i class="fas fa-trash"></i>
								</button>
							</div>
						</div>
						<div class="haproxy-card-body">
							<div class="haproxy-details">
								<!-- Bind -->
								<div class="detail-row">
									<span class="detail-label"><?= _("Bind") ?></span>
									<span class="detail-value">
										<?php foreach ($data['bind'] as $bind) { ?>
											<code class="port-badge"><?= htmlspecialchars($bind) ?></code>
										<?php } ?>
									</span>
								</div>
								<!-- Mode -->
								<?php if ($data['mode']) { ?>
								<div class="detail-row">
									<span class="detail-label"><?= _("Mode") ?></span>
									<span class="detail-value"><code><?= htmlspecialchars($data['mode']) ?></code></span>
								</div>
								<?php } ?>
								<!-- Default Backend -->
								<?php if ($data['default_backend']) { ?>
								<div class="detail-row">
									<span class="detail-label"><?= _("Default Backend") ?></span>
									<span class="detail-value">
										<code class="backend-link"><?= htmlspecialchars($data['default_backend']) ?></code>
									</span>
								</div>
								<?php } ?>
								<!-- Options -->
								<?php if (!empty($data['options'])) { ?>
								<div class="detail-row">
									<span class="detail-label"><?= _("Options") ?></span>
									<span class="detail-value">
										<details>
											<summary><?= count($data['options']) ?> <?= _("option(s)") ?></summary>
											<pre class="options-code"><?= htmlspecialchars(implode("\n", $data['options'])) ?></pre>
										</details>
									</span>
								</div>
								<?php } ?>
							</div>
						</div>
					</div>
					<?php } ?>
				<?php } ?>
			</div>

			<!-- Backends -->
			<div class="haproxy-section">
				<div class="section-header">
					<h2><i class="fas fa-server icon-green"></i> <?= _("Backends") ?></h2>
				</div>
				<?php if (empty($backends)) { ?>
					<p class="u-text-muted"><?= _("No backends configured") ?></p>
				<?php } else { ?>
					<?php foreach ($backends as $name => $data) { ?>
					<div class="haproxy-card">
						<div class="haproxy-card-header">
							<h3><i class="fas fa-cube icon-green"></i> <?= htmlspecialchars($name) ?></h3>
							<div class="haproxy-card-actions">
								<button type="button" class="button button-small button-secondary" onclick="editBackend('<?= htmlspecialchars($name) ?>')">
									<i class="fas fa-pencil"></i>
								</button>
								<button type="button" class="button button-small button-danger" onclick="confirmDelete('backend', '<?= htmlspecialchars($name) ?>')">
									<i class="fas fa-trash"></i>
								</button>
							</div>
						</div>
						<div class="haproxy-card-body">
							<div class="haproxy-details">
								<!-- Mode -->
								<?php if ($data['mode']) { ?>
								<div class="detail-row">
									<span class="detail-label"><?= _("Mode") ?></span>
									<span class="detail-value"><code><?= htmlspecialchars($data['mode']) ?></code></span>
								</div>
								<?php } ?>
								<!-- Balance -->
								<?php if ($data['balance']) { ?>
								<div class="detail-row">
									<span class="detail-label"><?= _("Balance") ?></span>
									<span class="detail-value"><code><?= htmlspecialchars($data['balance']) ?></code></span>
								</div>
								<?php } ?>
								<!-- Servers -->
								<?php if (!empty($data['servers'])) { ?>
								<div class="detail-row">
									<span class="detail-label"><?= _("Servers") ?></span>
									<span class="detail-value">
										<div class="servers-list">
											<?php foreach ($data['servers'] as $server) { ?>
											<div class="server-item">
												<code class="server-badge">
													<i class="fas fa-server"></i>
													<?= htmlspecialchars($server['name']) ?>: <?= htmlspecialchars($server['address']) ?>
												</code>
												<?php if ($server['options']) { ?>
													<small class="server-opts"><?= htmlspecialchars($server['options']) ?></small>
												<?php } ?>
											</div>
											<?php } ?>
										</div>
									</span>
								</div>
								<?php } ?>
								<!-- Options -->
								<?php if (!empty($data['options'])) { ?>
								<div class="detail-row">
									<span class="detail-label"><?= _("Options") ?></span>
									<span class="detail-value">
										<details>
											<summary><?= count($data['options']) ?> <?= _("option(s)") ?></summary>
											<pre class="options-code"><?= htmlspecialchars(implode("\n", $data['options'])) ?></pre>
										</details>
									</span>
								</div>
								<?php } ?>
							</div>
						</div>
					</div>
					<?php } ?>
				<?php } ?>
			</div>

		</div>

		<!-- Listen Sections (if any) -->
		<?php if (!empty($listens)) { ?>
		<div class="haproxy-section u-mt30">
			<div class="section-header">
				<h2><i class="fas fa-plug icon-orange"></i> <?= _("Listen Sections") ?></h2>
			</div>
			<?php foreach ($listens as $name => $data) { 
				// Skip stats section as it's shown separately
				if ($name === 'stats') continue;
			?>
			<div class="haproxy-card">
				<div class="haproxy-card-header">
					<h3><i class="fas fa-plug icon-orange"></i> <?= htmlspecialchars($name) ?></h3>
					<div class="haproxy-card-actions">
						<button type="button" class="button button-small button-secondary" onclick="editListen('<?= htmlspecialchars($name) ?>')">
							<i class="fas fa-pencil"></i>
						</button>
						<button type="button" class="button button-small button-danger" onclick="confirmDelete('listen', '<?= htmlspecialchars($name) ?>')">
							<i class="fas fa-trash"></i>
						</button>
					</div>
				</div>
				<div class="haproxy-card-body">
					<div class="haproxy-details">
						<!-- Bind -->
						<?php if (!empty($data['bind'])) { ?>
						<div class="detail-row">
							<span class="detail-label"><?= _("Bind") ?></span>
							<span class="detail-value">
								<?php foreach ($data['bind'] as $bind) { ?>
									<code class="port-badge"><?= htmlspecialchars($bind) ?></code>
								<?php } ?>
							</span>
						</div>
						<?php } ?>
						<!-- Mode -->
						<?php if ($data['mode']) { ?>
						<div class="detail-row">
							<span class="detail-label"><?= _("Mode") ?></span>
							<span class="detail-value"><code><?= htmlspecialchars($data['mode']) ?></code></span>
						</div>
						<?php } ?>
						<!-- Balance -->
						<?php if ($data['balance']) { ?>
						<div class="detail-row">
							<span class="detail-label"><?= _("Balance") ?></span>
							<span class="detail-value"><code><?= htmlspecialchars($data['balance']) ?></code></span>
						</div>
						<?php } ?>
						<!-- Servers -->
						<?php if (!empty($data['servers'])) { ?>
						<div class="detail-row">
							<span class="detail-label"><?= _("Servers") ?></span>
							<span class="detail-value">
								<div class="servers-list">
									<?php foreach ($data['servers'] as $server) { ?>
									<div class="server-item">
										<code class="server-badge">
											<i class="fas fa-server"></i>
											<?= htmlspecialchars($server['name']) ?>: <?= htmlspecialchars($server['address']) ?>
										</code>
									</div>
									<?php } ?>
								</div>
							</span>
						</div>
						<?php } ?>
					</div>
				</div>
			</div>
			<?php } ?>
		</div>
		<?php } ?>

	<?php } ?>

</div>

<!-- Add Frontend Modal -->
<div id="modal-add-frontend" class="modal" style="display:none;">
	<div class="modal-content">
		<div class="modal-header">
			<h3><i class="fas fa-globe icon-blue"></i> <?= _("Add Frontend") ?></h3>
			<button type="button" class="modal-close" onclick="closeModal('modal-add-frontend')">&times;</button>
		</div>
		<form action="/add/haproxy/frontend/" method="post">
			<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
			<div class="modal-body">
				<div class="form-group">
					<label for="frontend_name"><?= _("Name") ?></label>
					<input type="text" id="frontend_name" name="name" class="form-control" placeholder="web_front" required pattern="[a-zA-Z0-9_-]+">
				</div>
				<div class="form-group">
					<label for="frontend_bind"><?= _("Bind (port)") ?></label>
					<input type="text" id="frontend_bind" name="bind" class="form-control" placeholder="*:80" required>
					<small><?= _("Example: *:80, *:443 ssl crt /path/to/cert.pem, 192.168.1.1:8080") ?></small>
				</div>
				<div class="form-group">
					<label for="frontend_mode"><?= _("Mode") ?></label>
					<select id="frontend_mode" name="mode" class="form-control">
						<option value="http">http</option>
						<option value="tcp">tcp</option>
					</select>
				</div>
				<div class="form-group">
					<label for="frontend_backend"><?= _("Default Backend") ?></label>
					<select id="frontend_backend" name="default_backend" class="form-control">
						<option value=""><?= _("-- Select Backend --") ?></option>
						<?php foreach ($backends as $bname => $bdata) { ?>
							<option value="<?= htmlspecialchars($bname) ?>"><?= htmlspecialchars($bname) ?></option>
						<?php } ?>
					</select>
				</div>
				<div class="form-group">
					<label for="frontend_options"><?= _("Additional Options") ?></label>
					<textarea id="frontend_options" name="options" class="form-control" rows="5" placeholder="option httplog
option forwardfor
acl is_api path_beg /api
use_backend api_backend if is_api"></textarea>
					<small><?= _("One option per line") ?></small>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="button button-secondary" onclick="closeModal('modal-add-frontend')"><?= _("Cancel") ?></button>
				<button type="submit" class="button"><?= _("Add Frontend") ?></button>
			</div>
		</form>
	</div>
</div>

<!-- Add Backend Modal -->
<div id="modal-add-backend" class="modal" style="display:none;">
	<div class="modal-content">
		<div class="modal-header">
			<h3><i class="fas fa-server icon-green"></i> <?= _("Add Backend") ?></h3>
			<button type="button" class="modal-close" onclick="closeModal('modal-add-backend')">&times;</button>
		</div>
		<form action="/add/haproxy/backend/" method="post">
			<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
			<div class="modal-body">
				<div class="form-group">
					<label for="backend_name"><?= _("Name") ?></label>
					<input type="text" id="backend_name" name="name" class="form-control" placeholder="nginx_backend" required pattern="[a-zA-Z0-9_-]+">
				</div>
				<div class="form-group">
					<label for="backend_mode"><?= _("Mode") ?></label>
					<select id="backend_mode" name="mode" class="form-control">
						<option value="http">http</option>
						<option value="tcp">tcp</option>
					</select>
				</div>
				<div class="form-group">
					<label for="backend_balance"><?= _("Balance Algorithm") ?></label>
					<select id="backend_balance" name="balance" class="form-control">
						<option value="roundrobin">roundrobin</option>
						<option value="leastconn">leastconn</option>
						<option value="source">source (IP hash)</option>
						<option value="first">first</option>
						<option value="uri">uri</option>
					</select>
				</div>
				<div class="form-group">
					<label for="backend_servers"><?= _("Servers") ?></label>
					<textarea id="backend_servers" name="servers" class="form-control" rows="4" placeholder="server nginx1 127.0.0.1:8080 check
server nginx2 127.0.0.1:8081 check backup" required></textarea>
					<small><?= _("One server per line. Format: server NAME ADDRESS [OPTIONS]") ?></small>
				</div>
				<div class="form-group">
					<label for="backend_options"><?= _("Additional Options") ?></label>
					<textarea id="backend_options" name="options" class="form-control" rows="4" placeholder="option httpchk GET /health
http-check expect status 200
option forwardfor"></textarea>
					<small><?= _("One option per line") ?></small>
				</div>
			</div>
			<div class="modal-footer">
				<button type="button" class="button button-secondary" onclick="closeModal('modal-add-backend')"><?= _("Cancel") ?></button>
				<button type="submit" class="button"><?= _("Add Backend") ?></button>
			</div>
		</form>
	</div>
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
	margin-bottom: 20px;
}

/* Stats Card */
.stats-card {
	margin: 20px 0;
	background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
	border: 1px solid #667eea44;
}
.stats-info-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 15px;
}
.stats-info-item {
	display: flex;
	flex-direction: column;
	gap: 5px;
}
.stats-info-item label {
	font-size: 0.85em;
	color: var(--color-text-muted);
	font-weight: 500;
}
.stats-value {
	display: flex;
	align-items: center;
	gap: 10px;
}
.stats-value code {
	background: var(--color-bg-secondary);
	padding: 5px 10px;
	border-radius: 4px;
	font-family: monospace;
}
.stats-value a {
	color: var(--color-primary);
	word-break: break-all;
}
.btn-show-pass {
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color-text-muted);
	padding: 5px;
}
.btn-show-pass:hover {
	color: var(--color-primary);
}

/* Sections */
.haproxy-sections {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
	gap: 30px;
	margin-top: 30px;
}
.haproxy-section {
	min-width: 0;
}
.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 15px;
	padding-bottom: 10px;
	border-bottom: 1px solid var(--color-border);
}
.section-header h2 {
	font-size: 1.1em;
	margin: 0;
}

/* Cards */
.haproxy-card {
	background: var(--color-bg-primary);
	border: 1px solid var(--color-border);
	border-radius: 8px;
	margin-bottom: 15px;
	overflow: hidden;
}
.haproxy-card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 15px;
	background: var(--color-bg-secondary);
	border-bottom: 1px solid var(--color-border);
}
.haproxy-card-header h3 {
	margin: 0;
	font-size: 1em;
	font-weight: 600;
}
.haproxy-card-actions {
	display: flex;
	gap: 8px;
}
.haproxy-card-body {
	padding: 15px;
}

/* Details */
.haproxy-details {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.detail-row {
	display: flex;
	gap: 15px;
}
.detail-label {
	min-width: 120px;
	font-weight: 500;
	color: var(--color-text-muted);
	font-size: 0.9em;
}
.detail-value {
	flex: 1;
}
.detail-value code {
	background: var(--color-bg-secondary);
	padding: 3px 8px;
	border-radius: 4px;
	font-family: monospace;
	font-size: 0.9em;
}

/* Port Badge */
.port-badge {
	display: inline-block;
	background: #3b82f622 !important;
	color: #3b82f6 !important;
	border: 1px solid #3b82f644;
	margin-right: 5px;
	margin-bottom: 5px;
}

/* Backend Link */
.backend-link {
	background: #22c55e22 !important;
	color: #22c55e !important;
	border: 1px solid #22c55e44;
}

/* Server Badge */
.servers-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.server-item {
	display: flex;
	flex-direction: column;
	gap: 3px;
}
.server-badge {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	background: var(--color-bg-secondary) !important;
}
.server-opts {
	color: var(--color-text-muted);
	font-size: 0.85em;
	margin-left: 25px;
}

/* Options */
.options-code {
	background: #1e1e1e;
	color: #d4d4d4;
	padding: 10px;
	border-radius: 4px;
	font-family: monospace;
	font-size: 12px;
	margin-top: 8px;
	overflow-x: auto;
	white-space: pre;
}
details summary {
	cursor: pointer;
	color: var(--color-primary);
}

/* Buttons */
.button-small {
	padding: 5px 10px;
	font-size: 0.85em;
}
.button-danger {
	background: #ef4444;
	color: white;
}
.button-danger:hover {
	background: #dc2626;
}

/* Modal */
.modal {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0,0,0,0.5);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}
.modal-content {
	background: var(--color-bg-primary);
	border-radius: 12px;
	max-width: 600px;
	width: 90%;
	max-height: 90vh;
	overflow-y: auto;
	box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.modal-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px;
	border-bottom: 1px solid var(--color-border);
}
.modal-header h3 {
	margin: 0;
}
.modal-close {
	background: none;
	border: none;
	font-size: 1.5em;
	cursor: pointer;
	color: var(--color-text-muted);
}
.modal-body {
	padding: 20px;
}
.modal-footer {
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	padding: 15px 20px;
	border-top: 1px solid var(--color-border);
	background: var(--color-bg-secondary);
}
.form-group {
	margin-bottom: 15px;
}
.form-group label {
	display: block;
	margin-bottom: 5px;
	font-weight: 500;
}
.form-group small {
	display: block;
	margin-top: 5px;
	color: var(--color-text-muted);
	font-size: 0.85em;
}
.form-control {
	width: 100%;
	padding: 10px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-bg-secondary);
	color: var(--color-text-primary);
	font-family: inherit;
}
textarea.form-control {
	font-family: monospace;
	resize: vertical;
}
</style>

<script>
function showAddFrontend() {
	document.getElementById('modal-add-frontend').style.display = 'flex';
}

function showAddBackend() {
	document.getElementById('modal-add-backend').style.display = 'flex';
}

function closeModal(id) {
	document.getElementById(id).style.display = 'none';
}

function togglePassword(elementId, password) {
	var elem = document.getElementById(elementId);
	if (elem.classList.contains('password-hidden')) {
		elem.textContent = password;
		elem.classList.remove('password-hidden');
	} else {
		elem.textContent = '•'.repeat(password.length);
		elem.classList.add('password-hidden');
	}
}

function editFrontend(name) {
	window.location.href = '/edit/haproxy/frontend/?name=' + encodeURIComponent(name);
}

function editBackend(name) {
	window.location.href = '/edit/haproxy/backend/?name=' + encodeURIComponent(name);
}

function editListen(name) {
	window.location.href = '/edit/haproxy/listen/?name=' + encodeURIComponent(name);
}

function confirmDelete(type, name) {
	if (confirm('Are you sure you want to delete ' + type + ' "' + name + '"?')) {
		window.location.href = '/delete/haproxy/' + type + '/?name=' + encodeURIComponent(name) + '&token=<?= $_SESSION["token"] ?>';
	}
}

// Close modal on outside click
document.querySelectorAll('.modal').forEach(function(modal) {
	modal.addEventListener('click', function(e) {
		if (e.target === modal) {
			modal.style.display = 'none';
		}
	});
});

// Close modal on Escape key
document.addEventListener('keydown', function(e) {
	if (e.key === 'Escape') {
		document.querySelectorAll('.modal').forEach(function(modal) {
			modal.style.display = 'none';
		});
	}
});
</script>
