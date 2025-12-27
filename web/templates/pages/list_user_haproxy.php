<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/" class="button button-secondary">
				<i class="fas fa-arrow-left"></i><?= _("Back") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<button type="button" class="button button-secondary" onclick="showAddFrontend()">
				<i class="fas fa-circle-plus icon-blue"></i><?= _("Add Frontend") ?>
			</button>
			<button type="button" class="button" onclick="showAddBackend()">
				<i class="fas fa-circle-plus icon-green"></i><?= _("Add Backend") ?>
			</button>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<!-- Header -->
	<div class="server-summary">
		<div class="server-summary-icon">
			<i class="fas fa-network-wired icon-purple"></i>
		</div>
		<div class="server-summary-content">
			<h1 class="server-summary-title"><?= _("HAProxy Configuration") ?></h1>
			<ul class="server-summary-list">
				<li class="server-summary-item">
					<span class="server-summary-list-label"><?= _("Frontends") ?></span>
					<span class="server-summary-list-value"><?= count($frontends) ?></span>
				</li>
				<li class="server-summary-item">
					<span class="server-summary-list-label"><?= _("Backends") ?></span>
					<span class="server-summary-list-value"><?= count($backends) ?></span>
				</li>
				<li class="server-summary-item">
					<span class="server-summary-list-label"><?= _("User") ?></span>
					<span class="server-summary-list-value"><?= htmlspecialchars(trim($user, "'")) ?></span>
				</li>
			</ul>
		</div>
	</div>

	<?php show_alert_message($_SESSION); ?>

	<?php if (empty($frontends) && empty($backends)) { ?>
		<div class="empty-state">
			<i class="fas fa-server"></i>
			<h2><?= _("No HAProxy configuration") ?></h2>
			<p><?= _("Start by creating a Backend for your application, then create a Frontend to expose it.") ?></p>
			<div class="empty-state-actions">
				<button type="button" class="button" onclick="showAddBackend()">
					<i class="fas fa-circle-plus"></i>
					<?= _("Add Backend") ?>
				</button>
			</div>
		</div>
	<?php } else { ?>

		<!-- Flow Diagram -->
		<div class="haproxy-flow">
			<!-- Internet/Client Column -->
			<div class="flow-column flow-column-client">
				<div class="flow-column-header">
					<i class="fas fa-globe"></i>
					<span><?= _("Internet") ?></span>
				</div>
				<div class="flow-node flow-node-client">
					<div class="flow-node-icon">
						<i class="fas fa-users"></i>
					</div>
					<div class="flow-node-label"><?= _("Clients") ?></div>
				</div>
			</div>

			<!-- Arrow to Frontends -->
			<div class="flow-arrow">
				<svg viewBox="0 0 60 40" preserveAspectRatio="none">
					<defs>
						<marker id="arrowhead1" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
							<polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/>
						</marker>
					</defs>
					<line x1="0" y1="20" x2="50" y2="20" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrowhead1)"/>
				</svg>
			</div>

			<!-- Frontends Column -->
			<div class="flow-column flow-column-frontend">
				<div class="flow-column-header">
					<i class="fas fa-broadcast-tower"></i>
					<span><?= _("Frontends") ?></span>
					<button type="button" class="btn-add-small" onclick="showAddFrontend()" title="<?= _("Add Frontend") ?>">
						<i class="fas fa-plus"></i>
					</button>
				</div>
				<?php if (empty($frontends)) { ?>
					<div class="flow-empty" onclick="showAddFrontend()">
						<i class="fas fa-plus-circle"></i>
						<span><?= _("Add Frontend") ?></span>
					</div>
				<?php } else { ?>
					<?php foreach ($frontends as $index => $frontend) { ?>
					<div class="flow-node flow-node-frontend" data-frontend="<?= htmlspecialchars($frontend['NAME']) ?>" data-backend="<?= htmlspecialchars($frontend['DEFAULT_BACKEND'] ?? '') ?>">
						<div class="flow-node-header">
							<span class="flow-node-name"><?= htmlspecialchars($frontend['NAME']) ?></span>
							<div class="flow-node-actions">
								<a href="/delete/user-haproxy/?type=frontend&name=<?= urlencode($frontend['NAME']) ?>&token=<?= $_SESSION["token"] ?>"
								   class="btn-delete js-confirm-action"
								   data-confirm-title="<?= _("Delete Frontend") ?>"
								   data-confirm-message="<?= sprintf(_("Delete frontend '%s'?"), htmlspecialchars($frontend['NAME'])) ?>">
									<i class="fas fa-trash"></i>
								</a>
							</div>
						</div>
						<div class="flow-node-body">
							<div class="flow-node-port">
								<span class="port-label">BIND</span>
								<span class="port-value port-external">*:<?= htmlspecialchars($frontend['PORT']) ?></span>
							</div>
							<div class="flow-node-detail">
								<span class="detail-label"><?= _("Mode") ?></span>
								<span class="detail-value"><?= htmlspecialchars($frontend['MODE']) ?></span>
							</div>
							<?php if (!empty($frontend['DEFAULT_BACKEND'])) { ?>
							<div class="flow-node-target">
								<i class="fas fa-arrow-right"></i>
								<span class="target-backend"><?= htmlspecialchars($frontend['DEFAULT_BACKEND']) ?></span>
							</div>
							<?php } else { ?>
							<div class="flow-node-target flow-node-target-none">
								<i class="fas fa-exclamation-triangle"></i>
								<span><?= _("No backend") ?></span>
							</div>
							<?php } ?>
						</div>
						<?php if ($frontend['STATUS'] === 'active') { ?>
							<div class="flow-node-status status-active"><i class="fas fa-circle"></i> <?= _("Active") ?></div>
						<?php } else { ?>
							<div class="flow-node-status status-error"><i class="fas fa-circle"></i> <?= _("Error") ?></div>
						<?php } ?>
					</div>
					<?php } ?>
				<?php } ?>
			</div>

			<!-- Connection Lines (SVG) -->
			<div class="flow-connections">
				<svg id="connection-lines" width="100%" height="100%">
					<defs>
						<marker id="arrowhead2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
							<polygon points="0 0, 8 3, 0 6" fill="#22c55e"/>
						</marker>
						<marker id="arrowhead-warning" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
							<polygon points="0 0, 8 3, 0 6" fill="#f59e0b"/>
						</marker>
					</defs>
				</svg>
			</div>

			<!-- Backends Column -->
			<div class="flow-column flow-column-backend">
				<div class="flow-column-header">
					<i class="fas fa-server"></i>
					<span><?= _("Backends") ?></span>
					<button type="button" class="btn-add-small" onclick="showAddBackend()" title="<?= _("Add Backend") ?>">
						<i class="fas fa-plus"></i>
					</button>
				</div>
				<?php if (empty($backends)) { ?>
					<div class="flow-empty" onclick="showAddBackend()">
						<i class="fas fa-plus-circle"></i>
						<span><?= _("Add Backend") ?></span>
					</div>
				<?php } else { ?>
					<?php foreach ($backends as $backend) { ?>
					<div class="flow-node flow-node-backend" data-backend="<?= htmlspecialchars($backend['NAME']) ?>">
						<div class="flow-node-header">
							<span class="flow-node-name"><?= htmlspecialchars($backend['NAME']) ?></span>
							<div class="flow-node-actions">
								<a href="/delete/user-haproxy/?type=backend&name=<?= urlencode($backend['NAME']) ?>&token=<?= $_SESSION["token"] ?>"
								   class="btn-delete js-confirm-action"
								   data-confirm-title="<?= _("Delete Backend") ?>"
								   data-confirm-message="<?= sprintf(_("Delete backend '%s'?"), htmlspecialchars($backend['NAME'])) ?>">
									<i class="fas fa-trash"></i>
								</a>
							</div>
						</div>
						<div class="flow-node-body">
							<div class="flow-node-detail">
								<span class="detail-label"><?= _("Mode") ?></span>
								<span class="detail-value"><?= htmlspecialchars($backend['MODE']) ?></span>
							</div>
							<div class="flow-node-detail">
								<span class="detail-label"><?= _("Balance") ?></span>
								<span class="detail-value"><?= htmlspecialchars($backend['BALANCE']) ?></span>
							</div>
							<div class="flow-node-servers">
								<div class="server-item">
									<i class="fas fa-server"></i>
									<span>127.0.0.1:<?= htmlspecialchars($backend['PORT']) ?></span>
								</div>
							</div>
						</div>
						<?php if ($backend['STATUS'] === 'active') { ?>
							<div class="flow-node-status status-active"><i class="fas fa-circle"></i> <?= _("Active") ?></div>
						<?php } else { ?>
							<div class="flow-node-status status-error"><i class="fas fa-circle"></i> <?= _("Error") ?></div>
						<?php } ?>
					</div>
					<?php } ?>
				<?php } ?>
			</div>

			<!-- Arrow to Servers -->
			<div class="flow-arrow">
				<svg viewBox="0 0 60 40" preserveAspectRatio="none">
					<defs>
						<marker id="arrowhead3" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
							<polygon points="0 0, 10 3.5, 0 7" fill="#22c55e"/>
						</marker>
					</defs>
					<line x1="0" y1="20" x2="50" y2="20" stroke="#22c55e" stroke-width="2" marker-end="url(#arrowhead3)"/>
				</svg>
			</div>

			<!-- Application Servers Column -->
			<div class="flow-column flow-column-servers">
				<div class="flow-column-header">
					<i class="fas fa-cube"></i>
					<span><?= _("Your Apps") ?></span>
				</div>
				<div class="flow-node flow-node-app">
					<div class="flow-node-icon">
						<i class="fas fa-code"></i>
					</div>
					<div class="flow-node-label"><?= _("Application Servers") ?></div>
					<div class="flow-node-hint">Node.js, Python, PHP...</div>
				</div>
			</div>
		</div>

		<!-- Legend -->
		<div class="flow-legend">
			<div class="legend-item">
				<span class="legend-line legend-line-connected"></span>
				<span><?= _("Connected") ?></span>
			</div>
			<div class="legend-item">
				<span class="legend-line legend-line-warning"></span>
				<span><?= _("No backend assigned") ?></span>
			</div>
		</div>

	<?php } ?>

