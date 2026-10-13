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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '../../src/components/InputField';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useRegister } from '../../src/services/auth/mutations';
import { COLORS } from '../../src/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const registerMutation = useRegister();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    try {
      setError(null);
      const res = await registerMutation.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        Alert.alert(
          'Inscription réussie',
          'Votre compte a été créé. Veuillez vous connecter avec vos identifiants.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        setError(res.message || 'L\'inscription a échoué.');
      }
    } catch (err: any) {
      console.log('Register error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Impossible de terminer l\'inscription. Veuillez réessayer.';
      setError(msg);
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add-outline" size={28} color={COLORS.primaryDarkNavy} />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez l'équipe d'inventaire StockMaster-AI</Text>
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
              label="Nom complet"
              placeholder="ex: Sarah Connor"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (error) setError(null);
              }}
              leftIcon="person-outline"
            />

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



            <PrimaryButton
              title="S'inscrire"
              onPress={handleRegister}
              loading={registerMutation.isPending}
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Vous avez déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
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
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.lightCyan,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C7EBE8',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primaryDarkNavy,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: 4,
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

  submitBtn: {
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryDarkNavy,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.secondaryText,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryBlue,
  },
});
