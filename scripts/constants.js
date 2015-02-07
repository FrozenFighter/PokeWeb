Time = {
	now : Date.now,
	framerate : Settings._("framerate"),
	millisecond : 1,
	milliseconds : 1,
	second : 1000,
	seconds : 1000
};
Time.refresh = Time.second / Time.framerate;
Directions = { up : q = 0, right : ++ q, down : ++ q, left : ++ q };