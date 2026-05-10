import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, Dimensions } from 'react-native';
import { COLORS } from '../utils/constants';
import { FONTS } from '../utils/theme';
import Mark from './Mark';

/**
 * POLLSTICS splash — translates the design's animated splash into RN.
 *  • dark layered background (radial-gradient feel via stacked dark circles)
 *  • 4 red/white speed streaks, alternating, looping left → right
 *  • 3 expanding rings centered on the logo, staggered
 *  • logo: entrance scale-in + slow breathe loop
 *  • POLLSTICS wordmark: letter-by-letter cascade
 *  • Hindi tagline + footer fade-up
 *  • indeterminate gradient progress bar at the bottom
 *
 * All animations use the built-in Animated API so we don't pull in
 * reanimated/native deps for a screen that runs for ~2 s on launch.
 */

const SCREEN = Dimensions.get('window');

const Streak: React.FC<{ index: number }> = ({ index }) => {
  const x = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.45,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(x, {
          toValue: SCREEN.width + 80,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    const t = setTimeout(() => loop.start(), index * 130);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [index, x, opacity]);

  const isRed = index % 2 === 0;
  const top = SCREEN.height * 0.42 + (index % 2 ? -12 : 12);
  const width = 70 - index * 10;
  return (
    <Animated.View
      style={[
        styles.streak,
        {
          top,
          width,
          backgroundColor: isRed ? '#D82A2A' : COLORS.white,
          opacity,
          transform: [{ translateX: x }],
        },
      ]}
    />
  );
};

const Ring: React.FC<{ delay: number }> = ({ delay }) => {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.6,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [delay, scale, opacity]);
  return (
    <Animated.View
      style={[
        styles.ring,
        { opacity, transform: [{ scale }] },
      ]}
    />
  );
};

const Letter: React.FC<{ char: string; delay: number }> = ({ char, delay }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.bezier(0.2, 0.7, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: 0,
          duration: 520,
          easing: Easing.bezier(0.2, 0.7, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [delay, opacity, ty]);
  return (
    <Animated.Text style={[styles.letter, { opacity, transform: [{ translateY: ty }] }]}>
      {char}
    </Animated.Text>
  );
};

const ProgressTrack: React.FC = () => {
  const x = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 140,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  return (
    <View style={styles.progressOuter}>
      <Animated.View
        style={[
          styles.progressInner,
          { transform: [{ translateX: x }] },
        ]}
      />
    </View>
  );
};

export const AnimatedSplash: React.FC = () => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const breathe = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1.05,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });

    Animated.sequence([
      Animated.delay(1300),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(1500),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, breathe, taglineOpacity, footerOpacity]);

  const letters = useMemo(() => 'POLLSTICS'.split(''), []);

  return (
    <View style={styles.root}>
      {/* Radial-feel layered background — three concentric dark fills */}
      <View style={styles.bgFar} />
      <View style={styles.bgMid} />
      <View style={styles.bgNear} />

      {/* Speed streaks (4) */}
      {[0, 1, 2, 3].map((i) => (
        <Streak key={i} index={i} />
      ))}

      <View style={styles.center}>
        {/* Pulsing rings */}
        <View style={styles.rings} pointerEvents="none">
          <Ring delay={0} />
          <Ring delay={400} />
          <Ring delay={800} />
        </View>

        {/* Logo with entrance + breathe */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: Animated.multiply(logoScale, breathe) }],
          }}>
          <Mark size={140} glow />
        </Animated.View>

        {/* Wordmark — letter cascade */}
        <View style={styles.wordRow}>
          {letters.map((ch, i) => (
            <Letter key={i} char={ch} delay={600 + i * 55} />
          ))}
        </View>

        {/* Hindi tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          फ़ील्ड स्टाफ़ · चुनाव अभियान
        </Animated.Text>
      </View>

      {/* Indeterminate progress bar */}
      <View style={styles.progressWrap}>
        <ProgressTrack />
      </View>

      {/* Signature footer */}
      <Animated.Text style={[styles.footer, { opacity: footerOpacity }]}>
        ELECTION · FIELD · 2026
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050404',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Layered dark fills approximate the design's radial gradient
  // (#161310 → #0A0908 → #050404). Smaller circles sit on top.
  bgFar: {
    position: 'absolute',
    width: SCREEN.width * 1.8,
    height: SCREEN.width * 1.8,
    borderRadius: SCREEN.width,
    top: -SCREEN.width * 0.4,
    backgroundColor: '#0A0908',
  },
  bgMid: {
    position: 'absolute',
    width: SCREEN.width * 1.2,
    height: SCREEN.width * 1.2,
    borderRadius: SCREEN.width * 0.6,
    top: SCREEN.height * 0.15,
    backgroundColor: '#161310',
  },
  bgNear: {
    position: 'absolute',
    width: SCREEN.width * 0.7,
    height: SCREEN.width * 0.7,
    borderRadius: SCREEN.width * 0.35,
    top: SCREEN.height * 0.25,
    backgroundColor: '#1c1410',
  },
  streak: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    left: -80,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  rings: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(216,42,42,0.45)',
  },
  wordRow: {
    flexDirection: 'row',
    marginTop: 28,
    height: 36,
    overflow: 'hidden',
  },
  letter: {
    color: COLORS.white,
    fontSize: 30,
    fontFamily: FONTS.uiBold,
    fontWeight: '800',
    letterSpacing: 1.5,
    lineHeight: 32,
  },
  tagline: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: FONTS.hi,
    fontSize: 14,
  },
  progressWrap: {
    position: 'absolute',
    bottom: 56,
    width: 140,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressOuter: {
    width: '100%',
    height: '100%',
  },
  progressInner: {
    position: 'absolute',
    height: '100%',
    width: 56,
    borderRadius: 2,
    backgroundColor: '#D82A2A',
  },
  footer: {
    position: 'absolute',
    bottom: 22,
    color: 'rgba(255,255,255,0.32)',
    fontFamily: FONTS.mono,
    fontSize: 10,
    letterSpacing: 2,
  },
});

export default AnimatedSplash;
