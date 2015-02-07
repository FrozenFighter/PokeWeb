// Add left-padding to strings
String.prototype.lpad = Number.prototype.lpad = function (character, length) {
	var string = this.toString();
	while (string.length < length) {
		string = character + string;
	}
	return string;
};

// Add urlifying
String.prototype.urlify = function () {
	var string = this.replace(/(http|ftp|https):\/\/(www\.)?([\w\-_.]+)(:[0-9]+)?(\/[\S]*)?/g, function (url, protocol, subDomain, domain, port, rest) {
		rest = rest ? (rest[rest.length - 1] === '/' ? rest.substr(0, rest.length - 1) : rest) : '';
		return '<a href="' + url + '" target="_blank" title="' + url + '">' + domain + (port || '') + (rest.length < 16 ? rest : rest.substr(0, 16) + '...') + '</a>';
	});
	string = string.replace(/(magnet:[\S]*)/g, '<a href="$1" target="_blank" title="$1">magnet:?...</a>');
	string = string.replace(/irc:\/\/([\w]*)\/?([\S]*)?/g, '<a href="irc://$1/$2" target="_blank" title="irc://$1/$2">irc://$1...</a>');
	return string;
};

String.prototype.unicodeEncode = function () {
	var escaped = '',
		hex,
		i;
	for (i = 0; i < this.length; i += 1) {
		if (this.charCodeAt(i) > 127) {
			hex = this.charCodeAt(i).toString(16).toUpperCase();
			escaped += '\\u' + '000'.substr(hex.length) + hex;
		} else {
			escaped += this[i];
		}
	}
	return escaped;
};

String.prototype.unicodeDecode = function () {
	return this.replace(/\\u([\d\w]{4})/gi, function (match, value) {
		return String.fromCharCode(parseInt(value, 16));
	});
};

Array.prototype.intify = function () {
	var i,
		array = this;
	for (i = array.length - 1; i >= 0; i -= 1) {
		array[i] = parseInt(array[i], 10);
	}
	return array;
};

// Create the $ function
var $ = $ || function (id) {
	if (id[0] !== '.') {
		return document.getElementById(id);
	}
	return 0;
};

// Element functions
var Element = {
	add: function (object) {
		var element = document.createElement(object.type),
			i;
		if (object.style) {
			for (i in object.style) {
				if (object.style.hasOwnProperty(i)) {
					element.style[i] = object.style[i];
				}
			}
		}
		if (object.data) {
			for (i in object.data) {
				if (object.data.hasOwnProperty(i)) {
					element.setAttribute('data-' + i, object.data[i]);
				}
			}
		}
		if (object.className) {
			element.className = object.className;
		}
		if (object.id) {
			element.id = object.id;
		}
		if (object.innerHTML) {
			element.innerHTML = object.innerHTML;
		}
		if (object.src) {
			element.src = object.src;
		}
		if (object.width) {
			element.width = object.width;
		}
		if (object.height) {
			element.height = object.height;
		}
		(object.parent ? $(object.parent) : document.body).appendChild(element);
		if (object.success) {
			object.success(element);
		}
		return element;
	}
};

// Misc
var int = parseInt,
	max = Math.max,
	min = Math.min,
	abs = Math.abs,
	pow = Math.pow,
	round = Math.round,
	floor = Math.floor,
	ceil = Math.ceil,
	sqrt = Math.sqrt,
	float = parseFloat,
	cos = Math.cos,
	sin = Math.sin,
	atan2 = Math.atan2,
	PI = Math.PI;

// HTMLElement
HTMLElement.prototype.clear = function () {
	this.innerHTML = '';
};

HTMLElement.prototype.remove = function () {
	this.parentNode.removeChild(this);
};

HTMLElement.prototype.addClass = function (className) {
	//this.classList
	var classes = this.className.split(' ');
	if (classes.indexOf(className) < 0) {
		classes.push(className);
		this.className = classes.join(' ');
	}
};

HTMLElement.prototype.removeClass = function (className) {
	var classes = this.className.split(' '),
		i;
	for (i = classes.length - 1; i >= 0; i -= 1) {
		if (classes[i] === className) {
			classes.splice(i, 1);
		}
	}
	this.className = classes.join(' ');
};

