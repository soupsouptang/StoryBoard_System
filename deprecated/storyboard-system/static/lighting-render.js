/**
 * FrameForge Lighting Renderer V2.1
 *
 * Projections:
 *   2D:   top-down orthographic (x, y)
 *   2.5D: dimetric orthographic - theta=45deg, phi=50deg
 *   3D:   simple perspective (for preview / orientation, not photometric)
 *
 * Coordinate system: x=right, y=depth, z=height (all in cm)
 */
(function(root) {
'use strict';

// --- Projection constants ---
var COS45 = Math.cos(Math.PI / 4);
var COS50 = Math.cos(50 * Math.PI / 180);
var SIN50 = Math.sin(50 * Math.PI / 180);

// --- Light subtype color palette ---
var LIGHT_COLORS = {
  cob:       { body: '#e8a33d', glow: 'rgba(232,163,61,0.9)' },
  fresnel:   { body: '#f0b354', glow: 'rgba(240,179,84,0.9)' },
  par:       { body: '#d4c455', glow: 'rgba(212,196,85,0.9)' },
  led_panel: { body: '#7ec8e3', glow: 'rgba(126,200,227,0.9)' },
  hmi:       { body: '#b8d4f8', glow: 'rgba(184,212,248,0.9)' },
  tungsten:  { body: '#e8a33d', glow: 'rgba(255,160,60,0.9)' },
  practical: { body: '#f5d78e', glow: 'rgba(245,215,142,0.9)' },
};

// =====================================================================
//  Projection functions
// =====================================================================

function project25d(x, y, z, zoom) {
  zoom = zoom || 1;
  return [
    (x - y) * COS45 * zoom,
    ((x + y) * COS45 * COS50 - z * SIN50) * zoom,
  ];
}

function project2d(x, y, _z, zoom) {
  zoom = zoom || 1;
  return [x * zoom, y * zoom];
}

function unproject2d(sx, sy, zoom) {
  zoom = zoom || 1;
  return [sx / zoom, sy / zoom];
}

/**
 * 2.5D delta unproject: screen delta -> world delta (for drag).
 */
function unproject25dDelta(dxScreen, dyScreen, zoom) {
  zoom = zoom || 1;
  var a = dxScreen / (COS45 * zoom);
  var b = dyScreen / (COS45 * COS50 * zoom);
  return [(a + b) / 2, (b - a) / 2];
}

/**
 * Simple perspective projection for 3D preview.
 * Camera above-behind at ~45deg elevation, distance varies with zoom.
 */
function project3d(x, y, z, zoom, roomW, roomD) {
  zoom = zoom || 1;
  roomW = roomW || 1600; roomD = roomD || 1000;
  var fov = 60 * Math.PI / 180;
  var camDist = Math.max(roomW, roomD) * 1.2 / zoom;
  var camH = camDist * 0.7;
  var camX = roomW / 2, camY = -roomD * 0.3, camZ = camH;
  // Translate relative to camera
  var dx = x - camX, dy = y - camY, dz = z - camZ;
  // Rotate: looking toward +Y with -30deg pitch
  var pitch = -30 * Math.PI / 180;
  var ry = dy * Math.cos(pitch) - dz * Math.sin(pitch);
  var rz = dy * Math.sin(pitch) + dz * Math.cos(pitch);
  // Perspective divide
  if (ry < 10) ry = 10;
  var scale = (fov / (2 * Math.tan(fov / 2))) * camDist / ry;
  return [dx * scale * zoom, -rz * scale * zoom];
}

// =====================================================================
//  Object visual height (for 2.5D pole rendering)
// =====================================================================

function getObjectHeight(obj) {
  var map = {
    actor: (obj.properties && obj.properties.height) ? obj.properties.height : 170,
    camera: 130, light: 30, modifier: 20,
    furniture: 80, architecture: 280, grip: 200, practical: 100,
  };
  return map[obj.type] || 50;
}

// =====================================================================
//  Screen bounds
// =====================================================================

function objectScreenBounds(obj, mode, zoom) {
  var x = obj.transform.position.x, y = obj.transform.position.y, z = obj.transform.position.z;
  var w = obj.transform.scale.x, h = obj.transform.scale.y;
  var proj = mode === '2d' ? project2d : mode === '3d' ? function(px, py, pz, pzoom) { return project3d(px, py, pz, pzoom, 1600, 1000); } : project25d;
  var oh = getObjectHeight(obj);
  var corners = [
    proj(x, y, z, zoom), proj(x + w, y, z, zoom),
    proj(x, y + h, z, zoom), proj(x + w, y + h, z, zoom),
    proj(x + w / 2, y + h / 2, z + oh, zoom),
  ];
  var xs = corners.map(function(c) { return c[0]; });
  var ys = corners.map(function(c) { return c[1]; });
  return {
    left:   Math.min.apply(null, xs),
    top:    Math.min.apply(null, ys),
    width:  Math.max.apply(null, xs) - Math.min.apply(null, xs),
    height: Math.max.apply(null, ys) - Math.min.apply(null, ys),
  };
}

// =====================================================================
//  Ground + Grid
// =====================================================================

function renderGround(ctx, scene, view, canvasW, canvasH) {
  var env = scene.environment || {};
  var roomWidth = env.roomWidth || 1600, roomDepth = env.roomDepth || 1000;
  var zoom = view.zoom || 1, mode = view.mode || '2d';
  var proj = mode === '2d' ? project2d : mode === '3d' ? function(x, y, z) { return project3d(x, y, z, zoom, roomWidth, roomDepth); } : project25d;

  ctx.fillStyle = '#0e1014';
  ctx.fillRect(0, 0, canvasW, canvasH);

  var corners = [
    proj(0, 0, 0, zoom), proj(roomWidth, 0, 0, zoom),
    proj(roomWidth, roomDepth, 0, zoom), proj(0, roomDepth, 0, zoom),
  ];
  ctx.beginPath();
  ctx.moveTo(corners[0][0], corners[0][1]);
  for (var i = 1; i < corners.length; i++) ctx.lineTo(corners[i][0], corners[i][1]);
  ctx.closePath();
  ctx.fillStyle = '#16191e';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Grid lines
  var gridSize = (scene.settings && scene.settings.gridSize) || 100;
  var minor = zoom > 0.5 ? 50 : 100;
  for (var gx = 0; gx <= roomWidth; gx += minor) {
    var isMaj = gx % gridSize === 0;
    ctx.strokeStyle = isMaj ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth   = isMaj ? 1.2 : 0.6;
    var a = proj(gx, 0, 0, zoom), b = proj(gx, roomDepth, 0, zoom);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
  for (var gy = 0; gy <= roomDepth; gy += minor) {
    var isMajY = gy % gridSize === 0;
    ctx.strokeStyle = isMajY ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth   = isMajY ? 1.2 : 0.6;
    var c = proj(0, gy, 0, zoom), d = proj(roomWidth, gy, 0, zoom);
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
  }

  // Axis labels (2D only, every gridSize cm)
  if (mode === '2d' && zoom >= 0.35) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = Math.max(9, 10 * zoom) + 'px sans-serif';
    ctx.textAlign = 'center';
    for (var lx = 0; lx <= roomWidth; lx += gridSize) {
      var lp = proj(lx, 0, 0, zoom);
      ctx.fillText(lx + '', lp[0], lp[1] - 4);
    }
    ctx.textAlign = 'right';
    for (var ly = 0; ly <= roomDepth; ly += gridSize) {
      var lq = proj(0, ly, 0, zoom);
      ctx.fillText(ly + '', lq[0] - 4, lq[1] + 3);
    }
  }
}

// =====================================================================
//  Individual object renderers
// =====================================================================

function renderLight(ctx, obj, proj, zoom, mode, accent, fill, selected) {
  var p = obj.properties || {};
  var sub = obj.subtype || 'cob';
  var lc = LIGHT_COLORS[sub] || LIGHT_COLORS.cob;
  var bodyColor = selected ? '#e8a33d' : lc.body;
  var r = 14 * zoom;

  // Vertical pole in 2.5D/3D
  if (mode !== '2d') {
    var poleH = getObjectHeight(obj) * zoom * 0.55;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -poleH);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Fixture head at top of pole
    ctx.beginPath();
    ctx.arc(0, -poleH, r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Glow dot
    ctx.beginPath();
    ctx.arc(0, -poleH, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = lc.glow;
    ctx.fill();
  } else {
    // 2D: footprint circle
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner glow
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = lc.glow;
    ctx.fill();
  }

  // Beam cone (2D only - projected to floor)
  if (mode === '2d' && p.showCoverage !== false && p.beamSpread != null) {
    var spread = p.beamSpread * Math.PI / 180;
    var len = (p.beamLength || 300) * zoom * 0.45;
    var aim = ((p.aimPan || 0) - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, aim - spread / 2, aim + spread / 2);
    ctx.closePath();
    ctx.fillStyle = selected ? 'rgba(232,163,61,0.12)' : 'rgba(232,163,61,0.07)';
    ctx.fill();
    ctx.strokeStyle = selected ? 'rgba(232,163,61,0.5)' : 'rgba(232,163,61,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Aim direction arrow
  var aimRad = ((p.aimPan || 0) - 90) * Math.PI / 180;
  var dLen = 18 * zoom;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(aimRad) * dLen, Math.sin(aimRad) * dLen);
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Arrowhead
  var ah = 5 * zoom;
  ctx.beginPath();
  ctx.moveTo(Math.cos(aimRad) * dLen, Math.sin(aimRad) * dLen);
  ctx.lineTo(Math.cos(aimRad - 0.4) * (dLen - ah), Math.sin(aimRad - 0.4) * (dLen - ah));
  ctx.lineTo(Math.cos(aimRad + 0.4) * (dLen - ah), Math.sin(aimRad + 0.4) * (dLen - ah));
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
}

function renderModifier(ctx, obj, proj, zoom, mode, accent, fill) {
  var sub = obj.subtype || 'softbox_rect';
  var w = obj.transform.scale.x * zoom * 0.5;
  var h = obj.transform.scale.y * zoom * 0.5;

  if (sub === 'softbox_oct') {
    // Octagon
    var pts = [];
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 - Math.PI / 8;
      pts.push([Math.cos(a) * w * 0.6, Math.sin(a) * h * 0.6]);
    }
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var j = 1; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Cross diffusion pattern
    ctx.beginPath();
    ctx.moveTo(-w * 0.5, 0); ctx.lineTo(w * 0.5, 0);
    ctx.moveTo(0, -h * 0.5); ctx.lineTo(0, h * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (sub === 'reflector') {
    // Curved reflector shape
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.6, h * 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,200,200,0.15)';
    ctx.fill();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (sub === 'negative_fill') {
    // Black flag - filled rectangle
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  } else {
    // Rect softbox / diffusion / barndoors / grid
    ctx.fillStyle = fill;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    // Diagonal diffusion lines
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2);
    ctx.moveTo(w / 2, -h / 2); ctx.lineTo(-w / 2, h / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (sub === 'grid') {
      // Grid lines
      for (var gi = 1; gi < 4; gi++) {
        var gix = -w / 2 + gi * w / 4;
        ctx.beginPath(); ctx.moveTo(gix, -h / 2); ctx.lineTo(gix, h / 2); ctx.stroke();
      }
    }
  }
}

function renderCamera(ctx, obj, proj, zoom, mode, accent, fill) {
  var p = obj.properties || {};
  var w = 28 * zoom, h = 18 * zoom;
  // Camera body
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 2 * zoom);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Lens circle
  ctx.beginPath();
  ctx.arc(0, 0, 6 * zoom, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(100,149,237,0.3)';
  ctx.fill();
  ctx.strokeStyle = '#6495ed';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Eyepiece
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(w / 2 - 5 * zoom, -h / 4, 5 * zoom, h / 2);
  // FOV cone
  var rot = (obj.transform.rotation.z - 90) * Math.PI / 180;
  var fov = ((p.focalLength ? 2 * Math.atan(18 / p.focalLength) : 0.87) * 180 / Math.PI) * Math.PI / 180;
  var fovLen = 70 * zoom;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, fovLen, rot - fov / 2, rot + fov / 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(100,149,237,0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,149,237,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  // Lens direction
  var lLen = 22 * zoom;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(rot) * lLen, Math.sin(rot) * lLen);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function renderActor(ctx, obj, proj, zoom, mode, accent, fill) {
  var p = obj.properties || {};
  var r = 11 * zoom;
  // Body circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Head indicator
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  // Facing arrow
  var facing = (p.facing || 0) * Math.PI / 180;
  var aLen = 18 * zoom;
  ctx.beginPath();
  ctx.moveTo(Math.cos(facing) * r, Math.sin(facing) * r);
  ctx.lineTo(Math.cos(facing) * aLen, Math.sin(facing) * aLen);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Arrowhead
  var ah = 5 * zoom;
  var tip = [Math.cos(facing) * aLen, Math.sin(facing) * aLen];
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(Math.cos(facing - 0.4) * (aLen - ah) + Math.cos(facing - Math.PI / 2) * 0, Math.sin(facing - 0.4) * (aLen - ah));
  ctx.lineTo(Math.cos(facing + 0.5) * (aLen - ah), Math.sin(facing + 0.5) * (aLen - ah));
  ctx.closePath();
  ctx.fillStyle = accent;
  ctx.fill();
  // Height pole in 2.5D
  if (mode !== '2d') {
    var hPole = (p.height || 170) * zoom * 0.45;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -hPole);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -hPole, 3 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
  }
}

function renderGrip(ctx, obj, proj, zoom, mode, accent, fill) {
  var sub = obj.subtype || 'tripod';
  if (sub === 'tripod') {
    var legR = 14 * zoom;
    for (var li = 0; li < 3; li++) {
      var la = (li / 3) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(la) * legR, Math.sin(la) * legR);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 4 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (sub === 'c_stand') {
    var sw = 8 * zoom, sh = 16 * zoom;
    ctx.fillStyle = fill;
    ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-sw / 2, -sh / 2, sw, sh);
    // Arm
    ctx.beginPath();
    ctx.moveTo(0, -sh / 2);
    ctx.lineTo(18 * zoom, -sh / 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    renderGeneric(ctx, obj, proj, zoom, mode, accent, fill);
  }
}

function renderFurniture(ctx, obj, proj, zoom, mode, accent, fill) {
  var sub = obj.subtype || 'table';
  var w = obj.transform.scale.x * zoom, h = obj.transform.scale.y * zoom;
  ctx.fillStyle = fill;
  if (sub === 'round_table') {
    var rr = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (sub === 'chair') {
    // Chair seat + back
    ctx.fillRect(-w / 2, -h / 4, w, h * 0.6);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 4, w, h * 0.6);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -h / 2);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    // Table legs (dots at corners)
    if (sub === 'table' || sub === 'conference_table') {
      var lr = 3 * zoom;
      [[- w / 2 + lr, -h / 2 + lr], [w / 2 - lr, -h / 2 + lr],
       [-w / 2 + lr, h / 2 - lr],  [w / 2 - lr, h / 2 - lr]].forEach(function(pt) {
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], lr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();
      });
    }
  }
}

function renderArchitecture(ctx, obj, proj, zoom, mode, accent, fill) {
  var sub = obj.subtype || 'wall';
  var w = obj.transform.scale.x * zoom, h = obj.transform.scale.y * zoom;
  var lw = sub === 'wall' ? 3 : 1.5;
  ctx.strokeStyle = accent;
  ctx.lineWidth = lw;
  ctx.fillStyle = sub === 'wall' ? 'rgba(150,150,160,0.2)' : 'transparent';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  if (sub === 'window') {
    ctx.beginPath();
    ctx.moveTo(0, -h / 2); ctx.lineTo(0, h / 2);
    ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
    ctx.strokeStyle = 'rgba(100,149,237,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (sub === 'door') {
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.arc(-w / 2, h / 2, h, -Math.PI / 2, 0);
    ctx.strokeStyle = 'rgba(200,180,130,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (sub === 'column') {
    var cr = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, cr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,150,160,0.3)';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // 2.5D wall height hint
  if (mode !== '2d' && sub === 'wall') {
    var wallH = 280 * zoom * 0.35;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(-w / 2, -h / 2 - wallH);
    ctx.moveTo(w / 2,  -h / 2); ctx.lineTo(w / 2,  -h / 2 - wallH);
    ctx.moveTo(-w / 2, -h / 2 - wallH); ctx.lineTo(w / 2, -h / 2 - wallH);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function renderAnnotation(ctx, obj, proj, zoom, mode, accent, fill) {
  var sub = obj.subtype || 'arrow';
  var w = obj.transform.scale.x * zoom;
  if (sub === 'arrow') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
    ctx.stroke();
    var ah = 7 * zoom;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2 - ah, -ah / 2);
    ctx.lineTo(w / 2 - ah, ah / 2);
    ctx.closePath();
    ctx.fillStyle = accent;
    ctx.fill();
  } else if (sub === 'distance') {
    ctx.strokeStyle = 'rgba(255,200,80,0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // End ticks
    ctx.beginPath();
    ctx.moveTo(-w / 2, -4 * zoom); ctx.lineTo(-w / 2, 4 * zoom);
    ctx.moveTo(w / 2,  -4 * zoom); ctx.lineTo(w / 2,  4 * zoom);
    ctx.strokeStyle = 'rgba(255,200,80,0.8)';
    ctx.stroke();
  } else {
    renderGeneric(ctx, obj, proj, zoom, mode, accent, fill);
  }
}

function renderGeneric(ctx, obj, proj, zoom, mode, accent, fill) {
  var w = obj.transform.scale.x * zoom, h = obj.transform.scale.y * zoom;
  ctx.fillStyle = fill;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
}

// =====================================================================
//  Main object renderer
// =====================================================================

function renderObject(ctx, obj, view, selected) {
  if (!obj.visible) return;
  var zoom = view.zoom || 1, mode = view.mode || '2d';
  var proj = mode === '2d' ? project2d : mode === '3d' ? project3d : project25d;
  var x = obj.transform.position.x, y = obj.transform.position.y, z = obj.transform.position.z;
  var w = obj.transform.scale.x, h = obj.transform.scale.y;

  ctx.save();
  var cx, cy;
  if (mode === '3d') {
    var roomW = view.roomWidth || 1600, roomD = view.roomDepth || 1000;
    var pt = project3d(x + w / 2, y + h / 2, z, zoom, roomW, roomD);
    cx = pt[0]; cy = pt[1];
  } else {
    var pt25 = proj(x + w / 2, y + h / 2, z, zoom);
    cx = pt25[0]; cy = pt25[1];
  }
  ctx.translate(cx, cy);
  if (mode === '2d') ctx.rotate(obj.transform.rotation.z * Math.PI / 180);

  var accent = selected ? '#f5a623' : '#c8c8c8';
  var fill   = selected ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.07)';

  switch (obj.type) {
    case 'light':        renderLight(ctx, obj, proj, zoom, mode, accent, fill, selected); break;
    case 'modifier':     renderModifier(ctx, obj, proj, zoom, mode, accent, fill); break;
    case 'camera':       renderCamera(ctx, obj, proj, zoom, mode, accent, fill); break;
    case 'actor':        renderActor(ctx, obj, proj, zoom, mode, accent, fill); break;
    case 'grip':         renderGrip(ctx, obj, proj, zoom, mode, accent, fill); break;
    case 'furniture':    renderFurniture(ctx, obj, proj, zoom, mode, accent, fill); break;
    case 'architecture': renderArchitecture(ctx, obj, proj, zoom, mode, accent, fill); break;
    case 'annotation':   renderAnnotation(ctx, obj, proj, zoom, mode, accent, fill); break;
    default:             renderGeneric(ctx, obj, proj, zoom, mode, accent, fill); break;
  }

  // Selection dashed outline (only in 2D where bounds are reliable)
  if (selected && mode === '2d') {
    var sw2 = w * zoom, sh2 = h * zoom;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-sw2 / 2 - 3, -sh2 / 2 - 3, sw2 + 6, sh2 + 6);
    ctx.setLineDash([]);
    // Corner handles
    var hs = 5 * zoom;
    [[-sw2 / 2 - 3, -sh2 / 2 - 3], [sw2 / 2 + 3, -sh2 / 2 - 3],
     [-sw2 / 2 - 3, sh2 / 2 + 3],  [sw2 / 2 + 3, sh2 / 2 + 3]].forEach(function(pt2) {
      ctx.fillStyle = accent;
      ctx.fillRect(pt2[0] - hs / 2, pt2[1] - hs / 2, hs, hs);
    });
  }

  // Label
  if (obj.label) {
    var labelY = mode === '2d' ? h / 2 * zoom + 13 : 22;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = Math.max(9, 10 * zoom) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(obj.label, 0, labelY);
  }

  ctx.restore();
}

// =====================================================================
//  Full frame render
// =====================================================================

function renderFrame(ctx, scene, view, canvasW, canvasH, selectedId) {
  selectedId = selectedId || null;
  var zoom = view.zoom || 1;
  var mode = view.mode || '2d';
  var env = scene.environment || {};
  var roomWidth = env.roomWidth || 1600, roomDepth = env.roomDepth || 1000;

  var proj = mode === '2d' ? project2d : mode === '3d' ? function(x, y, z) { return project3d(x, y, z, zoom, roomWidth, roomDepth); } : project25d;
  var center = proj(roomWidth / 2, roomDepth / 2, 0, zoom);
  var ox = canvasW / 2 - center[0], oy = canvasH / 2 - center[1];

  // For 3D mode the origin is already centered by perspective math
  if (mode === '3d') { ox = canvasW / 2; oy = canvasH / 2; }

  ctx.save();
  ctx.translate(ox, oy);

  var viewWithRoom = Object.assign({}, view, { roomWidth: roomWidth, roomDepth: roomDepth });
  renderGround(ctx, scene, viewWithRoom, canvasW, canvasH);

  // Sort: lower z first (painter's algorithm)
  var sorted = (scene.objects || []).slice().sort(function(a, b) {
    return a.transform.position.z - b.transform.position.z;
  });
  for (var i = 0; i < sorted.length; i++) {
    renderObject(ctx, sorted[i], viewWithRoom, sorted[i].id === selectedId);
  }
  ctx.restore();
}

// =====================================================================
//  FrameForge WebGL Unified Lighting Runtime (Three.js Engine)
// =====================================================================

function cctToThreeColor(temp) {
  temp = Math.max(1800, Math.min(10000, Number(temp) || 5600));
  var t = temp / 100;
  var r, g, b;
  if (t <= 66) {
    r = 255;
    g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(t) - 161.1195681661));
    b = t <= 19 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(t - 10) - 305.0447927307));
  } else {
    r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(t - 60, -0.1332047592)));
    g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(t - 60, -0.0755148492)));
    b = 255;
  }
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function LightingWebGLRuntime(container, options) {
  options = options || {};
  this.container = container;
  this.options = options;
  this.mode = options.mode || '3d';
  this.zoom = options.zoom || 1;
  this.selectedId = options.selectedId || null;
  this.tool = options.tool || 'select';
  this.roomWidth = options.roomWidth || 1600;
  this.roomDepth = options.roomDepth || 1000;
  this.coverage = options.coverage !== false;

  this.gltfCache = new Map();
  this.loadingPromises = new Map();
  this.equipmentMap = new Map();

  this.stats = {
    activeMode: this.mode,
    loadedGlbs: 0,
    totalMeshes: 0,
    activeEquipment: 0,
    lodSwitches: 0,
    lastError: null
  };

  this.initDOM();
  this.initThree();
  this.initEvents();

  if (typeof window !== 'undefined') {
    window.__FF_GLB_RUNTIME__ = this;
  }
}

