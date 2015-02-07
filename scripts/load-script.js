function loadScript(scripts, success, current, total, error) {
	total = total || scripts.length;
	current = current || 0;
	var script = document.createElement('script');
	script.src = scripts[0];
	script.addEventListener('load', function () {
		current += 1;
		if (document.getElementById('progress-value')) {
			document.getElementById('progress-value').style.width = ((100 / total) * current) + '%';
		}
		scripts.splice(0, 1);
		if (scripts.length) {
			loadScript(scripts, success, current, total, error);
		} else if (success) {
			success();
		}
		this.remove();
	});
	if (error) {
		script.addEventListener('error', error);
	}
	document.getElementById('resources').appendChild(script);
}