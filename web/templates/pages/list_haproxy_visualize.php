<!-- Begin toolbar -->
<div class="toolbar">
	<div class="toolbar-inner">
		<div class="toolbar-buttons">
			<a href="/list/haproxy/" class="button button-secondary">
				<i class="fas fa-arrow-left"></i><?= _("Back to HAProxy") ?>
			</a>
		</div>
		<div class="toolbar-buttons">
			<button type="button" class="button button-secondary" onclick="toggleLabels()">
				<i class="fas fa-tags"></i><?= _("Toggle Labels") ?>
			</button>
			<button type="button" class="button button-secondary" onclick="resetZoom()">
				<i class="fas fa-compress"></i><?= _("Reset View") ?>
			</button>
		</div>
	</div>
</div>
<!-- End toolbar -->

<div class="container">

	<!-- Header -->
	<div class="server-summary">
		<div class="server-summary-icon">
			<i class="fas fa-diagram-project icon-purple"></i>
		</div>
		<div class="server-summary-content">
			<h1 class="server-summary-title"><?= _("HAProxy Traffic Flow") ?></h1>
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
					<span class="server-summary-list-label"><?= _("Connections") ?></span>
					<span class="server-summary-list-value"><?= array_sum(array_map('count', $connections)) ?></span>
				</li>
			</ul>
		</div>
	</div>

	<?php show_alert_message($_SESSION); ?>

	<!-- Legend -->
	<div class="viz-legend">
		<div class="legend-item">
			<span class="legend-color legend-frontend"></span>
			<span><?= _("Frontend") ?></span>
		</div>
		<div class="legend-item">
			<span class="legend-color legend-backend"></span>
			<span><?= _("Backend") ?></span>
		</div>
		<div class="legend-item">
			<span class="legend-color legend-server"></span>
			<span><?= _("Server") ?></span>
		</div>
		<div class="legend-item">
			<span class="legend-line legend-default"></span>
			<span><?= _("Default Route") ?></span>
		</div>
		<div class="legend-item">
			<span class="legend-line legend-conditional"></span>
			<span><?= _("Conditional Route") ?></span>
		</div>
	</div>

	<!-- Visualization Canvas -->
	<div class="viz-container" id="viz-container">
		<svg id="viz-svg" width="100%" height="600">
			<defs>
				<!-- Arrow markers -->
				<marker id="arrow-default" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
					<polygon points="0 0, 10 3.5, 0 7" fill="#22c55e"/>
				</marker>
				<marker id="arrow-conditional" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
					<polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b"/>
				</marker>
				<marker id="arrow-server" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
					<polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6"/>
				</marker>
				<!-- Glow filter -->
				<filter id="glow">
					<feGaussianBlur stdDeviation="2" result="coloredBlur"/>
					<feMerge>
						<feMergeNode in="coloredBlur"/>
						<feMergeNode in="SourceGraphic"/>
					</feMerge>
				</filter>
			</defs>

			<!-- Connection lines will be drawn here -->
			<g id="connections-layer"></g>

			<!-- Nodes will be drawn here -->
			<g id="nodes-layer"></g>
		</svg>
	</div>

	<!-- Connection Details Panel -->
	<div class="viz-details" id="viz-details" style="display:none;">
		<div class="viz-details-header">
			<h3><i class="fas fa-route"></i> <span id="detail-title">Connection Details</span></h3>
			<button type="button" class="btn-close" onclick="hideDetails()">&times;</button>
		</div>
		<div class="viz-details-body" id="detail-body">
		</div>
	</div>

</div>

<!-- Data for JavaScript -->
<script>
const haproxyData = {
	frontends: <?= json_encode($frontends) ?>,
	backends: <?= json_encode($backends) ?>,
	listens: <?= json_encode($listens) ?>,
	connections: <?= json_encode($connections) ?>
};
</script>

