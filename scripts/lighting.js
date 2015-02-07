var Lighting = {
	update: function () {
		Game.lighting.clearRect(0, 0, Game.width * Game.zoom, Game.height * Game.zoom);
		if (!Map.threeD && (Map.lighting || (!Map.interior && Game.dayLight))) {
			Game.lighting.restore();
			Game.lighting.save();
			Game.lighting.fillStyle = 'rgba(' + (Map.lighting || Game.dayLight) + ')';
			Game.lighting.fillRect(0, 0, Game.width * Game.zoom, Game.height * Game.zoom);
			Game.lighting.globalCompositeOperation = 'destination-out';
			Game.lighting.drawing = true;
			Game.lighting.glows = {};
		} else {
			Game.lighting.drawing = false;
		}
	},
	glow: function (x, y, skin, light) {
		if (skin < -999 && !Skins.skins[skin]) {
			Dex.stat(skin);
			return;
		}
		light = light || (Skins.skins[skin] ? Skins.skins[skin][1] : 0);
		if (!Game.lighting.drawing || !light) {
			return;
		}
		x = Game.containers.map.position.x + ((x + 8) * Game.zoom);
		y = Game.containers.map.position.y + ((y + 8) * Game.zoom);
		if (Game.lighting.glows[x + ',' + y]) {
			return;
		}
		Game.lighting.glows[x + ',' + y] = true;
		var flicker = (light[1] ? (0.9 + cos(sin(Game.now / 200)) * 0.1) : 1),
			gradient = Game.lighting.createRadialGradient(x, y, 0, x, y, (light[0] * flicker) * Game.zoom);
		gradient.addColorStop(0, 'rgba(0,0,0,1)');
		gradient.addColorStop(0.75, 'rgba(0,0,0,0.5)');
		gradient.addColorStop(1, 'rgba(0,0,0,0)');
		Game.lighting.fillStyle = gradient;
		Game.lighting.beginPath();
		Game.lighting.arc(x, y, light[0] * Game.zoom, 0, PI * 2, 1);
		Game.lighting.closePath();
		Game.lighting.fill();
		if (light[2]) {
			Game.lighting.globalCompositeOperation = 'source-over';
			gradient = Game.lighting.createRadialGradient(x, y, 0, x, y, (light[0] * flicker) * Game.zoom);
			gradient.addColorStop(0, 'rgba(' + light[2] + ',0.4)');
			gradient.addColorStop(1, 'rgba(' + light[2] + ',0)');
			Game.lighting.fillStyle = gradient;
			Game.lighting.fill();
			Game.lighting.globalCompositeOperation = 'destination-out';
		}
	},
	cutout: function (x, y, sprite, frames) {
		if (!Game.lighting.drawing) {
			return;
		}
		if (!Sprites[sprite]) {
			Sprite.load({sprite: sprite});
			return;
		}
		x = Game.containers.map.position.x + (x * Game.zoom);
		y = Game.containers.map.position.y + (y * Game.zoom);
		Game.lighting.drawImage(Sprites[sprite], (floor(Game.now / 1000) % frames) * (Sprites[sprite].width / frames), 0, Sprites[sprite].width / frames, Sprites[sprite].height, x, y, (Sprites[sprite].width / frames) * Game.zoom, Sprites[sprite].height * Game.zoom);
	},
	lightbeam: function (x, y, beam) {
		if (!Game.lighting.drawing) {
			return;
		}
		x = Game.containers.map.position.x + (x * Game.zoom);
		y = Game.containers.map.position.y + (y * Game.zoom);
		beam.x2 = Game.containers.map.position.x + (beam.x * Game.zoom);
		beam.y2 = Game.containers.map.position.y + (beam.y * Game.zoom);
		if (beam.circleRadius) {
			beam.x2 += cos(((((Game.now - beam.sync * 1000) * beam.speed) % 12000) / 12000) * 2 * PI) * beam.circleRadius;
			beam.y2 += sin(((((Game.now - beam.sync * 1000) * beam.speed - beam.sync * 1000) % 20000) / 20000) * 2 * PI) * beam.circleRadius;
		}
		beam.x2 -= x;
		beam.y2 -= y;
		var length = sqrt(beam.x2 * beam.x2 + beam.y2 * beam.y2),
			gradient = Game.lighting.createLinearGradient(x, y, x + length, y),
			opacity = beam.fades ? (sin((((Game.now - beam.sync * 1000) % 4000) / 4000) * 2 * PI) * 0.25 + 0.75) : beam.flickers ? (random() * 4 > 0.5 ? 1: random() * 0.2 + 0.2) : 1,
			multiplier = (beam.color ? (1 - beam.colorOpacity) : 1),
			color;
		if (beam.fades) {
			gradient.addColorStop(0.5, 'rgba(0,0,0,' + (0.6 * opacity * multiplier) + ')');
			gradient.addColorStop(0, 'rgba(0,0,0,0)');
			gradient.addColorStop(1, 'rgba(0,0,0,' + (0.2 * opacity * multiplier) + ')');
		} else {
			gradient.addColorStop(0, 'rgba(0,0,0,' + (0.8 * opacity * multiplier) + ')');
			gradient.addColorStop(1, 'rgba(0,0,0,' + (0.4 * opacity * multiplier) + ')');
		}
		Game.lighting.translate(x, y);
		Game.lighting.rotate(atan2(beam.y2, beam.x2));
		Game.lighting.translate(-x, -y);
		Game.lighting.beginPath();
		Game.lighting.moveTo(x, y - (beam.startWidth * Game.zoom) / 2);
		Game.lighting.lineTo(x, y + (beam.startWidth * Game.zoom) / 2);
		Game.lighting.lineTo(x + length, y + (beam.endWidth * Game.zoom) / 2);
		Game.lighting.arc(x + length, y, (beam.endWidth * Game.zoom) / 2, PI / 2, PI * 3 / 2, 1);
		Game.lighting.closePath();
		Game.lighting.fillStyle = gradient;
		Game.lighting.fill();
		if (beam.color) {
			Game.lighting.globalCompositeOperation = 'source-over';
			color = beam.color
			if (beam.color === 'disco') {
				color = ((floor((Game.now - beam.sync * 100 * 30) / 100)) % (360 / 30)) * 30;
			}
			gradient = Game.lighting.createLinearGradient(x, y, x + length, y);
			gradient.addColorStop(0, 'hsla(' + color + ',100%,50%,' + (0.8 * opacity * (1 - multiplier)) + ')');
			gradient.addColorStop(1, 'hsla(' + color + ',100%,50%,' + (0.4 * opacity * (1 - multiplier)) + ')');
			Game.lighting.fillStyle = gradient;
			Game.lighting.fill();
			Game.lighting.globalCompositeOperation = 'destination-out';
		}
		Game.lighting.setTransform(1, 0, 0, 1, 0, 0);
	}
}