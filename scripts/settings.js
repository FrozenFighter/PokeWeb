// Define the settings object
var Settings = Settings || DataObject.new();

Settings.addData({
	tab: 0,
	tabs: ['Game','Audio','Chat','Keys','Misc', 'x'],
	keySelected: '',
	pressed: false
});

Settings.addData({
	username: '',
	password: '',
	chatColors: true,
	chatImages: true,
	chatTimestamps: true,
	swearFilter: true,
	beepWords: [],
	radar: true,
	replaceWords: [],
	confirmLeaving: false,
	zoom: 2,
	keys: {
		left: 'left',
		up: 'up',
		right: 'right',
		down: 'down',
		primary: 'Z',
		secondary: 'X',
		tertiary: 'C'
	},
	canvasRenderer: false,
	heartbeats: false,
	volumeMusic: 100,
	volumeEffects: 100,
	playerTags: true,
	status: '',
	notifications: false,
	channels: ['main']
}, 'user settings');

Settings.addMethods({
	save: function () {
		localStorage.settings = JSON.stringify(Settings.dataForFlag('user settings'));
	},
	load: function () {
		if (localStorage.settings) {
			var settings = JSON.parse(localStorage.settings),
				i,
				j;
			for (i in settings) {
				if (settings.hasOwnProperty(i) && typeof Settings.data[i] === typeof settings[i]) {
					if (typeof settings[i] === 'object' && ((settings[i] instanceof Array && !(Settings.data[i] instanceof Array)) || (Settings.data[i] instanceof Array && !(settings[i] instanceof Array)))) {
						continue;
					}
					if (typeof settings[i] === 'object' && !(settings[i] instanceof Array)) {
						for (j in settings[i]) {
							if (Settings.data[i].hasOwnProperty(j)) {
								if (i === 'keys') {
									settings[i][j] = Keys.name(settings[i][j]);
								}
								Settings.data[i][j] = settings[i][j];
							}
						}
					} else {
						Settings.data[i] = settings[i];
					}
				}
			}
		}
	},
	store: function (setting, value) {
		Settings.data[setting] = value;
		Settings.save();
		if (setting === 'heartbeats' && server.connected) {
			Server.heartbeat();
		}
		if (setting === 'status') {
			me().status = value;
		}
		if (setting === 'chatColors' && Server.connected) {
			Chat.onlinelist();
		}
		if (setting === 'zoom' && !Chat.chatOnly) {
			Game.resize(value);
		}
		if (setting === 'playerTags') {
			Entity.refresh();
		}
		if (setting === 'keys' && !Chat.chatOnly) {
			Game.addKeys();
		}
		if (setting === 'notifications' && value === true) {
			if (Notification.permission === 'default') {
				Notification.requestPermission();
			}
		}
		if (setting === 'radar' && !Chat.chatOnly) {
			if (Game.containers.radar.children.length) {
				Game.containers.radar.removeChildren();
			}
			Map.radarSteps = {};
			Entity.refresh();
		}
		if (setting === 'confirmLeaving' && !Chat.chatOnly) {
			window.onbeforeunload = value ? function () {
				return 'You are about to leave!';
			} : null;
		}
		if (setting === 'threeD' && !Chat.chatOnly) {
			Game.draw = false;
			Game.fade(1, function () {
				Game.createRenderer();
				Map.load(Map.current);
				Lighting.update();
			});
		}
		if (setting === 'volumeMusic' || setting === 'volumeEffects') {
			var elements = $('resources-audio').getElementsByClassName('audio-' + (setting === 'volumeMusic' ? 'music' : 'sfx')),
				i;
			for (i = elements.length - 1; i >= 0; i -= 1) {
				if (elements[i].id.substr(0, 9) === 'audio-sc:') {
					Game.audio.soundCloud[elements[i].id.substr(6)].setVolume(value / 100);
				}
				elements[i].volume = value / 100;
				if (!value) {
					(elements[i].id.substr(0, 9) === 'audio-sc:' ? Game.audio.soundCloud[elements[i].id.substr(6)] : elements[i]).pause();
				}
				if (value && Game.audio.playing === elements[i].id.substr(6)) {
					(elements[i].id.substr(0, 9) === 'audio-sc:' ? Game.audio.soundCloud[elements[i].id.substr(6)] : elements[i]).play();
				}
			}
		}
		if (['beepWords', 'replaceWords', 'username', 'password', 'status', 'channels'].indexOf(setting) > -1) {
			return;
		}
		Settings.draw();
		Game.audio('select.ogg');
	},
	toggle: function () {
		if ($('cover')) {
			$('cover').style.opacity = 0;
			setTimeout(function () {
				if ($('cover')) {
					$('cover').remove();
				}
			}, 200);
			Game.audio('cancel.ogg');
		} else {
			var i;
			Element.add({
				type: 'div',
				id: 'cover',
				innerHTML: '<div id="settings-tab"></div><br><div id="settings"></div>'
			});
			for (i = 0; i < Settings.data.tabs.length; i += 1) {
				$('settings-tab').innerHTML += '<span id="settings-tab' + i + (Settings.data.tab === i ? '" class="selected' : '') + (i === Settings.data.tabs.length - 1 ? '" style="float:right' : '') + '" onclick="Settings.draw(' + i + ')">' + Settings.data.tabs[i] + '</span>';
			}
			$('cover').addEventListener('mousedown', function () {
				if (Settings.data.keySelected) {
					Settings.data.keySelected = '';
					Settings.draw();
					Game.audio('cancel.ogg');
				}
			});
			Settings.draw();
			Game.audio('open.ogg');
			setTimeout(function () {
				if ($('cover')) {
					$('cover').style.opacity = 1;
				}
			}, 10);
		}
	},
	draw: function (tab) {
		var output = '',
			i,
			j;
		if (!$('settings')) {
			return;
		}
		if (tab === Settings.data.tabs.length - 1) {
			Settings.toggle();
			return;
		}
		if (tab >= 0) {
			$('settings-tab' + Settings.data.tab).className='';
			$('settings-tab' + tab).className = 'selected';
			Settings.data.tab = tab;
		}
		if (Settings.data.tab === 0) {
			output = '<p><input type="range" min="1" max="5" value="' + (Game.zoom || Settings.data.zoom) + '" onchange="Settings.store(\'zoom\', int(this.value))"> Zoom level. (' + floor((Game.zoom || Settings.data.zoom) * 100) + '%)</p>'
				+ '<br><input type="checkbox" id="opt5" onchange="Settings.store(\'zoom\', this.checked ? -1 : 2)"' + (Game.fullscreen || Settings.data.zoom < 0 ? ' checked' : '') + '><label for="opt5">Use entire page. (F6)</label>'
				+ '<p><input type="checkbox" id="opt6" onchange="Settings.store(\'canvasRenderer\', this.checked)"' + (Settings.data.canvasRenderer ? ' checked' : '') + '><label for="opt6">Use the canvas renderer.</label></p>'
				+ '<input type="checkbox" id="opt7" onchange="Settings.store(\'heartbeats\', this.checked)"' + (Settings.data.heartbeats ? ' checked' : '') + '><label for="opt7">Check the server\'s heartbeat.</label></p>'
				+ '<p><input type="checkbox" id="opt8" onchange="Settings.store(\'confirmLeaving\', this.checked)"' + (Settings.data.confirmLeaving ? ' checked' : '') + '><label for="opt8">Ask me if I want to leave.</label></p>'
				+ '<p><input type="checkbox" id="opt11" onchange="Settings.store(\'notifications\', this.checked)"' + (Settings.data.notifications ? ' checked' : '') + '><label for="opt11">Enable desktop notifications.</label></p>';
		}
		if (Settings.data.tab === 1) {
			output = '<p><input type="range" min="0" max="100" value="' + Settings.data.volumeMusic + '" onchange="Settings.store(\'volumeMusic\', int(this.value))"> Music. (' + Settings.data.volumeMusic + '%)</p>'
				+ '<input type="range" min="0" max="100" value="' + Settings.data.volumeEffects + '" onchange="Settings.store(\'volumeEffects\', int(this.value))"> Sound effects. (' + Settings.data.volumeEffects + '%)'
				+ '<br><br>(F3 to mute the master sound)';
		}
		if (Settings.data.tab === 2) {
			output = '<p><input type="checkbox" id="opt1" onchange="Settings.store(\'chatColors\', this.checked)"' + (Settings.data.chatColors ? ' checked' : '') + '><label for="opt1">Color the userlist.</label>'
				+ ' My color: <input type="color" value="' + (me().userColor ? '#' + me().userColor : '') + '" onchange="Server.relay([54, me().userColor = this.value.substr(1).replace(\'000000\', Chat.color.generate(me().name).substr(1))]);this.value = \'#\' + me().userColor;if(Settings.data.chatColors){Chat.onlinelist();}"></p>'
				+ '<input type="checkbox" id="opt2" onchange="Settings.store(\'swearFilter\', this.checked)"' + (Settings.data.swearFilter ? ' checked' : '') + '><label for="opt2">Say no to bad words!</label>'
				+ '<p><br>Beep me upon...<br><textarea onkeyup="Settings.store(\'beepWords\', this.value ? this.value.split(/, ?/) : [])" title="Separate words with commas (use * for every message)">'+Settings.data.beepWords.join(', ').replace(/</g, '&lt;')+'</textarea></p>'
				+ '<input type="checkbox" id="opt3" onchange="Settings.store(\'chatTimestamps\', this.checked)"' + (Settings.data.chatTimestamps ? ' checked' : '') + '><label for="opt3">Display timestamps.</label>'
				+ '<p><input type="checkbox" id="opt4" onchange="Settings.store(\'chatImages\', this.checked)"' + (Settings.data.chatImages ? ' checked' : '') + '><label for="opt4">Show images.</label></p>'
				+ '<br>Replace words...<br><textarea onkeyup="Settings.store(\'replaceWords\', this.value ? this.value.split(/, ?/) : [])" title="Example: \'hello, Hello\' replaces the first with the second word">'+Settings.data.replaceWords.join(', ').replace(/</g, '&lt;')+'</textarea>';
		}
		if (Settings.data.tab === 3) {
			output = '<table width="100%">';
			for (i in Settings.data.keys) {
				if (Settings.data.keys.hasOwnProperty(i)) {
					output += '<tr id="settings-key-' + i + '" onmouseup="Settings.chooseKey(\'' + i + '\')">'
						+ '<td width="25%">' + capitalise(i) + '</td>'
						+ '<td style="text-align:right">' + Keys.name(Settings.data.keys[i])[0].toUpperCase() + Keys.name(Settings.data.keys[i]).substr(1) + '</td>'
						+ '</tr>';
				}
			}
			output += '</table>';
		}
		if (Settings.data.tab === 4) {
			output = '<p><input type="checkbox" id="opt9" onchange="Settings.store(\'playerTags\', this.checked)"' + (Settings.data.playerTags ? ' checked' : '') + '><label for="opt9">Show player tags. (F2)</label></p>'
				+ 'Show us some skin...<br>[to do]'
				+ '<p><input type="checkbox" id="opt10" onchange="Settings.store(\'radar\', this.checked)"' + (Settings.data.radar ? ' checked' : '') + '><label for="opt10">Enable the radar. (F1)</label></p>';
		}
		$('settings').innerHTML = output;
		for (i = 0; i < 2; i += 1) {
			elements = $('settings').getElementsByTagName(i ? 'textarea' : 'input');
			for (j = elements.length - 1; j >= 0; j -= 1) {
				if(elements[j].type === 'text' || (elements[j].tagName && elements[j].tagName.toLowerCase() === 'textarea')){
					elements[j].addEventListener('focus', function () {
						Chat.focused = true;
					});
					elements[j].addEventListener('blur', function () {
						Chat.focused = false;
					});
				}
			}
		}
	},
	chooseKey: function (key) {
		if (Settings.data.keySelected) {
			$('settings-key-' + Settings.data.keySelected).className = '';
		}
		$('settings-key-' + key).className = 'selected';
		Settings.data.keySelected = key;
		Game.audio('select.ogg');
	}
});

