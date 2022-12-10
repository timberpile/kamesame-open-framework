import { Core } from './types'

export class ReviewInfo implements Core.ReviewInfo {
    get answerCorrect() {
        const input = document.querySelector('#app.kamesame #study .input-area input')
        if (!input) {
            return null
        }
        const outcomes: Core.AnswerOutcome[] = [
            'exactly_correct',
            'reading_correct',
            'alternative_match_completion',
            'alternative_match',
            'incorrect',
        ]
        for (const outcome of outcomes) {
            if (input.classList.contains(outcome)) {
                return outcome
            }
        }
        return null
    }

    get reviewType() {
        const input = document.querySelector('#app.kamesame #study .input-area input')
        if (!input) {
            return null
        }
        if (input.classList.contains('production')) {
            return 'production'
        }
        if (input.classList.contains('recognition')) {
            return 'recognition'
        }
        return null
    }
}

