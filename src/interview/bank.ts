// The built-in question bank (PLAN.md section 5).
//
// Gemma never sees this whole file: for each turn it gets only the current
// question's intent and the angle the rules picked. Key points are matched by
// code to choose a follow-up angle; in the report they can only ever appear as
// "possible gaps", never as a score (UX.md: report). Sample answers say what a
// strong answer covers, not a script to memorise.

// System design is its own round: answers are longer (several minutes, spoken
// as a walk-through) and the follow-ups probe scale and trade-offs.
export type Round = 'behavioural' | 'technical' | 'system-design' | 'hr'
export type Track = 'frontend' | 'backend' | 'ml'
export type Level = 'intern' | 'junior' | 'mid' | 'senior'

export type BankQuestion = {
  id: string
  round: Round
  tracks: ('any' | Track)[]
  levels: Level[]
  question: string
  // What the interviewer is really checking.
  intent: string
  // Matched by code: a point counts as mentioned if any phrase appears.
  keyPoints: { label: string; match: string[] }[]
  sampleAnswer: string
  // Written follow-ups, spoken when Gemma's line is rejected by the guard.
  followUps: string[]
}

const ALL: Level[] = ['intern', 'junior', 'mid', 'senior']
const JUNIOR_UP: Level[] = ['junior', 'mid', 'senior']
const MID_UP: Level[] = ['mid', 'senior']

