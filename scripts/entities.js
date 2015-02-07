// Get an entity's stats
function stat(id) {
	if (typeof id === 'number' || id.substr(0, 4) === 'npc-' || id.substr(0, 5) === 'ally-') {
		return Entity[id] || {
			x: 0,
			y: 0
		};
	}
	return Entity.nicks[Chat.clean.username(id).toLowerCase()];
}

// Get the player's stats
function me() {
	return Entity[player] || {};
}

// Define entity object
var Entity = {
	nicks: {}
};

// Create a new entity
Entity.add = function (id) {
	Entity.remove(id, true);
	Entity[id] = {
		name: '',
		id: id,
		idle: 0,
		hp: 100,
		frame: 0,
		facing: 0,
		queue: [],
		ally: -1,
		showNameTag: 1,
		showShadow: 1,
		latency: 1,
		gravity: 0,
		skin: 0,
		fromX: 0,
		fromY: 0,
		x: 0,
		y: 0,
		z: 0
	};
	Entity[id].nameSet = function (name) {
		this.name = name;
		Entity.nicks[Chat.clean.username(name).toLowerCase()] = id;
	};
	Entity[id].stop = function () {
		this.freeze = true;
		this.moving = false;
		this.frame = 0;
	};
	return Entity[id];
};

// Remove an entity
Entity.remove = function (id, permanently, spriteOnly) {
	if (!Chat.chatOnly) {
		if (Map.sprites['shadow-' + id]) {
			Map.sprites['shadow-' + id].parent.removeChild(Map.sprites['shadow-' + id]);
			delete Map.sprites['shadow-' + id];
		}
		if (Map.sprites['entity-' + id]) {
			Map.sprites['entity-' + id].parent.removeChild(Map.sprites['entity-' + id]);
			delete Map.sprites['entity-' + id];
		}
		if (Map.spriteSteps['entity-' + id] && !spriteOnly) {
			delete Map.spriteSteps['entity-' + id];
		}
		if (Map.sprites['nametag-' + id]) {
			Map.sprites['nametag-' + id].parent.removeChild(Map.sprites['nametag-' + id]);
			delete Map.sprites['nametag-' + id];
		}
		if (Map.sprites['icon-' + id]) {
			Map.sprites['icon-' + id].parent.removeChild(Map.sprites['icon-' + id]);
			delete Map.sprites['icon-' + id];
		}
		if (Map.radarSteps['radar-' + id] && !spriteOnly) {
			stat(id).radarBlip.parent.removeChild(stat(id).radarBlip);
			delete Map.radarSteps['radar-' + id];
		}
		if (stat(id).id && stat(id).ally !== -1 && !spriteOnly) {
			Entity.remove(stat(id).allyId, permanently);
		}
		if (!spriteOnly) {
			Entity.position(id, true);
		}
	}
	if (permanently) {
		if (Entity[id]) {
			delete Entity.nicks[Chat.clean.username(Entity[id].name).toLowerCase()];
		}
		delete Entity[id];
		if (id === me().following) {
			Game.trigger('follow');
		}
	}
};

// Refresh all the entities
Entity.refresh = function (id, spriteOnly) {
	if (id) {
		if (Map.sprites['entity-' + id]) {
			Entity.remove(id, false, spriteOnly);
			Entity.addToMap(id, spriteOnly);
		}
		return;
	}
	var i;
	for (i in Entity) {
		if (Entity.hasOwnProperty(i) && Entity[i].sideMap) {
			Entity[i].sideMap = Map.sideData(Entity[i].map);
			if (Entity[i].sideMap.visible) {
				if (i.substr(0, 5) === 'ally-') {
					continue;
				}
				i = i.substr(0, 4) === 'npc-' ? i : int(i);
				Entity.refresh(i, spriteOnly !== undefined ? spriteOnly : true);
			}
		}
	}
};

// Remove all the entities
Entity.clear = function () {
	var i;
	for (i in Entity) {
		if (Entity.hasOwnProperty(i) && Entity[i].queue) {
			Entity.remove(int(i));
		}
	}
};

// Set entity's position
Entity.positions = {};

Entity.position = function (id, remove, additional) {
	if (stat(id).lastPosition && Entity.positions[stat(id).lastPosition] && Entity.positions[stat(id).lastPosition].contains(id) && !additional) {
		Entity.positions[stat(id).lastPosition].splice(Entity.positions[stat(id).lastPosition].indexOf(id), 1);
		if (!Entity.positions[stat(id).lastPosition].length) {
			Entity.positions[stat(id).lastPosition] = null;
			stat(id).lastPosition = null;
		}
	}
	if (!remove) {
		var position = additional || (stat(id).x + stat(id).sideMap.x) + ',' + (stat(id).y + stat(id).sideMap.y);
		Entity.positions[position] = Entity.positions[position] || [];
		if (Entity.positions[position].indexOf(id) < 0) {
			Entity.positions[position].push(id);
		}
		if (!additional) {
			stat(id).lastPosition = position;
		} else {
			stat(id).movingTo = additional;
		}
	}
};