LightingWebGLRuntime.prototype.initDOM = function() {
  var self = this;
  var container = this.container;

  // 关键：只复用本运行时自己创建的 WebGL 画布。
  // 普通.ff-boards-25d-canvas 已被 2D 渲染器取过 context（canvas 一生只能有一种 context 类型），
  // 复用它会导致 WebGLRenderer 抛 "Canvas has an existing context of a different type"。
  var canvas = container.tagName === 'CANVAS' && container.classList.contains('ff-lighting-webgl-canvas')
    ? container
    : container.querySelector('canvas.ff-lighting-webgl-canvas');

  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'ff-boards-25d-canvas ff-lighting-webgl-canvas';
    Object.assign(canvas.style, {
      position: 'absolute', left: '0', top: '0', width: '100%', height: '100%',
      zIndex: '0', display: 'block', outline: 'none'
    });
    container.prepend(canvas);
  }
  this.canvas = canvas;

  // Split view center divider line
  var divider = container.querySelector('.ff-split-divider');
  if (!divider) {
    divider = document.createElement('div');
    divider.className = 'ff-split-divider';
    Object.assign(divider.style, {
      position: 'absolute', left: '50%', top: '0', width: '1px', height: '100%',
      background: 'rgba(255,255,255,0.18)', zIndex: '2', pointerEvents: 'none',
      display: 'none', transform: 'translateX(-50%)'
    });
    container.appendChild(divider);
  }
  this.divider = divider;

  // Debug HUD overlay
  var hud = container.querySelector('.ff-glb-debug-hud');
  if (!hud) {
    hud = document.createElement('div');
    hud.className = 'ff-glb-debug-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML = [
      '<div class="hud-title">FRAMEFORGE GLB RUNTIME HUD</div>',
      '<div class="hud-row"><span>Mode:</span> <b class="hud-mode">' + self.mode.toUpperCase() + '</b> | <span>Engine:</span> <b>Three.js WebGL</b></div>',
      '<div class="hud-row"><span>Fixtures:</span> <b class="hud-fixtures">0</b> | <span>Loaded GLBs:</span> <b class="hud-glbs">0</b></div>',
      '<div class="hud-row"><span>Meshes:</span> <b class="hud-meshes">0</b></div>',
      '<div class="hud-row"><span>Selected:</span> <b class="hud-selected">—</b></div>'
    ].join('');
    container.appendChild(hud);
  }
  this.hud = hud;
};

