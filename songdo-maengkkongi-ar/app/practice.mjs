// Standalone unranked mode; server independently owns official scoring.
export const PRACTICE_QUESTIONS = [
  {
    "id": "find",
    "title": "맹꽁이를 찾아주세요",
    "hint": "몸통과 다리를 함께 살펴봐요.",
    "models": [
      "maeng",
      "toad",
      "om"
    ],
    "answer": "maeng",
    "explain": "맹꽁이는 둥근 몸통에 머리가 작고 다리가 짧아요. 색깔 하나보다 여러 특징을 함께 보세요."
  },
  {
    "id": "shape",
    "title": "맹꽁이를 알아보는 단서는?",
    "hint": "방금 관찰한 모습을 떠올려요.",
    "model": "maeng",
    "options": [
      {
        "id": "round",
        "text": "둥근 몸통과 짧은 다리"
      },
      {
        "id": "long",
        "text": "길쭉한 몸통과 긴 뒷다리"
      },
      {
        "id": "disc",
        "text": "발끝의 커다란 흡반"
      }
    ],
    "answer": "round",
    "explain": "둥근 몸통과 작은 머리, 짧은 다리를 함께 관찰해요. 앞발은 4개, 뒷발은 5개의 발가락이 있고 뒷발에 부분적인 물갈퀴가 있어요."
  },
  {
    "id": "toad",
    "title": "눈 뒤 귀밑샘이 도드라진 친구는?",
    "hint": "눈 뒤쪽을 돌려서 살펴봐요.",
    "models": [
      "maeng",
      "toad",
      "om"
    ],
    "answer": "toad",
    "explain": "두꺼비는 눈 뒤에 타원형 귀밑샘이 있고 몸에 크고 작은 돌기가 있어요. 옴개구리는 등과 다리의 짧은 융기선을 함께 살펴봐요."
  },
  {
    "id": "crab",
    "title": "위험할 때 다리를 떼고 피하는 게. 우리는?",
    "hint": "이런 방어 행동을 ‘자절’이라고 해요.",
    "model": "crab",
    "options": [
      {
        "id": "protect",
        "text": "다리를 잡아당기지 않고 지켜봐요"
      },
      {
        "id": "pull",
        "text": "다시 자라는지 다리를 당겨봐요"
      },
      {
        "id": "instant",
        "text": "바로 자라니까 계속 만져요"
      }
    ],
    "answer": "protect",
    "explain": "일부 게는 위험할 때 다리를 스스로 떼고 피하기도 해요. 다시 자라는 데에는 탈피와 시간이 필요해요. 실제 게의 다리를 잡아당기지 않아요."
  },
  {
    "id": "final",
    "title": "소리만 듣고 누구인지 맞혀 보세요!",
    "hint": "마지막 고난도 문제예요. 다시 들어도 좋아요.",
    "sound": true,
    "options": [
      {"id":"maeng","text":"맹꽁이"},
      {"id":"toad","text":"두꺼비"},
      {"id":"om","text":"옴개구리"}
    ],
    "answer": "maeng",
    "explain": "정답은 맹꽁이예요. 이번에는 모습이 아닌 실제 울음소리로 찾아봤어요. 이제 귀여운 맹꽁이와 사진을 남겨요."
  }
];