// Load the settings
Settings.load();

// On key presses
window.addEventListener('keydown', function (event) {
	if (Settings.data.pressed) {
		return;
	}
	var key = event.which,
		volume;
	if (Settings.data.keySelected) {
		if (Keys.name(key)) {
			Settings.data.keys[Settings.data.keySelected] = Keys.name(key);
			Settings.data.keySelected = '';
			Settings.store('keys', Settings.data.keys);
			Game.audio('decide.ogg');
		}
		event.preventDefault();
		event.stopPropagation();
		return;
	}
	if (key === 27) {
		Settings.toggle();
	}
	if (key === 112) {
		Settings.store('radar', !Settings.data.radar);
		if (Chat.current) {
			Chat.print('==', 'The radar has been ' + (Settings.data.radar ? 'enabled' : 'disabled'));
		}
		event.preventDefault();
	}
	if (key === 113) {
		Settings.store('playerTags', !Settings.data.playerTags);
		if (Chat.current) {
			Chat.print('==', 'Player tags are now turned o' + (Settings.data.playerTags ? 'n' : 'ff'));
		}
		event.preventDefault();
	}
	if (key === 114) {
		volume = Settings.data.volumeMusic || Settings.data.volumeEffects ? 0 : 100;
		Settings.store('volumeMusic', volume);
		Settings.store('volumeEffects', volume);
		if (Chat.current) {
			Chat.print('==', 'The audio has been ' + (volume ? 'un' : '') + 'muted');
		}
		event.preventDefault();
	}
	if (key === 115) {
		Game.screenshot();
		event.preventDefault();
	}
	if (key === 116) {
		if (me().x % 16 ===0 && me().y % 16 === 0 && !me().z && !me().freeze && !me().path && Game.loggedIn && !float($('game-fade').style.opacity)) {
			me().stop();
			loadScript(['scripts/data/cache.js?' + random()], function () {
				delete Map.tileMap.map[Map.current];
				delete Map.tileMap.foreground[Map.current];
				Dex.data = {};
				var i;
				for (i in Skins.skins) {
					if (Skins.skins.hasOwnProperty(i) && i < 0) {
						delete Skins.skins[i];
					}
				}
				Sprites = {};
				Map.load(Map.current, true);
			});
		}
		event.preventDefault();
	}
	if (player && key === 117) {
		if (!Game.fullscreen) {
			Settings.store('zoom', -1);
		} else if(int($('chat-container').style.opacity) !== 0) {
			$('chat-container').style.opacity = 0;
			$('motd-container').style.opacity = 0;
			$('widgets').style.opacity = 0;
		} else {
			$('chat-container').style.opacity = 1;
			$('motd-container').style.opacity = 1;
			$('widgets').style.opacity = 1;
			Settings.store('zoom', 2);
		}
		event.preventDefault();
	}
	if (Game.desktop && key === 122) {
		nodeWebkit.win.toggleFullscreen();
		event.preventDefault();
	}
	if (Game.desktop && key === 123) {
		nodeWebkit.win.showDevTools();
		event.preventDefault();
	}
	Settings.data.pressed = true;
});

window.addEventListener('keyup', function (event) {
	Settings.data.pressed = false;
});