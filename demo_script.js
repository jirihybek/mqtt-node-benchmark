module.exports = function() {

	return JSON.stringify({
		t: Date.now() / 1000,
		v: Math.random()
	});

};