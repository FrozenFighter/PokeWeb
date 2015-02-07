var player;

// Set up the game object
var Game = Game || {};

Game.width = 356;
Game.height = 288;
Game.original = {
	width: Game.width,
	height: Game.height
};

// Tick tock!
Game.clock = function (initial) {
	Game.time = new Date(Date.now() * 7);
	Game.time = [Game.time.getUTCHours(), Game.time.getUTCMinutes(), Game.time.getUTCSeconds(), Game.time.getUTCDay()];
	if (Game.time[2] < 10 || initial) {
		$('sky-day').style.opacity = Game.time[0] > 5 && Game.time[0] < 19 ? 1 : 0;
		$('sky-night').style.opacity = Game.time[0] < 6 || Game.time[0] > 18 ? 1 : 0;
		$('cloud-1').style.opacity =
			$('cloud-2').style.opacity =
			$('cloud-3').style.opacity =
			Game.time[0] < 6 || Game.time[0] > 18 ? 0.1 : 1;
		Game.night = int($('sky-day').style.opacity) ? false : true;
		Game.dayLight = Game.night ? '0,0,35,0.6' : '';
		if (Map.threeDLight){
			Map.threeDLight.intensity = Game.night && !Map.interior ? 0.2 : 1;
		}
		Widgets.draw('clock');
	}
};

// Game init
Game.init = function () {
	WebFont.load({
		google: {
			families: ['Open Sans']
		},
		fontactive: function () {
			$('scene').style.opacity = 1;
			// Load the settings
			Settings.load();
			Game.resize(Settings.data.zoom);
			FunctionObject.initialise();
			// Load the current version number off the server
			AJAX({
				url: 'dynamic/version.php',
				success: function (result) {
					var style = {},
						direction = randomInt(0, 3),
						text = 'Welcome to <b>Pok&eacute;ngine</b>. To get started, log in using your credentials below. Press [enter] when you\'re done!'
							+ '<div id="login-error">...</div>'
							+ '<input id="login-username" value="' + (Settings.data.username || '') + '" maxlength="16">'
							+ '<input id="login-password" type="password" value="' + (Settings.data.password || '') + '">',
						unsupported = '';
					Game.version = result;
					Game.desktop = typeof process === 'object' && process.versions ? process.versions['node-webkit'] : false;
					Game.clock(1);
					setInterval(Game.clock, 1e3);
					style.left = [(window.innerWidth / 2) - 200, (window.innerWidth / 2) - 200, -400, window.innerWidth][direction] + 'px';
					style.top = [-200, window.innerHeight, (window.innerHeight / 2) - 128, (window.innerHeight / 2) - 128][direction] + 'px';
					window.stats = new Stats();
					stats.domElement.style.position = 'absolute';
					stats.domElement.style.right = '0px';
					stats.domElement.style.top = '2px';
					stats.domElement.style.zIndex = 1000000;
					Game.lighting = $('game-lighting').getContext('2d');
					document.body.appendChild(stats.domElement);
					// Create initial widgets
					Widgets.add('pokedex');
					Widgets.add('pokemon');
					Widgets.add('bag');
					Widgets.add('friends');
					Widgets.add('clock');
					// Set up the node-webkit object
					if (Game.desktop) {
						window.nodeWebkit = {};
						nodeWebkit.gui = require('nw.gui');
						nodeWebkit.win = nodeWebkit.gui.Window.get();
						nodeWebkit.win.on('new-win-policy', function (frame, url, policy) {
							policy.forceNewWindow();
						});
					}
					// Check browser support
					if (!$('game-fade').getContext('2d')) {
						unsupported = 'the canvas element';
					}
					if (window.localStorage === 'undefined') {
						unsupported += (unsupported ? ', and ' : '') + 'the Local Storage API';
					}
					if (window.WebSocket === 'undefined') {
						unsupported += (unsupported ? ', and ' : '') + 'the WebSocket API';
					}
					if (unsupported) {
						text = 'Oh no! Seems like your browser doesn\'t support ' + unsupported + '!';
						Game.error = true;
					}
					if ($('progress-container').getAttribute('data-build') !== Game.version) {
						text = 'Bummer! You\'re using version <b>' + $('progress-container').getAttribute('data-build') + '</b>, which is outdated...<br>Please refresh to load <b>v' + Game.version + '</b> in order to play!';
						Game.error = true;
					}
					Element.add({
						type: 'div',
						id: 'login-container',
						innerHTML: text,
						style: style
					});
					$('login-username').addEventListener('focus', function () {
						this.focused = true;
					});
					$('login-username').addEventListener('blur', function () {
						this.focused = false;
					});
					setTimeout(function () {
						$('login-container').style.left = ((window.innerWidth / 2) - 200) + 'px';
						$('login-container').style.top = ((window.innerHeight / 2) - 128) + 'px';
					}, 100);
					// Auto-login detected, because pressing Enter is so exhausting
					if (!Game.error && window.location.toString().indexOf('autologin') > -1) {
						setTimeout(function () {
							Keys.simulate('return');
						}, 500);
					}
				}
			});
		}
	});
};

// Window resizing
window.addEventListener('resize', Game.resize = function (zoom) {
	var i,
		stars = floor(randomInt(100, 150) * (window.innerWidth / 1440)),
		size,
		left,
		top,
		width,
		height,
		scrolled = typeof Chat === 'object' ? Chat.scrolled() : false,
		zoomArgument = zoom,
		originalZoom = Game.zoom,
		clouds = floor(window.innerWidth / 441);
	zoom = typeof zoomArgument === 'number' ? zoom : Game.zoom;
	if (typeof zoomArgument === 'object' ) {
		zoom = 1e3;
	}
	if (zoom < 0 || (typeof zoomArgument !== 'number' && Game.fullscreen)) {
		Game.zoom = zoom = floor((1 / Game.original.width) * window.innerWidth);
		Game.width = window.innerWidth / Game.zoom;
		Game.height = window.innerHeight / Game.zoom;
		Game.fullscreen = true;
	} else if (typeof zoomArgument === 'number' && Game.fullscreen) {
		Game.width = Game.original.width;
		Game.height = Game.original.height;
		Game.fullscreen = false;
	}
	if (!Game.fullscreen) {
		zoom = max(1, min(min(zoom, (window.innerHeight - 44) / Game.height), (window.innerWidth - Widgets.width - 24 - 250) / Game.width));
		zoom = floor(zoom);
	}
	Game.zoom = zoom;
	if (typeof zoomArgument === 'number' || zoom !== originalZoom) {
		width = floor(Game.width * zoom);
		height = floor(Game.height * zoom);
		if (Game.renderer) {
			if (Map.threeD) {
				Game.renderer.setSize(width, height);
				Game.camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
			} else {
				Game.renderer.resize(width, height);
				Game.containers.background.scale.set(zoom, zoom);
				Game.containers.map.scale.set(zoom, zoom);
				Game.containers.objects.scale.set(zoom, zoom);
				Game.containers.foreground.scale.set(zoom, zoom);
				Game.containers.tags.scale.set(zoom, zoom);
				Game.containers.radar.scale.set(zoom, zoom);
			}
		} else {
			$('game-map2D').width = $('game-map3D').width = width;
			$('game-map2D').height = $('game-map3D').height = height;
		}
		$('game').style.width = (width + 8) + 'px';
		$('game').style.height = (height + 8) + 'px';
		if (!Game.fullscreen) {
			$('game').style.top = '32px';
			$('game').style.right = (Widgets.width + 16) + 'px';
		} else {
			$('game').style.top = '-4px';
			$('game').style.right = '-4px';
		}
		if (Game.renderer && Game.renderer.type === PIXI.CANVAS_RENDERER) {
			$('game-map2D').imageSmoothing(false);
		}
		$('game-battle').width = $('game-lighting').width = $('game-fade').width = $('game-textbox').width = width;
		$('game-battle').height = $('game-lighting').height = $('game-fade').height = $('game-textbox').height = height;
		$('game-lighting').imageSmoothing(false);
		$('game-textbox').imageSmoothing(false);
		if (float($('game-fade').style.opacity)) {
			Game.fade(1);
		}
		Map.backgroundPopulate();
	}
	width = window.innerWidth - Widgets.width - (Game.width * Game.zoom) - 24;
	if (Game.fullscreen) {
		width = floor(window.innerWidth / 3);
	}
	if (window.innerWidth !== window.lastWidth || window.innerHeight !== window.lastHeight) {
		$('stars').clear();
		for (i = stars - 1; i >= 0; i -= 1) {
			size = randomInt(1, 2) + 'px';
			left = randomInt(window.innerWidth - int(size)) + 'px';
			top = randomInt(0, window.innerHeight - 250) + 'px';
			Element.add({
				type: 'div',
				parent: 'stars',
				className: 'star',
				style: {width: size, height: size, left: left, top: top}
			});
		}
		for (i = 0; i < 3; i += 1) {
			$('cloud-' + (i + 1)).style.left = floor((i * (window.innerWidth / clouds)) + randomInt((window.innerWidth / clouds) - 441)) + 'px';
			$('cloud-' + (i + 1)).style.bottom = randomInt(150, 300) + 'px';
			$('cloud-' + (i + 1)).style.display = clouds > i ? 'block' : 'none';
		}
		window.lastWidth = window.innerWidth;
		window.lastHeight = window.innerHeight;
	}
	$('chat-container').style.width = width + 'px';
	$('chat-container').style.height = window.innerHeight + 'px';
	$('chat-chat').style.width = (width - 8) + 'px';
	$('chat-chats').style.height = $('chat-chat').style.height = (window.innerHeight - $('chat-channels').clientHeight - 44 - (int($('chat-container').style.paddingTop) || 28) - $('chat-users').clientHeight) + 'px';
	if (!scrolled) {
		$('chat-chat').scrollTop = $('chat-chat').scrollHeight;
	}
	Widgets.resize();
	if ($('settings') && Settings.data.tab === 0) {
		Settings.draw();
	}
	if ($('login-container')) {
		$('login-container').style.left = ((window.innerWidth / 2) - 200) + 'px';
		$('login-container').style.top = ((window.innerHeight / 2) - 128) + 'px';
	}
});