</div>

<!-- Add Frontend Modal -->
<div id="modal-add-frontend" class="modal" style="display:none;">
	<div class="modal-content">
		<div class="modal-header">
			<h3><i class="fas fa-broadcast-tower icon-blue"></i> <?= _("Add Frontend") ?></h3>
			<button type="button" class="modal-close" onclick="closeModal('modal-add-frontend')">&times;</button>
		</div>
		<form action="/add/user-haproxy/" method="post">
			<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
			<input type="hidden" name="type" value="frontend">
			<div class="modal-body">
				<div class="form-group">
					<label for="frontend_name"><?= _("Name") ?> <span class="required">*</span></label>
					<input type="text" id="frontend_name" name="name" class="form-control" placeholder="web_front" required pattern="[a-zA-Z0-9_-]+">
					<small><?= _("Alphanumeric, underscores and dashes only") ?></small>
				</div>
				<div class="form-group">
					<label for="frontend_port"><?= _("Listen Port") ?> <span class="required">*</span></label>
					<input type="number" id="frontend_port" name="port" class="form-control" placeholder="8080" required min="1024" max="65535">
					<small><?= _("Port to listen for incoming connections (1024-65535)") ?></small>
				</div>
				<div class="form-group">
					<label for="frontend_mode"><?= _("Mode") ?></label>
					<select id="frontend_mode" name="mode" class="form-control">
						<option value="http" selected>HTTP (<?= _("Web traffic") ?>)</option>
						<option value="tcp">TCP (<?= _("Raw TCP") ?>)</option>
					</select>
				</div>
				<div class="form-group">
					<label for="frontend_backend"><?= _("Default Backend") ?></label>
					<select id="frontend_backend" name="default_backend" class="form-control">
						<option value=""><?= _("-- None --") ?></option>
						<?php foreach ($backends as $b) { ?>
							<option value="<?= htmlspecialchars($b['NAME']) ?>"><?= htmlspecialchars($b['NAME']) ?></option>
						<?php } ?>
					</select>
					<small><?= _("Backend to route traffic to") ?></small>
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
		<form action="/add/user-haproxy/" method="post">
			<input type="hidden" name="token" value="<?= $_SESSION["token"] ?>">
			<input type="hidden" name="type" value="backend">
			<div class="modal-body">
				<div class="form-group">
					<label for="backend_name"><?= _("Name") ?> <span class="required">*</span></label>
					<input type="text" id="backend_name" name="name" class="form-control" placeholder="myapp" required pattern="[a-zA-Z0-9_-]+">
					<small><?= _("Alphanumeric, underscores and dashes only") ?></small>
				</div>
				<div class="form-group">
					<label for="backend_port"><?= _("Target Port") ?> <span class="required">*</span></label>
					<input type="number" id="backend_port" name="port" class="form-control" placeholder="3000" required min="1" max="65535">
					<small><?= _("Port your application listens on (e.g., Node.js on 3000)") ?></small>
				</div>
				<div class="form-group">
					<label for="backend_mode"><?= _("Mode") ?></label>
					<select id="backend_mode" name="mode" class="form-control">
						<option value="http" selected>HTTP</option>
						<option value="tcp">TCP</option>
					</select>
				</div>
				<div class="form-group">
					<label for="backend_balance"><?= _("Balance Algorithm") ?></label>
					<select id="backend_balance" name="balance" class="form-control">
						<option value="roundrobin" selected>Round Robin</option>
						<option value="leastconn">Least Connections</option>
						<option value="source">Source IP Hash</option>
					</select>
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
	padding: 60px 20px;
}
.empty-state i {
	font-size: 4em;
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
.empty-state-actions {
	display: flex;
	gap: 10px;
	justify-content: center;
}

/* Flow Diagram */
.haproxy-flow {
	display: flex;
	align-items: flex-start;
	gap: 0;
	margin-top: 30px;
	padding: 30px 20px;
	background: var(--color-bg-secondary);
	border-radius: 12px;
	border: 1px solid var(--color-border);
	overflow-x: auto;
	position: relative;
}

.flow-column {
	flex: 0 0 auto;
	min-width: 180px;
	display: flex;
	flex-direction: column;
	gap: 15px;
}

.flow-column-frontend,
.flow-column-backend {
	min-width: 220px;
	flex: 1;
}

.flow-column-client,
.flow-column-servers {
	min-width: 120px;
	max-width: 140px;
}

.flow-column-header {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 15px;
	background: var(--color-bg-primary);
	border-radius: 8px;
	font-weight: 600;
	font-size: 0.9em;
	border: 1px solid var(--color-border);
}

.flow-column-header i {
	opacity: 0.7;
}

.flow-column-frontend .flow-column-header {
	background: linear-gradient(135deg, #3b82f615, #3b82f605);
	border-color: #3b82f633;
	color: #3b82f6;
}

.flow-column-backend .flow-column-header {
	background: linear-gradient(135deg, #22c55e15, #22c55e05);
	border-color: #22c55e33;
	color: #22c55e;
}

.btn-add-small {
	margin-left: auto;
	background: none;
	border: 1px solid currentColor;
	border-radius: 4px;
	padding: 2px 6px;
	cursor: pointer;
	color: inherit;
	opacity: 0.7;
	transition: opacity 0.2s;
}

.btn-add-small:hover {
	opacity: 1;
}

/* Flow Nodes */
.flow-node {
	background: var(--color-bg-primary);
	border: 1px solid var(--color-border);
	border-radius: 10px;
	overflow: hidden;
	transition: all 0.2s;
}

.flow-node:hover {
	box-shadow: 0 4px 20px rgba(0,0,0,0.1);
	transform: translateY(-2px);
}

.flow-node-client,
.flow-node-app {
	text-align: center;
	padding: 20px 15px;
}

.flow-node-icon {
	font-size: 2em;
	margin-bottom: 10px;
	opacity: 0.6;
}

.flow-node-label {
	font-weight: 500;
	font-size: 0.9em;
}

.flow-node-hint {
	font-size: 0.75em;
	color: var(--color-text-muted);
	margin-top: 5px;
}

.flow-node-frontend {
	border-color: #3b82f644;
}

.flow-node-frontend:hover {
	border-color: #3b82f6;
}

.flow-node-backend {
	border-color: #22c55e44;
}

.flow-node-backend:hover {
	border-color: #22c55e;
}

.flow-node-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 12px;
	background: var(--color-bg-secondary);
	border-bottom: 1px solid var(--color-border);
}

.flow-node-name {
	font-weight: 600;
	font-size: 0.95em;
}

.flow-node-actions {
	display: flex;
	gap: 5px;
}

.btn-delete {
	color: var(--color-text-muted);
	padding: 4px 6px;
	border-radius: 4px;
	transition: all 0.2s;
}

.btn-delete:hover {
	color: #ef4444;
	background: #ef444415;
}

.flow-node-body {
	padding: 12px;
}

.flow-node-port {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 10px;
}

.port-label {
	font-size: 0.7em;
	text-transform: uppercase;
	color: var(--color-text-muted);
	letter-spacing: 0.5px;
}

.port-value {
	font-family: monospace;
	font-size: 0.95em;
	padding: 4px 10px;
	border-radius: 5px;
	font-weight: 600;
}

.port-external {
	background: #3b82f620;
	color: #3b82f6;
	border: 1px solid #3b82f640;
}

.flow-node-detail {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 4px 0;
	font-size: 0.85em;
}

.detail-label {
	color: var(--color-text-muted);
}

.detail-value {
	font-family: monospace;
	background: var(--color-bg-secondary);
	padding: 2px 8px;
	border-radius: 4px;
}

.flow-node-target {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-top: 10px;
	padding: 8px 10px;
	background: #22c55e15;
	border: 1px dashed #22c55e44;
	border-radius: 6px;
	font-size: 0.85em;
}

.flow-node-target i {
	color: #22c55e;
}

.target-backend {
	font-weight: 600;
	color: #22c55e;
}

.flow-node-target-none {
	background: #f59e0b15;
	border-color: #f59e0b44;
}

.flow-node-target-none i,
.flow-node-target-none span {
	color: #f59e0b;
}

.flow-node-servers {
	margin-top: 10px;
}

.server-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 10px;
	background: #1a1a1a;
	border-radius: 6px;
	font-family: monospace;
	font-size: 0.85em;
	color: #22c55e;
}

.server-item i {
	opacity: 0.6;
}

.flow-node-status {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	font-size: 0.75em;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	border-top: 1px solid var(--color-border);
}

.flow-node-status i {
	font-size: 0.6em;
}

.status-active {
	color: #22c55e;
	background: #22c55e10;
}

.status-error {
	color: #ef4444;
	background: #ef444410;
}

/* Flow Arrows */
.flow-arrow {
	flex: 0 0 60px;
	display: flex;
	align-items: center;
	justify-content: center;
	padding-top: 60px;
}

.flow-arrow svg {
	width: 60px;
	height: 40px;
}

/* Connection Lines */
.flow-connections {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 1;
}

.flow-connections svg {
	position: absolute;
	top: 0;
	left: 0;
}

.connection-line {
	stroke: #22c55e;
	stroke-width: 2;
	fill: none;
	opacity: 0.6;
}

.connection-line-warning {
	stroke: #f59e0b;
	stroke-dasharray: 5,5;
}

/* Flow Empty State */
.flow-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 10px;
	padding: 30px 20px;
	background: var(--color-bg-primary);
	border: 2px dashed var(--color-border);
	border-radius: 10px;
	cursor: pointer;
	transition: all 0.2s;
	color: var(--color-text-muted);
}

