// Add new videos here — each entry gets a slot in the picker.
// levels: how many brightness levels were used in preprocessing
//   2 = binary (black/white only — ideal for high-contrast animation like Bad Apple)
//   6 = 6-level grayscale (better tonal range for real music videos)
// loop: true → restarts automatically when audio ends
const CDN = 'https://f006.backblazeb2.com/file/AsciiVideos'

export const VIDEOS = [
  {
    id: 'bad-apple',
    title: 'Bad Apple!!',
    artist: 'Alstroemeria Records',
    framesPath: `${CDN}/bad-apple/frames.bin`,
    audioPath:  `${CDN}/bad-apple/audio.mp3`,
    levels: 2,
  },
  {
    id: 'tuyu',
    title: "I'm Getting on the Bus to the Other World, See Ya!",
    artist: 'TUYU',
    framesPath: `${CDN}/tuyu/frames.bin`,
    audioPath:  `${CDN}/tuyu/audio.mp3`,
    levels: 6,
  },
  {
    id: 'kenshi-iris',
    title: 'Iris Out',
    artist: 'Kenshi Yonezu',
    framesPath: `${CDN}/kenshi-iris/frames.bin`,
    audioPath:  `${CDN}/kenshi-iris/audio.mp3`,
    levels: 6,
  },
  {
    id: 'yonezu-mv',
    title: 'Mass',
    artist: 'Virtual Boy',
    framesPath: `${CDN}/yonezu-mv/frames.bin`,
    audioPath:  `${CDN}/yonezu-mv/audio.mp3`,
    levels: 6,
  },
  {
    id: 'seven-nation-army',
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    framesPath: `${CDN}/seven-nation-army/frames.bin`,
    audioPath:  `${CDN}/seven-nation-army/audio.mp3`,
    levels: 6,
  },
  {
    id: 'happy-sugar-life',
    title: 'Happy Sugar Life OP',
    artist: 'Happy Sugar Life',
    framesPath: `${CDN}/happy-sugar-life/frames.bin`,
    audioPath:  `${CDN}/happy-sugar-life/audio.mp3`,
    levels: 6,
  },
  {
    id: 'ree-dance',
    title: 'Reze Dance (clip)',
    artist: 'IRIS OUT x REZE DANCE edit',
    framesPath: `${CDN}/ree-dance/frames.bin`,
    audioPath:  `${CDN}/ree-dance/audio.mp3`,
    levels: 6,
    loop: true,
  },
  {
    id: 'idol',
    title: 'アイドル (IDOL)',
    artist: 'YOASOBI',
    framesPath: `${CDN}/idol/frames.bin`,
    audioPath:  `${CDN}/idol/audio.mp3`,
    levels: 6,
  },
  {
    id: 'csm-iris',
    title: 'IRIS OUT (Chainsaw Man: Reze Arc Opening)',
    artist: 'Kenshi Yonezu',
    framesPath: `${CDN}/csm-iris/frames.bin`,
    audioPath:  `${CDN}/csm-iris/audio.mp3`,
    levels: 6,
  },
  {
    id: 'holo-foolish',
    title: 'Foolish (clip)',
    artist: 'Holo',
    framesPath: `${CDN}/holo-foolish/frames.bin`,
    audioPath:  `${CDN}/holo-foolish/audio.mp3`,
    levels: 6,
    loop: true,
  },
]
