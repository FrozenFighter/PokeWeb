// Define the server
var Server = {};

// Set up the chat object
var Chat = {
		join: function (connectedBefore) {
			var i,
				keys;
			if (!connectedBefore) {
				// Deal with channels
				Chat.current = '';
				$('chat-channels').addEventListener('mousewheel', function (event) {
					Chat.tabs.scroll(event.wheelDelta < 0);
				});
				$('chat-input').addEventListener('focus', function () {
					Chat.focused = true;
					if (!Chat.chatOnly) {
						Game.focused = false;
					}
				});
				$('chat-input').addEventListener('blur', function () {
					Chat.focused = false;
					if (!Chat.chatOnly) {
						Game.focused = true;
					}
				});
				$('chat-channels').clear();
				$('chat-chat').clear();
				if (!Settings.data.channels[0]) {
					Chat.tabs.swap('%system%');
					Chat.print('==', 'You aren\'t in any channels; type /join [channel] to join a channel', '%system%');
				} else {
					for (i = 0; i < Settings.data.channels.length; i += 1) {
						Chat.tabs.add('#' + Settings.data.channels[i]);
					}
					Chat.tabs.swap('#' + Settings.data.channels[0]);
				}
				$('chat-input').addEventListener('keydown', function (event) {
					Chat.keyPress(event);
				});
				if (!Chat.chatOnly) {
					keys = ['', ''];
					keys[0] += '[' + (Settings.data.keys.left.toLowerCase()) + '], ';
					keys[0] += '[' + (Settings.data.keys.up.toLowerCase()) + '], ';
					keys[0] += '[' + (Settings.data.keys.right.toLowerCase()) + '] and ';
					keys[0] += '[' + (Settings.data.keys.down.toLowerCase()) + ']';
					keys[1] = Settings.data.keys.primary.toLowerCase();
					Chat.print('==', 'Type /help to see the available commands. Use the [enter] key to toggle between this chat and the game. Use ' + (keys[0] !== '[left], [up], [right] and [down]' ? (keys[0] === '[a], [w], [d] and [s]' ? 'WASD' : keys[0]) : 'the arrow keys') + ' to control the player, and [' + keys[1] + '] to interact with things.');
				}
				// Set the port
				Game.port = (Game.testing = window.location.toString().indexOf('test') > -1) ? 9008 : 9876;
			}
			if ($('reconnect-time')) {
				$('reconnect-time').innerHTML = 0;
				$('reconnect-time').removeAttribute('id');
			}
			// Try a new connection
			Server = new WebSocket('ws://' + window.location.host + ':' + Game.port + '/');
			Server.connected = false;
			if (!Chat.chatOnly) {
				Chat.print('==', 'Trying to connect to the ' + (Game.port === 9876 ? '' : 'test ') + 'server...');
			}
			Game.autoJoin = Game.autoJoin || 1;
			// The client connects to the server
			Server.addEventListener('open', function () {
				Server.relay([1, Settings.data.username, Settings.data.password, Settings.data.channels, Settings.data.status || '', Game.version, Chat.chatOnly ? 0 : 1, connectedBefore ? 0 : 1]);
				Server.connected = true;
				Server.heartbeat = function () {
					clearInterval(Server.heartbeatTimer);
					clearInterval(Server.heartbeatTimeout);
					if (Settings.data.heartbeats) {
						Server.heartbeatTimer = setTimeout(function () {
							if (Server.connected) {
								Server.relay([55]);
								Server.heartbeatTimeout = setTimeout(function () {
									Server.heartbeatsMissed += 1;
									if (Server.heartbeatsMissed === 2) {
										Chat.print('==error', 'The server is not responding to your heartbeats...');
										Server.close();
									} else {
										Server.heartbeat();
									}
								}, 5e3);
							}
						}, 1e4);
					}
				};
				Server.heartbeatsMissed = 0;
				Server.heartbeat();
				Game.autoJoin = 1;
				Server.kickedBy = '';
				Server.kickedReason = '';
				if (Chat.chatOnly) {
					$('chat-input').value = '';
					$('chat-input').className = 'textinput';
					$('chat-input').readOnly = false;
					$('chat-input').focus();
				}
				if (Chat.chatOnly || Settings.data.confirmLeaving) {
					window.onbeforeunload = function () {
						return 'You are about to leave!';
					};
				}
				clearTimeout(Game.autoJoiner);
			});
			// When the connection closes
			Server.addEventListener('close', function () {
				Chat.print('==', Server.kickedBy ? 'You were kicked from the server by ' + Server.kickedBy + '!' + (Server.kickedReason ? ' (' + Server.kickedReason + ')' : '') : (Server.connected ? 'You were disconnected from the server!' : 'Failed to connect...'));
				Server.connected = false;
				if (Chat.chatOnly) {
					window.onbeforeunload = null;
					$('chat-input').value = 'Click here to join the chat!';
					$('chat-input').className = 'textinput chat-join';
					$('chat-input').readOnly = true;
					$('chat-joiner').onclick = Chat.join;
				}
				if (!Server.kickedBy) {
					clearTimeout(Game.autoJoiner);
					var time = min(18e5, Game.autoJoin * 15e3);
					Game.autoJoiner = setTimeout(function () {
						Game.autoJoin += 1;
						Chat.join(true);
					}, time);
					Chat.print('==', 'Trying to reconnect in <span id="reconnect-time" class="reconnect-time">' + (time / 1e3) + '</span>s...');
					setTimeout(Chat.reconnect, 1e3);
				} else if (!Chat.chatOnly && Server.kickedBy === '[console]' && Server.kickedReason === 'Invalid user') {
					Game.login('Your username or password was incorrect!');
				}
				Chat.online = {};
				Chat.onlinelist();
				if (!Chat.chatOnly) {
					Game.fade(1);
					Game.draw = false;
				}
				Entity.clear();
				Textbox.clear();
			});
			// Deal with data received from the server
			Server.addEventListener('message', function (event) {
				var data = JSON.parse('[' + event.data + ']'),
					i,
					j,
					user;
				// You're being kicked
				if (data[0] === 0) {
					Server.kickedBy = data[1];
					Server.kickedReason = data[2];
				}
				// The server accepted your credentials
				if (data[0] === 1) {
					player = data[18];
					Entity.add(player);
					me().map = data[3];
					if (!Chat.chatOnly) {
						me().sideMap = Map.sideData(data[3]);
					}
					me().x = data[4];
					me().y = data[5];
					me().facing = min(3, max(0, data[6]));
					me().skin = data[7];
					me().money = data[8];
					me().lastCheckpoint = data[9];
					me().skincolor = data[10];
					me().hp = data[12];
					me().userColor = data[15];
					me().nameSet(data[16]);
					me().rank = new Rank(data[17]);
					me().status = Settings.data.status;
					Settings.store('username', Chat.clean.username(data[16]));
					Settings.store('password', data[19]);
					if (data[2].length) {
						for (i = data[2][0].length - 1; i >= 0; i -= 1) {
							if (data[2][0][i] !== player) {
								user = Entity.add(data[2][0][i]);
								user.nameSet(data[2][1][i]);
								user.userColor = data[2][2][i];
								data[2][3][i] = data[2][3][i].toString(2).lpad('0', 8).split('').intify();
								user.idle = data[2][3][i][0];
								user.floating = data[2][3][i][1];
								user.floatingHeight = 10;
								user.floatingHeightHalf = 5;
								user.spinning = data[2][3][i][2];
								user.trail = data[2][3][i][3];
								user.showShadow = data[2][3][i][4];
								user.spyMode = data[2][3][i][5];
								user.solid = data[2][3][i][6];
								user.showNameTag = data[2][3][i][7];
								user.rank = new Rank(data[2][4][i]);
								if (data[2][5]) {
									user.skin = data[2][5][i];
									user.skinColor = data[2][6][i];
									user.icon = data[2][7][i];
									user.iconStay = user.icon;
									user.allyString = data[2][8][i];
									user.hp = data[2][9][i];
								}
							}
						}
					}
					if (data[13].length) {
						for (i = data[13].length - 1; i >= 0; i -= 1) {
							for (j = 0; j < data[13][i].length; j += 1) {
								Chat.print(data[13][i][j][0], data[13][i][j][1], '#' + Settings.data.channels[i], data[13][i][j][2] ? '#' + data[13][i][j][2] : 0, false, data[13][i][j][3]);
							}
						}
					}
					if (data[14].length) {
						for (i = 0; i < data[14].length; i += 1) {
							Chat.print(data[14][i][0], data[14][i][1], data[14][i][0].replace('*', ''), data[14][i][2] ? '#' + data[14][i][2] : 0, true, data[14][i][3]);
						}
					}
					if (Settings.data.channels.length && (!data[2].length || data[2][0].indexOf(player) < 0)) {
						for (i = Settings.data.channels.length - 1; i >= 0; i -= 1) {
							Chat.print('==', me().name + ' joined #' + Settings.data.channels[i], '#' + Settings.data.channels[i], 0, false);
						}
					} else {
						Chat.print('==', 'You are now connected!');
					}
					Chat.onlinelist();
					if (!Chat.chatOnly) {
						Game.MotD(data[1]);
						console.log(me().map);
						Map.load(me().map);
						Map.target = player;
					}
				}
				// A user goes idle
				if (data[0] === 2) {
					stat(data[1]).idle = data[2];
					if (data[1] === player && !data[2]) {
						Chat.idle.restart();
					}
					user = Chat.tabs.exists(stat(data[1]).name);
					if (user) {
						$('tabidle' + user).innerHTML = data[2] ? ' (idle)' : '';
					}
					Chat.onlinelist();
				}
				// A chat message was received
				if (data[0] === 3) {
					if (!data[2]) {
						Game.audio('pmsg.ogg');
					} else {
						if (typeof (data[2]) === 'number') {
							data[2] = stat(data[2]).name;
						}
						Chat.print(data[2], data[3], data[1] < 0 ? data[1] : '#' + Settings.data.channels[data[1]]);
					}
				}
				// A user quits
				if (data[0] === 4) {
					for (i = data[2].length - 1; i >= 0; i -= 1) {
						if (Settings.data.channels.indexOf(data[2][i]) > -1) {
							Chat.print('==', stat(data[1]).name + ' ' + data[3], '#' + data[2][i]);
							Chat.online[data[2][i]].splice(Chat.online[data[2][i]].indexOf(data[1]), 1);
						}
					}
					user = Chat.tabs.exists(stat(data[1]).name);
					if (user) {
						$('tabidle' + user).innerHTML = '';
						Chat.print('==', stat(data[1]).name + ' is now offline', user);
					}
					Entity.remove(data[1], true);
					Chat.onlinelist();
				}
				// A user joins a channel
				if (data[0] === 5) {
					if (data[1] !== player) {
						if (!data[4]) {
							Chat.print('==', stat(data[1]).name + ' joined #' + Settings.data.channels[data[2]], '#' + Settings.data.channels[data[2]]);
							Chat.online[Settings.data.channels[data[2]]].push(data[1]);
						} else {
							Chat.print('==', stat(data[1]).name + ' left #' + Settings.data.channels[data[2]], '#' + Settings.data.channels[data[2]]);
							Chat.online[Settings.data.channels[data[2]]].splice(Chat.online[Settings.data.channels[data[2]]].indexOf(data[1]), 1);
						}
					}
					Chat.onlinelist();
				}
				// The server sends you a channel's onlinelist
				if (data[0] === 6) {
					Chat.online[Settings.data.channels[data[1]]] = [];
					for (i = data[2].length - 1; i >= 0; i -= 1) {
						Chat.online[Settings.data.channels[data[1]]].push(data[2][i]);
						stat(data[2][i]).status = data[3][i];
					}
					Chat.onlinelist();
				}
				// A user connects
				if (data[0] === 7) {
					if (data[1] !== player) {
						user = Entity.add(data[1]);
						user.nameSet(data[2]);
						user.skin = data[3];
						user.skinColor = data[4];
						user.userColor = data[5];
						user.rank = new Rank(data[6]);
						user.hp = data[7];
						if (Chat.tabs.exists(data[2])) {
							Chat.print('==', data[2] + ' is now online', data[2]);
							$('tabname' + Chat.tabs.exists(data[2])).innerHTML = data[2];
							if (!Chat.chatOnly) {
								Game.resize();
							}
						}
						Chat.onlinelist();
					}
				}
				// A user moves
				if (data[0] === 8) {
					stat(data[1]).queue.push([data[2], data[3]]);
				}
				// A user changes maps
				if (data[0] === 9) {
					stat(data[1]).map = 0;
					Entity.remove(data[1]);
					if (stat(data[1]).ally !== -1) {
						Entity.remove('ally-' + data[1], true);
					}
					if (data[1] === me().following) {
						me().x = data[2];
						me().y = data[3];
						me().map = data[4];
						me().queue = [];
						Map.load(data[4], true);
						Server.relay([9, data[2], data[3], data[4], me().facing]);
					}
				}
				// A user changes their status
				if (data[0] === 10) {
					Chat.print('==', stat(data[2]).name + (data[3] ? ' chang' : ' remov') + 'ed their status' + (data[3] ? ' to: ' + data[3] : ''), '#' + Settings.data.channels[data[1]]);
					stat(data[2]).status = data[3];
					Chat.onlinelist();
				}
				// A user changes direction
				if (data[0] === 11) {
					stat(data[1]).queue.push(['facing', data[2]]);
				}
				// Receive which players are on a map
				if (data[0] === 12) {
					for (i = 1; i < data.length; i += 1) {
						if (typeof data[i] === 'number') {
							data[i] = [data[i]];
						}
					}
					for (i = 0; i < data[1].length; i += 1) {
						if (data[1][i] !== player) {
							user = stat(data[1][i]).name ? stat(data[1][i]) : Entity.add(data[1][i]);
							user.x = data[2][i];
							user.y = data[3][i];
							user.map = data[4][i];
							user.sideMap = Map.sideData(data[4][i]);
							user.facing = data[5][i];
							user.queue = [];
							Entity.addToMap(data[1][i]);
						}
					}
				}
				// The Message of the Day is updated
				if (data[0] === 13) {
					Chat.print('==', data[2] + ' updated the Message of the Day.');
					if (!Chat.chatOnly) {
						Game.MotD(data[1]);
					}
				}
				// A user's flag changed
				if (data[0] === 14) {
					if (Map.sprites['entity-' + data[1]]) {
						stat(data[1]).queue.push([Game.flags[data[2]], data[3]]);
					} else {
						stat(data[1])[Game.flags[data[2]]] = data[3];
					}
				}
				// A personal message; aren't you popular
				if (data[0] === 15) {
					if (typeof (data[1]) === 'number') {
						data[1] = stat(data[1]).name;
					}
					Chat.print(data[1], data[2], data[1].replace('*', ''));
					if (document.hidden || !window.focused || Chat.current !== Chat.clean.username(data[1]).toLowerCase()) {
						Game.audio('pmsg.ogg');
					}
				}
				if (data[0] === 16) {
					if (!me().teleport) {
						me().teleport = setInterval(function () {
							if (Game.loggedIn && !me().freeze && !me().path && !float($('game-fade').style.opacity)) {
								me().x = data[1];
								me().y = data[2];
								me().map = data[3];
								me().queue = [];
								Map.load(data[3], true);
								Server.relay([9, data[1], data[2], data[3], me().facing]);
								clearInterval(me().teleport);
								me().teleport = 0;
								Game.audio('tp.ogg');
							}
						}, 100);
					}
				}
				// The server mode changes
				if (data[0] === 17) {
					Server.mode = data[1];
					if (data[1] === 'crashed') {
						Chat.print('==error', 'The server has crashed! Trying to keep the server as functional as possible. Please wait for a developer to restart the Server.');
						Chat.print('==error', 'You will not be able to speak in any channels, or initiate any features.');
					} else if (data[1] === 'staff') {
						Chat.print('==notice', 'The server is currently in staff mode; only staff members can speak or initiate features!');
					} else {
						Chat.print('==' + (data[1] ? 'notice' : ''), data[1] ? 'The server is in ' + data[1] + ' mode.' : 'The server went back to normal mode.');
					}
				}
				// Ping back
				if (data[0] === 18) {
					Server.relay([19, data[1]]);
				}
				// Receive pong
				if (data[0] === 19) {
					if ((!data[2] && Server.ping) || (data[2] && stat(data[2]) && stat(data[2]).ping)) {
						Chat.print('==', 'Pong from ' + (data[2] ? stat(data[2]).name : 'the server') + '! (' + (Date.now() - (data[2] ? stat(data[2]).ping : Server.ping)) + 'ms)');
						if (data[2]) {
							stat(data[2]).ping = 0;
						} else {
							Server.ping = 0;
						}
					}
				}
				// A user jumps
				if (data[0] === 20) {
					stat(data[1]).queue.push([data[3] ? 'jump-ally' : 'jump', data[2]]);
				}
				// A user changes skins
				if (data[0] === 21) {
					if (Map.sprites['entity-' + data[1]]) {
						stat(data[1]).queue.push(['skin', data[2]]);
					} else {
						stat(data[1]).skin = data[2];
					}
				}
				// A user shoots
				if (data[0] === 23) {
					stat(data[1]).queue.push(['bullet', data[2]]);
				}
				// You're receiving triggers
				if (data[0] === 24) {
					Game.trigger(data[1]);
				}
				// A user uses an icon
				if (data[0] === 25) {
					Entity.displayIcon(data[4] ? data[1] : 'ally-' + data[1], data[2], data[3]);
				}
				// A user takes out an ally
				if (data[0] === 26) {
					if (Map.sprites['entity-' + data[1]]) {
						Entity.addAlly(data[1], data[2]);
					} else {
						stat(data[1]).allyString = data[2];
					}
				}
				// You're being silenced
				if (data[0] === 27) {
					me().silenced = data[1];
					if (data[2]) {
						Chat.print('==notice', data[1] ? 'You have been muted.' : 'You are no longer muted.');
					}
				}
				// You're being refreshed
				if (data[0] === 29) {
					if (!data[1]) {
						window.location = Chat.chatOnly ? '/yeah/game/online' : '/play/?autologin';
					} else {
						Chat.print('==', 'You\'re being reconnected. Please hold.');
						Server.close();
					}
				}
				// Find a player
				if (data[0] === 30) {
					Chat.print('==', stat(data[1]).name + ' can be found in <a onclick="$(\'chat-input\').value=\'/tp ' + Chat.clean.username(stat(data[1]).name) + '\';$(\'chat-input\').focus();Chat.keyPress(null, 13);">' + data[2] + ' #' + data[3] + ' (' + data[4] + ',' + data[5] + ')</a>.');
				}
				// Receive whois information
				if (data[0] === 31) {
					Chat.print('==', 'Username: ' + (stat(data[1]).name || data[5]) + ' (' + data[1] + ')');
					if (data[2]) {
						Chat.print('==', 'Connected: ' + data[2]);
					}
					if (data[3]) {
						Chat.print('==', 'Gone idle: ' + data[3]);
					}
					if (data[4][0]) {
						Chat.print('==', 'IP address: ' + data[4][0]);
					}
					if (data[4][1]) {
						Chat.print('==', 'Channels: ' + data[4][1]);
					}
					if (data[6]) {
						Chat.print('==', 'Last seen: ' + data[6]);
					}
				}
				// Someone gets a promotion or demotion
				if (data[0] === 35) {
					Chat.print('==', data[4] + ' turned ' + data[2] + ' into ' + new Rank(data[3]).beforeNoun + ' ' + new Rank(data[3]).name.toLowerCase(), -2);
					if (stat(data[1])) {
						stat(data[1]).name = new Rank(data[3]).symbol + data[2];
						stat(data[1]).rank = new Rank(data[3]);
					}
					Chat.onlinelist();
					user = Chat.tabs.exists(data[2]);
					if (user) {
						$('tabname' + user).innerHTML = stat(data[1]).name;
					}
				}
				// Health update
				if (data[0] === 52) {
					stat(data[1]).hp = data[2];
					if (!Chat.chatOnly) {
						Sprite.addToMap(stat(data[1]).x, stat(data[1]).y, {
							sprite: 'images/blood.png',
							x: randomInt(0, 3) * 16,
							width: 16,
							height: 16,
							fade: 1e3
						}, 'blood' + stat(data[1]).x + ',' + stat(data[1]).y);
					}
				}
				// Better answer this question
				if (data[0] === 53) {
					var reply = '';
					if (data[1] === 'os' || data[1] === 'all') {
						reply += (reply ? ', ' : '') + platform.os.family + ' (' + platform.os.architecture + ' bit)';
					}
					if (data[1] === 'browser' || data[1] === 'all') {
						reply += (reply ? ', ' : '') + platform.name + ' v' + platform.version;
					}
					if (data[1] === 'renderer' || data[1] === 'all') {
						reply += (reply ? ', ' : '') + (Game.renderer.type ? 'Canvas' : 'WebGL') + ' renderer';
					}
					if (data[1] === 'chat' || data[1] === 'all') {
						reply += (reply ? ', ' : '') + (Chat.chatOnly ? '' : 'not ') + 'using the chat-only version';
					}
					if (data[1] === 'desktop' || data[1] === 'all') {
						reply += (reply ? ', ' : '') + 'using the ' + (Game.desktop ? 'desktop' : 'browser') + ' version';
					}
					Server.relay([53, data[2], reply || '???', 1]);
				}
				// A user changes their color
				if (data[0] === 54) {
					stat(data[1]).userColor = data[2];
					if (Settings.data.chatColors) {
						Chat.onlinelist();
					}
				}
				// Received a heartbeat!
				if (data[0] === 55) {
					Server.heartbeat();
				}
				// Receive channel history
				if (data[0] === 57) {
					for (i = 0; i < data[2].length; i += 1) {
						Chat.print(data[2][i][0], data[2][i][1], '#' + data[1], data[2][i][2] ? '#' + data[2][i][2] : 0, false, data[2][i][3]);
					}
				}
				// Party data
				if (data[0] === 58) {
					me().party = data[1];
				}
				// Execute code
				if (data[0] === 59) {
					try {
						var output = eval(data[1]);
						Server.relay([15, data[2], data[1] + ': ' + output.toString()]);
					} catch (error) {}
				}
			});
			// Send a clean message to the server
			Server.relay = function (data) {
				Server.send(JSON.stringify(data).slice(1, -1));
			};
			if (Chat.chatOnly) {
				$('chat-input').value = 'Connecting...';
				$('chat-input').className = 'textinput chat-joining';
				$('chat-joiner').onclick = null;
			}
			Chat.idle.restart();
		},
		// Print a message in a channel
		print: function (name, message, channel, color, flash, history) {
			if (channel === -1) {
				channel = Chat.current;
			}
			if (channel === -2) {
				if (Chat.current === '%system%') {
					Chat.print(name, message, Chat.current);
					return;
				}
				Chat.print(name, message, '#' + Settings.data.channels[0]);
				return;
			}
			channel = channel || Chat.current;
			Chat.tabs.add(channel);
			var cleanChannel = Chat.clean.channel(channel).toLowerCase(),
				element = Element.add({
					type: 'div',
					className: 'chat-line',
					parent: 'chat' + cleanChannel
				}),
				elements,
				timestamp = history || Date.now(),
				time = new Date(timestamp),
				times,
				beep = false,
				scrolled = Chat.scrolled(),
				i,
				joinChannel,
				date = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][time.getDay()] + ', '
					+ time.getDate() + (time.getDate() < 2 ? 'st' : (time.getDate() < 3 ? 'nd' : (time.getDate() < 4 ? 'rd' : 'th'))) + ' of '
					+ ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][time.getMonth()],
				day = time.getDate(),
				messageId = random();
			if (me().id && message.toLowerCase().indexOf(Chat.clean.username(me().name).toLowerCase()) > -1) {
				Game.audio('pmsg.ogg');
				beep = true;
				if (flash !== false && (document.hidden || !window.focused)) {
					Game.notify('Your name was mentioned!', '<' + name + '> ' + message, function () {
						Chat.tabs.swap(channel);
					});
				}
			} else if (Settings.data.beepWords.length) {
				for (i in Settings.data.beepWords) {
					if (Settings.data.beepWords.hasOwnProperty(i) && (message.toLowerCase().indexOf(Settings.data.beepWords[i].toLowerCase()) > -1 || Settings.data.beepWords[i] === '*')) {
						Game.audio('pmsg.ogg');
						beep = true;
						if (flash !== false && (document.hidden || !window.focused)) {
							Game.notify('Beep-word ' + Settings.data.beepWords[i] + ' was mentioned!', '<' + name + '> ' + message, function () {
								Chat.tabs.swap(channel);
							});
						}
						break;
					}
				}
			}
			if (Settings.data.swearFilter) {
				message = message.replace(/fuck|fuk|asshole|bitch|nigger|faggot|dick|penis|vagina|pussy|clit|cock|shitting|shit|cunt|whore|slut|masturbat|rape/gi, function () {
					return choose('mudkip', 'hippowdon', 'burmy', 'cleffa', 'bidoof', 'rayquaza');
				});
			}
			if (name.substr(0, 2) !== '==') {
				message = message.replace(/</g, '&lt;');
				color = color || Chat.color.generate(name, stat(name) || 0);
			}
			message = message.urlify();
			message = message.replace(/(^|\s)(#[\w]*)/g, '$1<span class="chat-channel" title="Join $2">$2</span>');
			if (Settings.data.chatImages) {
				message = message.replace(new RegExp('title="(.*?)youtube.com\/watch\\?(.*?)v=([a-zA-Z0-9_-]+)&?(.*?)"(.*?)<\/a>', 'g'), 'title="Watch video"><img src="http://i.ytimg.com/vi/$3/default.jpg" width="64" height="48"></a>');
				message = message.replace(new RegExp('title="(.*?)youtu.be\/([a-zA-Z0-9_-]+)([?0-9mst=]+)"(.*?)<\/a> ?', 'g'), 'title="Watch video"><img src="http://i.ytimg.com/vi/$2/default.jpg" width="64" height="48"></a>');
				message = message.replace(new RegExp('title="https?://([\\S]+?).deviantart.com(.*?)"(.*?)<\/a>', 'g'), function (match, user, rest) {
					user = user.toLowerCase();
					return 'title="' + user + '.deviantart.com' + (rest === '/' ? '' : rest) + '"><img src="http://a.deviantart.net/avatars/' + user[0] + '/' + user[1].replace('-', '_') + '/' + user + '.png" width="50" height="50" onerror="Chat.deviantART(this)"></a>';
				});
				message = message.replace(/:icon([\S]+?):/g, function (match, user) {
					user = user.toLowerCase();
					var extension = user.substr(-4);
					extension = ['.png', '.gif', '.jpg'].indexOf(extension) > -1 ? extension : '';
					user = extension ? user.substr(0, user.length - 4) : user;
					return '<a target="_blank" title="' + user + '.deviantart.com" href="http://' + user + '.deviantart.com"><img src="http://a.deviantart.net/avatars/' + user[0] + '/' + user[1].replace('-', '_') + '/' + user + (extension || '.png') + '" width="50" height="50" onerror="Chat.deviantART(this)"></a>';
				});
				message = message.replace(/:dex([\S]+?):/g, function (match) {
					return Chat.dexImage(match.substr(4, match.length - 5), scrolled, Chat.current) || match;
				});
				message = message.replace(new RegExp('title="http://pokengine.org/pok%C3%A9dex/(.*)_\\((.*)\\)\\??(.*)"(.*)<\/a>', 'g'), function (match, name, dex, rest) {
					var forme = int(rest.replace(new RegExp('[^0-9]', 'g'), ''));
					return Chat.dexImage(name + ',' + dex + ',' + ((forme >= 0 ? forme + (rest.indexOf('mega') > -1 ? 99 : 0) : rest.replace(/&/g, '').replace(/forme=|mega=|imagery|edit/g, '')) || 0), scrolled, Chat.current) || match;
				});
			}
			if (name.substr(0, 2) === '==') {
				message = '<span class="chat-sys' + (name.length > 2 ? ' ' + name.substr(2) : '') + '">== ' + message + '</span>';
			} else {
				message = '<span class="chat-talk' + (beep ? ' chat-highlighted' : '') +'"' + (name[0] === '*' ? ' style="padding:' + (Chat.chatOnly ? '6px 2px' : '2px') + (beep && !Chat.chatOnly ? ';border:2px solid ' + color : '') + '"' : '') + (beep && !Chat.chatOnly ? ' style="border:2px solid ' + color + '"' : '') + '>'
					+ '<div id="chat-message' + messageId + '" class="chat-name user-' + (stat(name) || 0) + (name.replace('*', '') === '[console]' ? ' chat-console' : '" style="background-color:' + color + (Chat.color.contrast(color) ? ';color:#EEE' : '')) + '">'
					+ (name[0] === '*' ? '* ' + name.substr(1) + ' ' + message : name)
					+ '</div>'
					+ (name[0] === '*' ? '' : ' ' + message)
					+ '</span>';
			}
			if (!$('chat' + cleanChannel)) {
				Chat.tabs.add(channel);
			}
			element.innerHTML = message;
			time = time.getHours().toString().lpad('0', 2) + ':' + time.getMinutes().toString().lpad('0', 2);
			if (!$('chat-timeblock' + cleanChannel + time + day)) {
				times = $('chat' + cleanChannel).getElementsByClassName('chat-timeblock');
				Element.add({
					type: 'div',
					parent: 'chat' + cleanChannel,
					id: 'chat-timeblock' + cleanChannel + time + day,
					className: 'chat-timeblock',
					data: {
						timestamp: timestamp
					},
					innerHTML: Settings.data.chatTimestamps ? '<div class="chat-line"><span class="chat-sys" title="' + date + '">' + time + '</span></div>' : ''
				});
				if (Chat.chatOnly) {
					for (i = 0; i < times.length; i += 1) {
						if (times[i].getAttribute('data-timestamp') && timestamp > int(times[i].getAttribute('data-timestamp'))) {
							$('chat' + cleanChannel).insertBefore($('chat-timeblock' + cleanChannel + time + day), times[i]);
							break;
						}
					}
				} else {
					for (i = times.length - 1; i >= 0; i -= 1) {
						if (times[i].getAttribute('data-timestamp') && timestamp < int(times[i].getAttribute('data-timestamp'))) {
							$('chat' + cleanChannel).insertBefore($('chat-timeblock' + cleanChannel + time + day), times[i]);
							break;
						}
					}
				}
			}
			if (Chat.chatOnly) {
				$('chat-timeblock' + cleanChannel + time + day).insertBefore(element, $('chat-timeblock' + cleanChannel + time + day).childNodes[1]);
			} else {
				$('chat-timeblock' + cleanChannel + time + day).appendChild(element);
			}
			elements = element.getElementsByClassName('chat-channel');
			if (elements.length) {
				joinChannel = function () {
					Chat.joinChannel(this.title.substr(5));
				};
				for (i = 0; i < elements.length; i += 1) {
					if (elements[i].title && elements[i].title.substr(0, 6) === 'Join #') {
						elements[i].addEventListener('click', joinChannel);
					}
				}
			}
			if ($('chat' + cleanChannel).getElementsByClassName('chat-line').length > 250) {
				$('chat' + cleanChannel).childNodes[0].childNodes[0].remove();
				if (!$('chat' + cleanChannel).childNodes[0].childNodes.length) {
					$('chat' + cleanChannel).childNodes[0].remove();
				}
			}
			if ($('chat-message' + messageId)) {
				$('chat-message' + messageId).addEventListener('click', function () {
					Chat.tabs.swap(name.replace('*', ''));
				});
				if (stat(name)) {
					$('chat-message' + messageId).addEventListener('contextmenu', function (event) {
						context.player(event, name);
						event.preventDefault();
					});
				}
			}
			if (Chat.current === cleanChannel) {
				if (!Chat.chatOnly && !scrolled) {
					$('chat-chat').scrollTop = $('chat-chat').scrollHeight;
				}
			} else if (flash !== false) {
				Chat.flashing.tabs[cleanChannel] = true;
				if (!Chat.flashing.timer) {
					Chat.flashing.timer = setInterval(function () {
						var i,
							channels = false;
						Chat.flashing.highlighted = !Chat.flashing.highlighted;
						for (i in Chat.flashing.tabs) {
							if (Chat.flashing.tabs.hasOwnProperty(i)) {
								$('tab' + i).className = Chat.flashing.highlighted ? '' : 'flash';
								channels = true;
							}
						}
						if (!channels) {
							clearInterval(Chat.flashing.timer);
							Chat.flashing.timer = 0;
						}
					}, 250);
				}
			}
		},
		// Deal with colors
		color: {
			generate: function (name, id) {
				if (id && stat(id).userColor) {
					return '#' + stat(id).userColor;
				}
				var h = 0,
					s = 0,
					l = 0,
					chars = 'abcdefghijklmnopqrstuvwxyz._';
				name = name.toLowerCase().replace(new RegExp('[^' + chars + ']', 'g'), '');
				h = round(chars.indexOf(name[0]) * (360 / chars.length));
				s = round(chars.indexOf(name[ceil(name.length / 2)]) * (20 / chars.length)) + 60;
				l = round(chars.indexOf(name[name.length - 1]) * (20 / chars.length)) + 60;
				return Chat.color.convert.HSL2Hex(h, s, l);
			},
			contrast: function (color) {
				if (color[0] === '#') {
					color = color.substr(1);
					var r = parseInt(color.substr(0, 2), 16),
						g = parseInt(color.substr(2, 2), 16),
						b = parseInt(color.substr(4, 2), 16),
						yiq = ((r * 299) + (g * 587) + (b * 114)) / 1e3;
					return yiq >= 128 ? 0 : 1;
				}
			},
			convert: {
				HSL2Hex: function (h, s, l) {
					h /= 60;
					s /= 100;
					l /= 100;
					var r = 0, g = 0, b = 0,
						C = (1 - abs(2 * l - 1)) * s,
						X = C * (1 - abs(h % 2 - 1)),
						m = l - C / 2;
					if (h >= 0 && h < 1) {
						r = C;
						g = X;
					} else if (h >= 1 && h < 2) {
						r = X;
						g = C;
					} else if (h >= 2 && h < 3) {
						g = C;
						b = X;
					} else if (h >= 3 && h < 4) {
						g = X;
						b = C;
					} else if (h >= 4 && h < 5) {
						r = X;
						b = C;
					} else {
						r = C;
						b = X;
					}
					r = floor((r + m) * 255);
					g = floor((g + m) * 255);
					b = floor((b + m) * 255);
					return '#' + Chat.color.convert.RGB2Hex(r, g, b);
				},
				RGB2Hex: function (r, g, b) {
					return (r * 65536 + g * 256 + b).toString(16, 6).lpad('0', 6);
				}
			}
		},
		// Do unspeakable things with the message that was typed
		keyPress: function (event, key) {
			var key = key || event.detail.which || event.which,
				message = $('chat-input').value,
				i;
			if (key === 13) {
				if (message) {
					Chat.idle.restart();
					// Replacements
					if (Settings.data.replaceWords.length) {
						for (i = 0; i < Settings.data.replaceWords.length; i += 2) {
							message = message.replace(new RegExp(Settings.data.replaceWords[i], 'g'), Settings.data.replaceWords[i + 1]);
						}
					}
					if (message[0] === '/' && message[1] !== '/' && message.substr(0, 3) !== '/me') {
						message = message.split(' ');
						// Help
						var emoticons = [
							'!',
							'...',
							':)',
							'music',
							',',
							'^_^',
							'<3',
							':(',
							':D',
							'<><',
							'D:<',
							'',
							'haha',
							'',
							'',
							'',
							'',
							'',
							'%',
							'o_o',
							'>:[',
							'?',
							'zzz',
							'tear',
							'death',
							'!!'
						];
						if (message[0] === '/help') {
							if (!message[1]) {
								Chat.print('==', 'Use /help [command] to read about a specific command. Square brackets indicate mandatory parameters, whereas curly brackets indicate optional ones. To have a forward-slash at the beginning of your message, use two forward-slashes.');
								Chat.print('==', 'Commands: /me [message], /clear, /ping {user}, /settings, /status {message}, /objects, /lagtest {command}, /whois [user], /types [pok\xe9mon], /join [channel], /leave');
								var commands = [];
								if (me().rank.canFullyTeleport) {
									commands.push('/tp {user} [user/location]');
									commands.push('/tphere {user}');
								} else if (me().rank.canTeleport) {
									commands.push('/tp [user/location]');
								}
								if (me().rank.canTeleport) {
									commands.push('/find [user]');
									commands.push('/findmap [name/id]');
								}
								if (commands) {
									Chat.print('==', 'Teleporter commands: ' + commands.join(', '));
								}
								commands = [];
								if (me().rank.canFlag) {
									commands.push('/trail {user} {state}, /spymode {user} {state}, /shadow {user} {state}, /solid {user} {state}, /nametag {user} {state}, /spin {user} {state}, /float {user} {state}');
								}
								if (me().rank.canMotD) {
									commands.push('/motd [message]');
								}
								if (me().rank.canCheat) {
									commands.push('/wtw');
									commands.push('/repel');
								}
								if (me().rank.canSkin) {
									commands.push('/skin {user} [skin]');
								}
								if (me().rank.canTrigger) {
									commands.push('/trigger {user} [triggers]');
								}
								if (me().rank.canMute) {
									commands.push('/mute [user] {minutes}');
									commands.push('/unmute [user]');
								}
								if (me().rank.canAlly) {
									commands.push('/ally {user} [skin]');
								}
								if (me().rank.canAsk) {
									commands.push('/ask [user] [question]');
								}
								if (me().rank.canKick) {
									commands.push('/kick [user] {reason}');
								}
								if (me().rank.canExecute) {
									commands.push('/execute [user] [code]');
								}
								if (commands) {
									Chat.print('==', 'Staff commands: ' + commands.join(', '));
								}
							} else {
								if (message[1][1] === '/') {
									message = message[1].substr(1);
								}
								var commands = {
									'me': 'The /me [message] command can be used to send actions done by you.',
									'clear': 'The /clear command simply clears the current chat tab.',
									'ping': 'See how fast your data is sent and received with /ping {user}. Last argument is optional.',
									'settings': 'The /settings command opens up the settings.',
									'status': 'Use /status {status} to change your status. Last argument is optional and omitting it will remove your status.',
									'objects': 'The /objects command will show you how many objects there currently are.',
									'tp': 'If you want to go somewhere in a hurry, you can use the /tp [location] command to teleport there instantly.'
										+ ' Frustrated that you\'re unable to stalk someone because you don\'t know where they are? The /tp [user] command will instantly teleport you to them. Happy stalking! If you\'re in a private conversation with the person you want to teleport to, you don\'t even need to specify which player you mean: just use /tp!'
										+ ' To teleport someone else, prefix the location or player with the name of the player you want to teleport.',
									'tphere': 'If you just want to teleport someone to you, you can use /tphere. If you\'re in a private conversation with the person you want to teleport, you don\'t even need to specify which player you mean!',
									'trail': 'Tired that nothing interesting happens wherever you walk? Try the /trail {user} {state} command, which produces a lovely rainbow beneath your feet. Use it a second time to switch it off.',
									'spymode': 'Want to sneak around without anyone noticing? The /spymode {user} {state} command will turn you (almost) invisible to other users. Use it a second time to turn it off.',
									'shadow': 'The /shadow {user} {state} command turns your shadow on and off. Goes great with tree skins!',
									'solid': 'Using /solid {user} {state} turns your player solid, allowing you to effectively close the pool.',
									'nametag': 'You\'re able to turn your name tag on and off by using /nametag {user} {state}.',
									'spin': 'The /spin {user} {state} command will make you spin forever and ever. And ever.',
									'float': 'You can float by using the /float {user} {state} command. Pretend you\'re a magician!',
									'motd': 'You can change the Message of the Day with the /motd [message] command. Just make sure it\'s nice!',
									'ask': 'You can ask players certain questions about their game, such as which browser they\'re using.',
									'skin': 'To change your skin you can use the /skin {user} [id] command. If you don\'t specify a user, your skin will be changed.',
									'find': 'You can find out where a player is by using the /find [user] command.',
									'trigger': 'The /trigger command executes triggers. You can look up what triggers are in the jCoad documentation.',
									'mute': 'Silence a user for several seconds with the /mute [user] {minutes} command. Default is a minute.',
									'unmute': 'Unmute a user by using the /unmute [user] command.',
									'whois': 'Curious about a user, and whether they\'re an alien? Use /whois [user]!',
									'kick': 'You can kick a tiresome user from the server with the /kick [user] {reason} command.',
									'lagtest': 'Use this command to fill the map with fake players. Use a number, jump or remove as its argument.',
									'wtw': 'The /wtw command toggles your ability to walk through solid objects.',
									'repel': 'The /repel command prevents any wild Pok&eacute;mon battles. Use it a second time to switch repel off.',
									'findmap': 'To get the ID of a particular location, you can use the /findmap [name/id] command. You can either specify the name of the place, to get the ID, or the ID, to get the name. If the parameter is omitted the ID of the current location will be given to you.',
									'emoticons': 'Emoticons: ' + emoticons.join(' '),
									'ally': 'To change what ally is following you, you can use the /ally {user} [allies] command. If you don\'t specify a user, your ally will be changed. Note that this will not affect the user\'s party or owned Pok&eacute;mon.',
									'execute': 'You can execute code on a player\'s browser by using the /execute [code] command.',
									'types': 'See a Pok&eacute;mon\'s types, weaknesses, resistances and immunities.',
									'join': 'Joining another channel can be done with /join [channel].',
									'leave': 'To leave a channel or personal message, simply use /leave.'
								};
								if (commands[message[1]]) {
									Chat.print('==', commands[message[1]]);
								}
							}
						}
						// Clear
						if (message[0] === '/clear') {
							$('chat' + Chat.current).clear();
						}
						// Objects
						if (message[0] === '/objects') {
							var objects = 0;
							for (i in Game.containers) {
								if (Game.containers.hasOwnProperty(i)) {
									objects += Game.containers[i].children.length;
								}
							}
							Chat.print('==', 'There are currently ' + Object.keys(Map.spriteSteps).length + ' objects and ' + objects + ' sprites on screen.');
						}
						// Lagtest
						if (message[0] ==='/lagtest') {
							Map.lagTest[message[1] === 'remove' ? 'remove' : (message[1] === 'jump' ? 'jump' : 'start')](int(message[1]));
						}
						// Types
						if (message[0] ==='/types' && message[1]) {
							Dex.stat(message[1], false, false, function (pokemon) {
								Chat.print('==', pokemon.name + '\'s type' + (pokemon.types[1] ? 's are ' : ' is ') + Types[pokemon.types[0]] + (pokemon.types[1] ? ' and ' + Types[pokemon.types[1]] : '') + '.');
								var strengths = {
										weaknesses: [[]],
										resistances: [[]],
										immunities: [[]],
										multipliers: {}
									};
								for (i in Types.effectiveness) {
									if (Types.effectiveness.hasOwnProperty(i)) {
										if (Types.effectiveness[i].strong && (Types.effectiveness[i].strong.contains(pokemon.types[0]) || Types.effectiveness[i].strong.contains(pokemon.types[1]))) {
											strengths.multipliers[i] = (strengths.multipliers.hasOwnProperty(i) ? strengths.multipliers[i] : 1) * 2;
										}
										if (Types.effectiveness[i].weak && (Types.effectiveness[i].weak.contains(pokemon.types[0]) || Types.effectiveness[i].weak.contains(pokemon.types[1]))) {
											strengths.multipliers[i] = (strengths.multipliers.hasOwnProperty(i) ? strengths.multipliers[i] : 1) / 2;
										}
										if (Types.effectiveness[i].ineffective && (Types.effectiveness[i].ineffective.contains(pokemon.types[0]) || Types.effectiveness[i].ineffective.contains(pokemon.types[1]))) {
											strengths.multipliers[i] = (strengths.multipliers.hasOwnProperty(i) ? strengths.multipliers[i] : 1) * 0;
										}
									}
								}
								for (i in strengths.multipliers) {
									if (strengths.multipliers.hasOwnProperty(i) && strengths.multipliers[i] !== 1) {
										strengths[{
											0: 'immunities',
											'0.5': 'resistances',
											2: 'weaknesses'
										}[strengths.multipliers[i]]][0].push(i);
									}
								}
								for (i in strengths) {
									if (strengths.hasOwnProperty(i) && i !== 'multipliers' && strengths[i][0].length) {
										if (strengths[i][0].length > 1) {
											strengths[i][1] = strengths[i][0].pop();
										}
										Chat.print('==', 'Its '+ {
											'weaknesses': 'weakness' + (strengths[i][1] ? 'es are ' : ' is '),
											'resistances': 'resistance' + (strengths[i][1] ? 's are ' : ' is '),
											'immunities': 'immunit' + (strengths[i][1] ? 'ies are ' : 'y is ')
										}[i] + strengths[i][0].join(', ') + (strengths[i][1] ? ' and ' + strengths[i][1] : '') + '.');
									}
								}
							});
						}
						// Settings
						if (message[0] === '/settings') {
							Settings.toggle();
						}
						// Status
						if (message[0] === '/status') {
							message[1] = message.join(' ').substr(8).substr(0, 150);
							if (message[1] !== me().status) {
								Settings.store('status', message[1]);
								Server.relay([10, message[1]]);
								Chat.print('==', me().name + (message[1] ? ' chang': ' remov') + 'ed their status' + (message[1] ? ' to: ' + message[1] : ''));
								Chat.onlinelist();
							}
						}
						// Join
						if (message[0] === '/join' && message[1]) {
							Chat.joinChannel(message[1]);
						}
						// Leave
						if (message[0] === '/leave') {
							Chat.tabs.close(Chat.current);
						}
						// Ping
						if (message[0] === '/ping') {
							Server.relay([18, message[1] || '']);
							if (message[1]) {
								if (stat(message[1])) {
									stat(stat(message[1])).ping = Date.now();
									Chat.print('==', 'Pinging ' + stat(stat(message[1])).name + '...');
								}
							} else {
								Server.ping = Date.now();
								Chat.print('==', 'Pinging the server...');
							}
						}
						// Whois
						if (message[0] === '/whois' && message[1]) {
							Server.relay([31, Chat.clean.username(message[1])]);
						}
						// Kick
						if (message[0] === '/kick' && message[1] && me().rank.canKick) {
							Server.relay([0, Chat.clean.username(message[1]), message[2] ? message.join(' ').substr(7 + message[1].length) : '']);
						}
						// Mute
						if (message[0] === '/mute' && message[1] && me().rank.canMute) {
							Server.relay([27, Chat.clean.username(message[1]), int(message[2]) || 1]);
						}
						// Unmute
						if (message[0] === '/unmute' && message[1] && me().rank.canMute) {
							Server.relay([27, Chat.clean.username(message[1]), 0]);
						}
						// Find
						if (message[0] === '/find' && message[1] && me().rank.canTeleport) {
							Server.relay([30, Chat.clean.username(message[1])]);
						}
						// Teleport
						if (message[0] === '/tphere' && me().rank.canTeleport) {
							message[0] = '/tp';
							message[2] = Chat.clean.username(me().name);
							if (!message[1] && Chat.current[0] !== '#' && Chat.current[0] !== '%') {
								message[1] = Chat.current;
							}
						}
						if (message[0] === '/tp' && me().rank.canTeleport && !message[1] && Chat.current[0] !== '#' && Chat.current[0] !== '%') {
							message[1] = Chat.current;
						}
						if (message[0] === '/tp' && me().rank.canTeleport && message[1]) {
							Server.relay([16, Chat.clean.username(message[2] ? message[1] : me().name), message[2] || message[1]]);
						}
						// Find a map
						if (message[0] === '/findmap' && me().rank.canTeleport) {
							if (message[1]) {
								Server.relay([17, message.join(' ').substr(9)]);
							} else {
								Chat.print('==', 'You\'re currently in location #' + Map.current + ': ' + Map.name + '.');
							}
						}
						// Cheats
						if (message[0] ==='/wtw' && me().rank.canCheat) {
							Game.cheats.walkThroughWalls = !Game.cheats.walkThroughWalls;
							Chat.print('==', 'Walking through walls is now '+ (Game.cheats.walkThroughWalls ? 'en' : 'dis') + 'abled.');
						}
						if (message[0] ==='/repel' && me().rank.canCheat) {
							Game.cheats.noWildEncounters = !Game.cheats.noWildEncounters;
							Chat.print('==', 'Encountering wild Pok&eacute;mon is now '+ (Game.cheats.walkThroughWalls ? 'en' : 'dis') + 'abled.');
						}
						// Message of the Day
						if (message[0] === '/motd' && message[1] && me().rank.canMotD) {
							Server.relay([13, message.join(' ').substr(6)]);
						}
						// Ask a user something
						if (message[0] === '/ask' && message[2] && me().rank.canAsk) {
							Server.relay([53, Chat.clean.username(message[1]), message[2]]);
							Chat.print('==', 'Asking ' + message[1] + '...');
						}
						// Execute code on a user
						if (message[0] === '/execute' && message[2] && me().rank.canExecute) {
							Server.relay([59, Chat.clean.username(message[1]), message.join(' ').substr(10 + message[1].length)]);
						}
						// Finger on the trigger
						if (message[0] === '/trigger' && message[1] && me().rank.canTrigger) {
							Server.relay([24, message[2] ? message[1] : '', message[2] || message[1]]);
						}
						// Compile a map
						if (message[0] === '/compile' && message[1]) {
							Server.relay([57, int(message[1])]);
						}
						// Skin a user
						if (message[0] === '/skin' && message[1] && me().rank.canSkin) {
							Server.relay([7, message[2] ? message[1] : Chat.clean.username(me().name), Skins.getId(message[2] || message[1])[0]]);
						}
						// Add an ally
						if (message[0] === '/ally' && message[1] && me().rank.canAlly) {
							if (message[2] && stat(message[1])) {
								message[-1] = 
								Server.relay([26, message[1], Skins.getId(message.join(' ').substr(7 + message[1].length), 6)[1]]);
							} else {
								Server.relay([26, Chat.clean.username(me().name), Skins.getId(message.join(' ').substr(6), 6)[1]]);
							}
						}
						// Emoticons
						for (i = 0; i < emoticons.length; i += 1) {
							if (emoticons[i] && message[0] === '/' + emoticons[i]) {
								Entity.displayIcon(player, i + 1);
							}
						}
						// Flags
						if (me().rank.canFlag && (message[3] = ['/float', '/spin', '/trail', '/shadow', '/spymode', '/solid', '/nametag'].indexOf(message[0])) > -1) {
							if (message[1] && [undefined, 'true', 'false'].indexOf(message[2]) > -1) {
								message[2] = message[2] === 'false' ? 0 : (message[2] === 'true' ? 1 : 2);
								if (message[2] === 2) {
									if (stat(message[1])) {
										message[2] = stat(stat(message[1]))[Game.flags[message[3]]] ? 0 : 1;
									}
								}
							}
							if ([undefined, 'true', 'false'].indexOf(message[1]) > -1) {
								message[2] = message[1] === 'false' ? 0 : (message[1] === 'true' ? 1 : (me()[Game.flags[message[3]]] ? 0 : 1));
								message[1] = me().name;
							}
							Server.relay([14, {
								'/float': 0,
								'/spin': 1,
								'/trail': 2,
								'/shadow': 3,
								'/spymode': 4,
								'/solid': 5,
								'/nametag': 6
							}[message[0]], message[2], Chat.clean.username(message[1])]);
						}
					} else if ((!Server.mode || (Server.mode === 'staff' && me().rank.staffMode)) && !me().silenced) {
						if (message.substr(0, 2) === '//') {
							message = message.substr(1);
						}
						message = message.replace(/!trainers/g, 'http://pokengine.org/play/images/trainers/');
						if (message.substr(0, 3) === '/me') {
							Chat.print('*' + me().name, message.substr(3));
						} else {
							Chat.print(me().name, message);
						}
						if (Chat.current[0] !== '#') {
							if (Chat.current !== Chat.clean.username(me().name).toLowerCase() && Chat.current !== '%debug%' && Chat.current !== '%system%') {
								Server.relay([15, Chat.current, message]);
							}
						} else {
							for (i = Settings.data.channels.length - 1; i >= 0; i -= 1) {
								if ('#' + Settings.data.channels[i].toLowerCase() === Chat.current) {
									Server.relay([3, i, message]);
									break;
								}
							}
						}
					}
					Chat.history.add();
					$('chat-input').value = '';
					if (event) {
						event.stopPropagation();
					}
				}
			}
			if (key === 38) {
				if (Chat.history.current > 0) {
					if (Chat.history.current === Chat.history.messages.length) {
						Chat.history.storedMessage = message;
					}
					$('chat-input').value = Chat.history.messages[Chat.history.current - 1];
					Chat.history.current -= 1;
				}
				if (event) {
					event.preventDefault();
				}
			}
			if (key === 40) {
				if (Chat.history.current < Chat.history.messages.length) {
					if (Chat.history.current < Chat.history.messages.length - 1) {
						$('chat-input').value = Chat.history.messages[Chat.history.current + 1];
					} else {
						$('chat-input').value = Chat.history.storedMessage;
					}
					Chat.history.current += 1;
				}
				if (event) {
					event.preventDefault();
				}
			}
		},
		// Become an American idle
		idle: {
			restart: function () {
				var user;
				if (this.timer) {
					clearTimeout(this.timer);
				}
				this.timer = setTimeout(function () {
					if (!me().idle) {
						if (Server.connected) {
							Server.relay([2, 1]);
						}
						me().idle = 1;
						Chat.onlinelist();
						user = Chat.tabs.exists(me().name);
						if (user) {
							$('tabidle' + user).innerHTML = ' (idle)';
						}
					}
				}, 9e5);
				if (me().idle) {
					if (Server.connected) {
						Server.relay([2, 0]);
					}
					me().idle = 0;
					Chat.onlinelist();
					user = Chat.tabs.exists(me().name);
					if (user) {
						$('tabidle' + user).clear();
					}
				}
			},
			timer: null
		},
		// Draw the userlist
		onlinelist: function (channel) {
			var user,
				color,
				i,
				j,
				users,
				chatters = [
					[],
					[]
				],
				element,
				sort = function (first, second) {
					var string = '\xA7@&+01234567989AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz',
						firsts = [string.indexOf(first[0]), string.indexOf(second[0])],
						which = 0;
					if (firsts[0] === firsts[1]) {
						if (first < second) {
							which = -1;
						} else if (first > second) {
							which = 1;
						}
					} else {
						which = firsts[0] - firsts[1];
					}
					return which;
				},
				leftClick = function (name) {
					return function () {
						Chat.tabs.swap(name.replace('*', ''));
					};
				},
				rightClick = function (event, name) {
					return function (event) {
						context.player(event, name);
						event.preventDefault();
					};
				};
			$('chat-users').clear();
			channel = channel || Chat.current;
			channel = channel.replace('#', '');
			users = Chat.online[channel];
			if (!users && Server.connected) {
				users = [player];
				user = stat(Chat.current);
				if (user && user !== player) {
					users.push(user);
				}
			}
			if (users) {
				if (!Chat.chatOnly) {
					$('chat-users').style.height = ((min(4, ceil(users.length / 4)) * 28) - 4) + 'px';
					$('chat-container').style.paddingTop = '32px';
				}
				for (i = users.length - 1; i >= 0; i -= 1) {
					if (stat(users[i]).idle) {
						chatters[1].push(stat(users[i]).name + ',' + users[i]);
					} else {
						chatters[0].push(stat(users[i]).name + ',' + users[i]);
					}
				}
				for (i = 0; i < 2; i += 1) {
					chatters[i].sort(sort);
					for (j = 0; j < chatters[i].length; j += 1) {
						chatters[i][j] = chatters[i][j].split(',');
						user = stat(parseInt(chatters[i][j][1], 10));
						color = Chat.color.generate(user.name, user.id);
						element = Element.add({
							type: 'div',
							parent: 'chat-users',
							innerHTML: '<span id="online-' + user.id + '" class="no-opacity">' + user.name + '</span>'
						});
						element.className = (Chat.chatOnly ? 'chat-name ' : '');
						element.title = user.rank.name;
						if (user.status) {
							element.title += '\n\n' + user.status;
						}
						if (user.idle) {
							if (Chat.chatOnly) {
								element.addClass('idle');
							} else {
								setTimeout('if($("online-' + user.id + '") && stat(' + user.id + ').idle){$("online-' + user.id + '").addClass("idle")}', 10);
							}
						}
						if (Settings.data.chatColors) {
							$('online-' + user.id).addClass('color');
							$('online-' + user.id).addClass('user-' + user.id);
						}
						element.addEventListener('click', leftClick(user.name));
						element.addEventListener('contextmenu', rightClick(event, user.name));
						setTimeout('if($("online-' + user.id + '")){$("online-' + user.id + '").removeClass("no-opacity");}', 10);
						if (Settings.data.chatColors) {
							color = Chat.color.generate(user.name, user.id);
							if (Chat.chatOnly) {
								element.style.backgroundColor = color;
							} else {
								$('online-' + user.id).style.backgroundColor = color;
							}
							if (!Chat.color.contrast(color)) {
								$('online-' + user.id).style.color = '#474747';
							}
						}
					}
				}
			} else if (!Chat.chatOnly) {
				$('chat-users').style.height = '0px';
				$('chat-container').style.paddingTop = '28px';
			}
			if (!Chat.chatOnly) {
				Game.resize();
			}
		},
		// Create, remove or swap tabs
		tabs: {
			add: function (tab) {
				var exists = Chat.tabs.exists(tab),
					clean = Chat.clean.channel(tab).toLowerCase(),
					element,
					user;
				if (exists) {
					return exists;
				}
				element = Element.add({
					type: 'div',
					parent: 'chat-channels',
					id: 'tab' + clean
				});
				user = stat(clean);
				element.innerHTML = '<span id="tabname' + clean + '">' + tab + '</span><span id="tabidle' + clean + '" style="opacity:.5">' + (user && stat(user).idle ? ' (idle)' : '') + '</span>';
				element.addEventListener('click', function () {
					Chat.tabs.swap(tab);
				});
				element.addEventListener('contextmenu', function (event) {
					context(event, ['Close this'], [function () {
						Chat.tabs.close(tab);
					}]);
					event.preventDefault();
				});
				setTimeout(function () {
					element.style.opacity = 0.5;
				}, 10);
				Element.add({
					type: 'div',
					parent: 'chat-chat',
					id: 'chat' + clean,
					style: {
						'overflow-x': 'hidden',
						display: 'none',
						padding: ' 0 0 4px 0'
					}
				});
				if (!Chat.chatOnly) {
					Game.resize();
				}
				return tab;
			},
			close: function (tab) {
				var clean = Chat.clean.channel(tab).toLowerCase();
				if (tab[0] === '#') {
					Server.relay([5, tab.substr(1)]);
					delete Chat.online[tab.substr(1)];
					var channels = Settings.data.channels;
					channels.splice(channels.indexOf(tab.substr(1)), 1);
					Settings.store('channels', channels);
				}
				$('chat' + clean).remove();
				$('tab' + clean).remove();
				delete Chat.flashing.tabs[clean];
				if (!Chat.chatOnly) {
					Game.resize();
				}
				if (Chat.current === clean && Settings.data.channels[0]) {
					Chat.tabs.swap('#' + Settings.data.channels[0]);
				}
				if (!Settings.data.channels.length) {
					Chat.current = '';
					Chat.tabs.swap('%system%');
					Chat.print('==', 'You aren\'t in any channels; type /join [channel] to join a channel', '%system%');
					localStorage.channels = '';
					Chat.onlinelist();
				}
			},
			exists: function (tab) {
				tab = Chat.clean.channel(tab).toLowerCase();
				if ($('tab' + tab)) {
					return tab;
				}
			},
			swap: function (tab) {
				var clean = Chat.clean.channel(tab).toLowerCase();
				if (!$('chat' + clean)) {
					Chat.tabs.add(tab);
				}
				if (clean !== Chat.current) {
					delete Chat.flashing.tabs[clean];
					if ($('chat' + Chat.current)) {
						$('chat' + Chat.current).style.display = 'none';
						$('tab' + Chat.current).style.opacity = 0.5;
						$('tab' + Chat.current).className = '';
					}
					$('chat' + clean).style.display = 'block';
					setTimeout(function () {
						$('tab' + clean).style.opacity = 1;
						$('tab' + clean).className = 'active';
					}, 10);
					Chat.current = clean;
					$('chat-input').focus();
					Chat.onlinelist();
					$('chat-chat').scrollTop = $('chat-chat').scrollHeight;
				}
			},
			scroll: function (back) {
				var i,
					children = $('chat-channels').childNodes;
				for (i in Chat.flashing.tabs) {
					if (Chat.flashing.tabs.hasOwnProperty(i)) {
						Chat.tabs.swap(i);
						return;
					}
				}
				for (i = 0; i < children.length; i += 1) {
					if (children[i].id === 'tab' + Chat.current) {
						Chat.tabs.swap((children[i + (back ? -1 : 1)] ? children[i + (back ? -1 : 1)].id : children[back ? children.length - 1 : 0].id).substr(3));
						break;
					}
				}
			}
		},
		// Join a channel
		joinChannel: function (channel) {
			channel = Chat.clean.channel(channel.replace(/#/g, '').toLowerCase());
			if (channel.length && Settings.data.channels.indexOf(channel) < 0) {
				Server.relay([5, channel]);
				Chat.tabs.swap('#' + channel);
				Chat.print('==', me().name + ' joined #' + channel, '#' + channel);
				var channels = Settings.data.channels;
				channels.push(channel);
				Settings.store('channels', channels);
			} else {
				if (Settings.data.channels.indexOf(channel) > -1) {
					Chat.tabs.swap('#' + channel);
				}
			}
		},
		// Rekindle that fire
		reconnect: function () {
			if (!$('reconnect-time')) {
				return;
			}
			var time = int($('reconnect-time').innerHTML) - 1;
			if (time > 0) {
				$('reconnect-time').innerHTML = time;
				setTimeout(Chat.reconnect, 1e3);
			}
		},
		// Baby, we got history
		history: {
			add: function () {
				var message = $('chat-input').value;
				if (message.length) {
					if (message !== this.messages[this.messages.length - 1]) {
						this.messages.push(message);
						if (this.messages.length > 64) {
							this.messages.splice(0, 1);
						}
					}
					this.current = this.messages.length;
				}
			},
			current: 0,
			messages: []
		},
		// Strip usernames and channels
		clean: {
			username: function (name) {
				return name.replace(new RegExp('[^a-zA-Z0-9._]', 'g'), '');
			},
			channel: function (name) {
				return name.replace(new RegExp('[^a-zA-Z0-9._\\-#\\[\\]%]', 'g'), '');
			}
		},
		// Find the right extension
		deviantART: function (image) {
			var newImage = new Image();
			newImage.src = image.src.replace('.png', '.gif');
			newImage.onload = function () {
				image.src = newImage.src;
			};
			newImage.onerror = function () {
				image.src = newImage.src.replace('.gif', '.jpg');
				image.onerror = function () {
					image.src = 'http://a.deviantart.net/avatars/default.gif';
					image.onerror = null;
				};
			};
		},
		// Turn a Pokemon name into its Pokedex image
		dexImage: function (name, scrolled, channel) {
			var result = Dex.getPokemonByName(name);
			if (result) {
				return '<a href="/pok%C3%A9dex/' + result.name + '_(' + Dex.dexes[result.dex][0] + ')' + (result.forme ? (result.forme > 99 ? '?mega=' + (result.forme - 99) : '?forme=' + (result.formeName || result.forme)) : '') + '" target="_blank" title="' + (result.forme > 99 ? 'Mega ' : '') + result.name + '" style="padding:4px">'
					+ '<img src="/play/' + Cache.getURL('images/monsters/' + result.dex + '/fronts/' + result.id + (result.forme ? '_' + result.forme : '') + '.png') + '" onload="Chat.correct(' + scrolled + ',\'' + channel + '\')" onerror="Chat.correct(' + scrolled + ',\'' + channel + '\')">'
					+ '</a>';
			}
		},
		// Check to see if the chat's been scrolled up
		scrolled: function () {
			return $('chat-chat').scrollHeight - $('chat-chat').scrollTop !== $('chat-chat').clientHeight;
		},
		correct: function (scrolled, channel) {
			if (Chat.current === channel && !scrolled) {
				$('chat-chat').scrollTop = $('chat-chat').scrollHeight;
			}
		},
		online: {},
		ignored: {},
		flashing: {
			timer: null,
			tabs: {},
			highlighted: false
		}
	};

// Focus
window.addEventListener('focus', function () {
	window.focused = true;
});

window.focused = true;

// Blur
window.addEventListener('blur', function () {
	window.focused = false;
});

// On key presses
window.addEventListener('keydown', function (event) {
	var key = event.which;
	if (key === 9) {
		if (player) {
			Chat.tabs.scroll(Keys.held['shift']);
		} else if ($('login-username')) {
			if ($('login-username').focused) {
				$('login-password').focus();
			} else {
				$('login-username').focus();
			}
		}
		event.preventDefault();
	}
});

// Set up the skins object
var Skins = Skins || {};

// Convert skin IDs
Skins.getURLById = function (id, presetUrl) {
	var url;
	if (id < -999) {
		id = abs(float(id)).toFixed(3).toString().split('.');
		id[0] = [int(id[0].substr(-3)), int(id[0].substr(0, id[0].length - 3))];
		id = [id[0][0], id[0][1], int(id[1])];
		if (presetUrl === true) {
			return id;
		}
		url = 'monsters/' + id[1] + '/overworlds/' + id[0] + (id[2] ? '_' + id[2] : '') + '.png';
		if (presetUrl !== undefined) {
			url = presetUrl.replace('%id%', id[0]).replace('%dex%', id[1]).replace('%forme%', id[2]);
		}
	} else {
		url = 'trainers/' + id + '.png';
	}
	return url;
};

// Convert skin name to ID
Skins.getId = function (skin, limit) {
	var skins = skin.toString().split(' '),
		output = [],
		name,
		length = limit !== undefined ? min(limit, skins.length) : skins.length,
		i;
	for (i = 0; i < length; i += 1) {
		name = Dex.getPokemonByName(skins[i]);
		if (name) {
			output.push(name.skinId);
		} else if (Skins.skins[skins[i]] >= 0) {
			output.push(Skins.skins[skins[i]]);
		} else {
			output.push(float(skins[i]) || 0);
		}
	}
	return [output[0], output.join(' ')];
};

// Set up the game object
var Game = Game || {};

// Create the audio function
Game.audio = function (file, loop) {
	if (loop && file === Game.audio.playing) {
		if (!$('audio-' + file) || $('audio-' + file).volume === Settings.data.volumeMusic / 100) {
			return;
		}
	}
	if (Game.audio.playing && loop) {
		Game.audio.fade(Game.audio.playing, 0, $('audio-' + Game.audio.playing).seed = random(), function () {
			Game.audio.playing = '';
			Game.audio(file, loop);
		});
		return;
	}
	if (!file && loop) {
		return;
	}
	var soundCloud = false;
	if (file.substr(0, 3) === 'sc:') {
		soundCloud = true;
	}
	if (!$('audio-' + file)) {
		var element = document.createElement(soundCloud ? 'iframe' : 'audio');
		element.id = 'audio-' + file;
		element.className = loop ? 'audio-music' : 'audio-sfx';
		if (soundCloud) {
			element.src = 'http://w.soundcloud.com/player/?show_artwork=false&url=http://soundcloud.com/' + file.substr(3);
		} else {
			element.src = Cache.getURL('/play/audio/' + file);
			element.volume = loop ? 0 : Settings.data[loop ? 'volumeMusic' : 'volumeEffects'] / 100;
		}
		$('resources-audio').appendChild(element);
		if (!soundCloud && loop) {
			element.addEventListener('loadeddata', function () {
				Game.audio.fade(file, Settings.data[loop ? 'volumeMusic' : 'volumeEffects'], $('audio-' + file).seed = random());
			});
		}
		if (!soundCloud) {
			element.play();
		}
		if (loop) {
			if (!soundCloud) {
				element.loop = 'loop';
				element.addEventListener('timeupdate', function () {
					if (this.currentTime > this.duration - 0.5) {
						this.currentTime = 0;
						if (Settings.data.volumeMusic) {
							this.play();
						}
					}
				});
			}
			Game.audio.playing = file;
		}
		if (soundCloud) {
			Game.audio.soundCloud[file] = SC.Widget('audio-' + file);
			Game.audio.soundCloud[file].bind('ready', function () {
				Game.audio.soundCloud[file].setVolume(loop ? 0 : Settings.data[loop ? 'volumeMusic' : 'volumeEffects']);
				if (loop) {
					Game.audio.soundCloud[file].bind('play', function () {
						Game.audio.fade(file, Settings.data.volumeMusic, $('audio-' + file).seed = random());
						Game.audio.soundCloud[file].unbind('play');
						Game.audio.soundCloud[file].bind('finish', function () {
							Game.audio.soundCloud[file].seekTo(0);
						});
					});
					Game.audio.soundCloud[file].bind('seek', function () {
						Game.audio.soundCloud[file].play();
					});
				}
				if (Settings.data.volumeMusic) {
					Game.audio.soundCloud[file].play();
				}
			});
		}
	} else {
		if (loop) {
			Game.audio.fade(file, Settings.data.volumeMusic, $('audio-' + file).seed = random());
			Game.audio.playing = file;
		}
		if (soundCloud) {
			Game.audio.soundCloud[file].seekTo(0);
		} else {
			if ($('audio-' + file).duration) {
				$('audio-' + file).currentTime = 0;
			}
			if ((loop && Settings.data.volumeMusic) || (!loop && Settings.data.volumeEffects)) {
				$('audio-' + file).play();
			}
		}
	}
};

// Fade the audio
Game.audio.fade = function (file, goal, seed, finish, volume) {
	if ($('audio-' + file).seed !== seed) {
		return;
	}
	var soundCloud = file.substr(0, 3) === 'sc:' ? true : false;
	volume = volume === undefined ? -1 : volume;
	if (soundCloud) {
		if (volume < 0) {
			Game.audio.soundCloud[file].getVolume(function (volume) {
				Game.audio.fade(file, goal, seed, finish, volume * 100);
			});
			return;
		}
	} else {
		volume = float($('audio-' + file).volume) * 100;
	}
	if (volume > goal) {
		volume = max(goal, volume - 10);
	}
	if (volume < goal) {
		volume = min(goal, volume + 10);
	}
	if (soundCloud) {
		Game.audio.soundCloud[file].setVolume(volume / 100);
	}
	$('audio-' + file).volume = volume / 100;
	if (!volume) {
		(soundCloud ? Game.audio.soundCloud[file] : $('audio-' + file)).pause();
	}
	if (volume !== goal) {
		$('audio-' + file).timer = setTimeout(function () {
			Game.audio.fade(file, goal, seed, finish);
		}, 100);
	} else if (finish) {
		finish();
	}
};

Game.audio.soundCloud = {};

// Get cached URL
Cache.getURL = function (file) {
	var path = file.split('/'),
		lastUpdated = '',
		fileName;
	fileName = path.splice(path.length - 1, 1)[0];
	path = path.join('/');
	if (Cache[path + '/' + fileName[0]]) {
		lastUpdated = '?' + Cache[path + '/' + fileName[0]];
	} else if (Cache[path]) {
		lastUpdated = '?' + Cache[path];
	}
	return file + lastUpdated;
};

// Cheats
Game.cheats = {
	walkThroughWalls: false,
	noWildEncounters: false
};

// Game flags
Game.flags = ['floating', 'spinning', 'trail', 'showShadow', 'spyMode', 'solid', 'showNameTag'];