.flow-empty:hover {
	border-color: var(--color-primary);
	color: var(--color-primary);
	background: var(--color-primary-bg);
}

.flow-empty i {
	font-size: 1.5em;
}

/* Legend */
.flow-legend {
	display: flex;
	gap: 25px;
	justify-content: center;
	margin-top: 20px;
	padding: 15px;
	background: var(--color-bg-secondary);
	border-radius: 8px;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 10px;
	font-size: 0.85em;
	color: var(--color-text-muted);
}

.legend-line {
	width: 30px;
	height: 3px;
	border-radius: 2px;
}

.legend-line-connected {
	background: #22c55e;
}

.legend-line-warning {
	background: repeating-linear-gradient(
		90deg,
		#f59e0b,
		#f59e0b 5px,
		transparent 5px,
		transparent 10px
	);
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
	max-width: 500px;
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
	display: flex;
	align-items: center;
	gap: 10px;
}
.modal-close {
	background: none;
	border: none;
	font-size: 1.5em;
	cursor: pointer;
	color: var(--color-text-muted);
	line-height: 1;
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
	margin-bottom: 18px;
}
.form-group:last-child {
	margin-bottom: 0;
}
.form-group label {
	display: block;
	margin-bottom: 6px;
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
	padding: 10px 12px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-bg-secondary);
	color: var(--color-text-primary);
	font-family: inherit;
	font-size: 1em;
}
.form-control:focus {
	outline: none;
	border-color: var(--color-primary);
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.required {
	color: #ef4444;
}

/* Responsive */
@media (max-width: 900px) {
	.haproxy-flow {
		flex-direction: column;
		align-items: stretch;
	}

	.flow-column {
		min-width: 100% !important;
		max-width: 100% !important;
	}

	.flow-arrow {
		transform: rotate(90deg);
		padding: 10px 0;
	}

	.flow-connections {
		display: none;
	}
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

// Draw connection lines between frontends and backends
function drawConnections() {
	const svg = document.getElementById('connection-lines');
	if (!svg) return;

	const flowContainer = document.querySelector('.haproxy-flow');
	if (!flowContainer) return;

	// Clear existing lines
	svg.innerHTML = `
		<defs>
			<marker id="arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
				<polygon points="0 0, 8 3, 0 6" fill="#22c55e"/>
			</marker>
			<marker id="arrow-warning" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
				<polygon points="0 0, 8 3, 0 6" fill="#f59e0b"/>
			</marker>
		</defs>
	`;

	const containerRect = flowContainer.getBoundingClientRect();
	svg.setAttribute('width', containerRect.width);
	svg.setAttribute('height', containerRect.height);

	const frontends = document.querySelectorAll('.flow-node-frontend');
	const backends = document.querySelectorAll('.flow-node-backend');

	frontends.forEach(frontend => {
		const targetBackend = frontend.dataset.backend;
		if (!targetBackend) return;

		// Find matching backend
		backends.forEach(backend => {
			if (backend.dataset.backend === targetBackend) {
				const frontendRect = frontend.getBoundingClientRect();
				const backendRect = backend.getBoundingClientRect();

				const x1 = frontendRect.right - containerRect.left;
				const y1 = frontendRect.top + frontendRect.height/2 - containerRect.top;
				const x2 = backendRect.left - containerRect.left;
				const y2 = backendRect.top + backendRect.height/2 - containerRect.top;

				// Create curved path
				const midX = (x1 + x2) / 2;
				const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
				path.setAttribute('class', 'connection-line');
				path.setAttribute('marker-end', 'url(#arrow-green)');
				svg.appendChild(path);
			}
		});
	});
}

// Draw connections on load and resize
window.addEventListener('load', drawConnections);
window.addEventListener('resize', drawConnections);

// Close modal on outside click
document.querySelectorAll('.modal').forEach(function(modal) {
	modal.addEventListener('click', function(e) {
		if (e.target === modal) {
			modal.style.display = 'none';
		}
	});
});

// Close modal on Escape
document.addEventListener('keydown', function(e) {
	if (e.key === 'Escape') {
		document.querySelectorAll('.modal').forEach(function(modal) {
			modal.style.display = 'none';
		});
	}
});

// Highlight connections on hover
document.querySelectorAll('.flow-node-frontend').forEach(function(node) {
	node.addEventListener('mouseenter', function() {
		const backendName = this.dataset.backend;
		if (backendName) {
			document.querySelectorAll('.flow-node-backend').forEach(function(backend) {
				if (backend.dataset.backend === backendName) {
					backend.style.borderColor = '#22c55e';
					backend.style.boxShadow = '0 0 20px #22c55e33';
				}
			});
		}
	});

	node.addEventListener('mouseleave', function() {
		document.querySelectorAll('.flow-node-backend').forEach(function(backend) {
			backend.style.borderColor = '';
			backend.style.boxShadow = '';
		});
	});
});
</script>
