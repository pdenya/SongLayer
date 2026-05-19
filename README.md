# SongLayer

Record yourself singing, then sing along with yourself. SongLayer is a mobile app for building layered vocal videos one take at a time — each new clip records while every previous clip plays back, so you can harmonize, double, and stack parts against your own performance without ever leaving your phone.

The end result is a multi-pane video, sized and arranged for social, where every pane is one of your takes and the audio is all of them at once.

## How it works

1. **Record take 1.** Sing into the camera. That's your foundation.
2. **Record take 2.** Take 1 plays back while you record. Sing a harmony, a counter-melody, a bass line, a beatbox — anything that fits.
3. **Keep going.** Take 3 plays takes 1 and 2. Take 4 plays takes 1, 2, and 3. And so on.
4. **Arrange and export.** Pick from layouts designed for the platforms you actually post to.

Because each new take is performed against the existing mix, timing and pitch lock in naturally — you're reacting to what's already there, the way you would in a room with other singers.

## The grid evolves with your song

Most collage apps make you pick a layout up front and pour clips into fixed slots. SongLayer doesn't.

- One clip fills the frame.
- Two clips split it.
- Three, four, five clips rearrange into a layout that still reads on a phone screen.
- Layouts are customizable — but only within the set of arrangements that export cleanly to vertical (TikTok / Reels / Shorts), square (feed), and horizontal (YouTube).

You're never locked into a rigid template you chose before you knew how many parts the song needed.

## Also useful for multi-camera capture

The same playback-while-recording loop works for non-musical multi-cam:

- Film yourself from one angle, then film a second angle with the first as reference.
- Build a two- or three-camera "interview" with only one camera and one person.
- Capture a performance from multiple positions across multiple takes.

Anywhere you'd want synced multi-angle footage but only have one device, the layered-take workflow gets you there.

## Status

Early development. The repo currently contains the Expo template scaffolding the project is being built on top of.

## Tech stack

Built on the [nkzw-tech Expo app template](https://github.com/nkzw-tech/expo-app-template):

- Expo 55 & React Native 0.83 with the New Architecture
- Expo Router
- TypeScript, React 19, React Compiler
- Uniwind + Tailwind for styling
- fbtee for i18n
- Vite+ for tooling

## Getting started

### Prerequisites

Node.js 24, [Vite+](https://viteplus.dev/), and Cocoapods.

```bash
curl -fsSL https://vite.plus | bash
brew install cocoapods
```

For building and running on a device or simulator, follow the [Expo setup guides](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=simulated).

### Install

```bash
vp install && vp run dev:setup
```

### Run on iOS

```bash
vp run prebuild
vp run ios
```

If the app is already installed on your simulator, `pnpm dev` is enough to start the dev server.

## License

See [LICENSE](./LICENSE).
