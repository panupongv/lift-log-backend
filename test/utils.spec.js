const isValidExerciseContent = require('../routes/utils').isValidExerciseContent;

describe('Helper isValidExerciseContent', () => {
    it ('should check if the content string is in a valid format', () => {
        expect(isValidExerciseContent('')).toBe(true);  
        expect(isValidExerciseContent('40x10;50x10;55x10;60x8')).toBe(true); 
        expect(isValidExerciseContent('40x10')).toBe(true);  
        
        expect(isValidExerciseContent('40x10;-50x10;55x10;60x8')).toBe(false);    
        expect(isValidExerciseContent('40x10 50x10 55x10 60x8')).toBe(false);        
    })
});