// When the player presses a key
window.addEventListener('keydown', function (event) {
	var key = event.which;
	if (Settings.data.keySelected) {
		event.preventDefault();
		return;
	}
	if (player) {
		Chat.idle.restart();
	}
	if (Game.loggedIn && !Chat.focused && key === 8) {
		event.preventDefault();
	}
});

// Go back to the login screen
Game.login = function (error) {
	Server.close();
	$('chat-container').style.opacity = 0;
	$('motd-container').style.opacity = 0;
	$('game').style.opacity = 0;
	$('widgets').style.opacity = 0;
	$('login-container').style.visibility = 'visible';
	$('login-container').style.opacity = 1;
	$('login-error').style.opacity = error ? 1 : 0;
	$('login-error').innerHTML = error;
	setTimeout(function () {
		$('chat-container').style.visibility = 'hidden';
		$('motd-container').style.visibility = 'hidden';
		$('game').style.visibility = 'hidden';
		$('widgets').style.visibility = 'hidden';
		$('chat' + Chat.current).clear();
		$('chat-channels').clear();
		Game.resize();
		Game.loggedIn = false;
	}, 500);
};

// Tell us who you are!
Keys.addHandler(function (key, pressed) {
	if (!Game.loggedIn && pressed && key === 'return' && $('login-container').style.opacity !== '0' && $('login-username').value && $('login-password').value) {
		Settings.store('username', $('login-username').value);
		Settings.store('password', $('login-password').value);
		$('login-container').style.opacity = 0;
		if ($('progress-container')) {
			$('progress-container').remove();
		}
		$('chat-container').style.visibility = 'visible';
		$('motd-container').style.visibility = 'visible';
		$('game').style.visibility = 'visible';
		$('widgets').style.visibility = 'visible';
		$('chat-container').style.opacity = 1;
		$('motd-container').style.opacity = 1;
		$('game').style.opacity = 1;
		$('widgets').style.opacity = 1;
		Game.fade(1);
		setTimeout(function () {
			$('login-container').style.visibility = 'hidden';
			Game.createRenderer = function (check) {
				if (check) {
					if (Game.threeD !== undefined) {
					Map.threeD = Game.threeD;
					}
					if ((Map.threeD && $('game-map2D').style.display === 'block') || (!Map.threeD && $('game-map3D').style.display === 'block')) {
						Game.createRenderer();
						Lighting.update();
						return;
					}
				}
				var i,
					containers = ['background', 'map', 'objects', 'foreground', 'tags', 'radar', 'lights'];
				Game.containers = {};
				if (!Map.threeD) {
					PIXI.scaleModes.DEFAULT = PIXI.scaleModes.NEAREST;
					if (!Game.renderer2D) {
						if (Settings.data.canvasRenderer) {
							Game.renderer2D = new PIXI.CanvasRenderer(Game.width * Game.zoom, Game.height * Game.zoom, {
								view: $('game-map2D'),
								transparent: false
							});
						} else {
							Game.renderer2D = new PIXI.autoDetectRenderer(Game.width * Game.zoom, Game.height * Game.zoom, {
								view: $('game-map2D'),
								transparent: false
							});
						}
					}
					Game.renderer = Game.renderer2D;
					Game.stage = new PIXI.Stage(0x141414);
					for (i = 0; i < containers.length; i += 1) {
						Game.containers[containers[i]] = new PIXI.DisplayObjectContainer();
						Game.stage.addChild(Game.containers[containers[i]]);
					}
					$('game-map2D').style.display = 'block';
					$('game-map3D').style.display = 'none';
				} else {
					if (!Game.renderer3D) {
						Game.renderer3D = new THREE.WebGLRenderer({
							canvas: $('game-map3D'),
							antialias: true
						});
					}
					Game.renderer = Game.renderer3D;
					Game.renderer.setClearColor(0x141414, 1.0);
					Game.stage = new THREE.Scene();
					for (i = 0; i < containers.length; i += 1) {
						Game.containers[containers[i]] = new THREE.Object3D();
						Game.containers[containers[i]].addChild = Game.containers[containers[i]].add;
						Game.containers[containers[i]].removeChild = Game.containers[containers[i]].remove;
						Game.stage.add(Game.containers[containers[i]]);
					}
					Game.stage.removeChild = Game.stage.remove;
					Map.threeDLight = new THREE.DirectionalLight(0xFFFFFF, Game.night && !Map.interior ? 0.2 : 1);
					Map.threeDLight.position.set(100, 100, 50);
					Game.stage.add(Map.threeDLight);
					$('game-map2D').style.display = 'none';
					$('game-map3D').style.display = 'block';
				}
				Game.resize(Game.fullscreen ? -1 : Game.zoom);
			};
			if (!Game.renderer) {
				Game.createRenderer();
			}
			requestAnimationFrame(Game.update);
			Chat.join();
			Game.loggedIn = true;
			$('chat-input').blur();
		}, 500);
	}
	// Toggle the chat
	if (pressed && player) {
		if (Chat.focused && key === 'return') {
			if (!$('chat-input').value) {
				$('chat-input').blur();
			}
		} else if (!Chat.focused) {
			$('chat-input').focus();
			if (key === '/' && !$('chat-input').value) {
				$('chat-input').value = '/';
			}
		}
	}
}, ['return', '/']);

Game.addKeys = function () {
	// Player movement
	Keys.addHandler(function (key, pressed) {
		var keys = Settings.data.keys;
		if (pressed && !Textbox.active && !Chat.focused && Game.loggedIn && player && !float($('game-fade').style.opacity) && [keys.left, keys.right, keys.up, keys.down].contains(key) && !me().moving && !me().freeze && !me().path && me().x % 16 === 0 && me().y % 16 === 0) {
			var x,
				y,
				facing,
				obstacle;
			if (key === keys.left) {
				x = me().x - 16;
				y = me().y;
				facing = 3;
			}
			if (key === keys.up) {
				x = me().x;
				y = me().y - 16;
				facing = 1;
			}
			if (key === keys.right) {
				x = me().x + 16;
				y = me().y;
				facing = 2;
			}
			if (key === keys.down) {
				x = me().x;
				y = me().y + 16;
				facing = 0;
			}
			me().moving = true;
			me().bump = 25;
			if ((facing !== me().facing || Keys.held['S']) && !me().spinning) {
				if (!Keys.held['S']) {
					setTimeout(function () {
						me().frame = [0, 2, 2, 0][floor(me().frame)]
						if (Keys.held[key]) {
							obstacle = Map.placeCheck(x, y, false);
							if (obstacle === undefined) {
								return;
							}
							Server.relay([11, me().facing]);
							me().queue.push([x, y, obstacle]);
						} else {
							Server.relay([11, me().facing]);
							me().moving = false;
						}
					}, 100);
				} else {
					Server.relay([11, facing]);
					me().moving = false;
					me().frame = 0;
				}
				me().facing = facing;
				me().frame = Keys.held['S'] ? 0 : 1;
				return;
			}
			if (!me().spinning) {
				me().facing = facing;
			}
			obstacle = Map.placeCheck(x, y, false);
			if (obstacle === undefined) {
				return;
			}
			me().queue.push([x, y, obstacle]);
		}
	}, [Settings.data.keys.left, Settings.data.keys.up, Settings.data.keys.right, Settings.data.keys.down]);

	// Hot action key
	Keys.addHandler(function (key, pressed) {
		if (pressed && !Textbox.active && !Chat.focused && Game.loggedIn && player && !float($('game-fade').style.opacity)) {
			var entity,
				next = {x: me().x, y: me().y},
				opposite = [1, 0, 3, 2][me().facing],
				obj,
				current;
			next.x += me().facing === 2 ? 16 : (me().facing === 3 ? -16 : 0);
			next.y += me().facing === 0 ? 16 : (me().facing === 1 ? -16 : 0);
			entity = Entity.positionCheck(next.x, next.y);
			if (entity && entity[0] && entity[0] !== player && (!stat(entity[0]).movingTo || stat(entity[0]).movingTo === next.x + ',' + next.y)) {
				if (typeof entity[0] === 'number') {
					Entity.displayIcon(player, 1);
					Textbox.say('It\'s <colour:#347FE4>' + Chat.clean.username(stat(entity[0]).name) + '<colour:>...');
				} else {
					if (entity[0].substr(0, 4) === 'npc-') {
						if (!stat(entity[0]).ignore) {
							stat(entity[0]).queue.push(['facing', opposite]);
						}
						if (stat(entity[0]).dialog) {
							Game.message(stat(entity[0]).dialog, stat(entity[0]).answers || Map.object.get(13, next.x + ',' + next.y));
						}
					} else if (entity[0].substr(0, 5) === 'ally-') {
						if (stat(entity[0]).leader === player) {
							Textbox.say('It looks happy!');
							Entity.displayIcon('ally-' + player, 7);
						} else {
							if (typeof stat(entity[0]).leader === 'number') {
								Textbox.say('That\'s ' + Chat.clean.username(stat(stat(entity[0]).leader).name) + '\'s Pokemon. You should probably leave it alone.');
							} else {
								Textbox.say('Cute!');
							}
						}
					}
				}
				if (stat(entity[0]).skin < -999) {
					Game.audio(Skins.getURLById(stat(entity[0]).skin, 'cries/%dex%/%id%.ogg'));
				}
			} else {
				obj = Map.object.get(12, next.x +',' + next.y);
				if (obj) {
					Game.message(obj, Map.object.get(13, next.x +',' + next.y));
				}
			}
		}
	}, [Settings.data.keys.primary]);

	// Bunny hop!
	Keys.addHandler(function (key, pressed) {
		if (pressed && !Chat.focused && Game.loggedIn && player && !float($('game-fade').style.opacity) && !Textbox.active && !Keys.held['control'] && !me().z && !me().freeze && !me().path) {
			me().gravity = -2;
			Server.relay([20, -2]);
			Game.audio('jump.ogg');
		}
	}, [Settings.data.keys.tertiary]);
};