HTMLElement.prototype.imageSmoothing = function (smooth) {
	var context = this.getContext('2d');
	context.webkitImageSmoothingEnabled = smooth;
	context.mozImageSmoothingEnabled = smooth;
};

HTMLElement.prototype.trigger = window.trigger = function (trigger, detail) {
	var event;
	if (!detail) {
		event = document.createEvent('HTMLEvents');
		event.initEvent(trigger, true, false);
	} else {
		event = new CustomEvent(trigger, {
			detail: detail || null
		});
	}
    this.dispatchEvent(event);
};

// AJAX
function AJAX(request) {
	var xmlhttp = null,
		i;
	try {
		xmlhttp = new XMLHttpRequest();
	} catch (error) {
		try {
			xmlhttp = new ActiveXObject('Msxml2.XMLHTTP');
		} catch (failure) {
			xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
		}
	}
	xmlhttp.open(request.post ? 'POST' : 'GET', request.url, 1);
	if (request.post) {
		xmlhttp.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
	}
	if (request.headers) {
		for (i in request.headers) {
			if (request.headers.hasOwnProperty(i)) {
				xmlhttp.setRequestHeader(i, request.headers[i]);
			}
		}
	}
	xmlhttp.send(request.post || null);
	xmlhttp.onreadystatechange = function () {
		if (xmlhttp.readyState === 4) {
			if (xmlhttp.status === 200 && xmlhttp.responseText && request.success) {
				request.success(xmlhttp.responseText);
			}
			if (xmlhttp.status !== 200 && request.error) {
				request.error();
			}
		}
	};
}

// Context menu
function context(event, items, functions, checks, disabled) {
	var x = event.clientX,
		y = event.clientY,
		element = Element.add({
			type: 'div',
			id: 'context',
			style: {
				left: x + 'px',
				top: y + 'px'
			}
		}),
		i,
		text = '';
	functions = functions || [];
	checks = checks || [];
	disabled = disabled || [];
	for (i = 0; i < items.length; i += 1) {
		if (items[i] === '-') {
			text += '<tr><td colspan="2" style="padding:2px"><div style="border-bottom:1px solid rgba(0,0,0,.1)"></div></td></tr>';
		} else {
			items[i] = items[i].split('|');
			text += '<tr id="context-' + i + '" class="context' + (disabled[i] ? ' disabled' : '') + '">'
				+ '<td><span>' + (checks[i] ? '&#10003;' : '') + '</span>' + items[i][0] + '</td>'
				+ '<td style="padding:4px 16px 4px 16px">' + (items[i][1] || '') + '</td>'
				+ '</tr>';
		}
	}
	element.innerHTML = '<table>' + text + '</table>';
	for (i = 0; i < items.length; i += 1) {
		if (functions[i] && !disabled[i]) {
			$('context-' + i).addEventListener('mousedown', functions[i]);
		}
	}
	if (x + int(element.clientWidth) > window.innerWidth - 24) {
		element.style.left = (window.innerWidth - element.clientWidth - 24) + 'px';
	}
	if (y + int(element.clientHeight) > window.innerHeight) {
		element.style.top = (window.innerHeight - element.clientHeight - 8) + 'px';
	}
	event.preventDefault();
	return false;
}