LightingWebGLRuntime.prototype.initThree = function() {
  var THREE = globalThis.THREE;
  if (!THREE || !THREE.WebGLRenderer) {
    console.warn('[FrameForgeLightingRender] Three.js not found');
    return;
  }

  try {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    // WebGL 不可用时不得让异常穿透构造函数——调用方需要回退到 2D Canvas 渲染
    this.renderer = null;
    this.stats.lastError = 'WebGL context unavailable: ' + (err && err.message || err);
    console.warn('[FrameForgeLightingRender]', this.stats.lastError);
    return false;
  }
  this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  this.renderer.shadowMap.enabled = true;
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure = 1.1;

  this.scene = new THREE.Scene();
  this.scene.background = new THREE.Color(0x0e1014);

  // Lights
  this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  this.scene.add(this.ambientLight);

  this.mainLight = new THREE.DirectionalLight(0xfffaed, 1.35);
  this.mainLight.position.set(700, 1300, 700);
  this.mainLight.castShadow = true;
  this.scene.add(this.mainLight);

  this.rimLight = new THREE.DirectionalLight(0x94bce6, 0.65);
  this.rimLight.position.set(-700, 900, -700);
  this.scene.add(this.rimLight);

  this.hemiLight = new THREE.HemisphereLight(0x222730, 0x101318, 0.6);
  this.scene.add(this.hemiLight);

  // Ground & Floor Grid
  this.setupGround();

  // Cameras
  this.setupCameras();
};