Game.addKeys();

// Change the zoom
Keys.addHandler(function (key, pressed) {
	if (pressed && !Chat.focused && Game.loggedIn) {
		Settings.store('zoom', int(key));
	}
}, ['1', '2', '3']);

// Bullet hell
Keys.addHandler(function (key, pressed) {
	if (pressed && !Chat.focused && Game.loggedIn && player && !float($('game-fade').style.opacity) && player === 1) {
		Bullet(me().x, me().y, me().facing, me().id);
		Server.relay([23]);
	}
}, ['E']);

// Run this like, a lot
Game.update = function (standalone) {
	var i;
	Game.now = Date.now();
	if (Game.draw || standalone === true) {
		if (!Map.threeD) {
			if (Map.background) {
				Game.containers.background.position.x = (-(Map.backgroundWidth - (Game.width / 2 - 8) % Map.backgroundWidth) - (abs(stat(Map.target).x) % Map.backgroundWidth)) * Game.zoom;
				Game.containers.background.position.y = (-(Map.backgroundHeight - (Game.width / 2) % Map.backgroundHeight) - (abs(stat(Map.target).y) % Map.backgroundHeight)) * Game.zoom;
			}
			Game.containers.map.position.x = -(stat(Map.target).x - (Game.width / 2 - 8)) * Game.zoom;
			Game.containers.map.position.y = -(stat(Map.target).y - (Game.height / 2)) * Game.zoom;
			Game.containers.objects.position.x = Game.containers.map.position.x;
			Game.containers.objects.position.y = Game.containers.map.position.y;
			Game.containers.foreground.position.x = Game.containers.map.position.x;
			Game.containers.foreground.position.y = Game.containers.map.position.y;
			Game.containers.tags.position.x = Game.containers.map.position.x;
			Game.containers.tags.position.y = Game.containers.map.position.y;
			Game.containers.radar.position.x = Game.containers.map.position.x;
			Game.containers.radar.position.y = Game.containers.map.position.y;
			Lighting.update();
			for (i in Map.spriteSteps) {
				if (Map.spriteSteps.hasOwnProperty(i)) {
					Map.spriteSteps[i]();
				}
			}
			Game.containers.objects.children.sort(function (first, second) {
				if (first.depth === second.depth) {
					return second.id - first.id;
				}
				return first.depth - second.depth;
			});
		} else {
			for (i in Map.spriteSteps) {
				if (Map.spriteSteps.hasOwnProperty(i)) {
					Map.spriteSteps[i]();
				}
			}
			if (Map.sprites['entity-' + Map.target]) {
				/*if (Game.camera.x !== Game.camera.position.x) {
					Game.camera.position.x += Game.camera.x > Game.camera.position.x ? 1 : -1;
				}
				if (Game.camera.y !== Game.camera.position.y) {
					Game.camera.position.y += Game.camera.y > Game.camera.position.y ? 1 : -1;
				}
				if (Game.camera.z !== Game.camera.position.z) {
					Game.camera.position.z += Game.camera.z > Game.camera.position.z ? 1 : -1;
				}*/
				//Game.camera.position.set(Map.sprites['entity-' + Map.target].position.x, -stat(Map.target).z + 100, Map.sprites['entity-' + Map.target].position.z + 200);
				Game.camera.position.set(
					Map.sprites['entity-' + Map.target].position.x,// + [0, 0, -100, 100][stat(Map.target).facing],
					-stat(Map.target).z + 90,
					Map.sprites['entity-' + Map.target].position.z + 200// + [-100, 100, 0, 0][stat(Map.target).facing]
				);
				Game.camera.lookAt({
					x: Map.sprites['entity-' + Map.target].position.x,
					y: -stat(Map.target).z,
					z: Map.sprites['entity-' + Map.target].position.z
				});
			}
		}
		Game.renderer.render(Game.stage, Game.camera);
	}
	if (Game.freezeAction && standalone !== true) {
		Game.freezeAction();
		Game.freezeAction = null;
	}
	stats.update();
	if (standalone !== true) {
		requestAnimationFrame(Game.update);
	}
};

// Fade the game in or out
Game.fade = function (opacity, onComplete, color) {
	var context = $('game-fade').getContext('2d');
	context.fillStyle = color || $('game-fade').getAttribute('data-color');
	$('game-fade').setAttribute('data-color', context.fillStyle);
	context.fillRect(0, 0, $('game-fade').width, $('game-fade').height);
	$('game-fade').style.opacity = opacity;
	if (onComplete) {
		setTimeout(onComplete, 500);
	}
};

// Set the Message of the Day
Game.MotD = function (message) {
	$('motd-inner').innerHTML = message.replace(/</g, '&lt;').urlify();
	$('motd-inner').title = message;
	if (me().rank.canMotD) {
		$('motd-inner').addEventListener('dblclick', function () {
			$('chat-input').value = '/motd ' + message;
			$('chat-input').focus();
		});
	}
};

// Take a screenshot
Game.screenshot = function () {
	if (Game.renderer) {
		var element = document.createElement('canvas'),
			image = new Image(),
			tab = window.open('http://'+window.location.host+'/yeah/game/screenshots?data','_blank');
		element.width = $('game-map2D').width;
		element.height = $('game-map2D').height;
		Game.renderer.render(Game.stage);
		image.src = Game.renderer.view.toDataURL();
		element.getContext('2d').drawImage(image, 0, 0);
		tab.addEventListener('load', function () {
			tab.document.getElementById('image').setAttribute('data-src', element.toDataURL());
			tab.document.getElementById('imgur').style.display = 'inline-block';
			tab.document.getElementById('no-screenshot').style.display = 'none';
			tab.document.getElementById('screenshot').style.display = 'block';
			tab.window.onscroll();
		});
	}
};

// Desktop notifications
Game.notify = function (title, body, click, force) {
	if (!force && !Settings.data.notifications) {
		return;
	}
	if (Notification.permission === 'default') {
		Notification.requestPermission(function (permission) {
			if (permission === 'granted') {
				Game.notify(title, body, click, force);
			}
		});
		return;
	}
	var notification = new Notification(title, {
		body: body,
		icon: '/play/images/favicon.png'
	});
	if (click) {
		notification.addEventListener('click', click);
	}
};

// Deal with messages
Game.message = function (msg, answers, triggers) {
	var i;
	if (triggers !== undefined) {
		if (triggers.indexOf('answers=') < 0) {
			Textbox.say(msg, null, function () {
				Game.trigger(triggers);
			});
		} else {
			var splitTriggers = triggers.split('&'),
				displayedAnswers = [];
			for (i = 0; i < splitTriggers.length; i += 1) {
				if (splitTriggers[i].substr(0, 8) === 'answers=') {
					displayedAnswers = splitTriggers[i].substr(8).split(',');
					break;
				}
			}
			Textbox.ask(msg, displayedAnswers, function (answer) {
				if (answers[answer]) {
					if (answers[answer][0]) {
						Game.message([1, [[answers[answer][0]], [answers[answer][1]]]]);
					} else {
						Game.trigger(answers[answer][1]);
					}
				}
			});
		}
		return;
	}
	for (i = 0; i < msg[msg[0]][0].length; i += 1) {
		Game.message(msg[msg[0]][0][i], answers, msg[msg[0]][1][i] || '');
	}
	msg[0] += 1;
	if (msg[0] >= msg.length) {
		msg[0] = 1;
	}
};

