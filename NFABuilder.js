var REParser = require('./REParser.js');

var LAST_GID = 0;

function processChar(code, fromState, toState, resultSet) {
	if (!resultSet[fromState]) resultSet[fromState] = [];
	resultSet[fromState].push([toState, code]);
}

function processRange(operator, fromState, toState, resultSet) {
	if (!resultSet[fromState]) resultSet[fromState] = [];
	resultSet[fromState].push([toState, operator[1], operator[2]]);
}

function processConcatenation(operator, fromState, toState, resultSet) {
	var iterator, prevState;
	var nextState = fromState;
	var length = operator.length;
	for (iterator = 1; iterator < length; iterator++) {
		prevState = nextState;
		if (iterator === length - 1) nextState = toState;
		else nextState = (++LAST_GID);
		processOperator(
			operator[iterator],
			prevState,
			nextState,
			resultSet
		);
	}
}

function processAlternate(operator, fromState, toState, resultSet) {
	var index = 0, length = operator.length;
	while (++index < length) processOperator(
		operator[index],
		fromState,
		toState,
		resultSet
	);
}

function processRepetition(operator, fromState, toState, resultSet) {

	var min = operator[1];
	var max = operator[2];
	var value = operator[3];

	var iterator, prevState;
	var nextState = fromState;
	if (!resultSet[fromState]) resultSet[fromState] = [];

	for (iterator = 0; iterator < min; iterator++) {
		prevState = nextState;
		if (iterator === max - 1) nextState = toState;
		else nextState = (++LAST_GID);
		processOperator(value, prevState, nextState, resultSet);
	}

	for (iterator = min; iterator < max; iterator++) {
		prevState = nextState;
		if (iterator === max - 1) nextState = toState;
		else nextState = (++LAST_GID);
		processOperator(value, prevState, nextState, resultSet);
		if (!resultSet[prevState]) resultSet[prevState] = [];
		resultSet[prevState].push([toState]);
	}

	if (max === 0) {
		if (min === 0) {
			prevState = nextState;
			nextState = (++LAST_GID);
			processOperator(value, prevState, nextState, resultSet);
			if (!resultSet[prevState]) resultSet[prevState] = [];
			resultSet[prevState].push([toState]);
		}
		prevState = nextState;
		processOperator(value, prevState, prevState, resultSet);
		if (!resultSet[prevState]) resultSet[prevState] = [];
		resultSet[prevState].push([toState]);
	}
}

function processOperator(operator, fromState, toState, resultSet) {

	var type = operator[0];
	switch (type) {

		case REParser.CHAR:
			processChar(
				operator[1],
				fromState,
				toState,
				resultSet
			);
			break;

		case REParser.RANGE:
			processRange(
				operator,
				fromState,
				toState,
				resultSet
			);
			break;

		case REParser.CONCAT:
			processConcatenation(
				operator,
				fromState,
				toState,
				resultSet
			);
			break;

		case REParser.ALTERNATE:
			processAlternate(
				operator,
				fromState,
				toState,
				resultSet
			);
			break;

		case REParser.GROUP:
			processOperator(
				operator[1],
				fromState,
				toState,
				resultSet
			);
			break;

		case REParser.REPEAT:
			processRepetition(
				operator,
				fromState,
				toState,
				resultSet
			);
			break;

		default: throw('unknown: ' + type);

	}
}


function AST2NFA(expressions) {

	LAST_GID = 0;
	var result = [];
	expressions.forEach(function(expression, expressionId) {
		expression = REParser(expression);
		processOperator(expression, 0, (-expressionId - 1), result);
	});

	return result;
}

module.exports = AST2NFA;