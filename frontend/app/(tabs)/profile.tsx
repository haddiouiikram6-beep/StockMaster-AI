import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../src/components/AppHeader';
import { useAuthStore } from '../../src/store/useAuthStore';
import { authApi } from '../../src/services/auth/apis';
import { API_BASE_URL } from '../../src/services/apiClient';
import { COLORS, SHADOWS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshToken } = useAuthStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const displayName = user?.fullName || 'Utilisateur';
  const displayEmail = user?.email || '';
  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'Employé';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter de StockMaster-AI ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Profil et Paramètres"
        statusBadge="En ligne"
        rightAction={
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => Alert.alert('StockMaster-AI', 'La version 1.2.0 est à jour.')}
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {displayName}
                </Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => Alert.alert('Modifier le profil', 'Les mises à jour du profil sont gérées par l\'administrateur.')}
                >
                  <Ionicons name="pencil" size={14} color={COLORS.primaryBlue} />
                </TouchableOpacity>
              </View>

              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{displayRole}</Text>
              </View>

              <Text style={styles.profileEmail} numberOfLines={1}>
                {displayEmail}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={COLORS.secondaryText} />
                <Text style={styles.locationText}>Entrepôt principal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={styles.sectionHeader}>PRÉFÉRENCES</Text>
        <View style={styles.sectionCard}>
          {/* Push Notifications */}
          <View style={styles.settingsRow}>
            <View style={styles.settingsLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: COLORS.infoBg }]}>
                <Ionicons name="notifications-outline" size={18} color={COLORS.primaryBlue} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Notifications push</Text>
                <Text style={styles.settingSub}>Stock faible & résumé quotidien</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E2E8F0', true: COLORS.primaryBlue }}
              thumbColor={COLORS.white}
            />
          </View>

          {/* Language */}
          <TouchableOpacity
            style={styles.settingsRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Langue', 'Le Français (Maroc) est la langue par défaut.')}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: COLORS.lightCyan }]}>
                <Ionicons name="globe-outline" size={18} color={COLORS.primaryDarkNavy} />
              </View>
              <Text style={styles.settingTitle}>Language</Text>
            </View>
            <View style={styles.settingsRight}>
              <Text style={styles.settingValue}>Français (Maroc)</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </View>
          </TouchableOpacity>

          {/* Appearance */}
          <TouchableOpacity
            style={styles.settingsRow}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Apparence', 'Le mode clair est optimisé pour la visibilité en entrepôt.')}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: COLORS.warningBg }]}>
                <Ionicons name="sunny-outline" size={18} color={COLORS.warningText} />
              </View>
              <Text style={styles.settingTitle}>Appearance</Text>
            </View>
            <View style={styles.settingsRight}>
              <Text style={styles.settingValue}>Mode clair</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </View>
          </TouchableOpacity>

          {/* Store Locations */}
          <TouchableOpacity
            style={[styles.settingsRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Store Locations', 'Primary: Main Warehouse\nSecondary: Central Depot')}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: COLORS.successBg }]}>
                <Ionicons name="storefront-outline" size={18} color={COLORS.success} />
              </View>
              <Text style={styles.settingTitle}>Store Locations</Text>
            </View>
            <View style={styles.settingsRight}>
              <Text style={styles.settingValue}>Entrepôt principal</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Network & Backend Configuration */}
        <Text style={styles.sectionHeader}>API CONFIGURATION</Text>
        <View style={styles.sectionCard}>
          <View style={[styles.settingsRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingsLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: COLORS.lightCyan }]}>
                <Ionicons name="server-outline" size={18} color={COLORS.primaryBlue} />
              </View>
              <View>
                <Text style={styles.settingTitle}>Point de terminaison du serveur</Text>
                <Text style={styles.settingSub} numberOfLines={1}>{API_BASE_URL}</Text>
              </View>
            </View>
            <View style={styles.apiActiveBadge}>
              <Text style={styles.apiActiveText}>Actif</Text>
            </View>
          </View>
        </View>

        {/* Security & Session */}
        <Text style={styles.sectionHeader}>SÉCURITÉ ET SESSION</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.settingsRow, { borderBottomWidth: 0 }]}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingIconBox, { backgroundColor: COLORS.dangerBg }]}>
                <Ionicons name="log-out-outline" size={18} color={COLORS.dangerText} />
              </View>
              <Text style={[styles.settingTitle, { color: COLORS.dangerText }]}>Se déconnecter</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.dangerText} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>StockMaster-AI v1.2.0 • Édition Petite Entreprise</Text>
          <Text style={styles.footerSub}>Protégé par un chiffrement d'entreprise de bout en bout</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryDarkNavy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  editBtn: {
    padding: 4,
  },
  roleBadge: {
    backgroundColor: COLORS.lightCyan,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginVertical: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryBlue,
  },
  profileEmail: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: COLORS.secondaryText,
    marginLeft: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondaryText,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  sectionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    ...SHADOWS.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingSub: {
    fontSize: 11,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginRight: 6,
  },
  apiActiveBadge: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  apiActiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  footerBrand: {
    fontSize: 12,
    color: COLORS.secondaryText,
    fontWeight: '500',
  },
  footerSub: {
    fontSize: 11,
    color: COLORS.mutedText,
    marginTop: 3,
  },
});