// Trigger-happy!
Game.trigger = function (triggers, target) {
	var i,
		trigger;
	remaining = triggers,
	triggers = triggers.split('&');
	target = target || player;
	for (i = 0; i < triggers.length; i += 1) {
		remaining = remaining.substr(triggers[i].length + 1);
		trigger = triggers[i].split('=');
		if (trigger[0] === 'with') {
			if (trigger[1] === 'player') {
				target = player;
			} else if (stat('npc-' + trigger[1]).id) {
				target = 'npc-' + trigger[1];
			} else if (stat(trigger[1]) && stat(trigger[1]).id) {
				target = trigger[1];
			}
		}
		if (trigger[0] === 'pause') {
			setTimeout(function () {
				Game.trigger(remaining);
			}, int(trigger[1]));
			return;
		}
		if (trigger[0] === 'jump' && !stat(target).z) {
			trigger[1] = -sqrt(min(1e3, max(5, int(trigger[1]) || 20)) / 5);
			stat(target).gravity = trigger[1];
			if (target === player) {
				Server.relay([20, trigger[1]]);
				Game.audio('jump.ogg');
			}
		}
		if (trigger[0] === 'speed') {
			stat(target).speed = int(trigger[1]) / 100;
		}
		if (trigger[0] === 'sfx') {
			Game.audio(trigger[1]);
		}
		if (trigger[0] === 'track') {
			Game.audio(trigger[1], true);
		}
		if (trigger[0] === 'cry') {
			var pokemon = Dex.getPokemonByName(trigger[1]);
			if (pokemon) {
				Game.audio('cries/' + pokemon.dex + '/' + pokemon.id + '.ogg');
			}
		}
		if (trigger[0] === 'filter') {
			if (trigger[1] === 'underwater') {
				var filter = new PIXI.DisplacementFilter(new PIXI.Texture.fromImage('images/displacement_map.png'));
				filter.count = 0;
				Game.stage.filters = [filter];
				clearInterval(Game.stage.filters[0].timer);
				filter.timer = setInterval(function () {
					filter.offset.x = filter.count * 10;
					filter.offset.y = filter.count * 10;
					filter.count += 0.1;
				}, 50);
			} else if (trigger[1] === 'pixelate') {
				var filter = new PIXI.PixelateFilter();
				filter.size.x = 4;
				filter.size.y = 4;
				Game.stage.filters = [filter];
			} else if (trigger[1] === 'dotscreen') {
				var filter = new PIXI.DotScreenFilter();
				Game.stage.filters = [filter];
			} else if (trigger[1] === 'rgbsplitter') {
				var filter = new PIXI.RGBSplitFilter();
				Game.stage.filters = [filter];
			} else if (trigger[1] === 'twist') {
				var filter = new PIXI.TwistFilter();
				Game.stage.filters = [filter];
			} else {
				if (Game.stage.filters) {
					clearInterval(Game.stage.filters[0].timer);
				}
				Game.stage.filters = null;
			}
		}
		trigger[2] = ['float', 'spin', 'trail', 'shadow', 'spymode', 'solid', 'nametag'].indexOf(trigger[0]);
		if (trigger[2] > -1 && ([undefined, 'true', 'false'].indexOf(trigger[1]) > -1 || target !== player)) {
			trigger[1] = trigger[1] === 'false' ? 0 : (trigger[1] >= 0 ? int(trigger[1]) : 1);
			if (target === player) {
				Server.relay([14, trigger[2], trigger[1]]);
			}
			stat(target).queue.push([Game.flags[trigger[2]], trigger[1]]);
		}
		if (trigger[0] === 'view') {
			if (Game.fullscreen) {
				Game.resize(2);
			}
			var size = trigger[1].split(',');
			if (size[0] === 'normal') {
				Game.width = Game.original.width;
				Game.height = Game.original.height;
				Game.zoom = 2;
			} else if (size[0] === 'max') {
				Game.zoom = -1;
			} else {
				Game.width = int(size[0]);
				Game.height = int(size[1]);
			}
			Game.resize(Game.zoom);
		}
		if (trigger[0] === 'icon') {
			trigger[1] = trigger[1].split(',');
			Entity.displayIcon(target, int(trigger[1][0]), trigger[1][1] ? true : false);
		}
		if (trigger[0] === 'lagtest') {
			Map.lagTest[trigger[1] === 'remove' ? 'remove' : (trigger[1] === 'jump' ? 'jump' : 'start')](min(100, int(trigger[1])));
		}
		if (trigger[0] === 'zoom') {
			Game.resize(float(trigger[1]));
		}
		if (trigger[0] === 'path') {
			if (trigger[1] === 'circle') {
				trigger[1] = '1r,1d,1l,1u*';
			}
			stat(target).path = trigger[1];
			stat(target).pathOriginal = trigger[1];
		}
		if (trigger[0] === 'follow') {
			if (!trigger[1]) {
				if (me().leader) {
					stat(me().leader).ally = -1;
					stat(me().leader).allyId = null;
					me().leader = null;
					me().following = null;
					me().freeze = false;
				}
			} else {
				var whom;
				if (stat(trigger[1]) && stat(trigger[1]).id) {
					whom = trigger[1];
				} else if (stat(int(trigger[1])) && stat(int(trigger[1])).id) {
					whom = int(trigger[1]);
				}
				if (whom) {
					var lastAlly = whom;
					while (1) {
						if (stat(lastAlly).ally !== -1) {
							lastAlly = stat(lastAlly).allyId;
						} else {
							break;
						}
					}
					stat(lastAlly).ally = player;
					stat(lastAlly).allyId = player;
					me().leader = lastAlly;
					me().following = trigger[2];
					me().freeze = true;
				}
			}
		}
		if (trigger[0] === 'freeze') {
			me().freeze = true;
		}
		if (trigger[0] === 'unfreeze') {
			me().freeze = false;
		}
		if (trigger[0] === 'warn') {
			Chat.print('==', 'Your warn level has been raised!');
		}
		if (trigger[0] === 'notify') {
			trigger[1] = trigger[1].split(',');
			Game.notify(trigger[1][0], trigger[1][1], null, true);
		}
		if (trigger[0] === '3D') {
			Game.threeD = trigger[1] === 'false' ? false : (trigger[1] === 'true' ? true : undefined);
			Game.draw = false;
			Game.fade(1, function () {
				Map.load(Map.current);
				Lighting.update();
			});
		}
		if (trigger[0] === 'mirror') {
			$('game').style.webkitTransform = 'scaleX(' + (int($('game').style.webkitTransform.substr(7)) < 0 ? 1 : -1) + ')';
		}
		if (trigger[0] === 'grayscale') {
			$('game').style.webkitFilter = int(trigger[1]) ? 'grayscale(' + trigger[1] + '%)' : '';
		}
		if (trigger[0] === 'sepia') {
			$('game').style.webkitFilter = int(trigger[1]) ? 'sepia(' + trigger[1] + '%)' : '';
		}
		if (trigger[0] === 'saturate') {
			$('game').style.webkitFilter = int(trigger[1]) ? 'saturate(' + trigger[1] + ')' : '';
		}
		if (trigger[0] === 'hue') {
			$('game').style.webkitFilter = int(trigger[1]) ? 'hue-rotate(' + trigger[1] + 'deg)' : '';
		}
		if (trigger[0] === 'invert') {
			$('game').style.webkitFilter = int(trigger[1]) ? 'invert(' + trigger[1] + '%)' : '';
		}
		if (trigger[0] === 'brightness') {
			$('game').style.webkitFilter = int(trigger[1]) ? 'brightness(' + trigger[1] + '%)' : '';
		}
		if (trigger[0] === 'blur') {
			$('game').style.webkitFilter = int(trigger[1]) ? 'blur(' + trigger[1] + 'px)' : '';
		}
		if (trigger[0] === 'flip' && trigger[1]) {
			trigger[1] = trigger[1].split(',');
			Game.flip(0, trigger[1][0], trigger[1][1]);
		}
		if (trigger[0] === 'flipx') {
			$('game').style.webkitTransform = int(trigger[1]) ? 'rotateX(' + trigger[1] + 'deg)' : '';
		}
		if (trigger[0] === 'flipy') {
			$('game').style.webkitTransform = int(trigger[1]) ? 'rotateY(' + trigger[1] + 'deg)' : '';
		}
		if (trigger[0] === 'flipz') {
			$('game').style.webkitTransform = int(trigger[1]) ? 'rotateZ(' + trigger[1] + 'deg)' : '';
		}
		if (trigger[0] === 'disco') {
			trigger[1] = trigger[1] ? trigger[1].split(',') : [1, ''];
			Game.disco(0, max(1, int(trigger[1][0])), trigger[1][1]);
		}
	}
};

// My game got flipped, turned upside down!
Game.flip = function (degree, axis, other) {
	var i,
		transformation = '';
	for (i = 0; i < axis.length; i += 1) {
		transformation += ' rotate' + axis[i].toUpperCase() + '(' + degree + 'deg)';
	}
	$(other || 'game').style.webkitTransform = degree < 360 ? transformation.substr(1) : '';
	if (degree < 360) {
		setTimeout(function () {
			Game.flip(degree + 1, axis, other);
		}, 10);
	}
};

// Let's party
Game.disco = function (degree, times, other) {
	degree += 1;
	if (degree > 360) {
		degree = 0;
		times -= 1;
	}
	$(other || 'game').style.webkitFilter = 'hue-rotate(' + degree + 'deg)';
	if (times) {
		setTimeout(function () {
			Game.disco(degree, times, other);
		}, 10);
	}
};