LightingWebGLRuntime.prototype.setupGround = function() {
  var THREE = globalThis.THREE;
  if (!THREE) return;

  var rw = this.roomWidth, rd = this.roomDepth;

  // Floor plate
  var floorGeo = new THREE.PlaneGeometry(rw * 1.6, rd * 1.6);
  floorGeo.rotateX(-Math.PI / 2);
  var floorMat = new THREE.MeshStandardMaterial({
    color: 0x14171e,
    roughness: 0.85,
    metalness: 0.1
  });
  this.floorMesh = new THREE.Mesh(floorGeo, floorMat);
  this.floorMesh.position.y = -0.1;
  this.floorMesh.receiveShadow = true;
  this.scene.add(this.floorMesh);

  // Room grid
  var gridGroup = new THREE.Group();
  var lineMatMajor = new THREE.LineBasicMaterial({ color: 0x333a47, transparent: true, opacity: 0.85 });
  var lineMatMinor = new THREE.LineBasicMaterial({ color: 0x20252e, transparent: true, opacity: 0.6 });
  var borderMat = new THREE.LineBasicMaterial({ color: 0x5a6578, linewidth: 2 });

  // Grid lines
  var minor = 50, major = 100;
  for (var x = -rw / 2; x <= rw / 2; x += minor) {
    var isMaj = Math.abs(x % major) < 1e-4;
    var pts = [new THREE.Vector3(x, 0, -rd / 2), new THREE.Vector3(x, 0, rd / 2)];
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    gridGroup.add(new THREE.Line(geo, isMaj ? lineMatMajor : lineMatMinor));
  }
  for (var z = -rd / 2; z <= rd / 2; z += minor) {
    var isMajZ = Math.abs(z % major) < 1e-4;
    var ptsZ = [new THREE.Vector3(-rw / 2, 0, z), new THREE.Vector3(rw / 2, 0, z)];
    var geoZ = new THREE.BufferGeometry().setFromPoints(ptsZ);
    gridGroup.add(new THREE.Line(geoZ, isMajZ ? lineMatMajor : lineMatMinor));
  }

  // Room perimeter border
  var borderPts = [
    new THREE.Vector3(-rw / 2, 0.1, -rd / 2),
    new THREE.Vector3(rw / 2, 0.1, -rd / 2),
    new THREE.Vector3(rw / 2, 0.1, rd / 2),
    new THREE.Vector3(-rw / 2, 0.1, rd / 2),
    new THREE.Vector3(-rw / 2, 0.1, -rd / 2)
  ];
  var borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
  gridGroup.add(new THREE.Line(borderGeo, borderMat));

  this.gridGroup = gridGroup;
  this.scene.add(gridGroup);
};

LightingWebGLRuntime.prototype.setupCameras = function() {
  var THREE = globalThis.THREE;
  if (!THREE) return;

  // 1. Top Orthographic Camera (2D View)
  this.cameraTop = new THREE.OrthographicCamera(-800, 800, 500, -500, 1, 8000);
  this.cameraTop.position.set(0, 3500, 0);
  this.cameraTop.lookAt(0, 0, 0);
  this.cameraTop.up.set(0, 0, -1);

  // 2. Isometric Orthographic Camera (2.5D View)
  this.cameraIso = new THREE.OrthographicCamera(-800, 800, 500, -500, 1, 8000);
  var isoDist = 2600;
  var isoEl = 45 * Math.PI / 180;
  var isoAz = 45 * Math.PI / 180;
  this.cameraIso.position.set(
    isoDist * Math.cos(isoEl) * Math.sin(isoAz),
    isoDist * Math.sin(isoEl),
    isoDist * Math.cos(isoEl) * Math.cos(isoAz)
  );
  this.cameraIso.lookAt(0, 80, 0);
  this.cameraIso.up.set(0, 1, 0);

  // 3. Perspective Camera (3D View)
  this.cameraPerspective = new THREE.PerspectiveCamera(50, 16 / 9, 10, 20000);
  this.cameraPerspective.position.set(0, 950, 1750);
  this.cameraPerspective.lookAt(0, 110, 0);

  // 4. 轨道相机状态（拖拽旋转 / 右键平移 / 滚轮缩放），默认 3/4 立体视角
  this.viewPreset = '3q';
  this.orbit = { theta: 0, phi: 0.62, radius: 2000, tx: 0, ty: 110, tz: 0 };
  this.setViewPreset((this.options && this.options.viewPreset) || '3q');
};

LightingWebGLRuntime.prototype.updateCameraBounds = function(cam, width, height, zoom) {
  zoom = Math.max(0.1, zoom || 1);
  if (cam.isOrthographicCamera) {
    var halfW = (width / 2) / zoom;
    var halfH = (height / 2) / zoom;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;
    cam.updateProjectionMatrix();
  } else if (cam.isPerspectiveCamera) {
    cam.aspect = width / height;
    cam.updateProjectionMatrix();
  }
};

LightingWebGLRuntime.prototype.loadGLB = function(url, onSuccess, onError) {
  var self = this;
  if (!url) {
    if (onError) onError(new Error('No GLB URL specified'));
    return;
  }
  if (this.gltfCache.has(url)) {
    if (onSuccess) onSuccess(this.gltfCache.get(url));
    return;
  }
  if (this.loadingPromises.has(url)) {
    this.loadingPromises.get(url).then(onSuccess).catch(onError);
    return;
  }

  var THREE = globalThis.THREE;
  var GLTFLoader = THREE && THREE.GLTFLoader;
  if (!GLTFLoader) {
    var err = new Error('GLTFLoader not available on THREE');
    if (onError) onError(err);
    return;
  }

  var loader = new GLTFLoader();
  var fullUrl = url.startsWith('/') ? url : '/' + url;

  var promise = new Promise(function(resolve, reject) {
    loader.load(
      fullUrl,
      function(gltf) {
        self.gltfCache.set(url, gltf);
        self.stats.loadedGlbs = self.gltfCache.size;
        resolve(gltf);
      },
      undefined,
      function(error) {
        console.warn('[LightingWebGLRuntime] GLB load error for ' + url + ':', error);
        self.stats.lastError = error && error.message ? error.message : String(error);
        reject(error);
      }
    );
  });

  this.loadingPromises.set(url, promise);
  var releasePending = function() {
    if (self.loadingPromises.get(url) === promise) self.loadingPromises.delete(url);
  };
  promise.then(releasePending, releasePending);
  promise.then(onSuccess).catch(onError);
};

