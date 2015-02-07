var exports = exports || window;

// Define all the different ranks
exports.Rank = function (rank) {
	switch (rank) {
	case 0:
		this.id = 0;
		this.name = 'Player';
		this.symbol = '';
		this.beforeNoun = 'a';
		this.canPromote = [];
		break;
	case 1:
		this.id = 1;
		this.name = 'Teleporter';
		this.symbol = '+';
		this.beforeNoun = 'a';
		this.canPromote = [];
		this.canTeleport = 1;
		break;
	case 2:
		this.id = 2;
		this.name = 'Moderator';
		this.symbol = '&';
		this.beforeNoun = 'a';
		this.canPromote = [0, 1];
		this.canKick = 1;
		this.canSkin = 1;
		this.canMotD = 1;
		this.canFlag = 1;
		this.canTeleport = 1;
		this.canFullyTeleport = 1;
		this.canTrigger = 1;
		this.canMute = 1;
		this.extendedWhois = 1;
		this.canAsk = 1;
		this.staffMode = 1;
		this.canCheat = 1;
		this.canAlly = 1;
		break;
	case 3:
		this.id = 3;
		this.name = 'Administrator';
		this.symbol = '@';
		this.beforeNoun = 'an';
		this.canPromote = [0, 1, 2];
		this.canKick = 1;
		this.canSkin = 1;
		this.canMotD = 1;
		this.canFlag = 1;
		this.canTeleport = 1;
		this.canFullyTeleport = 1;
		this.canTrigger = 1;
		this.canMute = 1;
		this.extendedWhois = 1;
		this.canAsk = 1;
		this.staffMode = 1;
		this.canCheat = 1;
		this.canAlly = 1;
		break;
	case 4:
		this.id = 4;
		this.name = 'Developer';
		this.symbol = '\xA7';
		this.beforeNoun = 'a';
		this.canPromote = [0, 1, 2, 3];
		this.canKick = 1;
		this.canSkin = 1;
		this.canMotD = 1;
		this.canFlag = 1;
		this.canTeleport = 1;
		this.canFullyTeleport = 1;
		this.canTrigger = 1;
		this.canMute = 1;
		this.extendedWhois = 1;
		this.canAsk = 1;
		this.staffMode = 1;
		this.canCheat = 1;
		this.canAlly = 1;
		this.canExecute = 1;
		break;
	}
};