// Check whether something is in view
Game.inView = function (x, y, width, height) {
	return x > stat(Map.target).x + 8 - width - (Game.width / 2)
		&& x < stat(Map.target).x + 8 + width + (Game.width / 2)
		&& y > stat(Map.target).y - height  - (Game.height / 2)
		&& y < stat(Map.target).y + height  + (Game.height / 2);
};

// Map object
var Map = {
	target: 0,
	tileMap: {
		map: {},
		foreground: {}
	},
	offset: {
		x: 0,
		y: 0
	},
	original: {},
	sprites: {},
	spriteSteps: {},
	radarSteps: {}
};

// Load a map
Map.load = function (map, fadeout, state, success) {
	if (!state) {
		var load = function () {
				loadScript([Cache.getURL('scripts/data/maps/' + map + '.js')], function () {
					if (success) {
						success();
						return;
					}
					Map.reset();
					Map.current = map;
					Map.data();
					me().map = map;
					if (typeof me().spawnId === 'number') {
						if (Map.object.get(8, me().spawnId)) {
							me().x = Map.object[8][me().spawnId][0];
							me().y = Map.object[8][me().spawnId][1];
							if (Map.object[8][me().spawnId][2] !== 4) {
								me().facing = Map.object[8][me().spawnId][2];
							}
						} else {
							Map.load(2);
							return;
						}
						Server.relay([9, me().x, me().y, map, me().facing]);
						me().spawnId = null;
					}
					Map.generate(1, Map.file);
				}, 0, 1, function () {
					Game.draw = true;
					if (fadeout) {
						Game.fade(0);
					}
				});
			};
		Game.draw = false;
		if (fadeout) {
			Game.fade(1, load);
		} else {
			load();
		}
	}
	if (state === 1) {
		Map.original.width = Map.width;
		Map.original.height = Map.height;
		Map.original.current = Map.current;
		Map.original.data = Map.data;
	}
	if (state >= 1 && state <= 4) {
		var side = ['n', 's', 'w', 'e'][state - 1];
		if (Map.side[side]) {
			loadScript([Cache.getURL('scripts/data/maps/' + Map.side[side][0] + '.js')], function () {
				Map.offset.x = [Map.side.n[2], Map.side.s[2], -Map.side.w[3], Map.original.width][state - 1];
				Map.offset.y = [-Map.side.n[4], Map.original.height, Map.side.w[2], Map.side.e[2]][state - 1];
				Map.current = Map.side[side][0];
				Map.data(true);
				Map.generate(state + 1, Map.side[side][1]);
			}, 0, 1);
		} else {
			Map.load(null, null, state + 1);
		}
	}
	if (state === 5) {
		if (Map.underwater) {
			Game.trigger('filter=underwater');
		} else if (Game.stage.filters) {
			Game.trigger('filter');
		}
		Map.offset.x = 0;
		Map.offset.y = 0;
		Map.width = Map.original.width;
		Map.height = Map.original.height;
		Map.current = Map.original.current;
		Map.data = Map.original.data;
		Entity.addToMap(player);
		Game.draw = true;
		Map.placeCheck(me().x, me().y, true);
		Server.relay([12, Map.current]);
		me().freeze = false;
		if (float($('game-fade').style.opacity)) {
			Game.fade(0);
		}
		if (Keys.held[Keys.name(Settings.data.keys.right)]) {
			Keys.simulate(Settings.data.keys.right);
		}
		if (Keys.held[Keys.name(Settings.data.keys.left)]) {
			Keys.simulate(Settings.data.keys.left);
		}
		if (Keys.held[Keys.name(Settings.data.keys.up)]) {
			Keys.simulate(Settings.data.keys.up);
		}
		if (Keys.held[Keys.name(Settings.data.keys.down)]) {
			Keys.simulate(Settings.data.keys.down);
		}
		Game.audio(Map.audio ? (Map.audio.substr(0, 3) === 'sc:' ? Map.audio : 'tracks/' + Map.audio + '.ogg') : '', true);
	}
};

Map.generate = function (loadNext, file, tileData, iterator, tileset, x, y, atPiece, foreground) {
	if (file) {
		if (Map.tileMap.map[Map.current] && !Map.threeD) {
			Map.backgroundPopulate();
			Game.containers.map.addChild(Map.tileMap.map[Map.current]);
			Map.tileMap.map[Map.current].position.x = Map.offset.x;
			Map.tileMap.map[Map.current].position.y = Map.offset.y;
			if (Map.tileMap.foreground[Map.current]) {
				Game.containers.foreground.addChild(Map.tileMap.foreground[Map.current]);
				Map.tileMap.foreground[Map.current].position.x = Map.offset.x;
				Map.tileMap.foreground[Map.current].position.y = Map.offset.y;
			}
			Map.load(null, null, loadNext);
			return;
		}
		loadScript([Cache.getURL('scripts/data/pms/' + file + '.js')], function () {
			Map.tileMap.map[Map.current] = document.createElement('canvas');
			Map.tileMap.map[Map.current].width = Map.PMS[0];
			Map.tileMap.map[Map.current].height = Map.PMS[1];
			Map.tileMap.foreground[Map.current] = document.createElement('canvas');
			Map.tileMap.foreground[Map.current].width = Map.PMS[0];
			Map.tileMap.foreground[Map.current].height = Map.PMS[1];
			Map.generate(loadNext, null, Map.PMS, 3, 0, 0, 0, 0, false);
		}, 0, 1, function () {
			Map.load(null, null, loadNext);
		});
	} else if (Map.tileMap.map[Map.current]) {
		var i,
			j,
			piece,
			tile,
			layer,
			context = {
				map: Map.tileMap.map[Map.current].getContext('2d'),
				foreground: Map.tileMap.foreground[Map.current].getContext('2d')
			},
			tilesetLoad = function () {
				Map.generate(loadNext, file, tileData, i, tileset, x, y, j, foreground);
			};
		for (i = iterator; i < tileData.length; i += 1) {
			piece = tileData[i];
			if (typeof piece !== 'object') {
				piece = [piece];
			}
			layer = 0;
			for (j = atPiece; j < piece.length; j += 1) {
				tile = piece[j];
				if (tile !== 0) {
					if (tile < 0) {
						tileset = abs(tile) - 1;
						continue;
					} else {
						if (!Sprites['images/tilesets/' + tileset + '.png']) {
							Sprite.load({
								sprite: 'images/tilesets/' + tileset + '.png',
								success: tilesetLoad
							});
							return;
						}
						context[layer >= tileData[2] - 1 ? 'foreground' : 'map'].drawImage(Sprites['images/tilesets/' + tileset + '.png'],
							((tile -= 1) % 16) * 16,
							floor(tile / 16) * 16,
							16,
							16,
							x,
							y,
							16,
							16);
						if (layer >= tileData[2] - 1) {
							foreground = true;
						}
					}
				}
				layer += 1;
			}
			if (tile > -1) {
				if ((x += 16) >= tileData[0]) {
					y += 16;
					x = 0;
				}
			}
			atPiece = 0;
		}
		if (Map.threeD) {
			var texture = new THREE.Texture(Map.tileMap.map[Map.current]),
				material = new THREE.MeshPhongMaterial({
					map: texture,
					transparent: true
				}),
				geometry = new THREE.PlaneBufferGeometry(Map.PMS[0], Map.PMS[1], 10, 10),
				plane = new THREE.Mesh(geometry, material);
			texture.magFilter = THREE.NearestFilter;
			texture.minFilter = THREE.NearestFilter;
			texture.needsUpdate = true;
			plane.rotation.x = -PI / 2;
			plane.position.x = (Map.PMS[0] / 2) + Map.offset.x;
			plane.position.z = (Map.PMS[1] / 2) + Map.offset.y;
			Game.containers.map.add(plane);
			Map.tileMap.map[Map.current] = null;
			Map.tileMap.foreground[Map.current] = null;
			Map.load(null, null, loadNext);
			return;
		}
		Map.backgroundPopulate();
		Map.tileMap.map[Map.current] = new PIXI.Sprite(new PIXI.Texture.fromImage(Map.tileMap.map[Map.current].toDataURL()));
		Map.tileMap.map[Map.current].position.x = Map.offset.x;
		Map.tileMap.map[Map.current].position.y = Map.offset.y;
		Game.containers.map.addChild(Map.tileMap.map[Map.current]);
		if (foreground) {
			Map.tileMap.foreground[Map.current] = new PIXI.Sprite(new PIXI.Texture.fromImage(Map.tileMap.foreground[Map.current].toDataURL()));
			Map.tileMap.foreground[Map.current].position.x = Map.offset.x;
			Map.tileMap.foreground[Map.current].position.y = Map.offset.y;
			Game.containers.foreground.addChild(Map.tileMap.foreground[Map.current]);
		} else {
			Map.tileMap.foreground[Map.current] = null;
		}
		Map.load(null, null, loadNext);
	} else {
		Map.load(null, null, loadNext);
	}
};

