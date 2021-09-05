const isValidWeightAndReps = (stringValue) => {
    return !isNaN(stringValue) &&
        parseFloat(stringValue) >= 0;
}

const isValidExerciseContent = (contentString) => {
    if (contentString === "") return true;
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

module.exports.isValidExerciseContent = isValidExerciseContent;