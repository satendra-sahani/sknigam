module.exports = {
  project: {
    android: {
      packageName: 'com.electioncampaign',
    },
  },
  // Bundle custom .ttf fonts placed in src/assets/fonts.
  // Drop IBM Plex Sans, IBM Plex Sans Devanagari and IBM Plex Mono families
  // here (see src/assets/fonts/README.md for the exact filenames). After
  // adding files, run `npx react-native-asset` then rebuild Android.
  assets: ['./src/assets/fonts'],
};
