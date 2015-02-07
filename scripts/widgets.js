// Widgets!
var Widgets = {
	width: 256,
	widgets: [],
	open: [],
	add: function (id) {
		if (!$('widget-' + id)) {
			var element = Element.add({
				type: 'div',
				parent: 'widgets',
				id: 'widget-' + id,
				className: 'widget',
				style: {
					width: (Widgets.width + 8) + 'px'
				},
				innerHTML: '<div class="widget-container" id="widget-container-' + id + '" style="width:' + Widgets.width + 'px">'
					+ '<canvas id="widget-canvas-' + id + '" width="' + Widgets.width + '" height="0"></canvas>'
					+ '<div id="widget-div-' + id + '" class="widget-div"></div>'
					+ '</div>'
			});
			element.addEventListener('click', function () {
				if (Widgets.open.indexOf(id) < 0) {
					Widgets.open.push(id);
				} else {
					Widgets.open.splice(Widgets.open.indexOf(id), 1);
				}
				Widgets.resize();
			});
			setTimeout(function () {
				element.style.opacity = 1;
			}, 100);
			Widgets.widgets.push(id);
			Widgets.resize();
		}
	},
	resize: function () {
		var i,
			height,
			usableHeight = window.innerHeight - 36,
			widgetHeight = Widgets.open.length ? 32 : floor((usableHeight - 8 - ((Widgets.widgets.length - 1) * 12)) / (Widgets.widgets.length)),
			totalHeight = (Widgets.widgets.length * (widgetHeight + 8)) + ((Widgets.widgets.length - 1) * 4);
		for (i = Widgets.widgets.length - 1; i >= 0; i -= 1) {
			height = widgetHeight + ((!Widgets.open.length && i === Widgets.widgets.length - 1 && totalHeight !== usableHeight) || Widgets.open.indexOf(Widgets.widgets[i]) > -1 ? (usableHeight - totalHeight) / max(1, Widgets.open.length) : 0)
			$('widget-canvas-' + Widgets.widgets[i]).height = height;
			$('widget-container-' + Widgets.widgets[i]).style.height = height + 'px';
			$('widget-' + Widgets.widgets[i]).style.height = (height + 8) + 'px';
			Widgets.draw(Widgets.widgets[i]);
		}
	},
	draw: function (id) {
		if (Widgets.widgets.indexOf(id) < 0) {
			return;
		}
		var text = '',
			open = Widgets.open.indexOf(id) > -1,
			context = $('widget-canvas-' + id).getContext('2d'),
			i;
		context.clearRect(0, 0, Widgets.width, $('widget-canvas-' + id).height);
		$('widget-div-' + id).innerHTML = '';
		// Pokedex widget
		if (id === 'pokedex') {
			text = 'Pok\xe9dex';
			if (open) {
				$('widget-canvas-' + id).getContext('2d').fillRect(0, 0, 16, 16);
			}
		}
		// Party widget
		if (id === 'pokemon') {
			text = 'Pok\xe9mon';
			if(open && me().party && me().party[0]){
				text = '';
				$('widget-canvas-' + id).height = me().party.length * 64;
				for (i = 0; i < me().party.length; i += 1) {
					/*Text.draw({
						text: me().party[i].name,
						canvas: 'widget-canvas-' + id,
						x: 0,
						y: (i * 64) + 32,
						zoom: 1
					});*/
					context.font = '12px Open Sans';
					context.textBaseline = 'middle';
					context.fillStyle = '#EEE';
					context.fillText(me().party[i].name, 0, (i * 64) + 32);
					context.drawImage(Sprite.load({
						sprite: 'images/monsters/' + me().party[i].dex + '/icons/' + me().party[i].pid + (me().party[i].forme ? '_' + me().party[i].forme : '') + '.png',
						backup: 'images/unknown.png',
						firstLoad: function () {
							Widgets.draw(id);
						}
					}), 0, i * 64);
				}
			}
		}
		// Bag widget
		if (id === 'bag') {
			text = 'Bag';
		}
		// Friends widget
		if (id === 'friends') {
			text = 'Friends';
		}
		// Clock widget
		if (id === 'clock') {
			text = Game.time[0].lpad('0', 2) + ':' + Game.time[1].lpad('0', 2);
		}
		if (text) {
			/*Text.draw({
				text: text,
				canvas: 'widget-canvas-' + id,
				x: floor((Widgets.width / 2) - (Text.width(text) / 2)),
				y: floor(int($('widget-container-' + id).style.height) / 2) - 7,
				zoom: 1,
				firstLoad: function () {
					Widgets.draw(id);
				}
			});*/
			context.font = '12px Open Sans';
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillStyle = '#EEE';
			context.fillText(text, floor(Widgets.width / 2), floor(int($('widget-container-' + id).style.height) / 2));
		}
	},
	isAvailable: function(){
		switch (widget) {
			default:
				return false;
		}
	},
	outsource: function(){
	}
};