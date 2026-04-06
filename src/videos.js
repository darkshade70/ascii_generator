// Add new videos here — each entry gets a slot in the picker.
// levels: how many brightness levels were used in preprocessing
//   2 = binary (black/white only — ideal for high-contrast animation like Bad Apple)
//   6 = 6-level grayscale (better tonal range for real music videos)
// loop: true → restarts automatically when audio ends
export const VIDEOS = [
  {
    id: 'bad-apple',
    title: 'Bad Apple!!',
    artist: 'Alstroemeria Records',
    framesPath: '/videos/bad-apple/frames.bin',
    audioPath:  '/videos/bad-apple/audio.mp3',
    levels: 2,
  },
  {
    id: 'tuyu',
    title: "I'm Getting on the Bus to the Other World, See Ya!",
    artist: 'TUYU',
    framesPath: '/videos/tuyu/frames.bin',
    audioPath:  '/videos/tuyu/audio.mp3',
    levels: 6,
  },
  {
    id: 'kenshi-iris',
    title: 'Iris Out',
    artist: 'Kenshi Yonezu',
    framesPath: '/videos/kenshi-iris/frames.bin',
    audioPath:  '/videos/kenshi-iris/audio.mp3',
    levels: 6,
  },
  {
    id: 'yonezu-mv',
    title: 'Mass',
    artist: 'Virtual Boy',
    framesPath: '/videos/yonezu-mv/frames.bin',
    audioPath:  '/videos/yonezu-mv/audio.mp3',
    levels: 6,
  },
  {
    id: 'seven-nation-army',
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    framesPath: '/videos/seven-nation-army/frames.bin',
    audioPath:  '/videos/seven-nation-army/audio.mp3',
    levels: 6,
  },
  {
    id: 'happy-sugar-life',
    title: 'Happy Sugar Life OP',
    artist: 'Happy Sugar Life',
    framesPath: '/videos/happy-sugar-life/frames.bin',
    audioPath:  '/videos/happy-sugar-life/audio.mp3',
    levels: 6,
  },
  {
    id: 'ree-dance',
    title: 'Reze Dance (clip)',
    artist: 'IRIS OUT x REZE DANCE edit',
    framesPath: '/videos/ree-dance/frames.bin',
    audioPath:  '/videos/ree-dance/audio.mp3',
    levels: 6,
    loop: true,
  },
  {
    id: 'idol',
    title: 'アイドル (IDOL)',
    artist: 'YOASOBI',
    framesPath: '/videos/idol/frames.bin',
    audioPath:  '/videos/idol/audio.mp3',
    levels: 6,
  },
  {
    id: 'csm-iris',
    title: 'IRIS OUT (Chainsaw Man: Reze Arc Opening)',
    artist: 'Kenshi Yonezu',
    framesPath: '/videos/csm-iris/frames.bin',
    audioPath:  '/videos/csm-iris/audio.mp3',
    levels: 6,
  },
  {
    id: 'holo-foolish',
    title: 'Foolish (clip)',
    artist: 'Holo',
    framesPath: '/videos/holo-foolish/frames.bin',
    audioPath:  '/videos/holo-foolish/audio.mp3',
    levels: 6,
    loop: true,
  },
]
