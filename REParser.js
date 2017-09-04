var offset = null;
var inputStr = null;

var CHAR = 1;
var RANGE = 2;
var GROUP = 3;
var CONCAT = 4;
var REPEAT = 5;
var ALTERNATE = 6;

function parseError(expected) {
	var found = (inputStr[offset] || 'EOF');
	var errorMessage = ('Parse error, "' + expected +
		'" expected, but "' + found + '" found'
	);
	throw {
		found: found,
		expected: expected,
		toString: function() {
			return errorMessage;
		}
	};
}

function test(ch, index) {
	if (typeof index !== 'number') index = 0;
	return (inputStr[offset + index] === ch);
}

function next() {
	var length = arguments.length;
	if (!length) return inputStr[offset++];
	for (var c = 0; c < length; c++) {
		if (!test(arguments[c], c)) return false;
	}
	offset += length;
	return true;
}

function isNot(skipChars) {
	if (!skipChars) skipChars = [];
	for (var c = 0; c < skipChars.length; c++) {
		if (test(skipChars[c])) return false;
	}
	return next();
}

function parseChar(skipChars) {
	var value = isNot(skipChars);
	if (!value) return;
	if (value === '\\') value = next();
	return [CHAR, value.charCodeAt(0)];
}

function parseGroup(skipChars) {

	if (next('(') && !next(')')) {
		var nonCapturing = next('?', ':');
		var expression = parseExpression(skipChars.concat(')'));
		if (!expression) parseError('expression');
		if (!next(')')) parseError(')');
		expression = [GROUP, expression];
		if (nonCapturing) expression.push(1);
		return expression;
	}

	else if (next('[') && !next(']')) {
		var inverse = next('^');
		var values = [], fromChar, toChar;
		while (fromChar = parseChar(']')) {
			if (next('-')) {
				if (toChar = parseChar(']'))
					values.push([RANGE, fromChar[1], toChar[1]]);
				else values.push(fromChar, [CHAR, '-']);
			} else values.push(fromChar);
		}
		if (!values.length) parseError('expression');
		if (!next(']')) parseError(']');
		// if (inverse) inverse(values);
		return [ALTERNATE].concat(values);
	}

	return parseChar(skipChars);
}

function parseKleene(skipChars) {

	var value = parseGroup(skipChars);
	if (!value) return;

	if (next('+')) return [REPEAT, 1, 0, value];
	if (next('*')) return [REPEAT, 0, 0, value];
	if (next('?')) return [REPEAT, 0, 1, value];

	if (next('{')) {
		var min = 0, max = 0;
		var minMax = '', ch;
		while (ch = isNot('}')) minMax += ch;
		if (!next('}')) parseError('}');
		minMax = minMax.split(/\s*,\s*/);
		if (minMax.length > 1) {
			min = (parseInt(minMax[0], 10) || 0);
			max = (parseInt(minMax[1], 10) || 0);
		} else min = max = parseInt(minMax, 10);
		return [REPEAT, min, max, value];
	}

	return value;
}

function parseConcatenation(skipChars) {
	var left = parseKleene(skipChars);
	var right = parseKleene(skipChars);
	if (right) left = [left, right]; else return left;
	while (right = parseKleene(skipChars)) left.push(right);
	return [CONCAT].concat(left);
}

function parseExpression(skipChars) {
	var expression = parseConcatenation(skipChars);
	if (!test('|')) return expression;
	if (!expression) parseError('exression');
	var expressions = [expression];
	while (next('|')) {
		if (expression = parseConcatenation(skipChars)) {
			expressions.push(expression);
		} else parseError('expression');
	}
	return [ALTERNATE].concat(expressions);
}

function REParser(regExp) {
	offset = 0, inputStr = regExp;
	var result = parseExpression(['|']);
	if (!test(undefined)) parseError('EOF');
	return result;
}

REParser.CHAR = CHAR;
REParser.RANGE = RANGE;
REParser.GROUP = GROUP;
REParser.CONCAT = CONCAT;
REParser.REPEAT = REPEAT;
REParser.ALTERNATE = ALTERNATE;

module.exports = REParser;