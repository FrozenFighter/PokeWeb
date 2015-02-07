// Define the dex object
var Dex = Dex || {};

Dex.data = {};

// Get a Pokemon's dex and skin ID based on its name
Dex.getPokemonByName = function (name) {
	var parts = name.split(','),
		dex,
		pokemon,
		i;
	if (parts.length === 1) {
		parts = Dex.names[name.toLowerCase()];
		if (parts) {
			return {
				id: parts[1],
				dex: parts[2],
				forme: parts[3],
				skinId: -int(parts[2].toString() + parts[1].lpad('0', 3)) - (parts[3] ? parts[3] / 1000 : 0),
				name: parts[0],
				formeName: parts[4]
			};
		}
	} else {
		dex = Dex.dexes[parts[1].toLowerCase()];
		pokemon = Dex.names[parts[0].toLowerCase()];
		if (pokemon) {
			for (i = 1; i < pokemon.length; i += 4) {
				if (((dex && pokemon[i + 1] === dex[1]) || pokemon[i + 1] === int(parts[1]) || (typeof pokemon[i + 3] === 'string' && pokemon[i + 3].toLowerCase() === parts[1].toLowerCase())) && (parts.length === 2 || (pokemon[i + 2] === int(parts[2]) || (typeof pokemon[i + 3] === 'string' && pokemon[i + 3].toLowerCase() === parts[2].toLowerCase())))) {
					return {
						id: pokemon[i],
						dex: pokemon[i + 1],
						forme: pokemon[i + 2],
						skinId: -int(pokemon[i + 1].toString() + pokemon[i].lpad('0', 3)) - (pokemon[i + 2] ? pokemon[i + 2] / 1000 : 0),
						name: pokemon[0],
						formeName: pokemon[i + 3]
					};
				}
			}
		}
	}
};

// Read a Pokemon's stats
Dex.stat = function (id, dex, forme, success) {
	if (id < -999) {
		id = Skins.getURLById(id, true);
		dex = id[1];
		forme = id[2];
		id = id[0];
	} else if (typeof id === 'string') {
		id = Dex.getPokemonByName(id);
		if (id) {
			dex = id.dex;
			forme = id.forme;
			id = id.id;
		}
	}
	if (!Dex.data[dex]) {
		loadScript([Cache.getURL('/play/scripts/data/dexes/' + dex + '.js')], function () {
			Dex.convertToSkins(dex);
			if (success) {
				success(Dex.data[dex][id]);
			}
		}, 0, 1, function () {
			Skins.skins[arguments[0]] = ['', 0];
		});
		return {};
	} else {
		if (success) {
			success(Dex.data[dex][id]);
		}
		return Dex.data[dex][id];
	}
};

// Convert a dex's Pokemon to skin data
Dex.convertToSkins = function (dex) {
	var i,
		j;
	for (i in Dex.data[dex]) {
		if (Dex.data[dex].hasOwnProperty(i)) {
			Skins.skins[-int(dex.toString() + i.lpad('0', 3))] = [Dex.data[dex][i].name, Dex.data[dex][i].glow];
			if (Dex.data[dex][i].formes) {
				for (j in Dex.data[dex][i].formes) {
					if (Dex.data[dex][i].formes.hasOwnProperty(j)) {
						Skins.skins[-int(dex.toString() + i.lpad('0', 3)) - (j ? j / 1000 : 0)] = [Dex.data[dex][i].formes[j].name || Dex.data[dex][i].name, Dex.data[dex][i].formes[j].glow];
					}
				}
			}
		}
	}
};

// Get a random Pokemon
Dex.randomPokemon = function () {
    var keys = Object.keys(Dex.names),
		entry = Dex.names[keys[randomInt(keys.length)]],
		pick = 1 + (randomInt(((entry.length - 1) / 4) - 1) * 4);
	return {
		id: entry[pick],
		dex: entry[pick + 1],
		forme: entry[pick + 2],
		skinId: -int(entry[pick + 1].toString() + entry[pick].lpad('0', 3)) + (entry[pick + 2] ? entry[pick + 2] / 1000 : 0),
		name: entry[0],
		formeName: entry[pick + 3]
	};
};