import { deleteExercise } from './index';
import { supabase } from '$lib/utils/functions/supabase';

jest.mock('$lib/utils/functions/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    match: jest.fn().mockResolvedValue({ error: null }),
    in: jest.fn().mockResolvedValue({ error: null })
  }
}));

describe('deleteExercise performance optimization', () => {
  it('performs a constant number of database requests regardless of question count', async () => {
    const questions = [
      { id: 'q1' },
      { id: 'q2' },
      { id: 'q3' }
    ];
    const exerciseId = 'e1';

    await deleteExercise(questions, exerciseId);

    // Optimized implementation:
    // 1. delete from 'option' (bulk)
    // 2. delete from 'question_answer' (bulk)
    // 3. delete from 'question' (bulk)
    // 4. delete from 'submission'
    // 5. delete from 'exercise'
    // Total: 5

    const fromCalls = (supabase.from as jest.Mock).mock.calls;
    console.log('Total calls to supabase.from after optimization:', fromCalls.length);

    expect(fromCalls.length).toBe(5);
  });
});