/**
 * Creates a clean procedural 3D equipment model for immediate visibility.
 */
LightingWebGLRuntime.prototype.createProceduralModel = function(item) {
  var THREE = globalThis.THREE;
  var group = new THREE.Group();
  group.name = 'procedural-fixture';

  var type = item.type || 'light';
  var sub = item.subtype || 'cob';
  var height = (item.z != null ? Number(item.z) : 180) || 180;

  var metalMat = new THREE.MeshStandardMaterial({ color: 0x2b303c, roughness: 0.35, metalness: 0.85 });
  var bodyMat = new THREE.MeshStandardMaterial({ color: 0x1f232b, roughness: 0.5, metalness: 0.5 });
  var lensMat = new THREE.MeshBasicMaterial({ color: cctToThreeColor(item.temperature || 5600) });

  if (type === 'light') {
    // 3-legged folding base
    for (var i = 0; i < 3; i++) {
      var angle = (i * 120 * Math.PI) / 180;
      var legGeo = new THREE.CylinderGeometry(1.2, 1.2, 38, 8);
      legGeo.rotateZ(Math.PI / 2);
      legGeo.rotateY(angle);
      var leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(Math.cos(angle) * 19, 2, Math.sin(angle) * 19);
      leg.castShadow = true;
      group.add(leg);
    }
    // Vertical riser column
    var mastGeo = new THREE.CylinderGeometry(1.8, 2.2, height, 12);
    var mast = new THREE.Mesh(mastGeo, metalMat);
    mast.position.y = height / 2;
    mast.castShadow = true;
    group.add(mast);

    // Fixture head
    var isPanel = sub.includes('panel') || sub.includes('skypanel');
    if (isPanel) {
      var pGeo = new THREE.BoxGeometry(74, 34, 14);
      var pMesh = new THREE.Mesh(pGeo, bodyMat);
      pMesh.position.y = height;
      pMesh.castShadow = true;
      group.add(pMesh);

      var faceGeo = new THREE.PlaneGeometry(68, 28);
      var face = new THREE.Mesh(faceGeo, lensMat);
      face.position.set(0, height, 7.1);
      group.add(face);
    } else {
      var barrelGeo = new THREE.CylinderGeometry(15, 17, 36, 16);
      barrelGeo.rotateX(Math.PI / 2);
      var barrel = new THREE.Mesh(barrelGeo, bodyMat);
      barrel.position.y = height;
      barrel.castShadow = true;
      group.add(barrel);

      var lensGeo = new THREE.CircleGeometry(14, 16);
      var lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(0, height, 18.1);
      group.add(lens);
    }
  } else if (type === 'camera') {
    // Tripod legs
    for (var j = 0; j < 3; j++) {
      var tang = (j * 120 * Math.PI) / 180;
      var tlegGeo = new THREE.CylinderGeometry(1.2, 1.2, height * 1.05, 8);
      tlegGeo.rotateZ(0.2);
      tlegGeo.rotateY(tang);
      var tleg = new THREE.Mesh(tlegGeo, metalMat);
      tleg.position.set(Math.cos(tang) * 16, height / 2, Math.sin(tang) * 16);
      tleg.castShadow = true;
      group.add(tleg);
    }
    // Cinema camera body
    var camBoxGeo = new THREE.BoxGeometry(24, 20, 36);
    var camBody = new THREE.Mesh(camBoxGeo, bodyMat);
    camBody.position.y = height;
    camBody.castShadow = true;
    group.add(camBody);

    // Matte box / lens
    var mbGeo = new THREE.BoxGeometry(18, 16, 12);
    var mbMesh = new THREE.Mesh(mbGeo, metalMat);
    mbMesh.position.set(0, height, 22);
    group.add(mbMesh);
  } else {
    // Generic equipment box on stand
    var gStandGeo = new THREE.CylinderGeometry(1.5, 1.8, height, 8);
    var gStand = new THREE.Mesh(gStandGeo, metalMat);
    gStand.position.y = height / 2;
    group.add(gStand);

    var gBoxGeo = new THREE.BoxGeometry(30, 30, 30);
    var gBox = new THREE.Mesh(gBoxGeo, bodyMat);
    gBox.position.y = height;
    group.add(gBox);
  }

  return group;
};

/**
 * Builds a luminous 3D light beam cone + floor footprint.
 */