// Check a position for an entity
Entity.positionCheck = function (x, y, set) {
	if (Entity.positions[x + ',' + y] && Entity.positions[x + ',' + y].length) {
		var i,
			output = [Entity.positions[x + ',' + y][0], false, false, false];
		for (i in Entity.positions[x + ',' + y]) {
			if (Entity.positions[x + ',' + y].hasOwnProperty(i)) {
				if (stat(Entity.positions[x + ',' + y][i]).solid) {
					output[1] = true;
				}
				if (Entity.positions[x + ',' + y][i] === player) {
					output[2] = true;
				}
				if (Entity.positions[x + ',' + y][i] === player || (typeof Entity.positions[x + ',' + y][i] === 'string' && Entity.positions[x + ',' + y][i].substr(0, 4) === 'npc-')) {
					output[3] = true;
				}
			}
		}
		return output;
	} else if (set) {
		Entity.position(set, false, x + ',' + y);
	}
	return [];
};

// Add an entity to the map
Entity.addToMap = function (id, spriteOnly) {
	if (!spriteOnly) {
		Entity.remove(id);
	}
	Entity.position(id);
	if (!Map.threeD) {
		var shadow = new PIXI.Sprite(new PIXI.Texture(PIXI.Texture.fromImage(Cache.getURL('images/' + Skins.getURLById(stat(id).skin))))),
			entity = new PIXI.Sprite(new PIXI.Texture(PIXI.Texture.fromImage(Cache.getURL('images/' + Skins.getURLById(stat(id).skin))))),
			tag,
			element,
			context,
			font = '10px Open Sans',
			name;
		shadow.visible = false;
		shadow.alpha = 0.4;
		shadow.tint = 0;
		shadow.anchor.x = 0.5;
		shadow.anchor.y = 1;
		shadow.scale.y = 0.5;
		shadow.depth = -1e6;
		shadow.id = id;
		Game.containers.objects.addChild(shadow);
		Map.sprites['shadow-' + id] = shadow;
		if (typeof id === 'number' && Settings.data.playerTags && id !== player) {
			if (!stat(id).nameTag) {
				name = Chat.clean.username(stat(id).name).toUpperCase() || 'UNDEFINED';
				element = Element.add({
					type: 'canvas',
					width: Text.width(name, 1, 1) + 2,
					height: 7
				});
				context = element.getContext('2d');
				context.fillStyle = 'rgba(20, 20, 20, 0.75)';
				context.fillRect(0, 0, element.width, 7);
				Text.draw({
					text: name,
					canvas: element,
					x: 1,
					y: 1,
					font: 1,
					zoom: 1,
					space: 1,
					firstLoad: function () {
						stat(id).nameTag = null;
						Entity.refresh(id);
					}
				});
				stat(id).nameTag = element.toDataURL();
				element.remove();
			}
			tag = new PIXI.Sprite(new PIXI.Texture(PIXI.Texture.fromImage(stat(id).nameTag)));
			Game.containers.tags.addChild(tag);
			Map.sprites['nametag-' + id] = tag;
			tag.visible = false;
			tag.anchor.set(0, 1);
		}
		if (typeof id === 'number' && Settings.data.radar && id !== player) {
			if (!stat(id).radarBlip) {
				element = Element.add({
					type: 'canvas',
					width: 9,
					height: 9
				});
				context = element.getContext('2d');
				context.fillStyle = 'rgba(20, 20, 20, 0.3)';
				context.fillRect(1, 1, 8, 8);
				context.fillStyle = '#FFF';
				context.fillRect(0, 0, 8, 8);
				context.fillStyle = Chat.color.generate(stat(id).name, id);
				context.fillRect(1, 1, 6, 6);
				stat(id).radarBlip = new PIXI.Sprite(new PIXI.Texture(PIXI.Texture.fromImage(element.toDataURL())));
				stat(id).radarBlip.step = function () {
					this.position.x = max(stat(Map.target).x + 9 - (Game.width / 2), min(stat(Map.target).x - 1 + (Game.width / 2), stat(id).x + stat(id).sideMap.x + 4));
					this.position.y = max(stat(Map.target).y + 1 - (Game.height / 2), min(stat(Map.target).y - 9 + (Game.height / 2), stat(id).y + stat(id).sideMap.y + 4));
				};
				element.remove();
			}
			stat(id).radarBlip.visible = false;
			Game.containers.radar.addChild(stat(id).radarBlip);
			Map.radarSteps['radar-' + id] = stat(id).radarBlip;
		}
		entity.visible = false;
		entity.anchor.x = 0.5;
		entity.anchor.y = 1;
		entity.depth = 0;
		if (stat(id).spyMode) {
			entity.alpha = 0.1;
		}
		entity.id = (id === player ? 0 : (typeof id === 'number' ? id : random())) + 0.2;
		Game.containers.objects.addChild(entity);
		Map.sprites['entity-' + id] = entity;
	} else {
		var texture = new THREE.ImageUtils.loadTexture(Cache.getURL('images/' + Skins.getURLById(stat(id).skin)), undefined, function () {
				var material = new THREE.MeshLambertMaterial({
						map: texture,
						transparent: true,
						alphaTest: 0.1
					}),
					geometry = new THREE.PlaneBufferGeometry(texture.image.width / (stat(id).skin > -1 ? 3 : 2), texture.image.height / 4, 1, 1),
					entity = new THREE.Mesh(geometry, material);
				texture.repeat.x = 1 / (stat(id).skin > -1 ? 3 : 2);
				texture.repeat.y = 1 / 4;
				entity.visible = false;
				if (stat(id).spyMode) {
					entity.material.opacity = 0.1;
				}
				Game.containers.objects.addChild(entity);
				Map.sprites['entity-' + id] = entity;
			});
			texture.magFilter = THREE.NearestFilter;
			texture.minFilter = THREE.NearestFilter;
	}
	if (stat(id).icon && stat(id).iconStay) {
		Entity.displayIcon(id, stat(id).icon, stat(id).iconStay);
	}
	if (stat(id).allyString && !spriteOnly) {
		Entity.addAlly(id, stat(id).allyString);
	}
	stat(id).frame = 0;
	Map.spriteSteps['entity-' + id] = function () {
		if (Map.sprites['entity-' + id]) {
			if (!Map.sprites['entity-' + id].visible && (Map.threeD || Map.sprites['entity-' + id].texture.baseTexture.hasLoaded)) {
				Map.sprites['entity-' + id].visible = true;
				if (Map.sprites['shadow-' + id] && !stat(id).spyMode && stat(id).showShadow) {
					Map.sprites['shadow-' + id].visible = true;
				}
				if (Map.sprites['nametag-' + id] && !stat(id).spyMode && stat(id).showNameTag) {
					Map.sprites['nametag-' + id].visible = true;
				}
				if (Map.radarSteps['radar-' + id]) {
					stat(id).radarBlip.visible = false;
				}
			}
			if (!Map.threeD && !Game.inView(stat(id).x + stat(id).sideMap.x, stat(id).y + stat(id).sideMap.y, 32, 32)) {
				Entity.remove(id, false, true);
				if (Map.radarSteps['radar-' + id]) {
					stat(id).radarBlip.visible = true;
				}
			}
		} else if (Game.inView(stat(id).x + stat(id).sideMap.x, stat(id).y + stat(id).sideMap.y, 32, 32)) {
			Entity.addToMap(id, true);
		}
		if (stat(id).gravity) {
			stat(id).frame = 3;
			stat(id).z += stat(id).gravity;
			if (Map.sprites['shadow-' + id]) {
				Map.sprites['shadow-' + id].scale.set(max(0.5, 1 + min(0.5, (0.5 / 20) * stat(id).z)), max(0.25, 0.5 + min(0.25, (0.25 / 20) * stat(id).z)));
			}
			if (stat(id).z < 0) {
				stat(id).gravity += 0.1;
			} else {
				if (Map.sprites['shadow-' + id]) {
					Map.sprites['shadow-' + id].scale.set(1, 0.5);
				}
				stat(id).gravity = 0;
				stat(id).z = 0;
				stat(id).frame = 0;
			}
		}
		if (stat(id).floating) {
			stat(id).previousZ = stat(id).z;
			stat(id).z = floor((16 / 2000) * (Game.now % 2000));
			stat(id).z = -stat(id).floatingHeight - (stat(id).z > 8 ? 8 - (stat(id).z - 8) : stat(id).z);
			if (stat(id).floating === 1) {
				if (stat(id).previousZ <= stat(id).z) {
					stat(id).floating = 2;
				} else {
					stat(id).z = stat(id).previousZ - 1;
				}
			}
			if (Map.sprites['shadow-' + id]) {
				Map.sprites['shadow-' + id].scale.set(max(0.5, 1 + min(0.5, (0.5 / 20) * stat(id).z)), max(0.25, 0.5 + min(0.25, (0.25 / 20) * stat(id).z)));
			}
		} else if (stat(id).z && !stat(id).gravity) {
			stat(id).z += 1;
			stat(id).frame = 0;
			if (Map.sprites['shadow-' + id]) {
				Map.sprites['shadow-' + id].scale.set(max(0.5, 1 + min(0.5, (0.5 / 20) * stat(id).z)), max(0.25, 0.5 + min(0.25, (0.25 / 20) * stat(id).z)));
			}
		}
		if (stat(id).skin < 0) {
			stat(id).frame = (stat(id).frame + 0.05).toFixed(2) % 4;
		}
		if (!Map.threeD && Map.sprites['entity-' + id] && Map.sprites['entity-' + id].texture.baseTexture.hasLoaded) {
			Map.sprites['entity-' + id].texture.setFrame({
				x: [0, 1, 0, stat(id).skin > -1 ? 2 : 1][floor(stat(id).frame)] * Map.sprites['entity-' + id].texture.baseTexture.width / (stat(id).skin > -1 ? 3 : 2),
				y: stat(id).facing * Map.sprites['entity-' + id].texture.baseTexture.height / 4,
				width: Map.sprites['entity-' + id].texture.baseTexture.width / (stat(id).skin > -1 ? 3 : 2),
				height: Map.sprites['entity-' + id].texture.baseTexture.height / 4
			});
			Map.sprites['entity-' + id].position.x = stat(id).x + stat(id).sideMap.x + 8;
			Map.sprites['entity-' + id].position.y = stat(id).y + stat(id).sideMap.y + 16 - (!stat(id).z && stat(id).skin < 0 && stat(id).frame - floor(stat(id).frame) < 0.5 ? 1 : 0) + stat(id).z;
			Map.sprites['entity-' + id].depth = stat(id).y + stat(id).sideMap.y + 16;
			Map.sprites['shadow-' + id].texture.setFrame({
				x: [0, 1, 0, stat(id).skin > -1 ? 2 : 1][floor(stat(id).frame)] * Map.sprites['entity-' + id].texture.baseTexture.width / (stat(id).skin > -1 ? 3 : 2),
				y: stat(id).facing * Map.sprites['entity-' + id].texture.baseTexture.height / 4,
				width: Map.sprites['entity-' + id].texture.baseTexture.width / (stat(id).skin > -1 ? 3 : 2),
				height: Map.sprites['entity-' + id].texture.baseTexture.height / 4
			});
			Map.sprites['shadow-' + id].position.x = stat(id).x + stat(id).sideMap.x + 8;
			Map.sprites['shadow-' + id].position.y = stat(id).y + stat(id).sideMap.y + 16;
			Map.sprites['shadow-' + id].depth = stat(id).y + stat(id).sideMap.y + 15;
			if (Map.sprites['nametag-' + id]) {
				Map.sprites['nametag-' + id].position.x = stat(id).x + stat(id).sideMap.x + 8 - floor(Map.sprites['nametag-' + id].width / 2);
				Map.sprites['nametag-' + id].position.y = stat(id).y + stat(id).sideMap.y + 16 - floor(Map.sprites['entity-' + id].texture.baseTexture.height / 4) - 1 + stat(id).z;
			}
			if (Map.sprites['icon-' + id]) {
				if (Map.sprites['icon-' + id].texture.baseTexture.hasLoaded) {
					if (!Map.sprites['icon-' + id].visible) {
						Map.sprites['icon-' + id].visible = true;
						stat(id).iconEnd = Game.now + 3e3;
					}
					stat(id).icon = max(1, min(stat(id).icon, (Map.sprites['icon-' + id].texture.baseTexture.width - 1) / 15));
					Map.sprites['icon-' + id].texture.setFrame({
						x: (stat(id).icon - 1) * 15,
						y: (floor(Game.now / 400) % 2) * 16,
						width: 16,
						height: 16
					});
				}
				Map.sprites['icon-' + id].position.x = stat(id).x + stat(id).sideMap.x + 8;
				Map.sprites['icon-' + id].position.y = stat(id).y + stat(id).sideMap.y + 16 - floor(Map.sprites['entity-' + id].texture.baseTexture.height / 4) - (Map.sprites['nametag-' + id] ? Map.sprites['nametag-' + id].height : 0) - 2 + stat(id).z;
				if (Map.sprites['icon-' + id].alpha < 1 && Game.now < stat(id).iconEnd) {
					Map.sprites['icon-' + id].alpha += 0.05;
				} else if (Game.now >= stat(id).iconEnd && !stat(id).iconStay) {
					Map.sprites['icon-' + id].alpha -= 0.05;
					if (Map.sprites['icon-' + id].alpha <= 0) {
						Map.sprites['icon-' + id].parent.removeChild(Map.sprites['icon-' + id]);
						delete Map.sprites['icon-' + id];
						stat(id).icon = 0;
					}
				}
			}
			if (id === player && Settings.data.radar) {
				for (var i in Map.radarSteps) {
					if (Map.radarSteps.hasOwnProperty(i)) {
						Map.radarSteps[i].step();
					}
				}
			}
			Lighting.glow(stat(id).x + stat(id).sideMap.x, stat(id).y + stat(id).sideMap.y + stat(id).z, stat(id).skin);
		} else if (Map.threeD && Map.sprites['entity-' + id]) {
			Map.sprites['entity-' + id].position.y = (Map.sprites['entity-' + id].geometry.parameters.height / 2) + (!stat(id).z && stat(id).skin < 0 && stat(id).frame - floor(stat(id).frame) < 0.5 ? 1 : 0) - stat(id).z;
			Map.sprites['entity-' + id].position.x = stat(id).x + stat(id).sideMap.x + 8;
			Map.sprites['entity-' + id].position.z = stat(id).y + stat(id).sideMap.y + 8;
			Map.sprites['entity-' + id].material.map.offset.set([0, 1, 0, stat(id).skin > -1 ? 2 : 1][floor(stat(id).frame)] / (stat(id).skin > -1 ? 3 : 2), (3 - stat(id).facing) / 4);
		}
		if (stat(id).spinning) {
			switch (floor(Game.now / 100) % 4) {
			case 0:
				stat(id).facing = 0;
				break;
			case 1:
				stat(id).facing = 3;
				break;
			case 2:
				stat(id).facing = 1;
				break;
			case 3:
				stat(id).facing = 2;
				break;
			}
		}
		if (!stat(id).queue[0] && !stat(id).path && !stat(id).pause) {
			return;
		} else if (stat(id).pause) {
			if (Game.now >= stat(id).pause) {
				stat(id).pause = null;
			}
			return;
		}
		if (stat(id).path && !stat(id).queue[0]) {
			if (Textbox.active) {
				return;
			}
			if (stat(id).x % 16 === 0 && stat(id).y % 16 === 0) {
				if (stat(id).path.indexOf('x') > -1) {
					if (!randomInt(0, 100)) {
						stat(id).facing = randomInt(0, 3);
						stat(id).path = stat(id).path.split('x');
						if ((stat(id).facing === 3 && stat(id).fromX === -int(stat(id).path[2] || 0))
							|| (stat(id).facing === 2 && stat(id).fromX === int(stat(id).path[0]))
							|| (stat(id).facing === 1 && stat(id).fromY === -int(stat(id).path[3] || 0))
							|| (stat(id).facing === 0 && stat(id).fromY === int(stat(id).path[1]))) {
							stat(id).path = stat(id).path.join('x');
							return;
						}
						if (stat(id).solid) {
							if (Map.placeCheck(stat(id).x + (stat(id).facing === 2 ? 16 : (stat(id).facing === 3 ? -16 : 0)), stat(id).y + (stat(id).facing === 0 ? 16 : (stat(id).facing === 1 ? -16 : 0)), id)) {
								stat(id).path = stat(id).path.join('x');
								return;
							}
						}
						stat(id).fromX += stat(id).facing === 2 ? 1 : (stat(id).facing === 3 ? -1 : 0);
						stat(id).fromY += stat(id).facing === 0 ? 1 : (stat(id).facing === 1 ? -1 : 0);
						stat(id).path = stat(id).path.join('x');
						stat(id).queue.push([stat(id).x + (stat(id).facing === 2 ? 16 : (stat(id).facing === 3 ? -16 : 0)), stat(id).y + (stat(id).facing === 0 ? 16 : (stat(id).facing === 1 ? -16 : 0))]);
					}
					return;
				} else {
					stat(id).path = stat(id).path.split(',');
					if (stat(id).path[0].substr(stat(id).path[0].length - 1) === '*') {
						stat(id).path[0] = stat(id).path[0].substr(0, stat(id).path[0].length - 1);
						stat(id).pathRepeat = true;
					}
					stat(id).pathSpliced = false;
					if (stat(id).path[0].substr(0, 5) === 'pause') {
						stat(id).queue.push(['pause', int(stat(id).path[0].substr(5))]);
						stat(id).path.splice(0, 1);
						stat(id).pathSpliced = true;
					} else {
						if (int(stat(id).path[0]) >= 0) {
							stat(id).pathDirection = {'d': 0, 'u': 1, 'r': 2, 'l': 3}[stat(id).path[0].substr(stat(id).path[0].length - 1)];
							stat(id).pathTiles = int(stat(id).path[0]);
							if (!stat(id).pathTiles) {
								stat(id).queue.push(['facing', stat(id).pathDirection]);
								stat(id).queue.push(['pause', 250]);
								stat(id).frame = 0;
							} else {
								if (stat(id).solid) {
									if (Map.placeCheck(stat(id).x + (stat(id).pathDirection === 2 ? 16 : (stat(id).pathDirection === 3 ? -16 : 0)), stat(id).y + (stat(id).pathDirection === 0 ? 16 : (stat(id).pathDirection === 1 ? -16 : 0)), id)) {
										stat(id).path = stat(id).path.join(',');
										stat(id).frame = 0;
										return;
									}
								}
								stat(id).queue.push([stat(id).x + (stat(id).pathDirection === 2 ? 16 : (stat(id).pathDirection === 3 ? -16 : 0)), stat(id).y + (stat(id).pathDirection === 0 ? 16 : (stat(id).pathDirection === 1 ? -16 : 0))]);
							}
							stat(id).pathTiles -= 1;
							stat(id).path[0] = stat(id).pathTiles + stat(id).path[0].substr(stat(id).path[0].length - 1)
							if (stat(id).pathTiles <= 0) {
								stat(id).path.splice(0, 1);
								stat(id).pathSpliced = true;
							}
						} else {
							stat(id).path.splice(0, 1);
							stat(id).path = stat(id).path.join(',');
							stat(id).pathSpliced = true;
							return;
						}
					}
					stat(id).path = stat(id).path.join(',');
					if (stat(id).pathRepeat && stat(id).pathSpliced) {
						stat(id).path = stat(id).pathOriginal;
						stat(id).pathRepeat = null;
					}
					if (!stat(id).path) {
						stat(id).pathTiles = undefined;
						stat(id).pathDirection = undefined;
					}
				}
			} else if (stat(id).pathTiles === undefined && stat(id).pathDirection === undefined) {
				stat(id).x = floor(me().x / 16) * 16;
				stat(id).y = floor(me().y / 16) * 16;
				return;
			}
		}
		if (stat(id).queue[0][0] === 'facing') {
			stat(id).facing = stat(id).queue[0][1];
			stat(id).queue.splice(0, 1);
			return;
		}
		if (stat(id).queue[0][0] === 'pause') {
			stat(id).pause = Game.now + stat(id).queue[0][1];
			stat(id).queue.splice(0, 1);
			return;
		}
		if (stat(id).queue[0][0] === 'skin') {
			stat(id).skin = stat(id).queue[0][1];
			Entity.refresh(id);
			stat(id).frame = 0;
			stat(id).queue.splice(0, 1);
			return;
		}
		if (stat(id).queue[0][0] === 'jump') {
			if (!stat(id).gravity) {
				stat(id).gravity = stat(id).queue[0][1];
				stat(id).queue.splice(0, 1);
			}
			return;
		}
		if (stat(id).queue[0][0] === 'bullet') {
			Bullet(stat(id).x, stat(id).y, stat(id).queue[0][1], id);
			stat(id).queue.splice(0, 1);
			return;
		}
		if (Game.flags.indexOf(stat(id).queue[0][0]) > -1) {
			stat(id)[stat(id).queue[0][0]] = stat(id).queue[0][1];
			if (stat(id).queue[0][0] === 'floating') {
				stat(id)[stat(id).queue[0][0]] = stat(id).queue[0][1] ? 1 : 0;
				stat(id).floatingHeight = max(10, stat(id).queue[0][1]);
			}
			if (['showShadow', 'spyMode', 'showNameTag'].indexOf(stat(id).queue[0][0]) > -1) {
				Entity.refresh(id);
			}
			stat(id).queue.splice(0, 1);
			return;
		}
		if (stat(id).x % 16 === 0 && stat(id).y % 16 === 0) {
			if (!stat(id).queue[0][2]) {
				if (stat(id).trail) {
					Sprite.addToMap(stat(id).x, stat(id).y, {
						sprite: 'images/rainbow.png',
						frames: 6,
						fade: 1e3,
						id: 1,
						flat: true
					}, 'trail' + stat(id).x + ',' + stat(id).y);
				}
				if (stat(id).skin <= -1704 && stat(id).skin >= -1706) {
					Sprite.addToMap(stat(id).x, stat(id).y, {
						sprite: 'images/goo.png',
						x: randomInt(0, 3) * 16,
						width: 16,
						height: 16,
						fade: 1e3,
						id: 2,
						flat: true
					}, 'goo' + stat(id).x + ',' + stat(id).y);
				} else if (!stat(id).z && Map.object[1] && Map.object[1][stat(id).x + ',' + stat(id).y]) {
					Sprite.addToMap(stat(id).x, stat(id).y, {
						sprite: 'images/sand.png',
						x: stat(id).facing * 16,
						width: 16,
						height: 16,
						fade: 1e3,
						id: 3,
						flat: true
					}, 'sand' + stat(id).x + ',' + stat(id).y);
				} else if (stat(id).hp <= 10) {
					Sprite.addToMap(stat(id).x, stat(id).y, {
						sprite: 'images/blood.png',
						x: randomInt(0, 3) * 16,
						width: 16,
						height: 16,
						fade: 1e3,
						id: 4,
						flat: true
					}, 'blood' + stat(id).x + ',' + stat(id).y);
				}
				if (stat(id).ally !== -1) {
					stat(stat(id).allyId).queue.push([stat(id).x, stat(id).y]);
				}
			}
			if (id === player && me().queue[0][2]) {
				if (me().bump > 34) {
					Game.audio('bump.ogg');
					me().bump = 0;
				}
				me().frame = (me().frame + 0.025).toFixed(3) % 4;
				me().bump += 1;
				me().queue[0][0] = me().x;
				me().queue[0][1] = me().y;
			}
			if (!stat(id).queue[0][2]) {
				Entity.position(id, false, (stat(id).queue[0][0] + stat(id).sideMap.x) + ',' + (stat(id).queue[0][1] + stat(id).sideMap.y));
			}
			stat(id).stepCount = 0;
		}
		if (id === player) {
			me().latency = me().leader ? stat(me().leader).latency : (me().speed || (Keys.held[Settings.data.keys.secondary] && !me().path && !me().freeze ? 4 : 1));
			me().moving = true;
		} else {
			stat(id).latency = stat(id).leader ? stat(stat(id).leader).latency : (stat(id).speed || [1, 1, 2, 2, 4, 4, 8, 8, 8][min(8, stat(id).queue.length)]);
		}
		stat(id).halfStep = ceil(ceil(16 / stat(id).latency) / 2);
		if (!stat(id).queue[0][2]) {
			if (stat(id).stepCount === stat(id).halfStep && ((!stat(id).z && stat(id).skin > -1) || (stat(id).floating && stat(id).skin > -1))) {
				if (!stat(id).speed || (stat(id).speed && stat(id).lastFramePosition !== floor(stat(id).x) + ',' + floor(stat(id).y))) {
					stat(id).frame = (stat(id).frame + 1) % 4;
					stat(id).lastFramePosition = floor(stat(id).x) + ',' + floor(stat(id).y);
				}
			}
			if (stat(id).spinning) {
				stat(id).frame = 0;
			}
			if (stat(id).x < stat(id).queue[0][0]) {
				stat(id).x = min(stat(id).queue[0][0], stat(id).x + stat(id).latency);
				if (!stat(id).spinning) {
					stat(id).facing = 2;
				}
			}else if (stat(id).x > stat(id).queue[0][0]) {
				stat(id).x = max(stat(id).queue[0][0], stat(id).x - stat(id).latency);
				if (!stat(id).spinning) {
					stat(id).facing = 3;
				}
			} else if (stat(id).y < stat(id).queue[0][1]) {
				stat(id).y = float(min(stat(id).queue[0][1], stat(id).y + stat(id).latency).toFixed(2));
				if (!stat(id).spinning) {
					stat(id).facing = 0;
				}
			} else if (stat(id).y > stat(id).queue[0][1]) {
				stat(id).y = float(max(stat(id).queue[0][1], stat(id).y - stat(id).latency).toFixed(2));
				if (!stat(id).spinning) {
					stat(id).facing = 1;
				}
			}
			stat(id).stepCount += 1;
		}
		if (stat(id).x === stat(id).queue[0][0] && stat(id).y === stat(id).queue[0][1]) {
			Entity.position(id);
			if (id === player) {
				if (!me().queue[0][2]) {
					if (Map.placeCheck(me().x, me().y, true) === undefined) {
						return;
					}
					Server.relay([8, me().x, me().y, me().facing]);
				}
				if (Keys.held[Keys.name(Settings.data.keys.right)] && !me().freeze && !me().path && !Textbox.active) {
					if (!me().spinning) {
						me().facing = 2;
					}
					me().next = Map.placeCheck(me().x + 16, me().y, false);
					if (me().next === undefined) {
						me().queue.splice(0, 1);
						return;
					}
					me().queue.push([me().x + 16, me().y, me().next]);
				} else if (Keys.held[Keys.name(Settings.data.keys.left)] && !me().freeze && !me().path && !Textbox.active) {
					if (!me().spinning) {
						me().facing = 3;
					}
					me().next = Map.placeCheck(me().x - 16, me().y, false);
					if (me().next === undefined) {
						me().queue.splice(0, 1);
						return;
					}
					me().queue.push([me().x - 16, me().y, me().next]);
				} else if (Keys.held[Keys.name(Settings.data.keys.down)] && !me().freeze && !me().path && !Textbox.active) {
					if (!me().spinning) {
						me().facing = 0;
					}
					me().next = Map.placeCheck(me().x, me().y + 16, false);
					if (me().next === undefined) {
						me().queue.splice(0, 1);
						return;
					}
					me().queue.push([me().x, me().y + 16, me().next]);
				} else if (Keys.held[Keys.name(Settings.data.keys.up)] && !me().freeze && !me().path && !Textbox.active) {
					if (!me().spinning) {
						me().facing = 1;
					}
					me().next = Map.placeCheck(me().x, me().y - 16, false);
					if (me().next === undefined) {
						me().queue.splice(0, 1);
						return;
					}
					me().queue.push([me().x, me().y - 16, me().next]);
				} else {
					me().moving = false;
					if ((!me().z && me().skin > -1) || (me().floating && me().skin > -1)) {
						setTimeout(function () {
							if (me().id && !me().queue.length) {
								me().frame = [0, 2, 2, 0][floor(me().frame)];
							}
						}, 50);
					}
				}
			} else {
				if ((!stat(id).z && stat(id).skin > -1) || (stat(id).floating && stat(id).skin > -1)) {
					setTimeout(function () {
						if (stat(id).id && !stat(id).queue.length) {
							stat(id).frame = [0, 2, 2, 0][floor(stat(id).frame)];
						}
					}, 50);
				}
			}
			stat(id).queue.splice(0, 1);
		}
	};
};