<style>
/* Legend */
.viz-legend {
	display: flex;
	flex-wrap: wrap;
	gap: 20px;
	justify-content: center;
	padding: 15px 20px;
	background: var(--color-bg-secondary);
	border-radius: 8px;
	margin: 20px 0;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 0.9em;
}

.legend-color {
	width: 16px;
	height: 16px;
	border-radius: 4px;
}

.legend-frontend {
	background: #3b82f6;
}

.legend-backend {
	background: #22c55e;
}

.legend-server {
	background: #8b5cf6;
}

.legend-line {
	width: 30px;
	height: 3px;
	border-radius: 2px;
}

.legend-default {
	background: #22c55e;
}

.legend-conditional {
	background: repeating-linear-gradient(
		90deg,
		#f59e0b,
		#f59e0b 5px,
		transparent 5px,
		transparent 10px
	);
}

/* Visualization Container */
.viz-container {
	background: var(--color-bg-secondary);
	border: 1px solid var(--color-border);
	border-radius: 12px;
	overflow: hidden;
	position: relative;
}

#viz-svg {
	display: block;
	min-height: 500px;
}

/* Nodes */
.viz-node {
	cursor: pointer;
	transition: transform 0.2s;
}

.viz-node:hover {
	filter: url(#glow);
}

.viz-node-frontend rect {
	fill: #3b82f6;
	rx: 8;
}

.viz-node-backend rect {
	fill: #22c55e;
	rx: 8;
}

.viz-node-server rect {
	fill: #8b5cf6;
	rx: 6;
}

.viz-node text {
	fill: white;
	font-size: 12px;
	font-weight: 600;
	text-anchor: middle;
	dominant-baseline: middle;
	pointer-events: none;
}

.viz-node .node-subtitle {
	font-size: 10px;
	font-weight: 400;
	fill: rgba(255,255,255,0.8);
}

/* Connection Lines */
.viz-connection {
	fill: none;
	stroke-width: 2;
	transition: stroke-width 0.2s, opacity 0.2s;
}

.viz-connection:hover {
	stroke-width: 4;
}

.viz-connection-default {
	stroke: #22c55e;
}

.viz-connection-conditional {
	stroke: #f59e0b;
	stroke-dasharray: 8,4;
}

.viz-connection-server {
	stroke: #8b5cf6;
	opacity: 0.6;
}

/* Connection Labels */
.viz-label {
	font-size: 10px;
	fill: var(--color-text-muted);
	pointer-events: none;
}

.viz-label-bg {
	fill: var(--color-bg-primary);
	rx: 3;
}

/* Details Panel */
.viz-details {
	position: fixed;
	bottom: 20px;
	right: 20px;
	width: 350px;
	max-width: 90vw;
	background: var(--color-bg-primary);
	border: 1px solid var(--color-border);
	border-radius: 12px;
	box-shadow: 0 10px 40px rgba(0,0,0,0.3);
	z-index: 100;
}

.viz-details-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px 20px;
	background: var(--color-bg-secondary);
	border-bottom: 1px solid var(--color-border);
	border-radius: 12px 12px 0 0;
}

.viz-details-header h3 {
	margin: 0;
	font-size: 1em;
	display: flex;
	align-items: center;
	gap: 8px;
}

.btn-close {
	background: none;
	border: none;
	font-size: 1.5em;
	cursor: pointer;
	color: var(--color-text-muted);
	line-height: 1;
}

.viz-details-body {
	padding: 15px 20px;
	max-height: 300px;
	overflow-y: auto;
}

.detail-item {
	display: flex;
	justify-content: space-between;
	padding: 8px 0;
	border-bottom: 1px solid var(--color-border);
}

.detail-item:last-child {
	border-bottom: none;
}

.detail-label {
	color: var(--color-text-muted);
	font-size: 0.9em;
}

.detail-value {
	font-family: monospace;
	font-size: 0.9em;
}

.detail-value code {
	background: var(--color-bg-secondary);
	padding: 2px 6px;
	border-radius: 4px;
}