// Animate the map's background
Map.backgroundPopulate = function (x, y) {
	var asset,
		i;
	if (typeof x === 'undefined') {
		if (Game.containers && Game.containers.background.children.length) {
			for (i = Game.containers.background.children.length - 1; i >= 0; i -= 1) {
				Game.containers.background.removeChild(Game.containers.background.children[i]);
			}
		}
		if (Map.background && !Map.threeD) {
			asset = new PIXI.AssetLoader(['images/sprites/' + Map.background]);
			asset.onComplete = function () {
				var width = floor(PIXI.Texture.fromImage('images/sprites/' + Map.background).baseTexture.width / max(1, Map.backgroundFrames)),
					height = PIXI.Texture.fromImage('images/sprites/' + Map.background).baseTexture.height,
					i,
					j;
				Map.backgroundWidth = width;
				Map.backgroundHeight = height;
				for (i = 0; i < Game.width + (width * 2); i += width) {
					for (j = 0; j < Game.height + (height * 2); j += height) {
						Map.backgroundPopulate(i, j);
					}
				}
			};
			asset.load();
		}
	} else {
		asset = new PIXI.Sprite(new PIXI.Texture.fromImage('images/sprites/' + Map.background));
		Map.spriteSteps['background-' + x + ',' + y] = function () {
			if (!Map.sprites['background-' + x + ',' + y].visible && Map.sprites['background-' + x + ',' + y].texture.baseTexture.hasLoaded) {
				Map.sprites['background-' + x + ',' + y].visible = true;
			}
			if (Map.backgroundFrames && Map.backgroundSpeed) {
				Map.sprites['background-' + x + ',' + y].texture.setFrame({
					x: (floor(Game.now / Map.backgroundSpeed) % Map.backgroundFrames) * Map.backgroundWidth,
					y: 0,
					width: Map.backgroundWidth,
					height: Map.backgroundHeight
				});
			}
		};
		asset.position.x = x;
		asset.position.y = y;
		asset.visible = false;
		Game.containers.background.addChild(asset);
		Map.sprites['background-' + x + ',' + y] = asset;
	}
};

// Test that lag!
Map.lagTest = {
	start: function (amount) {
		var i,
			entity,
			missing = 1;
		amount = amount || floor(Map.width / 16) * floor(Map.height / 16);
		Map.lagTest.remove();
		for (i = 1; i <= amount; i += 1) {
			if (!stat(i).name) {
				entity = Entity.add(i);
				entity.skin = 0;
				entity.x = ((missing - 1) % floor(Map.width / 16)) * 16;
				entity.y = floor((missing - 1) / (Map.width / 16)) * 16;
				entity.map = Map.current;
				entity.sideMap = Map.sideData(entity.map);
				entity.facing = randomInt(0, 3);
				Entity.addToMap(i);
			} else {
				missing -= 1;
				amount += 1;
			}
			missing += 1;
		}
		Map.lagTest.testing = true;
	},
	jump: function () {
	var i;
		for (i in Entity) {
			if (Entity.hasOwnProperty(i) && stat(int(i)).id && !stat(int(i)).name) {
				stat(int(i)).queue.push(['jump', -(1 + randomInt(0, 3))]);
			}
		}
	},
	remove: function () {
		var i;
		for (i in Entity) {
			if (Entity.hasOwnProperty(i) && stat(int(i)).id && !stat(int(i)).name) {
				Entity.remove(int(i), true);
			}
		}
		Map.lagTest.testing = false;
	}
};

// Check if side-map
Map.sideData = function (map) {
	var details = {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		visible: false
	};
	if (map === Map.side.n[0]) {
		details.visible = true;
		details.x = Map.side.n[2];
		details.y = -Map.side.n[4];
		details.width = Map.side.n[3];
		details.height = Map.side.n[4];
	}
	if (map === Map.side.s[0]) {
		details.visible = true;
		details.x = Map.side.s[2];
		details.y = Map.height;
		details.width = Map.side.s[3];
		details.height = Map.side.s[4];
	}
	if (map === Map.side.w[0]) {
		details.visible = true;
		details.x = -Map.side.w[3];
		details.y = Map.side.w[2];
		details.width = Map.side.w[3];
		details.height = Map.side.w[4];
	}
	if (map === Map.side.e[0]) {
		details.visible = true;
		details.x = Map.width;
		details.y = Map.side.e[2];
		details.width = Map.side.e[3];
		details.height = Map.side.e[4];
	}
	if (map === Map.current) {
		details.visible = true;
		details.width = Map.width;
		details.height = Map.height;
	}
	return details;
};

// Load next map
Map.next = function (map, x, y, facing) {
	Game.freezeAction = function () {
		Game.draw = false;
		me().stop();
		me().queue.splice(0, 1);
		Game.update(true);
		me().x = x;
		me().y = y;
		me().facing = facing;
		Server.relay([9, x, y, map, facing]);
		Map.load(map);
	};
};

// Check a tile for object data
Map.placeCheck = function (x, y, current) {
	var position = x + ',' + y,
		obj,
		height = Map.object.get(11, position),
		target = typeof current === 'boolean' ? player : (typeof current === 'object' ? -1 : current),
		targetStat = typeof current === 'object' ? current : stat(target);
	if (current === true) {
		if (y < 0 && Map.side.n[0]) {
			Map.next(Map.side.n[0], me().x - Map.side.n[2], Map.side.n[4] + me().y, 1);
			return;
		}
		if (y >= Map.height && Map.side.s[0]) {
			Map.next(Map.side.s[0], me().x - Map.side.s[2], me().y - Map.height, 0);
			return;
		}
		if (x < 0 && Map.side.w[0]) {
			Map.next(Map.side.w[0], Map.side.w[3] + me().x, me().y - Map.side.w[2], 3);
			return;
		}
		if (x >= Map.width && Map.side.e[0]) {
			Map.next(Map.side.e[0], me().x - Map.width, me().y - Map.side.e[2], 2);
			return;
		}
		obj = Map.object.get(7, position);
		if (obj && (!height || (height > me().z))) {
			if (obj[2]) {
				Game.trigger(obj[2]);
			}
			Game.draw = false;
			me().stop();
			me().queue.splice(0, 1);
			Game.update(true);
			Game.freezeAction = function () {
				me().spawnId = obj[1];
				Map.load(obj[0], true);
			};
			return;
		}
	}
	if (current === false) {
		obj = Map.object.get(2, position);
		if (obj && !Game.cheats.walkThroughWalls) {
			if ((obj[0].indexOf(me().facing) > -1 || obj[0].indexOf(4) > -1) && !me().z) {
				var index = obj[0].indexOf(me().facing);
				if (obj[0].indexOf(4) > -1) {
					index = obj[0].indexOf(4);
				}
				Game.trigger('jump=' + (obj[1][index] || 20) + '&path=' + (obj[2][index] || 2) + ['d', 'u', 'r', 'l'][me().facing]);
				return;
			}
			return 1;
		}
		obj = Map.object.get(9, position);
		if (obj) {
			if (obj[2]) {
				Game.trigger(obj[2]);
			}
			if (!obj[2] || (obj[2] && obj[2].indexOf('sfx=') < 0)) {
				Game.audio('door_exit.ogg');
			}
			Game.draw = false;
			me().stop();
			me().queue.splice(0, 1);
			Game.update(true);
			Game.freezeAction = function () {
				me().spawnId = obj[1];
				Map.load(obj[0], true);
			};
			return;
		}
		obj = Map.object.get(10, position);
		if (obj) {
			if (obj[5]) {
				Game.trigger(obj[5]);
			}
			if (!obj[5] || (obj[5] && obj[5].indexOf('sfx=') < 0)) {
				Game.audio('door_exit.ogg');
			}
			me().stop();
			me().queue.splice(0, 1);
			Sprite.addToMap(x + obj[3], y + obj[4], {
				sprite: 'images/doors/' + obj[0] + '.png',
				frames: 4,
				loop: 0,
				speed: 100,
				success: function () {
					me().queue.push([me().x + [0, 0, 16, -16][me().facing], me().y + [16, -16, 0, 0][me().facing]]);
					setTimeout(function () {
						Game.freezeAction = function () {
							me().spawnId = obj[2];
							Map.load(obj[1], true);
						};
					}, 500);
				}
			});
			me().facing = me().x > x ? 3 : (me().x < x ? 2 : (me().y < y ? 0 : 1));
			return;
		}
		if (height && height < 0 && !me().z) {
			Game.trigger('float=true&shadow=false');
		}
	}
	if (typeof current === 'boolean' && (Game.cheats.walkThroughWalls || (height > 0 && abs(me().z) >= height))) {
		return 0;
	}
	obj = Map.object.get(0, position);
	if (obj) {
		if (obj.indexOf(5) > -1) {
			return 1;
		}
		if (
			(obj.indexOf(1) > -1 && (targetStat.spinning || targetStat.facing === 1))
			|| (obj.indexOf(2) > -1 && (targetStat.spinning || targetStat.facing === 0))
			|| (obj.indexOf(3) > -1 && (targetStat.spinning || targetStat.facing === 3))
			|| (obj.indexOf(4) > -1 && (targetStat.spinning || targetStat.facing === 2))
			) {
			return 1;
		}
	}
	if (Map.object.get(12, position)) {
		return 1;
	}
	if (current !== true && targetStat.checkEntity !== false) {
		obj = Entity.positionCheck(x + targetStat.sideMap.x, y + targetStat.sideMap.y, target);
		if (obj && ((target === player && obj[1]) || (target !== player && obj[3]))) {
			return 1;
		}
	}
	if (target === player && me().floating && height >= 0) {
		Game.trigger('float=false&shadow=true');
	}
	if (target !== player) {
		if (Map.object.get(2, position) || Map.object.get(9, position) || Map.object.get(10, position)) {
			return 1;
		}
	}
	return 0;
};