// Make an icon pop up
Entity.displayIcon = function (id, iconId, stay) {
	if (!Map.sprites['entity-' + id] || Map.threeD) {
		return;
	}
	if (id === player || id === 'ally-' + player) {
		var stay = stay === undefined ? [0, 12, 14, 15, 16, 17, 18].indexOf(iconId) > -1 : stay;
		if (me().iconStay && !stay && iconId) {
			return;
		}
		if (id !== player) {
			stay = false;
		}
		if (iconId !== stat(id).icon || stay !== stat(id).iconStay) {
			Server.relay([25, iconId, stay ? 1 : 0, id === player ? 1 : 0]);
		}
	}
	if (Map.sprites['icon-' + id]) {
		if (!iconId) {
			stat(id).iconEnd = Game.now;
			stat(id).iconStay = false;
			return;
		}
		Map.sprites['icon-' + id].parent.removeChild(Map.sprites['icon-' + id]);
		delete Map.sprites['icon-' + id];
	} else if (!iconId) {
		return;
	}
	stat(id).icon = iconId;
	stat(id).iconStay = stay;
	var icon = new PIXI.Sprite(new PIXI.Texture(PIXI.Texture.fromImage(Cache.getURL('images/icons.png'))));
	Game.containers.tags.addChild(icon);
	Map.sprites['icon-' + id] = icon;
	icon.visible = false;
	icon.alpha = 0;
	icon.anchor.set(0.5, 1);
};