.detail-section {
	margin-top: 15px;
	padding-top: 15px;
	border-top: 1px solid var(--color-border);
}

.detail-section h4 {
	margin: 0 0 10px 0;
	font-size: 0.85em;
	color: var(--color-text-muted);
	text-transform: uppercase;
}

.server-list {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.server-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 10px;
	background: var(--color-bg-secondary);
	border-radius: 6px;
	font-family: monospace;
	font-size: 0.85em;
}

.server-item i {
	color: #8b5cf6;
}

/* Responsive */
@media (max-width: 768px) {
	.viz-details {
		position: relative;
		bottom: auto;
		right: auto;
		width: 100%;
		margin-top: 20px;
	}
}
</style>

<script>
let showLabels = true;
let selectedNode = null;

// Initialize visualization
document.addEventListener('DOMContentLoaded', function() {
	drawVisualization();
});

function drawVisualization() {
	const svg = document.getElementById('viz-svg');
	const nodesLayer = document.getElementById('nodes-layer');
	const connectionsLayer = document.getElementById('connections-layer');

	// Clear previous
	nodesLayer.innerHTML = '';
	connectionsLayer.innerHTML = '';

	const frontends = haproxyData.frontends;
	const backends = haproxyData.backends;
	const connections = haproxyData.connections;

	const frontendNames = Object.keys(frontends);
	const backendNames = Object.keys(backends);

	// Calculate dimensions
	const svgRect = svg.getBoundingClientRect();
	const width = svgRect.width || 1200;
	const height = Math.max(600, Math.max(frontendNames.length, backendNames.length) * 120 + 100);

	svg.setAttribute('height', height);

	// Node dimensions
	const nodeWidth = 180;
	const nodeHeight = 60;
	const serverNodeWidth = 140;
	const serverNodeHeight = 30;

	// Column positions
	const frontendX = 100;
	const backendX = width / 2 - nodeWidth / 2;
	const serverX = width - 250;

	// Store node positions for connection drawing
	const nodePositions = {};

	// Draw Frontend nodes
	frontendNames.forEach((name, index) => {
		const frontend = frontends[name];
		const y = 80 + index * 100;
		const bindText = frontend.bind.length > 0 ? frontend.bind[0] : '';

		nodePositions['frontend_' + name] = {
			x: frontendX,
			y: y,
			width: nodeWidth,
			height: nodeHeight,
			centerX: frontendX + nodeWidth / 2,
			centerY: y + nodeHeight / 2,
			rightX: frontendX + nodeWidth,
			rightY: y + nodeHeight / 2
		};

		const node = createNode('frontend', name, bindText, frontendX, y, nodeWidth, nodeHeight);
		node.addEventListener('click', () => showNodeDetails('frontend', name, frontend));
		nodesLayer.appendChild(node);
	});

	// Draw Backend nodes
	backendNames.forEach((name, index) => {
		const backend = backends[name];
		const y = 80 + index * 100;
		const serverCount = backend.servers ? backend.servers.length : 0;

		nodePositions['backend_' + name] = {
			x: backendX,
			y: y,
			width: nodeWidth,
			height: nodeHeight,
			centerX: backendX + nodeWidth / 2,
			centerY: y + nodeHeight / 2,
			leftX: backendX,
			leftY: y + nodeHeight / 2,
			rightX: backendX + nodeWidth,
			rightY: y + nodeHeight / 2
		};

		const node = createNode('backend', name, serverCount + ' server(s)', backendX, y, nodeWidth, nodeHeight);
		node.addEventListener('click', () => showNodeDetails('backend', name, backend));
		nodesLayer.appendChild(node);

		// Draw server nodes for this backend
		if (backend.servers && backend.servers.length > 0) {
			backend.servers.forEach((server, sIndex) => {
				const serverY = y - ((backend.servers.length - 1) * 20) + sIndex * 40;

				nodePositions['server_' + name + '_' + server.name] = {
					x: serverX,
					y: serverY,
					width: serverNodeWidth,
					height: serverNodeHeight,
					leftX: serverX,
					leftY: serverY + serverNodeHeight / 2
				};

				const serverNode = createNode('server', server.name, server.address, serverX, serverY, serverNodeWidth, serverNodeHeight);
				nodesLayer.appendChild(serverNode);

				// Draw connection from backend to server
				const conn = createConnection(
					backendX + nodeWidth, y + nodeHeight / 2,
					serverX, serverY + serverNodeHeight / 2,
					'server'
				);
				connectionsLayer.appendChild(conn);
			});
		}
	});

	// Draw connections between frontends and backends
	Object.keys(connections).forEach(frontendName => {
		const frontendConns = connections[frontendName];
		const frontendPos = nodePositions['frontend_' + frontendName];

		if (!frontendPos) return;

		frontendConns.forEach((conn, index) => {
			const backendPos = nodePositions['backend_' + conn.backend];
			if (!backendPos) return;

			const offset = (index - (frontendConns.length - 1) / 2) * 5;

			const line = createConnection(
				frontendPos.rightX, frontendPos.rightY + offset,
				backendPos.leftX, backendPos.leftY + offset,
				conn.type,
				conn.condition
			);

			line.addEventListener('click', () => showConnectionDetails(frontendName, conn));
			connectionsLayer.appendChild(line);
		});
	});
}

