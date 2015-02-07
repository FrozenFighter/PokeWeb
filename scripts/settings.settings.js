Settings.addData({
	"screen dimensions" : { width : 356, height : 288 },
	"framerate" : 60,
	"font" : {
		typeface : "Open Sans",
		weight : "300"
	},
	"debug mode" : false, // Whether debug mode is enabled, which shows extra details for some objects
	"stat transition duration" : 0, // How many seconds should health / experience, etc. transitions take? [0.5]
	"switch transition duration" : 0, // How many seconds should Pokémon being sent out, fainting, etc. take? [0.2]
	"ignore missing files" : false, // Whether the battle should start even if some of the required files were not loaded successfully
	"text replacements" : {
		"pokemon" : "Pok\xe9mon",
		"Pokemon" : "Pok\xe9mon",
		"pokedex" : "Pok\xe9dex",
		"Pokedex" : "Pok\xe9dex",
		"pokeball" : "Pok\xe9 Ball",
		"Pokeball" : "Pok\xe9 Ball"
	}
}, true);
Settings.addData({
	"animated moves" : false, // Whether moves display an animation when used [true]
	"visual weather effects" : true, // Whether weather constantly displays visually, or just at the end of each turn
	"particle collision-testing" : false, // Whether weather particles should implement proper collision testing
	"sound effects" : false, // Whether sounds play or not
	"text speed" : 4
}, false);