// Add a 3D cube
Map.addCube = function (x, y, color) {
	if (Map.threeD) {
		var block = new THREE.Mesh(
			new THREE.BoxGeometry(16, 16, 16),
			new THREE.MeshLambertMaterial({color: color})
		);
		block.position.set(x + 8, 8, y + 8);
		Game.containers.objects.addChild(block);
	}
};

// Add objects to a map
Map.object = [];

Map.object.set = function () {
	var arg = arguments,
		x = arg[1] + Map.offset.x,
		y = arg[2] + Map.offset.y,
		position = x + ',' + y,
		i,
		width = Game.width / 2,
		height = Game.height / 2;
	if (x < -width || x > Map.width + width || y < -height || y > Map.height + height) {
		return;
	}
	// Solid objects
	if (!arg[0]) {
		for (i = 1; i < arg.length; i += 2) {
			position = (floor(arg[i]) + Map.offset.x) + ',' + (arg[i + 1] + Map.offset.y);
			Map.object.create(0, position, '');
			arg[i] = arg[i].toString().split('.');
			Map.object[0][position] += arg[i][1] || '5';
		}
	}
	// Sand
	if (arg[0] === 1) {
		Map.object.create(1, position, true);
	}
	// Ledges
	if (arg[0] === 2) {
		Map.object.create(2, position, ['', [], []]);
		Map.object[2][position][0] += arg[3].toString();
		Map.object[2][position][1].push(arg[4]);
		Map.object[2][position][2].push(arg[5]);
	}
	// Sprites and animations
	if (arg[0] === 3 || arg[0] === 4) {
		Sprite.addToMap(x, y, {
			sprite: 'images/' + (arg[3][0] === '!' ? 'tilesets/' + arg[3].substr(1) : 'sprites/' + arg[3]),
			depth: arg[4],
			x: arg[5],
			y: arg[6],
			width: arg[7],
			height: arg[8],
			frames: arg[0] === 3 ? undefined : arg[9],
			speed: arg[10],
			loop: arg[11],
			opacity: arg[arg[0] === 3 ? 9 : 12],
			rotateX: (arg[arg[0] === 3 ? 10 : 13] || 0) * (PI / 180),
			rotateY: (arg[arg[0] === 3 ? 11 : 14] || 0) * (PI / 180),
			rotateZ: (arg[arg[0] === 3 ? 12 : 15] || 0) * (PI / 180),
			z: arg[arg[0] === 3 ? 13 : 16] || 0
		});
	}
	// NPCs
	if (arg[0] === 5) {
		arg[3] = arg[3] || (Map.current + ',' + arg[1] + ',' + arg[2]);
		var existing = {},
			entity = Entity.add('npc-' + arg[3]);
		entity.map = Map.current;
		entity.sideMap = Map.sideData(entity.map);
		entity.x = existing.id ? existing.x : arg[1];
		entity.y = existing.id ? existing.y : arg[2];
		entity.x = floor(entity.x / 16) * 16;
		entity.y = floor(entity.y / 16) * 16;
		entity.fromX = existing.id ? existing.fromX : 0;
		entity.fromY = existing.id ? existing.fromY : 0;
		entity.nameSet('npc-' + arg[3]);
		entity.skin = Skins.getId(arg[4])[0];
		entity.facing = existing.id ? existing.facing : arg[5];
		entity.queue = existing.id ? existing.queue : [];
		entity.path = existing.id ? existing.path : arg[6];
		entity.pathOriginal = existing.id ? existing.pathOriginal : arg[6];
		entity.solid = 1;
		Entity.addToMap('npc-' + arg[3]);
	}
	if (arg[0] === 6) {
		var entity = stat('npc-' + arg[2]);
		if (!entity.id) {
			return;
		}
		if (arg[1] === 0 && !entity.path) {
			entity.path = arg[3];
			entity.pathOriginal = entity.path;
		}
		if (arg[1] === 1) {
			entity.queue.push(['showShadow', false]);
		}
		if (arg[1] === 2) {
			entity.queue.push(['floating', arg[3]]);
		}
		if (arg[1] === 3) {
			entity.speed = arg[3] / 100;
			Entity.refresh('npc-' + arg[2]);
		}
		if (arg[1] === 4) {
			entity.queue.push(['solid', false]);
		}
		if (arg[1] === 5) {
			entity.ignore = true;
		}
		if (arg[1] === 6) {
			Entity.addAlly(entity.id, Skins.getId(arg[3])[1]);
		}
	}
	// Warp
	if (arg[0] === 7) {
		Map.object.create(7, position, [arg[3], arg[4], arg[5]]);
	}
	// Spawn
	if (arg[0] === 8 && !Map.offset.x && !Map.offset.y) {
		Map.object[8] = Map.object[8] || {};
		Map.object[8][arg[3]] = [x, y, arg[4]];
	}
	// Exit
	if (arg[0] === 9) {
		Map.object.create(9, position, [arg[3], arg[4], arg[5]]);
	}
	// Door
	if (arg[0] === 10) {
		Map.object.create(10, position, [arg[3], arg[4], arg[5], arg[6], arg[7], arg[8]]);
	}
	// Height
	if (arg[0] === 11) {
		Map.object.create(11, position, arg[3]);
	}
	// Message
	if (arg[0] === 12) {
		if (arg[5]) {
			if (stat('npc-' + arg[5]).id) {
				if (!stat('npc-' + arg[5]).dialog) {
					stat('npc-' + arg[5]).dialog = [1];
				}
				stat('npc-' + arg[5]).dialog.push([arg[3].split('|'), (arg[4] || '').split('|')]);
			}
		} else {
			Map.object.create(12, position, [1]);
			Map.object[12][position].push([arg[3].split('|'), (arg[4] || '').split('|')]);
		}
	}
	// Answer
	if (arg[0] === 13) {
		if (arg[6]) {
			if (stat('npc-' + arg[6]).id) {
				if (!stat('npc-' + arg[6]).answers) {
					stat('npc-' + arg[6]).answers = {};
				}
				stat('npc-' + arg[6]).answers[arg[3]] = [arg[4] || '', arg[5] || ''];
			}
		} else {
			Map.object.create(13, position, {});
			Map.object[13][position][arg[3]] = [arg[4] || '', arg[5] || ''];
		}
	}
	// Glow
	if (arg[0] === 14) {
		if (!Map.threeD) {
			Map.spriteSteps['glow-' + random()] = function () {
				Lighting.glow(x, y, 0, [arg[3], arg[5], arg[4]]);
			}
		} else {
			light = new THREE.PointLight(0xFFFFFF, 1, arg[3]);
			light.position.set(x, 20, y);
			Game.containers.lights.add(light);
		}
	}
	// Cutout
	if (arg[0] === 15) {
		Map.spriteSteps['cutout-' + random()] = function () {
			Lighting.cutout(x, y, 'images/sprites/' + arg[3], arg[4] || 1);
		}
	}
	// Lightbeam
	if (arg[0] === 16) {
		if (arg.length === 7) {
			Map.object.create(16, position, {
				x: arg[3] + Map.offset.x,
				y: arg[4] + Map.offset.y,
				startWidth: arg[5],
				endWidth: arg[6],
				colorOpacity: 0.3,
				speed: 1,
				circleRadius: 0,
				sync: random()
			});
			Map.lastLightbeam = position;
			Map.spriteSteps['lightbeam-' + random()] = function () {
				Lighting.lightbeam(x, y, Map.object[16][position]);
			}
		} else {
			if (!arg[1]) {
				Map.object[16][Map.lastLightbeam].circleRadius = arg[2];
				Map.object[16][Map.lastLightbeam].speed = arg[3] || 1;
			}
			if (arg[1] === 1) {
				Map.object[16][Map.lastLightbeam].color = arg[2];
				Map.object[16][Map.lastLightbeam].colorOpacity = arg[3] || 0.3;
			}
			if (arg[1] === 2) {
				Map.object[16][Map.lastLightbeam].flicker = true;
			}
			if (arg[1] === 3) {
				Map.object[16][Map.lastLightbeam].fade = true;
			}
			if (arg[1] === 4) {
				Map.object[16][Map.lastLightbeam].sync = arg[2];
			}
		}
	}
};

// Get an object
Map.object.get = function (object, position) {
	return Map.object[object] ? Map.object[object][position] : undefined;
};

// Create an object's object
Map.object.create = function (object, position, value) {
	Map.object[object] = Map.object[object] || {};
	Map.object[object][position] = Map.object[object][position] || value;
};