LightingWebGLRuntime.prototype.createBeamMesh = function(item, isSelected) {
  var THREE = globalThis.THREE;
  var group = new THREE.Group();
  group.name = 'beam-volume';

  var headH = (item.z != null ? Number(item.z) : 180) || 180;
  var spreadDeg = item.beamSpread || 60;
  var spreadRad = (spreadDeg * Math.PI) / 180;
  var length = item.beamLength || 420;
  var radius = Math.tan(spreadRad / 2) * length;
  var beamColor = cctToThreeColor(item.temperature || 5600);

  // 3D luminous cone
  var coneGeo = new THREE.ConeGeometry(radius, length, 32, 1, true);
  coneGeo.translate(0, -length / 2, 0);
  coneGeo.rotateX(-Math.PI / 2);

  var coneMat = new THREE.MeshBasicMaterial({
    color: beamColor,
    transparent: true,
    opacity: isSelected ? 0.28 : 0.15,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  var cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = headH;

  // Orient beam according to aimPan & aimTilt
  // 画布对象是 V1 降级形态（aim_tilt / rotation），V2 对象才是 aimTilt / aimPan。
  // 必须用 != null 判定：0（水平）是合法值，用 || 会被误当成缺省值。
  var tiltVal = item.aimTilt != null ? Number(item.aimTilt)
              : (item.aim_tilt != null ? Number(item.aim_tilt) : -35);
  var panVal  = item.aimPan  != null ? Number(item.aimPan)
              : (item.aim_pan  != null ? Number(item.aim_pan) : 0);
  if (!isFinite(tiltVal)) tiltVal = -35;
  if (!isFinite(panVal)) panVal = 0;
  var panRad = (panVal * Math.PI) / 180;
  var tiltRad = (tiltVal * Math.PI) / 180;
  cone.rotation.y = panRad;
  cone.rotation.x = tiltRad;

  group.add(cone);

  // Floor footprint circle
  var footprintR = Math.min(radius * 0.8, 120);
  var footGeo = new THREE.RingGeometry(footprintR * 0.85, footprintR, 32);
  footGeo.rotateX(-Math.PI / 2);
  var footMat = new THREE.MeshBasicMaterial({
    color: beamColor,
    transparent: true,
    opacity: isSelected ? 0.6 : 0.35,
    side: THREE.DoubleSide
  });
  var footMesh = new THREE.Mesh(footGeo, footMat);
  footMesh.position.set(0, 0.2, length * 0.6 * Math.cos(tiltRad));
  group.add(footMesh);

  return group;
};

/**
 * Creates 2D Top CAD schematic overlay representation.
 */
LightingWebGLRuntime.prototype.create2DSymbol = function(item, isSelected) {
  var THREE = globalThis.THREE;
  var group = new THREE.Group();
  group.name = 'symbol-2d';

  var accentColor = isSelected ? 0xf5a623 : 0x7ec8e3;
  var r = 16;

  // Footprint ring on floor
  var ringGeo = new THREE.RingGeometry(r * 0.75, r, 24);
  ringGeo.rotateX(-Math.PI / 2);
  var ringMat = new THREE.MeshBasicMaterial({ color: accentColor, side: THREE.DoubleSide });
  var ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.5;
  group.add(ring);

  // Aim direction arrow line
  var dirLen = 28;
  var arrowPts = [new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0, 0.6, dirLen)];
  var arrowGeo = new THREE.BufferGeometry().setFromPoints(arrowPts);
  var arrowMat = new THREE.LineBasicMaterial({ color: accentColor, linewidth: 2 });
  group.add(new THREE.Line(arrowGeo, arrowMat));

  return group;
};

/**
 * Syncs the Three.js scene with current board items.
 */
LightingWebGLRuntime.prototype.syncScene = function(board, options) {
  var self = this;
  var THREE = globalThis.THREE;
  if (!THREE || !this.scene) return;

  options = options || {};
  if (options.mode) this.mode = options.mode;
  if (options.zoom) this.zoom = options.zoom;
  if (options.selectedId !== undefined) this.selectedId = options.selectedId;
  if (options.coverage !== undefined) this.coverage = options.coverage;

  var items = (board && board.items) || [];
  var currentItemIds = new Set(items.map(function(i) { return i.id; }));

  // Remove deleted items
  this.equipmentMap.forEach(function(entry, id) {
    if (!currentItemIds.has(id)) {
      self.scene.remove(entry.group);
      self.equipmentMap.delete(id);
    }
  });

  // Add / Update items
  var LA = globalThis.FrameForgeLightingAssets;
  var rw = this.roomWidth, rd = this.roomDepth;

  items.forEach(function(item) {
    var isSelected = item.id === self.selectedId;
    var entry = self.equipmentMap.get(item.id);

    var itemW = item.width || 100;
    var itemH = item.height || 100;
    var worldX = item.x + itemW / 2 - rw / 2;
    var worldZ = item.y + itemH / 2 - rd / 2;
    var rotY = -(item.rotation || 0) * Math.PI / 180;

    if (!entry) {
      // New equipment group
      var group = new THREE.Group();
      group.name = 'item-' + item.id;
      group.position.set(worldX, 0, worldZ);
      group.rotation.y = rotY;

      // 1. Immediate procedural model
      var procedural = self.createProceduralModel(item);
      group.add(procedural);

      // 2. 2D symbol
      var symbol2d = self.create2DSymbol(item, isSelected);
      group.add(symbol2d);

      // 3. Beam volume
      var beam = (item.type === 'light' && (item.show_coverage !== false) && self.coverage)
        ? self.createBeamMesh(item, isSelected)
        : null;
      if (beam) group.add(beam);

      // 4. Selection box helper
      var selBox = null;
      if (isSelected) {
        selBox = new THREE.BoxHelper(procedural, 0xf5a623);
        group.add(selBox);
      }

      self.scene.add(group);

      entry = {
        id: item.id,
        group: group,
        procedural: procedural,
        glbMesh: null,
        beam: beam,
        selBox: selBox,
        symbol2d: symbol2d,
        item: item,
        type: item.type,
        subtype: item.subtype,
        label: item.label || (item.properties && item.properties.model) || item.subtype,
        glbLoaded: false,
        meshCount: 0,
        bbox: null
      };

      self.equipmentMap.set(item.id, entry);

      // 5. Load real GLB model asynchronously
      var glbUrl = LA && LA.getGLBUrl ? LA.getGLBUrl(item.type, item.subtype) : null;
      if (glbUrl) {
        self.loadGLB(glbUrl, function(gltf) {
          if (self.disposed || self.equipmentMap.get(item.id)!==entry) return;

          var cloned = gltf.scene.clone(true);
          var mCount = 0;
          cloned.traverse(function(child) {
            if (child.isMesh) {
              mCount++;
              child.castShadow = true;
              child.receiveShadow = true;
              child.visible = true;
              if (child.material) {
                child.material.side = THREE.DoubleSide;
                child.material.needsUpdate = true;
              }
            }
          });

          // Compute size and scale
          var rawBox = new THREE.Box3().setFromObject(cloned);
          var rawSize = rawBox.getSize(new THREE.Vector3());
          var realSize = LA && LA.getRealSize ? LA.getRealSize(item.type, item.subtype) : { h: 200 };
          var targetH = realSize.h || 200;

          var scale = (rawSize.y > 0) ? (targetH / rawSize.y) : 1;
          cloned.scale.setScalar(scale);

          var scaledBox = new THREE.Box3().setFromObject(cloned);
          cloned.position.x = -(scaledBox.min.x + scaledBox.max.x) / 2;
          cloned.position.z = -(scaledBox.min.z + scaledBox.max.z) / 2;
          cloned.position.y = -scaledBox.min.y;

          // LOD：保留程序化低模而不是删除 —— 远距离时用它替换 GLB 以保帧率
          procedural.visible = false;
          group.add(cloned);
          entry.glbMesh = cloned;
          entry.glbLoaded = true;
          entry.meshCount = mCount;
          entry.lodState = 'near';
          entry.bbox = scaledBox;

          // Register verified asset
          if (LA && LA.registerVerifiedAsset) {
            LA.registerVerifiedAsset(item.type, item.subtype, {
              loaded: true,
              meshCount: mCount,
              glbUrl: glbUrl,
              box: scaledBox
            });
          }

          // Update selection box if selected
          if (entry.selBox) {
            group.remove(entry.selBox);
            entry.selBox = new THREE.BoxHelper(cloned, 0xf5a623);
            group.add(entry.selBox);
          }

          self.render();
          self.updateHUD();
        });
      }
    } else {
      // Update existing item
      entry.item = item;
      entry.group.position.set(worldX, 0, worldZ);
      entry.group.rotation.y = rotY;

      // Update beam
      if (entry.beam) {
        entry.group.remove(entry.beam);
        entry.beam = null;
      }
      if (item.type === 'light' && item.show_coverage !== false && self.coverage) {
        entry.beam = self.createBeamMesh(item, isSelected);
        entry.group.add(entry.beam);
      }

      // Update selection box
      if (entry.selBox) {
        entry.group.remove(entry.selBox);
        entry.selBox = null;
      }
      if (isSelected) {
        var targetMesh = entry.glbMesh || entry.procedural;
        if (targetMesh) {
          entry.selBox = new THREE.BoxHelper(targetMesh, 0xf5a623);
          entry.group.add(entry.selBox);
        }
      }
    }
  });

  this.render();
  this.updateHUD();
};

/**
 * LOD：按相机到物体的距离在「GLB 精模」与「程序化低模」之间切换。
 * 器材多/距离远时只画低模，避免整场景高模拖垮帧率；近距离恢复真实几何。
 */
LightingWebGLRuntime.prototype.updateLOD = function() {
  var cam = this.cameraPerspective;
  if (!cam || !this.equipmentMap.size) return;
  var near = this.lodNearDistance || 2600;
  var far = this.lodFarDistance || 3600;   // 迟滞区间，避免临界点反复抖动
  var self = this;
  this.equipmentMap.forEach(function(entry) {
    if (!entry.glbMesh || !entry.procedural) return;
    var d = cam.position.distanceTo(entry.group.position);
    var state = entry.lodState || 'near';
    if (state === 'near' && d > far) state = 'far';
    else if (state === 'far' && d < near) state = 'near';
    if (state !== entry.lodState) {
      entry.lodState = state;
      self.stats.lodSwitches = (self.stats.lodSwitches || 0) + 1;
    }
    entry.glbMesh.visible = (state === 'near');
    entry.procedural.visible = (state === 'far') || !entry.glbLoaded;
  });
};

LightingWebGLRuntime.prototype.render = function() {
  if (!this.renderer || !this.scene) return;
  this.updateLOD();

  var container = this.container;
  var w = container.clientWidth || this.roomWidth;
  var h = container.clientHeight || this.roomDepth;
  if (w <= 0 || h <= 0) return;

  this.renderer.setSize(w, h, false);

  var mode = this.mode;
  var zoom = this.zoom || 1;

  if (mode === 'split') {
    // Split View using single renderer with scissor test
    if (this.divider) this.divider.style.display = 'block';

    var halfW = Math.floor(w / 2);
    this.renderer.setScissorTest(true);

    // Left Viewport: 2D Top CAD View
    this.renderer.setViewport(0, 0, halfW, h);
    this.renderer.setScissor(0, 0, halfW, h);
    this.updateCameraBounds(this.cameraTop, halfW, h, zoom);
    this.renderer.render(this.scene, this.cameraTop);

    // Right Viewport: 3D Perspective View
    this.renderer.setViewport(halfW, 0, w - halfW, h);
    this.renderer.setScissor(halfW, 0, w - halfW, h);
    this.updateCameraBounds(this.cameraPerspective, w - halfW, h, 1);
    this.renderer.render(this.scene, this.cameraPerspective);

    this.renderer.setScissorTest(false);
  } else {
    if (this.divider) this.divider.style.display = 'none';

    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissor(0, 0, w, h);

    if (mode === '2d') {
      this.updateCameraBounds(this.cameraTop, w, h, zoom);
      this.renderer.render(this.scene, this.cameraTop);
    } else if (mode === '3d') {
      this.updateCameraBounds(this.cameraPerspective, w, h, 1);
      // 竖长视口（如分屏右栏 392×718，aspect≈0.55）下水平视野会被压到约 28°，
      // 房间两侧被裁掉。按 aspect 补足垂直 FOV，保证横向能容纳场景。
      var asp = this.cameraPerspective.aspect || 1;
      this.cameraPerspective.fov = asp < 1 ? Math.min(78, 50 / Math.max(0.42, asp)) : 50;
      this.cameraPerspective.updateProjectionMatrix();
      this.renderer.render(this.scene, this.cameraPerspective);
    } else {
      // 2.5D Isometric view
      this.updateCameraBounds(this.cameraIso, w, h, zoom);
      this.renderer.render(this.scene, this.cameraIso);
    }
  }
};

LightingWebGLRuntime.prototype.updateHUD = function() {
  if (!this.hud) return;

  var self = this;
  var activeCount = 0;
  var totalMeshes = 0;
  var selectedDesc = '—';

  this.equipmentMap.forEach(function(entry, id) {
    activeCount++;
    totalMeshes += entry.meshCount || 4; // count procedural or GLB meshes
    if (id === self.selectedId) {
      // 不得按「GLB 加载成功」自称 DIGITAL TWIN —— 等级必须由 lighting-assets 的
      // 几何来源门禁决定（getAssetStatus）。此处只做展示。
      var status = (globalThis.FrameForgeLightingAssets
        && globalThis.FrameForgeLightingAssets.getAssetStatus)
        ? globalThis.FrameForgeLightingAssets.getAssetStatus(entry.type, entry.subtype)
        : 'staging';
      var labelMap = {
        digital_twin: '<b class="status-dt">DIGITAL TWIN</b>',
        replica: '<b class="status-replica">ENGINEERING REPLICA</b>',
        staging: '<b class="status-staging">STAGING</b>',
        cc0: '<b class="status-staging">GENERIC REFERENCE</b>',
        generic: '<b class="status-staging">GENERIC REFERENCE</b>',
        reference: '<b class="status-staging">REFERENCE</b>'
      };
      selectedDesc = entry.label + ' ' + (labelMap[status] || labelMap.staging);
    }
  });

  this.stats.activeMode = this.mode;
  this.stats.activeEquipment = activeCount;
  this.stats.totalMeshes = totalMeshes;

  var modeEl = this.hud.querySelector('.hud-mode');
  var fixEl = this.hud.querySelector('.hud-fixtures');
  var glbEl = this.hud.querySelector('.hud-glbs');
  var meshEl = this.hud.querySelector('.hud-meshes');
  var selEl = this.hud.querySelector('.hud-selected');

  if (modeEl) modeEl.textContent = this.mode.toUpperCase();
  if (fixEl) fixEl.textContent = activeCount;
  if (glbEl) glbEl.textContent = this.stats.loadedGlbs;
  if (meshEl) meshEl.textContent = totalMeshes;
  if (selEl) selEl.innerHTML = selectedDesc;
};

/**
 * 轨道相机：绕目标点的球坐标。
 * theta 水平角、phi 俯仰角(0=正上方)、radius 距离、t* 观察目标。
 */
LightingWebGLRuntime.prototype.applyOrbit = function() {
  var cam = this.cameraPerspective;
  if (!cam) return;
  var o = this.orbit;
  cam.position.set(
    o.tx + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
    o.ty + o.radius * Math.cos(o.phi),
    o.tz + o.radius * Math.sin(o.phi) * Math.cos(o.theta)
  );
  cam.lookAt(o.tx, o.ty, o.tz);
};

/** 轨道旋转（拖拽）。phi 夹在 (0, π) 内避免翻转与天顶奇异 */
LightingWebGLRuntime.prototype.orbitBy = function(dTheta, dPhi) {
  var o = this.orbit;
  o.theta += dTheta;
  o.phi = Math.max(0.03, Math.min(Math.PI / 2 + 0.55, o.phi + dPhi));
  this.applyOrbit();
  this.render();
};

/** 水平面平移（右键拖拽）。前后沿视线水平分量、左右沿相机右向量 */
LightingWebGLRuntime.prototype.focusSelected = function() {
  var entry=this.equipmentMap.get(this.selectedId), THREE=globalThis.THREE;
  if(!entry || !THREE)return;
  this.scene.updateMatrixWorld(true);
  var model=entry.glbMesh && entry.glbMesh.visible ? entry.glbMesh : entry.procedural;
  var box=new THREE.Box3().setFromObject(model), center=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3());
  Object.assign(this.orbit,{tx:center.x,ty:center.y,tz:center.z,radius:Math.max(100,size.length()*2)});
  this.applyOrbit();this.render();
};