function createNode(type, name, subtitle, x, y, width, height) {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	g.setAttribute('class', 'viz-node viz-node-' + type);
	g.setAttribute('transform', `translate(${x}, ${y})`);

	const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	rect.setAttribute('width', width);
	rect.setAttribute('height', height);
	rect.setAttribute('rx', type === 'server' ? 6 : 8);
	g.appendChild(rect);

	const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	text.setAttribute('x', width / 2);
	text.setAttribute('y', height / 2 - (subtitle ? 6 : 0));
	text.textContent = name.length > 18 ? name.substring(0, 16) + '...' : name;
	g.appendChild(text);

	if (subtitle && type !== 'server') {
		const subtext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		subtext.setAttribute('class', 'node-subtitle');
		subtext.setAttribute('x', width / 2);
		subtext.setAttribute('y', height / 2 + 12);
		subtext.textContent = subtitle.length > 22 ? subtitle.substring(0, 20) + '...' : subtitle;
		g.appendChild(subtext);
	}

	return g;
}

function createConnection(x1, y1, x2, y2, type, label) {
	const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

	// Calculate control points for bezier curve
	const dx = x2 - x1;
	const cx1 = x1 + dx * 0.4;
	const cx2 = x1 + dx * 0.6;

	const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	path.setAttribute('d', `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`);
	path.setAttribute('class', 'viz-connection viz-connection-' + type);

	if (type === 'default') {
		path.setAttribute('marker-end', 'url(#arrow-default)');
	} else if (type === 'conditional') {
		path.setAttribute('marker-end', 'url(#arrow-conditional)');
	} else {
		path.setAttribute('marker-end', 'url(#arrow-server)');
	}

	g.appendChild(path);

	// Add label if exists and showLabels is true
	if (label && showLabels) {
		const midX = (x1 + x2) / 2;
		const midY = (y1 + y2) / 2;

		// Background for label
		const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		labelBg.setAttribute('class', 'viz-label-bg');
		labelBg.setAttribute('x', midX - 40);
		labelBg.setAttribute('y', midY - 10);
		labelBg.setAttribute('width', 80);
		labelBg.setAttribute('height', 16);
		g.appendChild(labelBg);

		const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		labelText.setAttribute('class', 'viz-label');
		labelText.setAttribute('x', midX);
		labelText.setAttribute('y', midY + 2);
		labelText.setAttribute('text-anchor', 'middle');
		labelText.textContent = label.length > 15 ? label.substring(0, 13) + '...' : label;
		g.appendChild(labelText);
	}

	return g;
}

