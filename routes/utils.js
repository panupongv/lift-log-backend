const isValidStartLimit = (stringValue) => {
    return !isNaN(stringValue) &&
        Number.isInteger(parseFloat(stringValue)) &&
        parseFloat(stringValue) >= 0;
};


const isValidHistoryOffset = (stringValue) => {
    return !isNaN(stringValue) &&
        Number.isInteger(parseFloat(stringValue));
};


const isValidDateFormat = (dateString) => {
    var regEx = /^\d{4}-\d{2}-\d{2}Z$/;
    return !isNaN(new Date(dateString).getTime()) &&
        dateString.match(regEx) !== null;
};


const isValidWeightAndReps = (stringValue) => {
    return !isNaN(stringValue) &&
        parseFloat(stringValue) >= 0;
};


const isValidExerciseContent = (contentString) => {
    if (contentString === '') return true;
    try {
        const sets = contentString.split(';');
        return sets.every((set) => {
            const [weight, reps] = set.split('x');
            return isValidWeightAndReps(weight) && isValidWeightAndReps(reps);
        });
    } catch (err) {
        console.log(`Content validation error: ${err}`);
        return false;
    }
};

module.exports.isValidStartLimit = isValidStartLimit;
module.exports.isValidDateFormat = isValidDateFormat;
module.exports.isValidHistoryOffset = isValidHistoryOffset;
module.exports.isValidExerciseContent = isValidExerciseContent;