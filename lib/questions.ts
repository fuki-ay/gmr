export interface Question {
  id: string
  text: string
  scale_low?: string
  scale_high?: string
  scale_labels?: [string, string, string, string, string]
  category: string
  private: boolean
}

export const questions: Question[] = [
  {
    id: 'q1',
    text: 'How much do you like pizza?',
    scale_low: 'hate it',
    scale_high: 'love it',
    category: 'food',
    private: false,
  },
  {
    id: 'q2',
    text: 'How much do you enjoy waking up early on weekends?',
    scale_low: 'hate it',
    scale_high: 'love it',
    category: 'habit',
    private: false,
  },
  {
    id: 'q3',
    text: 'Beach vacation or mountain vacation?',
    scale_low: 'strongly beach',
    scale_high: 'strongly mountains',
    category: 'comparison',
    private: false,
  },
  {
    id: 'q4',
    text: 'How important is your phone to you?',
    scale_low: 'not important',
    scale_high: 'very important',
    category: 'object',
    private: false,
  },
  {
    id: 'q5',
    text: "How much do you like trying foods you've never had before?",
    scale_low: 'hate it',
    scale_high: 'love it',
    category: 'food',
    private: false,
  },
  {
    id: 'q6',
    text: 'Watching a movie or playing a game?',
    scale_low: 'strongly movie',
    scale_high: 'strongly game',
    category: 'comparison',
    private: false,
  },
  {
    id: 'q7',
    text: 'How important is being silly and laughing every day?',
    scale_low: 'not important',
    scale_high: 'very important',
    category: 'value',
    private: false,
  },
  {
    id: 'q8',
    text: 'How much do you like surprises?',
    scale_low: 'hate them',
    scale_high: 'love them',
    category: 'habit',
    private: false,
  },
  {
    id: 'q9',
    text: 'How important is spending time with family on weekends?',
    scale_low: 'not important',
    scale_high: 'very important',
    category: 'value',
    private: false,
  },
  {
    id: 'q10',
    text: 'How much do you believe in your dad that he will finally awaken fuki ay in him in a way that he creates software like this?',
    scale_labels: [
      'current dad version is still loading… permanently',
      'maybe in another lifetime… like version 12.5 dad',
      'depends… dad definitely has dreams.',
      'pretty likely',
      'yep, i believe he can definitely do that!',
    ],
    category: 'private',
    private: true,
  },
]