// Reset all the map variables
Map.reset = function () {
	var i,
		j,
		setObjects = Map.object.set,
		getObjects = Map.object.get,
		createObjects = Map.object.create;
	for (i in Game.containers) {
		if (Game.containers.hasOwnProperty(i) && Game.containers[i].children.length) {
			for (j = Game.containers[i].children.length - 1; j >= 0; j -= 1) {
				Game.containers[i].removeChild(Game.containers[i].children[j]);
			}
		}
	}
	Map.audio = '';
	Map.nameHide = false;
	Map.region = -1;
	Map.background = '';
	Map.backgroundFrames = 1;
	Map.backgroundSpeed = 200;
	Map.interior = false;
	Map.cave = false;
	Map.underwater = false;
	Map.lighting = false;
	Map.race = false;
	Map.retro = false;
	Map.threeD = false;
	Map.side = {
		n: 0,
		e: 0,
		s: 0,
		w: 0
	};
	Map.sprites = {};
	Map.spriteSteps = {};
	Map.radarSteps = {};
	Map.object = [];
	Map.object.set = setObjects;
	Map.object.get = getObjects;
	Map.object.create = createObjects;
	Entity.positions = {};
	if (Map.lagTest.testing) {
		Map.lagTest.remove();
	}
};

Map.reset();

// Ride the bullet
Bullet = function (x, y, direction, shooter) {
	var id = 'bullet' + random(),
		speed = 4;
	x += 6;
	Sprite.addToMap(x, y, {
		sprite: 'images/bullet.gif',
		fade: 4e3,
		shadow: true,
		depth: 256,
		z: 8 - stat(shooter).z,
		step: function (object) {
			object.actualX += [0, 0, speed, -speed][direction];
			object.actualY += [speed, -speed, 0, 0][direction];
			x = floor(object.actualX / 16) * 16;
			y = floor(object.actualY / 16) * 16;
			if (Entity.positions[x + ',' + y] && Entity.positions[x + ',' + y][0] !== shooter && object.actualZ >= abs(stat(Entity.positions[x + ',' + y][0]).z) && object.actualZ < abs(stat(Entity.positions[x + ',' + y][0]).z) + 32) {
				Sprite.removeFromMap(id);
			}
			if (shooter !== player && x >= me().x && x < me().x + 16 && y >= me().y && y < me().y + 16 && object.actualZ >= abs(me().z) && object.actualZ < abs(me().z) + 32) {
				Server.relay([52]);
				me().hp -= 1;
				if (!me().hp) {
					me().hp = 100;
				}
				if ((me().hp % 10 === 0 || me().hp < 10) && me().hp) {
					Chat.print(me().name, 'Argh! I have ' + me().hp + ' HP left!');
					Server.relay([3, 0, 'Argh! I have ' + me().hp + ' HP left!']);
				}
				Sprite.addToMap(me().x, me().y, {
					sprite: 'images/blood.png',
					x: randomInt(0, 3) * 16,
					width: 16,
					height: 16,
					fade: 1e3,
					flat: true
				}, 'blood' + me().x + ',' + me().y);
			}
			if (Map.placeCheck(x, y, {facing: direction, checkEntity: false})) {
				Sprite.removeFromMap(id);
			}
		}
	}, id);
};

// Text object and functions
var Text = {
	fonts: {
		characters: [
			0,
			'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-',
			'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ?.,:!\'\xe9-_;()/+*=\u2026"\xe1\xc1\xc9$\u2190\u2192\u2191\u2193'
		],
		width: [0, {
			'A': 5,
			'B': 5,
			'C': 5,
			'D': 5,
			'E': 5,
			'F': 5,
			'G': 5,
			'H': 5,
			'I': 5,
			'J': 5,
			'K': 5,
			'L': 5,
			'M': 5,
			'N': 5,
			'O': 5,
			'P': 5,
			'Q': 5,
			'R': 5,
			'S': 5,
			'T': 5,
			'U': 5,
			'V': 5,
			'W': 5,
			'X': 5,
			'Y': 5,
			'Z': 5,
			'0': 5,
			'1': 5,
			'2': 5,
			'3': 5,
			'4': 5,
			'5': 5,
			'6': 5,
			'7': 4,
			'8': 5,
			'9': 5,
			'.': 3,
			'_': 5,
			'-': 4
		}, {
			'A': 6,
			'B': 6,
			'C': 6,
			'D': 6,
			'E': 6,
			'F': 6,
			'G': 6,
			'H': 6,
			'I': 6,
			'J': 6,
			'K': 6,
			'L': 6,
			'M': 6,
			'N': 6,
			'O': 6,
			'P': 6,
			'Q': 6,
			'R': 6,
			'S': 6,
			'T': 6,
			'U': 6,
			'V': 6,
			'W': 6,
			'X': 6,
			'Y': 6,
			'Z': 6,
			'a': 6,
			'b': 6,
			'c': 6,
			'd': 6,
			'e': 6,
			'f': 5,
			'g': 6,
			'h': 6,
			'i': 3,
			'j': 5,
			'k': 6,
			'l': 4,
			'm': 6,
			'n': 6,
			'o': 6,
			'p': 6,
			'q': 6,
			'r': 6,
			's': 6,
			't': 6,
			'u': 6,
			'v': 6,
			'w': 6,
			'x': 6,
			'y': 6,
			'z': 6,
			'0': 6,
			'1': 6,
			'2': 6,
			'3': 6,
			'4': 6,
			'5': 6,
			'6': 6,
			'7': 6,
			'8': 6,
			'9': 6,
			' ': 4,
			'?': 6,
			'.': 5,
			',': 5,
			':': 5,
			'!': 5,
			'\'': 5,
			'\xe9': 6,
			'-': 6,
			'_': 6,
			';': 5,
			'(': 6,
			')': 6,
			'/': 6,
			'+': 6,
			'*': 6,
			'=': 6,
			'\u2026': 6,
			'"': 6,
			'\xe1': 6,
			'\xc1': 6,
			'\xc9': 6,
			'$': 6,
			'\u2190': 6,
			'\u2192': 6,
			'\u2191': 6,
			'\u2193': 6
		}],
		size: [
			0, [5, 5], [6, 15]
		],
		colors: [
			0,
			'240,240,240,80,80,80',
			'74,74,74,189,189,189'
		]
	},
	draw: function (object) {
		var context = (typeof canvas === 'string' ? $(object.canvas) : object.canvas).getContext('2d'),
			width = 0,
			i,
			character,
			position;
		object.x = object.x || 0;
		object.y = object.y || 0;
		object.font = object.font || 2;
		object.color = object.color || 0;
		object.space = object.space || 0;
		object.zoom = object.zoom || Game.zoom;
		if (!Sprites['images/font' + object.font + '.png']) {
			Sprite.load({
				sprite: 'images/font' + object.font + '.png',
				success: function () {
					if (object.firstLoad) {
						object.firstLoad();
					} else {
						Text.draw(object);
					}
				}
			});
			return;
		}
		if (object.font === 1) {
			object.text = object.text.toUpperCase();
		}
		if (!object.color) {
			Sprites['images/font' + object.font + ',0'] = Sprites['images/font' + object.font + '.png'];
		} else if (!Sprites['images/font' + object.font + ',' + object.color]) {
			Text.fontColor(object.font, object.color);
		}
		object.text = object.text.toString();
		for (i = 0; i < object.text.length; i += 1) {
			if (object.text[i] === '#') {
				object.y += Text.fonts.size[object.font][1];
				i += 1;
				width = 0;
			}
			character = object.text[i];
			position = Text.fonts.characters[object.font].indexOf(character);
			if (position > -1) {
				context.drawImage(
					Sprites['images/font' + object.font + ',' + object.color],
					position * Text.fonts.size[object.font][0],
					0,
					Text.fonts.width[object.font][character],
					Text.fonts.size[object.font][1],
					object.x + width,
					object.y,
					Text.fonts.width[object.font][character] * object.zoom,
					Text.fonts.size[object.font][1] * object.zoom
				);
				width += (Text.fonts.width[object.font][character] * object.zoom) + (object.space * object.zoom);
			}
		}
		if (object.success) {
			object.success();
		}
	},
	width: function (text, font, space) {
		var i,
			width = 0,
			character;
		font = font || 2;
		space = space || 0;
		if (!font) {
			text = text.toUpperCase();
		}
		for (i = 0; i < text.length; i += 1) {
			character = Text.fonts.width[font][text[i]];
			width += character ? character + space : 0;
		}
		return width - space;
	},
	fontColor: function (font, color) {
		var width = Sprites['images/font' + font + '.png'].width,
			height = Sprites['images/font' + font + '.png'].height,
			element = Element.add({
				type: 'canvas',
				width: width,
				height: height,
				id: 'font' + font + ',' + color,
				parent: 'resources-images'
			}),
			context = element.getContext('2d'),
			data,
			colorValues,
			i,
			j,
			index;
		context.drawImage(Sprites['images/font' + font + '.png'], 0, 0);
		data = context.getImageData(0, 0, width, height);
		colorValues = Text.fonts.colors[color].split(',').intify();
		for (i = 0; i < width; i += 1) {
			for (j = 0; j < height; j += 1) {
				index = (i + j * width) * 4;
				if (!data.data[index] && !data.data[index + 1] && !data.data[index + 2]) {
					data.data[index] = colorValues[0];
					data.data[index + 1] = colorValues[1];
					data.data[index + 2] = colorValues[2];
				}
				if (data.data[index] === 255 && data.data[index + 1] === 255 && data.data[index + 2] === 255) {
					data.data[index] = colorValues[3];
					data.data[index + 1] = colorValues[4];
					data.data[index + 2] = colorValues[5];
				}
			}
		}
		context.putImageData(data, 0, 0);
		Sprites['images/font' + font + ',' + color] = element;
	}
};