function showNodeDetails(type, name, data) {
	const panel = document.getElementById('viz-details');
	const title = document.getElementById('detail-title');
	const body = document.getElementById('detail-body');

	title.textContent = (type === 'frontend' ? 'Frontend: ' : 'Backend: ') + name;

	let html = '';

	if (type === 'frontend') {
		if (data.bind && data.bind.length > 0) {
			html += `<div class="detail-item"><span class="detail-label"><?= _("Bind") ?></span><span class="detail-value"><code>${data.bind.join(', ')}</code></span></div>`;
		}
		if (data.mode) {
			html += `<div class="detail-item"><span class="detail-label"><?= _("Mode") ?></span><span class="detail-value"><code>${data.mode}</code></span></div>`;
		}
		if (data.default_backend) {
			html += `<div class="detail-item"><span class="detail-label"><?= _("Default Backend") ?></span><span class="detail-value"><code>${data.default_backend}</code></span></div>`;
		}
		if (data.use_backends && data.use_backends.length > 0) {
			html += `<div class="detail-section"><h4><?= _("Conditional Routes") ?></h4>`;
			data.use_backends.forEach(ub => {
				html += `<div class="detail-item"><span class="detail-value"><code>${ub.backend}</code> ${ub.condition}</span></div>`;
			});
			html += '</div>';
		}
	} else {
		if (data.mode) {
			html += `<div class="detail-item"><span class="detail-label"><?= _("Mode") ?></span><span class="detail-value"><code>${data.mode}</code></span></div>`;
		}
		if (data.balance) {
			html += `<div class="detail-item"><span class="detail-label"><?= _("Balance") ?></span><span class="detail-value"><code>${data.balance}</code></span></div>`;
		}
		if (data.servers && data.servers.length > 0) {
			html += `<div class="detail-section"><h4><?= _("Servers") ?> (${data.servers.length})</h4><div class="server-list">`;
			data.servers.forEach(server => {
				html += `<div class="server-item"><i class="fas fa-server"></i> <strong>${server.name}</strong>: ${server.address}</div>`;
			});
			html += '</div></div>';
		}
	}

	body.innerHTML = html;
	panel.style.display = 'block';
}

function showConnectionDetails(frontendName, conn) {
	const panel = document.getElementById('viz-details');
	const title = document.getElementById('detail-title');
	const body = document.getElementById('detail-body');

	title.textContent = 'Route: ' + frontendName + ' → ' + conn.backend;

	let html = `
		<div class="detail-item">
			<span class="detail-label"><?= _("Type") ?></span>
			<span class="detail-value"><code>${conn.type === 'default' ? '<?= _("Default") ?>' : '<?= _("Conditional") ?>'}</code></span>
		</div>
		<div class="detail-item">
			<span class="detail-label"><?= _("From") ?></span>
			<span class="detail-value"><code>${frontendName}</code></span>
		</div>
		<div class="detail-item">
			<span class="detail-label"><?= _("To") ?></span>
			<span class="detail-value"><code>${conn.backend}</code></span>
		</div>
	`;

	if (conn.condition) {
		html += `
			<div class="detail-item">
				<span class="detail-label"><?= _("Condition") ?></span>
				<span class="detail-value"><code>${conn.condition}</code></span>
			</div>
		`;
	}

	body.innerHTML = html;
	panel.style.display = 'block';
}

function hideDetails() {
	document.getElementById('viz-details').style.display = 'none';
}

function toggleLabels() {
	showLabels = !showLabels;
	drawVisualization();
}

function resetZoom() {
	drawVisualization();
}

// Redraw on window resize
let resizeTimeout;
window.addEventListener('resize', function() {
	clearTimeout(resizeTimeout);
	resizeTimeout = setTimeout(drawVisualization, 200);
});
</script>