// Add an ally to an entity
Entity.addAlly = function (id, skin, leader) {
	if (typeof skin === 'string') {
		var skins = skin.split(' '),
			owner = '',
			i;
		if (skin !== '-1') {
			for (i = 0; i < skins.length; i += 1) {
				Entity.addAlly(owner ? owner + id : id, float(skins[i]), id);
				owner += 'ally-';
			}
		} else if (stat(id).ally !== -1) {
			Entity.remove('ally-' + id, true);
			stat(id).ally = -1;
		}
		if (id === me().following) {
			Game.trigger('follow=' + id);
		}
		stat(id).allyString = skin;
		return;
	}
	stat(id).ally = skin;
	stat(id).allyId = 'ally-' + id;
	if (stat('ally-' + id).id && stat('ally-' + id).skin === skin && stat('ally-' + id).map === stat(id).map && stat('ally-' + id).speed === stat(id).speed && stat('ally-' + id).solid === stat(id).solid) {
		stat('ally-' + id).sideMap = Map.sideData(stat('ally-' + id).map);
		Entity.addToMap('ally-' + id);
		return;
	}
	var entity = Entity.add('ally-' + id),
		x = stat(id).x,
		y = stat(id).y;
	entity.facing = [1, 0, 3, 2][stat(id).facing];
	entity.map = stat(id).map;
	entity.sideMap = Map.sideData(entity.map);
	if (stat(id).facing === 0 && !Map.placeCheck(x, y - 16, 'ally-' + id)) {
		y -= 16;
	} else if (stat(id).facing === 1 && !Map.placeCheck(x, y + 16, 'ally-' + id)) {
		y += 16;
	} else if (stat(id).facing === 2 && !Map.placeCheck(x - 16, y, 'ally-' + id)) {
		x -= 16;
	} else if (stat(id).facing === 3 && !Map.placeCheck(x + 16, y, 'ally-' + id)) {
		x += 16;
	}
	entity.skin = skin;
	entity.sideMap = Map.sideData(entity.map);
	entity.x = x;
	entity.y = y;
	entity.queue = [];
	entity.solid = typeof leader === 'string' && leader.substr(0, 4) === 'npc-' && stat(leader).solid;
	entity.leader = leader;
	entity.facing = stat(id).facing;
	entity.speed = entity.latency = stat(id).speed;
	Entity.addToMap('ally-' + id);
};