LightingWebGLRuntime.prototype.panBy = function(dx, dy) {
  var o = this.orbit;
  var s = o.radius * 0.0016;
  var fx = Math.sin(o.theta), fz = Math.cos(o.theta);   // 视线水平前向
  var rx = Math.cos(o.theta), rz = -Math.sin(o.theta);  // 相机右向
  o.tx -= (rx * dx - fx * dy) * s;
  o.tz -= (rz * dx - fz * dy) * s;
  this.applyOrbit();
  this.render();
};

/** 缩放（滚轮）：改变相机到目标的距离 */
LightingWebGLRuntime.prototype.zoomBy = function(deltaY) {
  var o = this.orbit;
  var floor = Math.max(this.roomWidth, this.roomDepth) * 0.12;
  var ceil = Math.max(this.roomWidth, this.roomDepth) * 6;
  o.radius = Math.max(floor, Math.min(ceil, o.radius * (1 + deltaY * 0.0012)));
  this.applyOrbit();
  this.render();
};

/**
 * 视角预设（酷家乐式多视角）。
 *   top  俯视：正上方看平面布置
 *   bird 鸟瞰：默认 3/4 立体视角
 *   walk 漫游：人眼高度水平观察
 */
LightingWebGLRuntime.prototype.setViewPreset = function(name) {
  var rw = this.roomWidth || 1600, rd = this.roomDepth || 1000;
  var span = Math.max(rw, rd);
  this.viewPreset = name;
  if (name === 'top') {
    this.orbit = { theta: 0, phi: 0.04, radius: span * 0.95, tx: 0, ty: 0, tz: 0 };
  } else if (name === 'walk') {
    // 人眼 160cm 高，站在房间一端往里看；距离取房间跨度量级，
    // 否则相机贴在器材上，画面被单个模型塞满
    this.orbit = { theta: 0, phi: 1.44, radius: span * 1.05, tx: 0, ty: 160, tz: 0 };
  } else if (name === 'bird') {
    this.orbit = { theta: 0.55, phi: 0.72, radius: span * 1.05, tx: 0, ty: 40, tz: 0 };
  } else {
    // 默认 3/4 立体（与旧 cameraPerspective 观感接近）
    this.orbit = { theta: 0, phi: 0.62, radius: span * 1.25, tx: 0, ty: 110, tz: 0 };
  }
  this.applyOrbit();
  this.render();
  return this.viewPreset;
};

