# Bundled fonts (IBM Plex family)

POLLSTICS's civic baseline design uses three IBM Plex sub-families. Drop the
`.ttf` files listed below into this folder, then rebuild the app once for them
to be picked up on Android.

## Required files

```
IBMPlexSans-Regular.ttf
IBMPlexSans-Medium.ttf
IBMPlexSans-SemiBold.ttf
IBMPlexSans-Bold.ttf

IBMPlexSansDevanagari-Regular.ttf
IBMPlexSansDevanagari-Medium.ttf
IBMPlexSansDevanagari-SemiBold.ttf

IBMPlexMono-Regular.ttf
IBMPlexMono-Medium.ttf
IBMPlexMono-SemiBold.ttf
IBMPlexMono-Bold.ttf
```

## Where to download

IBM Plex is open-source (SIL OFL).

- IBM Plex Sans: https://fonts.google.com/specimen/IBM+Plex+Sans
- IBM Plex Sans Devanagari: https://fonts.google.com/specimen/IBM+Plex+Sans+Devanagari
- IBM Plex Mono: https://fonts.google.com/specimen/IBM+Plex+Mono

Or grab the full repo from GitHub: https://github.com/IBM/plex

## Wiring (one-time)

After dropping the files into this folder:

```sh
cd packages/mobile
npx react-native-asset           # links the assets dir into Android
cd android && ./gradlew clean    # clear cached builds
cd .. && npm run android         # rebuild with new fonts
```

## Fallback

If the files are missing the app still runs — RN falls back to the system
default. Spacing and weights look correct, only the typeface differs. So you
can ship without these in dev and add them before the production build.
