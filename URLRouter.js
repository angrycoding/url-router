var NFABuilder = require('./NFABuilder.js');

function closure(stateSet, input) {
	var range, shift;
	var output = input;
	var repeat, stateIndex;
	var ranges, rangeIndex;
	do {
		repeat = false;
		stateIndex = output.length;
		while (stateIndex--) {
			if (ranges = stateSet[output[stateIndex]]) {
				rangeIndex = ranges.length;
				while (rangeIndex--) {
					range = ranges[rangeIndex];
					if (range.length === 1) {
						shift = range[0];
						if (output.indexOf(shift) === -1) {
							repeat = true;
							output.push(shift);
						}
					}
				}
			}
		}
	} while (repeat);
	return output;
}

function goto(stateSet, input, code) {
	var ranges, rangeIndex, range, shift;
	var output = [], stateIndex = input.length;
	while (stateIndex--) {
		if (ranges = stateSet[input[stateIndex]]) {
			rangeIndex = ranges.length;
			while (rangeIndex--) {
				range = ranges[rangeIndex];

				if (
					(range.length === 2 && code === range[1]) ||
					(range.length === 3 && code >= range[1] && code <= range[2])
				) {
					shift = range[0];
					if (output.indexOf(shift) === -1) {
						output.push(shift);
					}
				}


			}
		}
	}
	if (!output.length) return;
	return closure(stateSet, output);
}

function URLRouter(types) {
	this.nfa = [];
	this.data = [];
	this.paths = [];
	this.names = [];
	this.types = types;
}

URLRouter.prototype.clear = function() {
	this.nfa = [];
	this.data = [];
	this.paths = [];
	this.names = [];
};

URLRouter.prototype.add = function(path, data) {
	this.data.push(data);
	this.paths.push(path);
	return this.paths.length;
};

URLRouter.prototype.build = function() {

	var types = this.types;
	var paths = this.paths = this.paths
	.sort((a, b) => b.indexOf('$') - a.indexOf('$'))
	.map(path => {
		var names = [];
		this.names.push(names);
		return path.replace(/\$([a-z]+)(?:\=([a-zA-Z]*))?/, function(source, name, type) {
			names.push(name);
			if (types.hasOwnProperty(type))
				return '(' + types[type] + ')';
			return '([a-zA-Z0-9-]+)';
		});
	});


	this.nfa = NFABuilder(paths);
};

URLRouter.prototype.get = function(path) {

	path = path.toLowerCase();

	var acceptState = [], nfa = this.nfa;
	var startSet = closure(nfa, [0]);

	for (var c = 0; c < path.length; c++) {
		var code = path.charCodeAt(c);
		startSet = goto(nfa, startSet, code);
		if (!startSet) break;
	}

	// console.info(startSet)

	if (startSet) {
		for (var i = 0; i < startSet.length; i++) {
			if (!nfa[startSet[i]]) {
				acceptState.push(startSet[i]);
			}
		}
	}

	if (acceptState.length) {
		acceptState = acceptState.sort();
		acceptState = acceptState[0];
		acceptState = Math.abs(acceptState) - 1;


		var params = {};
		var matches = new RegExp(this.paths[acceptState]).exec(path);
		for (var c = 1; c < matches.length; c++) {
			params[this.names[acceptState][c - 1]] = matches[c];
		}

		return {params: params, data: this.data[acceptState]};

	}

};

module.exports = URLRouter;