context.player = function (event, user) {
	if (stat(user)) {
		user = stat(stat(user));
		var items = [],
			functions = [],
			checks = [],
			sendCommand = function (command) {
				return function () {
					$('chat-input').value = command;
					$('chat-input').focus();
					Chat.keyPress(null, 13);
				};
			},
			who = user.id === player ? 'me' : 'them';
		if (user.id !== player && me().rank.canTeleport) {
			items.push('Teleport to');
			functions.push(
				sendCommand('/tp ' + Chat.clean.username(user.name))
			);
			checks.push(0);
			if (me().rank.canFullyTeleport) {
				items.push('Teleport to me');
				functions.push(
					sendCommand('/tphere ' + Chat.clean.username(user.name))
				);
				checks.push(0);
			}
		}
		if (me().rank.canTeleport) {
			items.push(user.id === player ? 'Where am I?' : 'Where are they?');
			functions.push(
				sendCommand('/find ' + Chat.clean.username(user.name))
			);
			checks.push(0);
		}
		if (user.id === player) {
			items.push('Walk through walls', 'Encounter wild Pok&eacute;mon');
			functions.push(
				sendCommand('/wtw' + (user.id === player ? '' : ' ')),
				sendCommand('/repel')
			);
			checks.push(
				Game.cheats.walkThroughWalls,
				!Game.cheats.noWildEncounters
			);
		}
		if (user.id === player && me().rank.canFlag) {
			items.push('Spy mode', 'Rainbow trail');
			functions.push(
				sendCommand('/spymode ' + Chat.clean.username(user.name)),
				sendCommand('/trail ' + Chat.clean.username(user.name))
			);
			checks.push(
				user.spyMode,
				user.trail
			);
		}
		if (user.id === player) {
			if (Settings.data.status) {
				items.push('Remove status');
				functions.push(
					sendCommand('/status')
				);
			}
			checks.push(0);
			if (Object.getOwnPropertyNames(Chat.ignored).length) {
				items.push('Clear ignore-list');
				functions.push(
					sendCommand('/unignore')
				);
				checks.push(0);
			}
		} else {
			if (me().rank.canKick) {
				items.push('Kick');
				functions.push(
					sendCommand('/kick ' + Chat.clean.username(user.name))
				);
				checks.push(0);
			}
			if (me().rank.canMute) {
				items.push('Mute');
				functions.push(
					sendCommand('/mute ' + Chat.clean.username(user.name))
				);
				checks.push(0);
			}
			items.push('Ignore', 'Whois');
			functions.push(
				sendCommand('/ignore ' + Chat.clean.username(user.name)),
				sendCommand('/whois ' + Chat.clean.username(user.name))
			);
			checks.push(Chat.ignored[user.id], 0);
		}
		items.push('Ping!');
		functions.push(
			sendCommand('/ping' + (user.id === player ? '' : ' ' + Chat.clean.username(user.name)))
		);
		checks.push(0);
		if (items.length) {
			context(event, items, functions, checks);
		}
	}
};

window.addEventListener('mousedown', function () {
	if ($('context')) {
		$('context').remove();
	}
});

// Sprite loader
var Sprites = {},
	Sprite = {};

Sprite.load = function (object) {
	if (object.sprite !== 'images/blank.png' && !Sprites['images/blank.png']) {
		Sprite.load({
			sprite: 'images/blank.png',
			success: function () {
				Sprite.load(object);
			}
		});
		return;
	}
	object.alias = object.alias || object.sprite;
	if (Sprites[object.alias]) {
		if (object.replace) {
			Sprites[object.replace] = Sprites[object.sprite];
			if (object.firstLoad) {
				object.firstLoad();
			}
		}
		if (object.success) {
			object.success();
		}
		return Sprites[object.alias];
	}
	if (Sprites[object.sprite]) {
		if (object.replace) {
			Sprites[object.replace] = Sprites[object.sprite];
			if (object.firstLoad) {
				object.firstLoad();
			}
		}
		if (object.success) {
			object.success();
		}
		return Sprites[object.sprite];
	}
	var image = new Image();
	image.src = Cache.getURL(object.sprite);
	Sprites[object.sprite] = null;
	Sprites[object.alias] = null;
	image.addEventListener('load', function () {
		if (object.replace) {
			Sprites[object.replace] = image;
		}
		Sprites[object.sprite] = image;
		Sprites[object.alias] = image;
		if (object.success) {
			object.success();
		}
		if (object.firstLoad) {
			object.firstLoad();
		}
	});
	image.addEventListener('error', function () {
		Sprite.load({
			sprite: (object.backup || 'images/blank.png'),
			replace: object.sprite,
			success: object.success,
			firstLoad: object.firstLoad
		});
	});
	return Sprites['images/blank.png'];
};

Sprite.loaded = function (sprite) {
	return Sprites.hasOwnProperty(sprite) && Sprites[sprite];
};