export const BANK: BankQuestion[] = [
  // ---------------------------------------------------------------- Behavioural
  {
    id: 'b-pressure',
    round: 'behavioural',
    tracks: ['any'],
    levels: ALL,
    question: 'Tell me about a time you had to solve a problem under pressure.',
    intent: 'How they stay methodical when time is short, and what they personally did.',
    keyPoints: [
      { label: 'the deadline or stakes', match: ['deadline', 'hours', 'release', 'demo', 'production', 'urgent', 'customer'] },
      { label: 'how they narrowed the problem down', match: ['logs', 'reproduce', 'isolate', 'narrow', 'debug', 'profil'] },
      { label: 'the outcome', match: ['fixed', 'shipped', 'resolved', 'on time', 'result', 'in the end'] },
    ],
    sampleAnswer:
      'Sets the scene in a sentence (what broke, when it was due), says what they owned, walks through the concrete steps they took to narrow it down, and ends with the result and what they would do earlier next time.',
    followUps: ['What was the first thing you checked, and why that?', 'How did it turn out in the end?'],
  },
  {
    id: 'b-improved',
    round: 'behavioural',
    tracks: ['any'],
    levels: ALL,
    question: 'Tell me about a time you improved something that was not working well.',
    intent: 'Whether they notice problems, take initiative, and measure the effect.',
    keyPoints: [
      { label: 'what was wrong, with a number', match: ['slow', 'seconds', 'ms', 'percent', '%', 'errors', 'complaints'] },
      { label: 'their own part', match: [' i ', "i'd", 'i decided', 'i built', 'i wrote', 'i proposed'] },
      { label: 'the measured result', match: ['dropped', 'reduced', 'faster', 'improved', 'from', 'down to'] },
    ],
    sampleAnswer:
      'Names the problem and how they knew it was a problem, explains what they personally changed and why that option over others, and gives a before-and-after number.',
    followUps: ['What did you do yourself, as opposed to the team?', 'How did you know it actually worked?'],
  },
  {
    id: 'b-conflict',
    round: 'behavioural',
    tracks: ['any'],
    levels: ALL,
    question: 'Tell me about a time you disagreed with a teammate. How did you handle it?',
    intent: 'Whether they disagree respectfully, listen, and get to a decision.',
    keyPoints: [
      { label: 'what the disagreement was about', match: ['approach', 'design', 'decision', 'disagree', 'wanted'] },
      { label: 'listening to the other side', match: ['listened', 'understood', 'their point', 'perspective', 'asked'] },
      { label: 'how it was resolved', match: ['agreed', 'compromise', 'decided', 'data', 'tried', 'in the end'] },
    ],
    sampleAnswer:
      'Describes a real technical or process disagreement, shows they understood the other view, explains how they moved it to evidence or a quick experiment, and what was decided. Ends on the working relationship, not on being right.',
    followUps: ['What was their argument, in their words?', 'Looking back, would you handle it differently?'],
  },
  {
    id: 'b-mistake',
    round: 'behavioural',
    tracks: ['any'],
    levels: ALL,
    question: 'Tell me about a mistake you made and what you learned from it.',
    intent: 'Honesty and ownership, and whether the lesson changed how they work.',
    keyPoints: [
      { label: 'owning the mistake', match: ['my mistake', 'i missed', 'i forgot', 'i broke', 'my fault', 'i should have'] },
      { label: 'the fix', match: ['fixed', 'rolled back', 'reverted', 'apologised', 'apologized', 'told'] },
      { label: 'what changed afterwards', match: ['now i', 'since then', 'learned', 'checklist', 'test', 'always'] },
    ],
    sampleAnswer:
      'Picks a real mistake with real consequences, owns it without blaming others, says how they fixed or contained it, and names a concrete habit they changed because of it.',
    followUps: ['What do you do differently now because of it?', 'How did you find out it had gone wrong?'],
  },
  {
    id: 'b-learn-fast',
    round: 'behavioural',
    tracks: ['any'],
    levels: ALL,
    question: 'Tell me about a time you had to learn something new quickly.',
    intent: 'How they learn: sources, practice, asking for help, and applying it.',
    keyPoints: [
      { label: 'what they had to learn and why', match: ['new', 'never used', 'had to learn', 'unfamiliar', 'first time'] },
      { label: 'how they learned it', match: ['docs', 'documentation', 'tutorial', 'built', 'small project', 'asked', 'course'] },
      { label: 'applying it', match: ['shipped', 'used it', 'delivered', 'built', 'finished'] },
    ],
    sampleAnswer:
      'Says what they needed to learn and the time limit, describes a specific learning approach (docs, a small spike, asking someone), and shows they used it for real by the deadline.',
    followUps: ['What did you build first to try it out?', 'Who or what helped you most?'],
  },
  {
    id: 'b-feedback',
    round: 'behavioural',
    tracks: ['any'],
    levels: ALL,
    question: 'Tell me about a time you received difficult feedback.',
    intent: 'Whether they take feedback without defensiveness and act on it.',
    keyPoints: [
      { label: 'what the feedback was', match: ['feedback', 'told me', 'said that', 'review'] },
      { label: 'how they responded', match: ['asked', 'understood', 'reflected', 'accepted', 'listened'] },
      { label: 'the change they made', match: ['changed', 'started', 'now i', 'improved', 'since then'] },
    ],
    sampleAnswer:
      'Shares real feedback that stung, describes asking questions to understand it, and gives a concrete change they made and how they checked it worked.',
    followUps: ['What did you change after hearing it?', 'How did you feel when you first heard it?'],
  },
  {
    id: 'b-ambiguity',
    round: 'behavioural',
    tracks: ['any'],
    levels: JUNIOR_UP,
    question: 'Tell me about a time the requirements were unclear. What did you do?',
    intent: 'Whether they clarify early and make reasonable assumptions explicit.',
    keyPoints: [
      { label: 'spotting the ambiguity', match: ['unclear', 'vague', 'not sure', 'ambiguous', 'missing'] },
      { label: 'clarifying with people', match: ['asked', 'clarified', 'meeting', 'spoke to', 'checked with'] },
      { label: 'making assumptions explicit', match: ['assumed', 'assumption', 'wrote down', 'prototype', 'mockup'] },
    ],
    sampleAnswer:
      'Explains what was unclear and the risk of guessing, how they clarified (questions, a quick prototype, writing assumptions down), and how that changed what got built.',
    followUps: ['Who did you go to for answers?', 'What did you assume, and were you right?'],
  },
  {
    id: 'b-prioritise',
    round: 'behavioural',
    tracks: ['any'],
    levels: JUNIOR_UP,
    question: 'Tell me about a time you had more work than you could finish. How did you prioritise?',
    intent: 'How they decide what matters and communicate trade-offs.',
    keyPoints: [
      { label: 'how they ranked the work', match: ['priority', 'prioritise', 'prioritize', 'impact', 'urgent', 'important'] },
      { label: 'telling people', match: ['told', 'manager', 'communicated', 'stakeholder', 'updated'] },
      { label: 'what got dropped or delayed', match: ['dropped', 'delayed', 'pushed', 'later', 'cut'] },
    ],
    sampleAnswer:
      'Shows a clear way of ranking work (impact, deadlines, who is blocked), says what they deliberately left for later, and how they told the people affected.',
    followUps: ['What did you decide not to do?', 'How did you tell people their work would wait?'],
  },
  {
    id: 'b-proud',
    round: 'behavioural',
    tracks: ['any'],
    levels: ALL,
    question: "Tell me about a project you're proud of.",
    intent: 'What they value in their work, and depth on their own contribution.',
    keyPoints: [
      { label: 'what the project was for', match: ['users', 'customers', 'built', 'app', 'project', 'for'] },
      { label: 'their own contribution', match: [' i ', 'i built', 'i designed', 'i wrote', 'my part', 'i owned'] },
      { label: 'why they are proud of it', match: ['proud', 'because', 'learned', 'impact', 'used by'] },
    ],
    sampleAnswer:
      'Explains the project and who it was for in two sentences, goes deep on the part they personally built and a hard decision in it, and says why it matters to them.',
    followUps: ['What was the hardest part you built yourself?', 'If you started again, what would you change?'],
  },
  {
    id: 'b-mentor',
    round: 'behavioural',
    tracks: ['any'],
    levels: MID_UP,
    question: 'Tell me about a time you helped a teammate grow or get unblocked.',
    intent: 'Whether they lift others up, and how they teach without taking over.',
    keyPoints: [
      { label: 'what the teammate was stuck on', match: ['stuck', 'struggling', 'new', 'junior', 'blocked'] },
      { label: 'how they helped', match: ['paired', 'explained', 'reviewed', 'showed', 'guided'] },
      { label: 'the teammate doing it themselves after', match: ['on their own', 'independently', 'themselves', 'now they'] },
    ],
    sampleAnswer:
      'Describes the teammate’s situation with empathy, how they helped (pairing, questions, reviews) without just doing the work, and how the teammate became more independent.',
    followUps: ['How did you avoid just doing it for them?', 'How did they get on afterwards?'],
  },

  // ----------------------------------------------------------------------- HR
  {
    id: 'h-yourself',
    round: 'hr',
    tracks: ['any'],
    levels: ALL,
    question: 'Tell me about yourself.',
    intent: 'A short, relevant story: where they are, what they have done, why this role.',
    keyPoints: [
      { label: 'where they are now', match: ['currently', 'right now', 'final year', 'working at', 'i am a'] },
      { label: 'relevant experience', match: ['built', 'internship', 'project', 'worked on', 'experience'] },
      { label: 'why this role', match: ['looking for', 'excited', 'this role', 'next step', 'want to'] },
    ],
    sampleAnswer:
      'Under two minutes: present (what they do now), past (one or two relevant highlights), future (why this role is the next step). Work-focused, not a life story.',
    followUps: ['What made you choose this kind of work?', 'What would you like to do next?'],
  },
  {
    id: 'h-why-role',
    round: 'hr',
    tracks: ['any'],
    levels: ALL,
    question: 'Why do you want this role?',
    intent: 'Genuine, specific motivation that fits the job.',
    keyPoints: [
      { label: 'something specific about the role', match: ['team', 'product', 'role', 'stack', 'mission', 'users'] },
      { label: 'how it fits their goals', match: ['grow', 'learn', 'goal', 'career', 'next step'] },
      { label: 'what they bring', match: ['i can', 'my experience', 'skills', 'contribute', 'bring'] },
    ],
    sampleAnswer:
      'Names specific things about the role or product that attract them, links them to their own goals, and says what they would bring from day one.',
    followUps: ['What in particular drew you to it?', 'What would you bring to the team?'],
  },
  {
    id: 'h-leaving',
    round: 'hr',
    tracks: ['any'],
    levels: JUNIOR_UP,
    question: 'Why do you want to leave your current job?',
    intent: 'Positive framing: moving towards something, not just away.',
    keyPoints: [
      { label: 'what they are looking for', match: ['looking for', 'want to', 'grow', 'learn', 'opportunity'] },
      { label: 'staying positive about the current job', match: ['learned a lot', 'grateful', 'enjoyed', 'good team'] },
    ],
    sampleAnswer:
      'Frames it as moving towards something (scope, learning, a kind of product), says something fair about the current job, and avoids complaining about pay or people.',
    followUps: ['What are you looking for in your next role?', 'What have you liked most about your current job?'],
  },
  {
    id: 'h-weakness',
    round: 'hr',
    tracks: ['any'],
    levels: ALL,
    question: "What's a weakness you're working on?",
    intent: 'Self-awareness and a real plan, not a disguised strength.',
    keyPoints: [
      { label: 'a real weakness', match: ['weakness', 'struggle', 'not good at', 'tend to', 'working on'] },
      { label: 'what they are doing about it', match: ['practice', 'started', 'now i', 'working on', 'course', 'asking'] },
    ],
    sampleAnswer:
      'Names a genuine, job-relevant weakness (not "I work too hard"), gives an example of it, and describes the concrete steps they are taking and any progress.',
    followUps: ['What are you doing about it day to day?', 'Can you give an example where it showed up?'],
  },
  {
    id: 'h-five-years',
    round: 'hr',
    tracks: ['any'],
    levels: ALL,
    question: 'Where do you see yourself in a few years?',
    intent: 'Ambition that fits the role, and whether they would stay and grow.',
    keyPoints: [
      { label: 'a direction', match: ['senior', 'lead', 'expert', 'specialise', 'specialize', 'grow'] },
      { label: 'how this role helps', match: ['this role', 'here', 'learn', 'experience'] },
    ],
    sampleAnswer:
      'Gives a believable direction (deeper expertise, more ownership, leading projects) and connects it to what this role offers.',
    followUps: ['What would you like to be really good at by then?', 'How does this role help you get there?'],
  },
  {
    id: 'h-work-style',
    round: 'hr',
    tracks: ['any'],
    levels: ALL,
    question: 'How do you like to work with a team?',
    intent: 'Collaboration habits and self-awareness about their style.',
    keyPoints: [
      { label: 'communication habits', match: ['communicate', 'update', 'standup', 'ask', 'share'] },
      { label: 'an example', match: ['for example', 'once', 'when i', 'last'] },
    ],
    sampleAnswer:
      'Describes concrete habits (sharing progress early, asking for reviews, writing things down), gives a short example, and shows they adapt to the team.',
    followUps: ['Can you give me an example from a recent team?', 'What kind of team brings out your best work?'],
  },

  // ------------------------------------------------------------ System design
  // Spoken, so the bar is a clear walk-through: requirements, a simple design,
  // then scale and trade-offs. No whiteboard.
  {
    id: 'sd-url-shortener',
    round: 'system-design',
    tracks: ['any'],
    levels: JUNIOR_UP,
    question: 'How would you design a URL shortener like bit.ly?',
    intent: 'Clarifying requirements, a simple working design, then reads at scale.',
    keyPoints: [
      { label: 'requirements and scale', match: ['requirement', 'how many', 'per second', 'read heavy', 'reads', 'scale'] },
      { label: 'generating short codes', match: ['hash', 'base62', 'base 62', 'counter', 'unique id', 'collision'] },
      { label: 'storage and caching for redirects', match: ['database', 'key value', 'cache', 'redis', 'cdn'] },
    ],
    sampleAnswer:
      'Asks about scale and features first (custom links, expiry, analytics). Proposes a create endpoint that stores code to URL in a key-value store, codes from a counter encoded in base62 (or a hash with collision checks), and a redirect endpoint served mostly from a cache because reads far outnumber writes. Then talks about scaling reads, analytics written asynchronously, and abuse.',
    followUps: ['How would you generate the short codes so two links never collide?', 'Redirects are most of the traffic. How do you keep them fast?'],
  },
  {
    id: 'sd-file-sharing',
    round: 'system-design',
    tracks: ['any'],
    levels: JUNIOR_UP,
    question: 'How would you design a service where users upload and share photos?',
    intent: 'Separating file storage from metadata, uploads, and serving at scale.',
    keyPoints: [
      { label: 'object storage for files', match: ['s3', 'object storage', 'blob', 'bucket'] },
      { label: 'metadata in a database', match: ['metadata', 'database', 'table', 'owner'] },
      { label: 'serving and processing', match: ['cdn', 'thumbnail', 'resize', 'presigned', 'signed url', 'queue'] },
    ],
    sampleAnswer:
      'Stores images in object storage and metadata (owner, sharing, captions) in a database. Uploads go straight to storage with a presigned URL, a queue triggers thumbnail generation, and a CDN serves images. Covers private links, size limits, and what happens when a processing job fails.',
    followUps: ['How would the upload work without passing every file through your servers?', 'How would you make shared photos load quickly worldwide?'],
  },
  {
    id: 'sd-chat',
    round: 'system-design',
    tracks: ['any'],
    levels: MID_UP,
    question: 'How would you design a real-time chat app like WhatsApp?',
    intent: 'Persistent connections, message delivery guarantees, and offline users.',
    keyPoints: [
      { label: 'real-time connections', match: ['websocket', 'socket', 'long polling', 'persistent connection'] },
      { label: 'storing and ordering messages', match: ['store', 'database', 'order', 'sequence', 'timestamp'] },
      { label: 'offline users and delivery', match: ['offline', 'push notification', 'delivered', 'read receipt', 'retry'] },
    ],
    sampleAnswer:
      'Clients hold WebSocket connections to chat servers; a message is persisted, then routed to the recipient’s server (via a pub/sub layer) or queued for push notification if they are offline. Covers ordering per conversation, delivery and read receipts, group chats fanning out, and reconnecting clients catching up from the last message they saw.',
    followUps: ['What happens when the recipient is offline?', 'How do you keep messages in order within a conversation?'],
  },
  {
    id: 'sd-news-feed',
    round: 'system-design',
    tracks: ['any'],
    levels: MID_UP,
    question: 'How would you design the news feed for a social network?',
    intent: 'Fan-out on write versus read, ranking, and the celebrity problem.',
    keyPoints: [
      { label: 'fan-out on write or read', match: ['fan out', 'fan-out', 'fanout', 'push', 'pull', 'precompute'] },
      { label: 'users with huge followings', match: ['celebrit', 'million followers', 'popular', 'hybrid'] },
      { label: 'caching and pagination', match: ['cache', 'redis', 'pagination', 'cursor'] },
    ],
    sampleAnswer:
      'Compares fan-out on write (push posts into each follower’s precomputed feed) with fan-out on read (merge at request time), and proposes a hybrid where accounts with huge followings are merged at read time. Keeps feeds in a cache, paginates with cursors, and mentions ranking as a separate step.',
    followUps: ['What happens when someone with ten million followers posts?', 'How would you paginate the feed as new posts arrive?'],
  },
  {
    id: 'sd-notifications',
    round: 'system-design',
    tracks: ['any'],
    levels: MID_UP,
    question: 'How would you design a notification system that sends email, SMS and push notifications?',
    intent: 'Queues, retries, user preferences, and not spamming people.',
    keyPoints: [
      { label: 'queues and workers per channel', match: ['queue', 'worker', 'kafka', 'channel', 'async'] },
      { label: 'retries and failures', match: ['retry', 'dead letter', 'fail', 'idempoten'] },
      { label: 'preferences and rate limits', match: ['preference', 'opt out', 'unsubscribe', 'rate limit', 'quiet hours'] },
    ],
    sampleAnswer:
      'Services publish notification events; a notification service checks user preferences and rate limits, then puts work on per-channel queues with workers calling email, SMS and push providers. Retries with backoff, a dead-letter queue, idempotency so retries do not double-send, and templates plus delivery tracking.',
    followUps: ['What happens if the SMS provider is down for an hour?', 'How do you stop one user getting the same notification twice?'],
  },
  {
    id: 'sd-fe-typeahead',
    round: 'system-design',
    tracks: ['frontend'],
    levels: JUNIOR_UP,
    question: 'How would you design a search box with autocomplete suggestions on the frontend?',
    intent: 'Debouncing, out-of-order responses, caching, and accessibility.',
    keyPoints: [
      { label: 'debouncing requests', match: ['debounce', 'throttle', 'every keystroke', 'wait'] },
      { label: 'out-of-order responses', match: ['cancel', 'abort', 'race', 'out of order', 'latest'] },
      { label: 'keyboard and accessibility', match: ['keyboard', 'arrow', 'aria', 'combobox', 'screen reader'] },
    ],
    sampleAnswer:
      'Debounces input, cancels stale requests with AbortController (or ignores responses that are not for the latest query), caches recent results, and shows loading and empty states. The list is an accessible combobox: arrow keys, Enter, Escape, and announced results.',
    followUps: ['What happens if an older request comes back after a newer one?', 'How would someone use it with only a keyboard?'],
  },
  {
    id: 'sd-fe-design-system',
    round: 'system-design',
    tracks: ['frontend'],
    levels: MID_UP,
    question: 'How would you build a component library that several teams share?',
    intent: 'API design, theming, versioning, accessibility and documentation.',
    keyPoints: [
      { label: 'component API and tokens', match: ['props', 'api', 'tokens', 'theme', 'variant'] },
      { label: 'versioning and releases', match: ['version', 'semver', 'breaking', 'changelog', 'release'] },
      { label: 'docs, tests and accessibility', match: ['storybook', 'docs', 'documentation', 'accessib', 'visual test'] },
    ],
    sampleAnswer:
      'Starts from design tokens and a few well-designed primitives with small, consistent props, builds accessibility in, documents everything in Storybook with visual regression tests, and releases with semantic versioning, changelogs and codemods for breaking changes.',
    followUps: ['How would you ship a breaking change without blocking every team?', 'How would you make sure components stay accessible?'],
  },
  {
    id: 'sd-be-booking',
    round: 'system-design',
    tracks: ['backend'],
    levels: JUNIOR_UP,
    question: 'How would you design a ticket booking system that never sells the same seat twice?',
    intent: 'Concurrency control, holds with expiry, and payment flow.',
    keyPoints: [
      { label: 'preventing double booking', match: ['lock', 'transaction', 'unique constraint', 'optimistic', 'version'] },
      { label: 'temporary holds', match: ['hold', 'reserve', 'expire', 'timeout', 'ttl'] },
      { label: 'payment and failure', match: ['payment', 'fail', 'release', 'idempoten', 'confirm'] },
    ],
    sampleAnswer:
      'Holds a seat for a few minutes when chosen (a row with an expiry, taken inside a transaction or with a unique constraint or optimistic locking), confirms it when payment succeeds, and releases it when the hold expires or payment fails. Mentions handling a rush of users for a popular event with a queue.',
    followUps: ['Two people click the same seat at the same moment. What happens?', 'What happens if payment fails after the seat is held?'],
  },
  {
    id: 'sd-ml-recsys',
    round: 'system-design',
    tracks: ['ml'],
    levels: JUNIOR_UP,
    question: 'How would you design a product recommendation system for an online shop?',
    intent: 'Candidate generation and ranking, cold start, and offline versus online evaluation.',
    keyPoints: [
      { label: 'candidates then ranking', match: ['candidate', 'retriev', 'rank', 'two stage', 'two-stage'] },
      { label: 'cold start', match: ['cold start', 'new user', 'new product', 'popular'] },
      { label: 'evaluation', match: ['a/b', 'click', 'conversion', 'offline', 'online', 'metric'] },
    ],
    sampleAnswer:
      'Defines the goal (clicks, purchases), uses a two-stage design: cheap candidate generation (collaborative filtering, item similarity, popular items) then a ranking model on user and item features. Handles cold start with popularity and content features, evaluates offline then with an A/B test, and watches for feedback loops.',
    followUps: ['What would you show a brand-new user?', 'How would you know the recommendations are actually better?'],
  },
  {
    id: 'sd-ml-fraud',
    round: 'system-design',
    tracks: ['ml'],
    levels: MID_UP,
    question: 'How would you design a system that flags fraudulent payments in real time?',
    intent: 'Latency budget, features, imbalance, and humans in the loop.',
    keyPoints: [
      { label: 'real-time scoring and latency', match: ['real time', 'latency', 'milliseconds', 'stream', 'feature store'] },
      { label: 'imbalance and thresholds', match: ['imbalanc', 'threshold', 'precision', 'recall', 'false positive'] },
      { label: 'labels, review and drift', match: ['review', 'label', 'chargeback', 'drift', 'retrain', 'rules'] },
    ],
    sampleAnswer:
      'Scores each payment within a tight latency budget using precomputed and streaming features (velocity, device, history), combines rules with a model, picks thresholds by the cost of blocking good customers versus missing fraud, sends borderline cases to human review, and retrains as labels arrive from chargebacks because fraud patterns drift.',
    followUps: ['Where do your labels come from, and how late do they arrive?', 'How do you decide what gets blocked versus reviewed?'],
  },

  // ----------------------------------------------------------------- Frontend
  {
    id: 'fe-useeffect',
    round: 'technical',
    tracks: ['frontend'],
    levels: ALL,
    question: 'Can you explain what the useEffect hook does in React and when you would use it?',
    intent: 'Side effects after render, the dependency array, and cleanup.',
    keyPoints: [
      { label: 'runs after render, for side effects', match: ['side effect', 'after render', 'after the render'] },
      { label: 'the dependency array', match: ['dependenc', 'array', 're-run', 'rerun'] },
      { label: 'cleanup', match: ['cleanup', 'clean up', 'return a function', 'unsubscribe', 'unmount'] },
    ],
    sampleAnswer:
      'useEffect runs side effects after React renders: fetching, subscriptions, timers, touching the DOM. The dependency array decides when it re-runs; returning a function cleans up before the next run or on unmount. Mentions that derived values do not need an effect.',
    followUps: ['What happens if the dependency array is left out?', 'What happens if the component unmounts while a fetch is in flight?'],
  },
  {
    id: 'fe-slow-page',
    round: 'technical',
    tracks: ['frontend'],
    levels: JUNIOR_UP,
    question: 'A page in your app feels slow. How would you find out why?',
    intent: 'Measuring before fixing: profiling tools, network, rendering, bundle size.',
    keyPoints: [
      { label: 'measuring first', match: ['measure', 'lighthouse', 'profiler', 'devtools', 'performance tab'] },
      { label: 'network and bundle size', match: ['network', 'bundle', 'size', 'lazy', 'split', 'image'] },
      { label: 'rendering', match: ['re-render', 'rerender', 'render', 'memo', 'list', 'virtual'] },
    ],
    sampleAnswer:
      'Reproduces it, measures with the Performance tab, Lighthouse or the React Profiler, separates network (bundle size, images, waterfalls) from rendering (unnecessary re-renders, long lists), fixes the biggest cause and measures again.',
    followUps: ['Which tool would you open first, and what would you look for?', 'What if the profiler shows a list re-rendering on every keystroke?'],
  },
  {
    id: 'fe-event-loop',
    round: 'technical',
    tracks: ['frontend'],
    levels: ALL,
    question: 'How does the JavaScript event loop work?',
    intent: 'Single thread, call stack, task and microtask queues, and why it matters for UI.',
    keyPoints: [
      { label: 'single-threaded call stack', match: ['single thread', 'one thread', 'call stack', 'stack'] },
      { label: 'task and microtask queues', match: ['queue', 'microtask', 'promise', 'settimeout', 'callback'] },
      { label: 'blocking the main thread', match: ['block', 'freeze', 'long task', 'main thread'] },
    ],
    sampleAnswer:
      'JavaScript runs one call stack. Async work finishes elsewhere and queues callbacks; when the stack is empty the loop runs all microtasks (promises) and then the next task (timers, events). Long synchronous work blocks rendering and input.',
    followUps: ['Which runs first, a resolved promise or a setTimeout of zero?', 'What happens to the page during a long loop?'],
  },
  {
    id: 'fe-css-layout',
    round: 'technical',
    tracks: ['frontend'],
    levels: ALL,
    question: 'When would you use CSS grid instead of flexbox?',
    intent: 'One-dimensional versus two-dimensional layout, with a real example.',
    keyPoints: [
      { label: 'flexbox is one-dimensional', match: ['one dimension', 'one-dimensional', 'row or column', 'single axis'] },
      { label: 'grid is two-dimensional', match: ['two dimension', 'two-dimensional', 'rows and columns'] },
      { label: 'an example', match: ['navbar', 'card', 'dashboard', 'layout', 'gallery', 'form'] },
    ],
    sampleAnswer:
      'Flexbox lays things out along one axis and suits toolbars and rows of buttons; grid controls rows and columns together and suits page layouts and card grids. They are often combined.',
    followUps: ['How would you lay out a dashboard with a sidebar and cards?', 'How would you centre something inside a box?'],
  },
  {
    id: 'fe-a11y',
    round: 'technical',
    tracks: ['frontend'],
    levels: ALL,
    question: 'How do you make a web page accessible?',
    intent: 'Semantic HTML, keyboard use, labels, contrast, and testing with real tools.',
    keyPoints: [
      { label: 'semantic HTML', match: ['semantic', 'button', 'heading', 'label', 'landmark'] },
      { label: 'keyboard and focus', match: ['keyboard', 'tab', 'focus'] },
      { label: 'testing it', match: ['screen reader', 'voiceover', 'nvda', 'axe', 'lighthouse', 'contrast'] },
    ],
    sampleAnswer:
      'Starts with semantic HTML (real buttons, labels, headings), makes everything work by keyboard with visible focus, checks contrast and alt text, uses ARIA only when HTML cannot express it, and tests with a screen reader and an automated checker.',
    followUps: ['How would you test it yourself?', 'What goes wrong if you build a button out of a div?'],
  },
  {
    id: 'fe-state',
    round: 'technical',
    tracks: ['frontend'],
    levels: JUNIOR_UP,
    question: 'How do you decide where state should live in a React app?',
    intent: 'Keep state close to where it is used; server state versus client state.',
    keyPoints: [
      { label: 'keep it local, lift when shared', match: ['local', 'lift', 'closest', 'parent'] },
      { label: 'server state is different', match: ['server state', 'react query', 'tanstack', 'swr', 'cache'] },
      { label: 'global stores when needed', match: ['context', 'redux', 'zustand', 'global'] },
    ],
    sampleAnswer:
      'Keeps state as local as possible and lifts it only when siblings share it, treats server data as a cache (React Query or SWR), and reaches for context or a store only for truly app-wide state.',
    followUps: ['When would you reach for context instead of props?', 'Where would data from an API live?'],
  },
  {
    id: 'fe-xss',
    round: 'technical',
    tracks: ['frontend'],
    levels: JUNIOR_UP,
    question: 'What is cross-site scripting, and how do you prevent it in a frontend app?',
    intent: 'Untrusted content executed as code, escaping, and avoiding raw HTML.',
    keyPoints: [
      { label: 'what XSS is', match: ['inject', 'script', 'untrusted', 'user input', 'malicious'] },
      { label: 'escaping and not using raw HTML', match: ['escape', 'dangerouslysetinnerhtml', 'innerhtml', 'sanitize', 'sanitise'] },
      { label: 'extra defences', match: ['content security policy', 'csp', 'httponly', 'cookie'] },
    ],
    sampleAnswer:
      'XSS is untrusted input running as script in the page. Frameworks escape text by default, so avoid innerHTML and dangerouslySetInnerHTML, sanitise when HTML is unavoidable, add a Content Security Policy, and keep tokens out of reach of scripts.',
    followUps: ['When would React not protect you?', 'Where would you store an auth token, and why?'],
  },
  {
    id: 'fe-url',
    round: 'technical',
    tracks: ['frontend'],
    levels: ALL,
    question: 'What happens when you type a URL into the browser and press enter?',
    intent: 'DNS, connection, request, response, parsing and rendering, at a sensible depth.',
    keyPoints: [
      { label: 'DNS and connection', match: ['dns', 'ip', 'tcp', 'tls', 'https'] },
      { label: 'request and response', match: ['request', 'response', 'server', 'http'] },
      { label: 'parsing and rendering', match: ['parse', 'dom', 'css', 'render', 'paint', 'layout'] },
    ],
    sampleAnswer:
      'The browser resolves the domain with DNS, opens a TCP and TLS connection, sends an HTTP request, gets HTML back, parses it into the DOM, fetches CSS and scripts, builds the render tree, lays it out and paints.',
    followUps: ['What does the browser do with a script tag in the head?', 'Where can caching skip some of those steps?'],
  },
  {
    id: 'fe-testing',
    round: 'technical',
    tracks: ['frontend'],
    levels: JUNIOR_UP,
    question: 'How would you test a React component?',
    intent: 'Testing behaviour the user sees, not implementation details.',
    keyPoints: [
      { label: 'test behaviour, not internals', match: ['behaviour', 'behavior', 'user', 'what the user sees', 'implementation'] },
      { label: 'tools', match: ['testing library', 'jest', 'vitest', 'playwright', 'cypress'] },
      { label: 'mocking the network', match: ['mock', 'msw', 'stub', 'fake'] },
    ],
    sampleAnswer:
      'Renders it with Testing Library, interacts the way a user would (clicks, typing), asserts on what appears on screen, mocks the network at the boundary, and leaves full flows to a few end-to-end tests.',
    followUps: ['How would you test a component that fetches data?', 'What would you not bother testing?'],
  },
  {
    id: 'fe-loading',
    round: 'technical',
    tracks: ['frontend'],
    levels: MID_UP,
    question: 'How would you make a large single-page app load faster for first-time visitors?',
    intent: 'Code splitting, caching, rendering strategy, and measuring Web Vitals.',
    keyPoints: [
      { label: 'code splitting', match: ['split', 'lazy', 'dynamic import', 'chunk'] },
      { label: 'rendering strategy', match: ['ssr', 'server side', 'server-side', 'static', 'prerender', 'streaming'] },
      { label: 'measuring', match: ['web vitals', 'lcp', 'inp', 'cls', 'lighthouse', 'measure'] },
    ],
    sampleAnswer:
      'Measures LCP and INP first, splits code by route and lazy-loads heavy parts, considers server or static rendering for the first view, optimises images and fonts, and caches assets with long-lived hashed filenames.',
    followUps: ['Which number would you watch to know it worked?', 'What would you lazy-load first?'],
  },

  // ------------------------------------------------------------------ Backend
  {
    id: 'be-rest',
    round: 'technical',
    tracks: ['backend'],
    levels: ALL,
    question: 'How would you design a REST API for a simple to-do app?',
    intent: 'Resources, methods, status codes, and validation.',
    keyPoints: [
      { label: 'resources and methods', match: ['get', 'post', 'put', 'patch', 'delete', '/todos'] },
      { label: 'status codes', match: ['200', '201', '204', '400', '404', 'status code'] },
      { label: 'validation and errors', match: ['validat', 'error', 'bad request'] },
    ],
    sampleAnswer:
      'Models todos as a resource: GET /todos, POST /todos, GET, PATCH and DELETE /todos/:id, returns 201 on create and 404 for a missing item, validates input with a clear 400 error, and adds pagination once lists grow.',
    followUps: ['What would you return if the item does not exist?', 'How would you handle a list with ten thousand items?'],
  },
  {
    id: 'be-index',
    round: 'technical',
    tracks: ['backend'],
    levels: ALL,
    question: 'What is a database index, and when would you add one?',
    intent: 'Faster reads at the cost of writes and space; choosing columns from real queries.',
    keyPoints: [
      { label: 'what an index does', match: ['faster', 'lookup', 'b-tree', 'btree', 'scan'] },
      { label: 'the cost', match: ['write', 'slower insert', 'space', 'storage'] },
      { label: 'choosing from real queries', match: ['where', 'query', 'explain', 'slow query'] },
    ],
    sampleAnswer:
      'An index (usually a B-tree) lets the database find rows without scanning the table. Adds one on columns used in frequent filters, joins or sorts, confirmed with EXPLAIN, remembering every index slows writes and takes space.',
    followUps: ['How would you check whether a query uses the index?', 'Why not index every column?'],
  },
  {
    id: 'be-sql-nosql',
    round: 'technical',
    tracks: ['backend'],
    levels: ALL,
    question: 'How do you choose between a SQL and a NoSQL database?',
    intent: 'Data shape, consistency needs, query patterns and scale, not fashion.',
    keyPoints: [
      { label: 'relations and transactions', match: ['relation', 'join', 'transaction', 'acid', 'schema'] },
      { label: 'access patterns', match: ['access pattern', 'query', 'key value', 'document', 'flexible'] },
      { label: 'scale', match: ['scale', 'horizontal', 'shard'] },
    ],
    sampleAnswer:
      'Starts from the data and queries: relational data with joins and transactions suits SQL (often the default), while simple key or document lookups at very high scale or with a flexible shape can suit NoSQL. Names a concrete example of each.',
    followUps: ['Which would you pick for an online shop’s orders, and why?', 'What do you give up with a document database?'],
  },
  {
    id: 'be-cache',
    round: 'technical',
    tracks: ['backend'],
    levels: JUNIOR_UP,
    question: 'How would you add caching to a slow API endpoint?',
    intent: 'Where to cache, what to key on, and invalidation.',
    keyPoints: [
      { label: 'where the cache sits', match: ['redis', 'memcached', 'in memory', 'cdn', 'http cache'] },
      { label: 'invalidation or expiry', match: ['invalidat', 'ttl', 'expire', 'stale'] },
      { label: 'measuring the gain', match: ['hit rate', 'latency', 'measure', 'faster'] },
    ],
    sampleAnswer:
      'Measures why it is slow first, caches the expensive result in something like Redis keyed on the inputs, sets a TTL or invalidates on writes, watches the hit rate and latency, and considers HTTP caching if the data is public.',
    followUps: ['What happens when the underlying data changes?', 'What if many requests miss the cache at the same moment?'],
  },
  {
    id: 'be-auth',
    round: 'technical',
    tracks: ['backend'],
    levels: JUNIOR_UP,
    question: 'How would you handle user authentication in a web API?',
    intent: 'Sessions versus tokens, password storage, and secure transport.',
    keyPoints: [
      { label: 'password hashing', match: ['hash', 'bcrypt', 'argon', 'salt'] },
      { label: 'sessions or tokens', match: ['session', 'jwt', 'token', 'cookie'] },
      { label: 'security details', match: ['https', 'httponly', 'expiry', 'expire', 'refresh', 'csrf'] },
    ],
    sampleAnswer:
      'Hashes passwords with bcrypt or Argon2, issues a session cookie (httpOnly, secure) or a short-lived token with refresh, serves everything over HTTPS, and considers an established provider instead of rolling its own.',
    followUps: ['Where would you keep the token on the client, and why?', 'How would you log a user out everywhere?'],
  },
  {
    id: 'be-rate-limit',
    round: 'technical',
    tracks: ['backend'],
    levels: MID_UP,
    question: 'How would you rate-limit an API?',
    intent: 'An algorithm, where the counters live, and what clients see.',
    keyPoints: [
      { label: 'an algorithm', match: ['token bucket', 'leaky bucket', 'sliding window', 'fixed window'] },
      { label: 'shared counters', match: ['redis', 'shared', 'distributed', 'gateway'] },
      { label: 'what clients get', match: ['429', 'retry-after', 'header'] },
    ],
    sampleAnswer:
      'Picks a token bucket or sliding window per user or key, keeps counters somewhere shared like Redis or the API gateway so all instances agree, returns 429 with Retry-After, and sets limits from real traffic.',
    followUps: ['What happens when you run five instances of the service?', 'What should the client do when it gets limited?'],
  },
  {
    id: 'be-transactions',
    round: 'technical',
    tracks: ['backend'],
    levels: ALL,
    question: 'What is a database transaction, and why does it matter?',
    intent: 'All-or-nothing changes, ACID, and an example like a money transfer.',
    keyPoints: [
      { label: 'all or nothing', match: ['all or nothing', 'atomic', 'rollback', 'roll back'] },
      { label: 'ACID or isolation', match: ['acid', 'isolation', 'consistent', 'durable'] },
      { label: 'an example', match: ['transfer', 'bank', 'order', 'payment', 'stock'] },
    ],
    sampleAnswer:
      'A transaction groups changes so they all happen or none do. The classic example is a transfer: debit and credit together. Mentions ACID and that isolation levels decide what concurrent transactions can see.',
    followUps: ['What could go wrong without one in a money transfer?', 'What happens if two transactions update the same row?'],
  },
  {
    id: 'be-queue',
    round: 'technical',
    tracks: ['backend'],
    levels: MID_UP,
    question: 'When would you use a message queue?',
    intent: 'Decoupling slow or spiky work, retries, and idempotent consumers.',
    keyPoints: [
      { label: 'async or slow work', match: ['background', 'async', 'slow', 'email', 'decouple'] },
      { label: 'retries and failures', match: ['retry', 'dead letter', 'dlq', 'failure'] },
      { label: 'idempotency', match: ['idempoten', 'duplicate', 'at least once', 'exactly once'] },
    ],
    sampleAnswer:
      'Uses a queue to move slow or spiky work (emails, image processing) out of the request, smooth bursts and decouple services. Handles retries with a dead-letter queue and makes consumers idempotent because delivery is usually at least once.',
    followUps: ['What happens if the same message is delivered twice?', 'How would you notice messages piling up?'],
  },
  {
    id: 'be-idempotency',
    round: 'technical',
    tracks: ['backend'],
    levels: MID_UP,
    question: 'A client retries a payment request after a timeout. How do you avoid charging twice?',
    intent: 'Idempotency keys and storing the result of the first attempt.',
    keyPoints: [
      { label: 'idempotency key', match: ['idempoten', 'key', 'request id', 'unique'] },
      { label: 'storing the first result', match: ['store', 'save', 'return the same', 'previous result'] },
      { label: 'concurrency', match: ['lock', 'unique constraint', 'race', 'at the same time'] },
    ],
    sampleAnswer:
      'The client sends an idempotency key; the server records it with the outcome of the first attempt and returns that same outcome for retries, using a unique constraint or lock so two simultaneous retries cannot both charge.',
    followUps: ['What if both retries arrive at exactly the same time?', 'How long would you keep the keys?'],
  },
  {
    id: 'be-incident',
    round: 'technical',
    tracks: ['backend'],
    levels: JUNIOR_UP,
    question: 'Your service starts returning errors in production. What do you do?',
    intent: 'Mitigate first, then investigate with logs, metrics and recent changes.',
    keyPoints: [
      { label: 'mitigate first', match: ['rollback', 'roll back', 'revert', 'mitigate', 'feature flag'] },
      { label: 'logs and metrics', match: ['logs', 'metrics', 'dashboard', 'trace', 'monitoring'] },
      { label: 'recent changes and follow-up', match: ['deploy', 'recent change', 'postmortem', 'post-mortem', 'root cause'] },
    ],
    sampleAnswer:
      'Checks the scope on dashboards, looks at what changed recently, rolls back or flags off to stop the bleeding, then digs into logs and traces for the root cause, communicates status, and writes a blameless post-mortem.',
    followUps: ['What would you check first?', 'When would you roll back rather than fix forward?'],
  },

  // ----------------------------------------------------------------------- ML
  {
    id: 'ml-overfit',
    round: 'technical',
    tracks: ['ml'],
    levels: ALL,
    question: 'What is overfitting, and how do you deal with it?',
    intent: 'Train versus validation gap, and concrete remedies.',
    keyPoints: [
      { label: 'what it is', match: ['training data', 'memoris', 'memoriz', 'generalis', 'generaliz', 'noise'] },
      { label: 'how to spot it', match: ['validation', 'gap', 'test set', 'held out'] },
      { label: 'remedies', match: ['regulari', 'dropout', 'more data', 'simpler', 'early stopping', 'augment'] },
    ],
    sampleAnswer:
      'Overfitting is learning the training data, noise included, so it fails on new data; it shows as a large train versus validation gap. Remedies: more or augmented data, regularisation, dropout, early stopping, or a simpler model.',
    followUps: ['How would you spot it on a training curve?', 'What if you cannot get more data?'],
  },
  {
    id: 'ml-metrics',
    round: 'technical',
    tracks: ['ml'],
    levels: ALL,
    question: 'When is accuracy the wrong metric, and what would you use instead?',
    intent: 'Class imbalance, precision and recall, and the cost of each error.',
    keyPoints: [
      { label: 'imbalance', match: ['imbalanc', 'rare', 'fraud', '99%', 'minority'] },
      { label: 'precision and recall', match: ['precision', 'recall', 'f1', 'false positive', 'false negative'] },
      { label: 'cost of errors', match: ['cost', 'business', 'worse', 'miss'] },
    ],
    sampleAnswer:
      'With imbalanced classes accuracy misleads (99% by always saying "not fraud"). Uses precision, recall, F1 or PR-AUC, and picks the threshold from which error costs more: a missed fraud or a false alarm.',
    followUps: ['For a cancer screening model, which error is worse?', 'How would you choose the threshold?'],
  },
  {
    id: 'ml-leakage',
    round: 'technical',
    tracks: ['ml'],
    levels: JUNIOR_UP,
    question: 'What is data leakage, and how do you avoid it?',
    intent: 'Information from the future or the test set reaching training.',
    keyPoints: [
      { label: 'what leakage is', match: ['future', 'test set', 'target', 'information'] },
      { label: 'splitting correctly', match: ['split', 'before', 'time', 'group'] },
      { label: 'fitting preprocessing on train only', match: ['scaler', 'preprocess', 'fit on train', 'pipeline', 'normaliz', 'normalis'] },
    ],
    sampleAnswer:
      'Leakage is training on information unavailable at prediction time, which gives great offline scores that collapse in production. Avoids it by splitting first (by time or group where needed), fitting preprocessing on training data only, and checking features for target proxies.',
    followUps: ['How would a suspiciously good score make you check for it?', 'How would you split data that has dates?'],
  },
  {
    id: 'ml-bias-variance',
    round: 'technical',
    tracks: ['ml'],
    levels: JUNIOR_UP,
    question: 'Can you explain the bias-variance trade-off?',
    intent: 'Underfitting versus overfitting, and model complexity.',
    keyPoints: [
      { label: 'bias means underfitting', match: ['bias', 'underfit', 'too simple'] },
      { label: 'variance means overfitting', match: ['variance', 'overfit', 'too complex', 'sensitive'] },
      { label: 'the trade-off', match: ['trade', 'balance', 'complexity', 'sweet spot'] },
    ],
    sampleAnswer:
      'Bias is error from a model too simple to capture the pattern (underfitting); variance is error from sensitivity to the particular training set (overfitting). More complexity lowers bias and raises variance; validation finds the balance.',
    followUps: ['Which one does adding more data help with?', 'How would you tell which one your model suffers from?'],
  },
  {
    id: 'ml-imbalance',
    round: 'technical',
    tracks: ['ml'],
    levels: JUNIOR_UP,
    question: 'How would you handle a heavily imbalanced dataset?',
    intent: 'Resampling, class weights, the right metric and threshold.',
    keyPoints: [
      { label: 'resampling or weights', match: ['oversampl', 'undersampl', 'smote', 'class weight', 'weight'] },
      { label: 'the right metric', match: ['precision', 'recall', 'f1', 'pr auc', 'auc'] },
      { label: 'threshold', match: ['threshold'] },
    ],
    sampleAnswer:
      'Switches to precision, recall or PR-AUC, tries class weights or resampling (on the training split only), tunes the decision threshold, and considers collecting more minority examples.',
    followUps: ['Where in the pipeline would you resample, and why there?', 'What would you report to the team?'],
  },
  {
    id: 'ml-missing',
    round: 'technical',
    tracks: ['ml'],
    levels: ALL,
    question: 'How do you deal with missing values in a dataset?',
    intent: 'Understanding why data is missing before choosing a fix.',
    keyPoints: [
      { label: 'why it is missing', match: ['why', 'random', 'pattern', 'reason'] },
      { label: 'options', match: ['impute', 'mean', 'median', 'drop', 'indicator', 'flag'] },
      { label: 'fit on train only', match: ['train', 'pipeline', 'leak'] },
    ],
    sampleAnswer:
      'First asks why values are missing, since missingness can itself be informative. Options: drop rows or columns, impute with median or a model, or add a missing indicator, fitting any imputer on training data only.',
    followUps: ['When would you drop the column entirely?', 'What if missing values mean something?'],
  },
  {
    id: 'ml-deploy',
    round: 'technical',
    tracks: ['ml'],
    levels: MID_UP,
    question: 'Your model works well offline. How would you deploy and monitor it?',
    intent: 'Serving, latency, monitoring for drift, and retraining.',
    keyPoints: [
      { label: 'serving', match: ['api', 'endpoint', 'batch', 'latency', 'container', 'serve'] },
      { label: 'monitoring drift', match: ['drift', 'monitor', 'distribution', 'data change'] },
      { label: 'rollout and retraining', match: ['shadow', 'a/b', 'canary', 'retrain', 'rollback'] },
    ],
    sampleAnswer:
      'Chooses batch or online serving by latency needs, rolls out behind a shadow test or canary, monitors input distributions, prediction drift and real outcomes, and has a retraining and rollback plan.',
    followUps: ['How would you know the model had got worse?', 'How would you roll it out safely?'],
  },
  {
    id: 'ml-gradient',
    round: 'technical',
    tracks: ['ml'],
    levels: ALL,
    question: 'How does gradient descent work, and what does the learning rate do?',
    intent: 'Following the negative gradient, and the effect of step size.',
    keyPoints: [
      { label: 'following the gradient', match: ['gradient', 'slope', 'derivative', 'downhill', 'minimi'] },
      { label: 'the learning rate', match: ['learning rate', 'step size', 'step'] },
      { label: 'too big or too small', match: ['diverge', 'overshoot', 'slow', 'too small', 'too large'] },
    ],
    sampleAnswer:
      'It repeatedly moves the parameters a small step against the gradient of the loss. The learning rate is the step size: too large overshoots or diverges, too small is slow; schedules and optimisers like Adam help.',
    followUps: ['What would the loss curve look like with a learning rate that is too high?', 'What is the difference with stochastic gradient descent?'],
  },
  {
    id: 'ml-baseline',
    round: 'technical',
    tracks: ['ml'],
    levels: JUNIOR_UP,
    question: 'You get a new prediction problem. How do you start?',
    intent: 'Framing, a simple baseline, and a metric tied to the goal.',
    keyPoints: [
      { label: 'framing the goal and metric', match: ['goal', 'metric', 'business', 'define'] },
      { label: 'a simple baseline', match: ['baseline', 'simple', 'logistic', 'heuristic', 'linear'] },
      { label: 'looking at the data', match: ['explore', 'eda', 'look at the data', 'distribution'] },
    ],
    sampleAnswer:
      'Clarifies the decision the model supports and the metric that reflects it, explores the data, builds a simple baseline (a heuristic or logistic regression), and only then iterates on features and models against that baseline.',
    followUps: ['Why start with something simple?', 'How would you pick the metric?'],
  },
  {
    id: 'ml-attention',
    round: 'technical',
    tracks: ['ml'],
    levels: MID_UP,
    question: 'Can you explain how attention works in a transformer?',
    intent: 'Queries, keys and values, and why it replaced recurrence.',
    keyPoints: [
      { label: 'queries, keys and values', match: ['query', 'key', 'value', 'qkv'] },
      { label: 'weighting other tokens', match: ['weight', 'softmax', 'other tokens', 'relevan'] },
      { label: 'why it helps', match: ['parallel', 'long range', 'long-range', 'recurren', 'rnn'] },
    ],
    sampleAnswer:
      'Each token makes a query, key and value; attention scores are query-key dot products, softmaxed, used to weight the values. It lets every token draw on any other in parallel, which handles long-range context better than RNNs; multi-head attention learns several such patterns.',
    followUps: ['Why is attention expensive for long inputs?', 'What does multi-head attention add?'],
  },
]

export type PickOptions = { round: Round | 'full'; track: Track; level: Level; count: number }

// The questions for one interview. A full loop is 2 behavioural, 2 technical
// and 1 HR (the intro is its own turn in the engine). Otherwise `count` from
// the chosen round. Shuffled with `random` so tests can pass a fixed one.
export function pickQuestions(opts: PickOptions, random: () => number = Math.random): BankQuestion[] {
  const fits = (q: BankQuestion, round: Round) =>
    q.round === round && q.levels.includes(opts.level) && (q.tracks.includes('any') || q.tracks.includes(opts.track))
  const take = (round: Round, n: number) => shuffle(BANK.filter((q) => fits(q, round)), random).slice(0, n)
  if (opts.round === 'full') return [...take('behavioural', 2), ...take('technical', 2), ...take('hr', 1)]
  return take(opts.round, opts.count)
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
