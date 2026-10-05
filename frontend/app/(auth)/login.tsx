import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '../../src/components/InputField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { authApi } from '../../src/services/api';
import { useAuthStore } from '../../src/store/useAuthStore';
import { COLORS } from '../../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Veuillez entrer votre adresse e-mail et votre mot de passe.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await authApi.login({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.success && res.data) {
        await setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        setError(res.message || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
      }
    } catch (err: any) {
      console.log('Login error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Impossible de se connecter au serveur. Veuillez vérifier votre réseau et l\'URL de l\'API.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Logo */}
          <View style={styles.header}>
            <Image 
              source={require('../../assets/22bf2a7c-c863-4d07-a948-438419e52c04.jpg')} 
              style={styles.mainLogo} 
              resizeMode="contain" 
            />
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={COLORS.dangerText} />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            <InputField
              label="Adresse e-mail"
              placeholder="nom@entreprise.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail-outline"
            />

            <InputField
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              isPassword
              leftIcon="lock-closed-outline"
            />

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Réinitialisation du mot de passe',
                  'Veuillez contacter l\'administrateur de votre organisation (admin@stockmaster.com) pour réinitialiser vos identifiants.'
                )
              }
              style={styles.forgotPassBtn}
            >
              <Text style={styles.forgotPassText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />


          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous n'avez pas de compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.signUpLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainLogo: {
    width: 300,
    height: 180,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorBannerText: {
    fontSize: 12,
    color: COLORS.dangerText,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  forgotPassBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPassText: {
    fontSize: 13,
    color: COLORS.primaryBlue,
    fontWeight: '600',
  },
  loginBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryDarkNavy,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryBlue,
  },
});