// Remove a sprite from a map
Sprite.removeFromMap = function (id, spriteOnly) {
	if (Map.sprites['sprite-' + id]) {
		if (Map.sprites['sprite-shadow-' + id]) {
			Map.sprites['sprite-shadow-' + id].parent.removeChild(Map.sprites['sprite-shadow-' + id]);
		}
		Map.sprites['sprite-' + id].parent.removeChild(Map.sprites['sprite-' + id]);
	}
	delete Map.sprites['sprite-' + id];
	if (!spriteOnly) {
		delete Map.spriteSteps['sprite-' + id];
	}
};

// Add a sprite to the map
Sprite.addToMap = function (x, y, object, id, spriteOnly) {
	if (!Sprites[object.sprite]) {
		Sprite.load({
			sprite: object.sprite,
			success: function () {
				Sprite.addToMap(x, y, object, id, spriteOnly);
			}
		});
		return;
	}
	if (id !== undefined && !spriteOnly) {
		Sprite.removeFromMap(id);
	}
	var element = document.createElement('canvas'),
		sprite;
	element.width = object.width ? object.width * (object.frames || 1) : Sprites[object.sprite].width;
	element.height = object.height || Sprites[object.sprite].height;
	element.getContext('2d').drawImage(Sprites[object.sprite], object.x || 0, object.y || 0, element.width, element.height, 0, 0, element.width, element.height);
	if (object.shadow && !Map.threeD) {
		var shadow = new PIXI.Sprite(new PIXI.Texture(PIXI.Texture.fromImage(element.toDataURL())));
		shadow.anchor.y = 1;
		shadow.position.x = x;
		shadow.position.y = y + 16;
		shadow.alpha = 0.4;
		shadow.tint = 0;
		shadow.visible = false;
		shadow.depth = -1000001;
		shadow.id = random();
		Game.containers.objects.addChild(shadow);
		Map.sprites['sprite-shadow-' + id] = shadow;
	}
	id = id || random();
	object.actualX = x;
	object.actualY = y;
	object.actualZ = object.z || 0;
	if (!Map.threeD) {
		sprite = new PIXI.Sprite(new PIXI.Texture(PIXI.Texture.fromImage(element.toDataURL())));
		sprite.anchor.y = 1;
		sprite.position.x = x;
		sprite.position.y = y - (object.z || 0) + 16;
		sprite.visible = false;
		sprite.shadow = object.shadow;
		sprite.depth = object.depth ? (object.depth === 1 ? 999999 : y + 16 + object.depth - 256) : -1000001;
		sprite.id = 1e6 + random() + (object.id || 0);
		Game.containers.objects.addChild(sprite);
		Map.sprites['sprite-' + id] = sprite;
	} else {
		var texture = new THREE.ImageUtils.loadTexture(element.toDataURL(), undefined, function () {
			object.width = object.width ? min(object.width, texture.image.width) : texture.image.width / (object.frames || 1);
			object.height = object.height ? min(object.height, texture.image.height) : texture.image.height;
			var material = new THREE.MeshLambertMaterial({
					map: texture,
					transparent: true,
					alphaTest : 0.1
				}),
				geometry = new THREE.PlaneBufferGeometry(object.width || texture.image.width, object.height || texture.image.height, 1, 1),
				sprite = new THREE.Mesh(geometry, material);
			texture.repeat.x = 1 / (object.frames || 1);
			sprite.position.x = x + (object.width / 2);
			sprite.position.z = y + 8;
			if (object.flat) {
				sprite.rotation.x = -PI / 2;
				sprite.position.y = 1;
			} else {
				sprite.position.y = (object.z || 0) + (texture.image.height / 2);
			}
			sprite.rotation.x = object.rotateX;
			sprite.rotation.y = object.rotateY;
			sprite.rotation.z = object.rotateZ;
			sprite.visible = false;
			Game.containers.objects.addChild(sprite);
			Map.sprites['sprite-' + id] = sprite;
		});
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.NearestFilter;
	}
	Map.spriteSteps['sprite-' + id] = function () {
		if (Map.sprites['sprite-' + id] && (Map.threeD || Map.sprites['sprite-' + id].texture.baseTexture.hasLoaded)) {
			if (!Map.sprites['sprite-' + id].visible) {
				Map.sprites['sprite-' + id].visible = true;
				if (Map.sprites['sprite-shadow-' + id]) {
					Map.sprites['sprite-shadow-' + id].visible = true;
				}
				object.last = 0;
				object.ready = 0;
				object.x = object.x || 0;
				object.y = object.y || 0;
				if (!Map.threeD) {
					object.width = object.width ? min(object.width, Map.sprites['sprite-' + id].texture.baseTexture.width) : Map.sprites['sprite-' + id].texture.baseTexture.width / (object.frames || 1);
					object.height = object.height ? min(object.height, Map.sprites['sprite-' + id].texture.baseTexture.height) : Map.sprites['sprite-' + id].texture.baseTexture.height;
				}
				object.speed = object.speed || 200;
				object.loaded = true;
				if (object.frames > 1) {
					object.loop = object.loop !== undefined ? object.loop : -1;
				}
				if (object.fade) {
					object.fading = Game.now + object.fade;
					if (!object.opacity) {
						object.opacity = 1;
					}
				}
			}
		} else if (!Map.sprites['sprite-' + id] && Game.inView(x, y + 16, object.width, object.height)) {
			Sprite.addToMap(object.actualX, object.actualY, object, id, true);
		}
		if (object.loaded) {
			if (!Map.threeD && Map.sprites['sprite-' + id] && !Game.inView(Map.sprites['sprite-' + id].position.x, Map.sprites['sprite-' + id].position.y, object.width, object.height)) {
				Sprite.removeFromMap(id, true);
			}
			if (object.frames >= 0) {
				object.frame = object.frames ? floor(object.last ? object.frames - 1 : floor(Game.now / object.speed) % (object.frames + (object.loop > 0 ? object.loop : 0))) : 0;
				if (!object.loop) {
					if (!object.frame) {
						object.ready = 1;
					}
					if (object.frame && !object.ready) {
						object.frame = 0;
					}
					if (object.frames && object.frame + 1 === object.frames) {
						object.last = 1;
						if (object.remove) {
							Sprite.removeFromMap(id);
						}
						if (object.success) {
							object.success();
							object.success = null;
						}
					}
					if (object.frames && !object.frame && object.last) {
						object.frames = 0;
					}
				}
			}
			if (object.fading && Game.now >= object.fading) {
				object.opacity -= 0.05;
				if (object.opacity <= 0) {
					Sprite.removeFromMap(id);
				}
			}
			if (Map.sprites['sprite-' + id]) {
				if (!Map.threeD) {
					Map.sprites['sprite-' + id].alpha = object.opacity >= 0 ? object.opacity : 1;
					Map.sprites['sprite-' + id].texture.setFrame({
						x: object.frames ? min(object.frame, object.frames - 1) * object.width : 0,
						y: 0,
						width: object.width,
						height: object.height
					});
				} else {
					Map.sprites['sprite-' + id].material.opacity = object.opacity >= 0 ? object.opacity : 1;
					Map.sprites['sprite-' + id].material.map.offset.set(object.frames ? min(object.frame, object.frames - 1) / object.frames : 0, 0);
				}
			}
			if (object.step) {
				object.step(object);
				if (Map.sprites['sprite-' + id]) {
					if (!Map.threeD) {
						Map.sprites['sprite-' + id].position.x = object.actualX;
						Map.sprites['sprite-' + id].position.y = object.actualY + 16 - object.actualZ;
					} else {
						Map.sprites['sprite-' + id].position.x = object.actualX;
						Map.sprites['sprite-' + id].position.z = object.actualY + 16;
					}
					if (object.depth && object.depth !== 1) {
						Map.sprites['sprite-' + id].depth = object.actualY + 16 + object.depth - 256;
					}
					if (Map.sprites['sprite-shadow-' + id]) {
						Map.sprites['sprite-shadow-' + id].position.x = object.actualX;
						Map.sprites['sprite-shadow-' + id].position.y = object.actualY + 16;
					}
				}
			} else if (Map.sprites['sprite-' + id]) {
				object.actualX = Map.sprites['sprite-' + id].position.x;
				object.actualY = Map.sprites['sprite-' + id].position.y - 16;
			}
		}
	};
	return id;
};