LightingWebGLRuntime.prototype.initEvents = function() {
  var self = this;
  if (!this.canvas) return;

  // Window resize observer
  if (typeof ResizeObserver !== 'undefined') {
    var ro = new ResizeObserver(function() {
      self.render();
    });
    ro.observe(this.container);
    this.resizeObserver = ro;
  }

  var cv = this.canvas;
  var gesture = null;
  var touchPoints = new Map();
  var touchGesture = null;
  var THREE = globalThis.THREE;
  function ray(e) {
    var box = cv.getBoundingClientRect();
    if (!THREE || !self.cameraPerspective || !box.width || !box.height) return null;
    self.cameraPerspective.updateMatrixWorld(); self.scene.updateMatrixWorld(true);
    var caster = new THREE.Raycaster();
    caster.setFromCamera(new THREE.Vector2((e.clientX-box.left)/box.width*2-1, 1-(e.clientY-box.top)/box.height*2), self.cameraPerspective);
    return caster;
  }
  function pick(caster) {
    if (!caster) return null;
    var best = null, distance = Infinity;
    self.equipmentMap.forEach(function(entry) {
      var model = entry.glbMesh && entry.glbMesh.visible ? entry.glbMesh : entry.procedural;
      if (!model || !model.visible || !entry.group.visible) return;
      var hits = caster.intersectObject(model, true).filter(function(hit) {
        for (var node=hit.object;node;node=node.parent) if (!node.visible) return false;
        return true;
      });
      if (hits.length && hits[0].distance < distance) { best=entry; distance=hits[0].distance; }
    });
    return best;
  }
  function floor(caster) { return caster && caster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3()); }

  cv.style.touchAction = 'none';
  cv.tabIndex = 0;
  cv.setAttribute('aria-label', '3D 灯光画布：点选设备，移动或旋转工具拖动；Alt 拖动环绕，中键或右键平移');
  cv.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  cv.addEventListener('pointerdown', function(e) {
    // 只在与立体视图相关时接管指针；平面图模式不拦截，避免影响 2D 交互
    if (self.mode !== '3d' && self.mode !== 'split') return;
    if (e.pointerType === 'touch') {
      touchPoints.set(e.pointerId, {x:e.clientX, y:e.clientY});
      if (touchPoints.size === 2) {
        e.preventDefault(); e.stopPropagation();
        if (gesture) endDrag({type:'pointercancel', pointerId:gesture.id});
        var points = Array.from(touchPoints.values());
        var center = {x:(points[0].x + points[1].x) / 2, y:(points[0].y + points[1].y) / 2};
        touchGesture = {
          distance:Math.max(1, Math.hypot(points[1].x-points[0].x, points[1].y-points[0].y)),
          radius:self.orbit.radius, center:center
        };
        touchPoints.forEach(function(_, pointerId) { try { cv.setPointerCapture(pointerId); } catch (_) {} });
        return;
      }
    }
    if (gesture || e.button > 2) return;
    e.preventDefault(); e.stopPropagation(); cv.focus({preventScroll:true});
    var mode = e.button===1 || e.button===2 || self.tool==='pan' ? 'pan' : e.altKey || self.tool==='orbit' ? 'orbit' : self.tool;
    var caster = ray(e), entry = (mode==='pan'||mode==='orbit') ? null : pick(caster);
    if (mode!=='pan' && mode!=='orbit') {
      self.selectedId = entry ? entry.id : null;
      if (self.options.onSelect) self.options.onSelect(self.selectedId);
    }
    gesture = {id:e.pointerId, mode:mode, entry:entry, x:e.clientX, y:e.clientY, lastX:e.clientX, lastY:e.clientY,
      start:floor(caster), original:entry ? Object.assign({},entry.item) : null, patch:null};
    if(self.options.onGestureStart)self.options.onGestureStart();
    try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    cv.style.cursor = mode==='pan' ? 'grabbing' : mode==='select' ? 'default' : 'move';
  });

  cv.addEventListener('pointermove', function(e) {
    if (e.pointerType === 'touch' && touchPoints.has(e.pointerId)) {
      touchPoints.set(e.pointerId, {x:e.clientX, y:e.clientY});
      if (!touchGesture || touchPoints.size < 2) return;
      e.preventDefault();
      var points = Array.from(touchPoints.values());
      var center = {x:(points[0].x + points[1].x) / 2, y:(points[0].y + points[1].y) / 2};
      var distance = Math.max(1, Math.hypot(points[1].x-points[0].x, points[1].y-points[0].y));
      var deltaX = center.x - touchGesture.center.x, deltaY = center.y - touchGesture.center.y;
      var floorRadius = Math.max(self.roomWidth, self.roomDepth) * 0.12;
      var ceilRadius = Math.max(self.roomWidth, self.roomDepth) * 6;
      self.panBy(deltaX, deltaY);
      self.orbit.radius = Math.max(floorRadius, Math.min(ceilRadius, touchGesture.radius * touchGesture.distance / distance));
      self.applyOrbit(); self.render();
      touchGesture.center = center;
      return;
    }
    var g=gesture; if (!g || e.pointerId!==g.id) return;
    var dx=e.clientX-g.lastX, dy=e.clientY-g.lastY;
    g.lastX=e.clientX; g.lastY=e.clientY;
    if (g.mode==='pan') self.panBy(dx,dy);
    else if (g.mode==='orbit') self.orbitBy(-dx*.006,dy*.006);
    else if (g.entry && Math.hypot(e.clientX-g.x,e.clientY-g.y)>3) {
      var original=g.original;
      if (g.mode==='move' && g.start) {
        var current=floor(ray(e)); if (!current) return;
        g.patch={x:Math.max(0,Math.min(self.roomWidth-original.width,original.x+current.x-g.start.x)),
          y:Math.max(0,Math.min(self.roomDepth-original.height,original.y+current.z-g.start.z))};
        g.entry.group.position.x=g.patch.x+original.width/2-self.roomWidth/2;
        g.entry.group.position.z=g.patch.y+original.height/2-self.roomDepth/2;
      } else if (g.mode==='rotate') {
        var angle=(original.rotation||0)+(e.clientX-g.x)*.5;
        if(e.shiftKey)angle=Math.round(angle/15)*15;
        g.patch={rotation:angle}; g.entry.group.rotation.y=-angle*Math.PI/180;
      }
      self.render();
    }
  });

  function endDrag(e) {
    var g=gesture; if (!g || (e.pointerId!==undefined && e.pointerId!==g.id)) return;
    gesture=null;
    if(self.options.onGestureEnd)self.options.onGestureEnd();
    cv.style.cursor = '';
    try { cv.releasePointerCapture(g.id); } catch (_) {}
    if (g.entry) {
      g.entry.group.position.x=g.original.x+g.original.width/2-self.roomWidth/2;
      g.entry.group.position.z=g.original.y+g.original.height/2-self.roomDepth/2;
      g.entry.group.rotation.y=-(g.original.rotation||0)*Math.PI/180;
      if(e.type==='pointerup' && g.patch && self.options.onTransform) self.options.onTransform(g.entry.id,g.patch);
      else self.render();
    }
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('lostpointercapture', endDrag);
  function endTouch(e) {
    if (e.pointerType !== 'touch' || !touchPoints.has(e.pointerId)) return;
    touchPoints.delete(e.pointerId);
    if (touchGesture) {
      touchGesture = null;
      try { cv.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  }
  cv.addEventListener('pointerup', endTouch);
  cv.addEventListener('pointercancel', endTouch);
  this.cancelGesture = function() { endDrag({type:'cancel'}); };
  cv.addEventListener('keydown', function(e) { if(e.key==='Escape'&&gesture){e.preventDefault();e.stopPropagation();endDrag(e);} });

  cv.addEventListener('wheel', function(e) {
    if (self.mode !== '3d' && self.mode !== 'split') return;
    e.preventDefault();
    self.zoomBy(e.deltaY);
  }, { passive: false });
};

LightingWebGLRuntime.prototype.getStats = function() {
  return Object.assign({}, this.stats, {
    selectedId: this.selectedId,
    mode: this.mode,
    equipmentCount: this.equipmentMap.size
  });
};

LightingWebGLRuntime.prototype.getEquipment = function(id) {
  var entry = this.equipmentMap.get(id);
  if (!entry) return null;
  return {
    id: entry.id,
    type: entry.type,
    subtype: entry.subtype,
    glbLoaded: entry.glbLoaded,
    meshCount: entry.meshCount,
    visible: entry.group.visible,
    bbox: entry.bbox
  };
};

LightingWebGLRuntime.prototype.dispose = function() {
  this.disposed = true;
  if(this.cancelGesture)this.cancelGesture();
  if (this.resizeObserver) this.resizeObserver.disconnect();
  if (this.renderer) {
    this.renderer.dispose();
  }
  if (globalThis.__FF_GLB_RUNTIME__ === this) {
    globalThis.__FF_GLB_RUNTIME__ = null;
  }
};

/** Own one WebGL runtime for a board and viewport; return null for the 2D fallback. */
function reconcileWebGLRuntime(current, container, board, options, savedOrbit) {
  if (!container || !board) return null;
  var mode = options.mode === 'split' ? '3d' : options.mode;
  if (!current || current.disposed || !current.canvas || !current.canvas.isConnected ||
      current.container !== container || current.boardId !== board.id) {
    var previousOrbit = current && current.boardId === board.id && current.orbit
      ? Object.assign({}, current.orbit) : savedOrbit;
    if (current) current.dispose();
    current = new LightingWebGLRuntime(container, Object.assign({}, options, { mode: mode }));
    current.boardId = board.id;
    if (previousOrbit && current.renderer) {
      current.orbit = Object.assign({}, previousOrbit);
      current.applyOrbit();
    }
  }
  if (!current.renderer) {
    current.dispose();
    if (current.canvas !== container) current.canvas.remove();
    if (current.hud) current.hud.remove();
    return null;
  }
  current.syncScene(board, { mode: mode, selectedId: options.selectedId,
    zoom: options.zoom, coverage: options.coverage });
  return current;
}

var api = {
  project25d: project25d, project2d: project2d, project3d: project3d,
  unproject2d: unproject2d, unproject25dDelta: unproject25dDelta,
  objectScreenBounds: objectScreenBounds, getObjectHeight: getObjectHeight,
  renderGround: renderGround, renderObject: renderObject, renderFrame: renderFrame,
  LightingWebGLRuntime: LightingWebGLRuntime,
  createWebGLRuntime: function(container, options) {
    return new LightingWebGLRuntime(container, options);
  },
  reconcileWebGLRuntime: reconcileWebGLRuntime
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.FrameForgeLightingRender = api;
})(globalThis);
