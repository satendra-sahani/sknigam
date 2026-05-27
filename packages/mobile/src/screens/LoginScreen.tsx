import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { COLORS } from '../utils/constants';
import { FONTS, RADIUS } from '../utils/theme';
import Btn from '../components/Btn';
import Mark from '../components/Mark';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login } = useAuth();
  const { t, lang, toggle } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // Client-side validation — block submit until the user has typed an
  // actual email-shaped string in the email field.  The server enforces
  // the same rule via express-validator (and the lookup is email-only);
  // we just want to fail fast on the device instead of round-tripping a
  // 400 with a "Valid email is required" message.
  const trimmedEmail = email.trim();
  const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const showEmailError = trimmedEmail.length > 0 && !isEmailFormat;
  const isValid = isEmailFormat && password.length >= 6;

  const handleLogin = async () => {
    if (!isValid) {
      if (!isEmailFormat) {
        Alert.alert(t('login_failed'), 'Please enter a valid email address.');
      }
      return;
    }
    setIsLoading(true);
    try {
      const result = await login(trimmedEmail.toLowerCase(), password);
      if (result.success && result.otpRequired) {
        navigation.navigate('OtpVerification', {
          email: trimmedEmail.toLowerCase(),
          tempToken: result.tempToken,
        });
      } else if (!result.success) {
        Alert.alert(t('login_failed'), result.message || t('login_invalid'));
      }
    } catch (error: any) {
      Alert.alert(t('error'), t('login_generic_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.langPill}>
          <TouchableOpacity
            onPress={() => lang !== 'en' && toggle()}
            activeOpacity={0.85}
            style={[styles.langChip, lang === 'en' && styles.langChipActive]}>
            <Text
              style={[
                styles.langChipText,
                lang === 'en' && styles.langChipTextActive,
              ]}>
              EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => lang !== 'hi' && toggle()}
            activeOpacity={0.85}
            style={[styles.langChip, lang === 'hi' && styles.langChipActive]}>
            <Text
              style={[
                styles.langChipTextHi,
                lang === 'hi' && styles.langChipTextActive,
              ]}>
              हिं
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRow}>
          <Mark size={56} />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.brand}>POLLSTICS</Text>
            <Text style={styles.tagline}>फ़ील्ड स्टाफ़ ऐप</Text>
          </View>
        </View>

        <Text style={styles.intro}>Sign in with your assigned credentials.</Text>
        <Text style={styles.introHi}>दिए गए ईमेल और पासवर्ड से साइन इन करें।</Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.labelHi}> · ईमेल</Text>
            </View>
            <View
              style={[
                styles.inputBox,
                showEmailError && styles.inputBoxError,
              ]}>
              <TextInput
                style={styles.input}
                placeholder="you@pollstics.in"
                placeholderTextColor={COLORS.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            {showEmailError ? (
              <View style={styles.helperRow}>
                <Icon
                  name="alert-circle-outline"
                  size={13}
                  color={COLORS.danger}
                />
                <Text style={styles.helperError}>
                  Enter a valid email address (e.g. you@pollstics.in).
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.labelHi}> · पासवर्ड</Text>
            </View>
            <View style={styles.inputBox}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showBtn}
                activeOpacity={0.7}>
                <Text style={styles.showText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Btn
            full
            size="lg"
            loading={isLoading}
            disabled={!isValid}
            onPress={handleLogin}>
            Sign in · साइन इन
          </Btn>
          <Text style={styles.versionText}>v1.0 · POLLSTICS · 360×800</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const OtpVerificationScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { verifyOtp } = useAuth();
  const { t } = useI18n();
  const { email, tempToken } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value.charAt(value.length - 1);
    }
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (index === 5 && value) {
      const code = newOtp.join('');
      if (code.length === 6) {
        handleVerify(code);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) return;
    setIsLoading(true);
    try {
      const success = await verifyOtp(tempToken, otpCode);
      if (!success) {
        Alert.alert(t('otp_invalid_title'), t('otp_invalid_body'));
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      Alert.alert(t('error'), t('otp_verify_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.appBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}>
            <Icon name="chevron-left" size={22} color={COLORS.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.appBarTitle}>Verify phone</Text>
            <Text style={styles.appBarSub}>फ़ोन सत्यापित करें</Text>
          </View>
        </View>

        <Text style={styles.otpIntro}>
          We sent a 6-digit code to <Text style={styles.otpEmailMono}>{email}</Text>.
        </Text>
        <Text style={styles.otpIntroHi}>हमने 6-अंकीय कोड भेजा है।</Text>

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          <Text style={styles.resendMono}>Resend in 0:32</Text>
          <Text style={styles.resendHi}>0:32 में पुनः</Text>
        </View>

        <View style={styles.footer}>
          <Btn
            full
            size="lg"
            loading={isLoading}
            disabled={otp.join('').length !== 6}
            onPress={() => handleVerify()}>
            Verify · सत्यापित करें
          </Btn>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.cream },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  langPill: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: 4,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  langChipActive: { backgroundColor: COLORS.indigo },
  langChipText: {
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  langChipTextHi: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.hiSemiBold,
    fontWeight: '600',
  },
  langChipTextActive: { color: COLORS.white },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },
  brand: {
    fontSize: 24,
    color: COLORS.ink,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    marginTop: 2,
  },
  intro: {
    marginTop: 18,
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiMedium,
    lineHeight: 20,
  },
  introHi: {
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    opacity: 0.85,
    lineHeight: 20,
  },
  form: { marginTop: 28, gap: 14 },
  fieldGroup: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'baseline' },
  label: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  labelHi: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    opacity: 0.65,
  },
  inputBox: {
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.paper,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputBoxError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFF5F5',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  helperError: {
    fontSize: 11,
    color: COLORS.danger,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
    color: COLORS.ink,
    fontFamily: FONTS.uiMedium,
    fontWeight: '500',
  },
  showBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  showText: {
    fontSize: 11,
    color: COLORS.indigo,
    fontFamily: FONTS.uiBold,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  footer: { marginTop: 'auto', paddingTop: 24, gap: 12 },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
  },

  // OTP screen
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginBottom: 8,
    marginLeft: -8,
  },
  backBtn: { padding: 8, marginRight: 4 },
  appBarTitle: {
    fontSize: 16,
    color: COLORS.ink,
    fontFamily: FONTS.uiSemiBold,
    fontWeight: '600',
  },
  appBarSub: {
    fontSize: 12,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    opacity: 0.7,
  },
  otpIntro: {
    marginTop: 16,
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.uiMedium,
    lineHeight: 20,
  },
  otpEmailMono: { fontFamily: FONTS.monoMedium, color: COLORS.ink },
  otpIntroHi: {
    fontSize: 13,
    color: COLORS.mutedDeep,
    fontFamily: FONTS.hi,
    opacity: 0.85,
    marginTop: 4,
  },
  otpRow: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: 44,
    height: 56,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.paper,
    color: COLORS.ink,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: FONTS.monoBold,
    fontWeight: '700',
  },
  otpBoxFilled: {
    borderColor: COLORS.indigo,
    backgroundColor: COLORS.indigoSoft,
  },
  resendRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendMono: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.mono,
  },
  resendHi: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: FONTS.hi,
  },
});

export { OtpVerificationScreen };
export default LoginScreen;
