import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../../src/utils/currency';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatCard } from '../../src/components/StatCard';
import { AIActionCard } from '../../src/components/AIActionCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { ProductRow } from '../../src/components/ProductRow';
import { MovementRow } from '../../src/components/MovementRow';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import { useAuthStore } from '../../src/store/useAuthStore';
import {
  useProducts,
  useLowStockProducts,
  useStockMovements,
} from '../../src/hooks/useQueries';
import { COLORS } from '../../src/constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const {
    data: productsData,
    isLoading: loadingProducts,
    isError: errorProducts,
    refetch: refetchProducts,
  } = useProducts({ limit: 100 });

  const {
    data: lowStockData,
    isLoading: loadingLowStock,
    refetch: refetchLowStock,
  } = useLowStockProducts(5);

  const {
    data: movementsData,
    isLoading: loadingMovements,
    refetch: refetchMovements,
  } = useStockMovements({ limit: 5 });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchProducts(),
      refetchLowStock(),
      refetchMovements(),
    ]);
    setRefreshing(false);
  };

  // Compute Statistics
  const stats = useMemo(() => {
    const products = productsData?.data || [];
    const totalCount = productsData?.pagination?.total ?? products.length;

    const lowStockCount =
      lowStockData?.pagination?.total ??
      (lowStockData?.data
        ? lowStockData.data.length
        : products.filter((p) => Number(p.quantity) <= Number(p.minStock)).length);

    const totalValueNum = products.reduce((acc, p) => {
      return acc + Number(p.price || 0) * Number(p.quantity || 0);
    }, 0);

    const formattedValue = formatCurrency(totalValueNum);

    return {
      totalProducts: totalCount.toLocaleString(),
      lowStock: lowStockCount,
      stockValue: formattedValue,
    };
  }, [productsData, lowStockData]);

  const userName = user?.fullName?.split(' ')[0] || 'Utilisateur';

  const displayedLowStock = useMemo(() => {
    return lowStockData?.data?.slice(0, 3) || [];
  }, [lowStockData]);

  const displayedMovements = useMemo(() => {
    return movementsData?.data?.slice(0, 3) || [];
  }, [movementsData]);

  if (loadingProducts && !productsData && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="Loading dashboard..." />
      </SafeAreaView>
    );
  }

  if (errorProducts && !productsData && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState
          message="Impossible de charger les données d'inventaire. Vérifiez que le backend est en cours d'exécution."
          onRetry={onRefresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryBlue}
            colors={[COLORS.primaryBlue]}
          />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Bonjour, {userName}</Text>
            <Text style={styles.subtitle}>Aperçu du stock</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Notifications',
                `Vous avez ${stats.lowStock} produits nécessitant votre attention.`
              )
            }
          >
            <Ionicons name="notifications-outline" size={20} color={COLORS.text} />
            {Number(stats.lowStock) > 0 && <View style={styles.notifBadgeDot} />}
          </TouchableOpacity>
        </View>

        {/* 3 Compact Statistics Cards */}
        <View style={styles.statsRow}>
          <StatCard
            label="Total Produits"
            value={stats.totalProducts}
            subtitle="Articles au catalogue"
          />
          <View style={{ width: 10 }} />
          <StatCard
            label="Stock faible"
            value={stats.lowStock}
            accentColor={COLORS.dangerText}
            trend="Commande requise"
            trendPositive={false}
          />
          <View style={{ width: 10 }} />
          <StatCard
            label="Valeur du stock"
            value={stats.stockValue}
            trend="+3.4%"
            trendPositive={true}
          />
        </View>

        {/* AI Quick Action Card */}
        <View style={styles.aiActionWrapper}>
          <AIActionCard
            title="Demander à l'assistant IA"
            subtitle="Obtenez des informations instantanées"
            onPress={() => router.push('/(tabs)/ai')}
          />
        </View>

        {/* Low Stock Alerts Section */}
        <SectionHeader
          title="Alertes stock faible"
          actionText={`Voir tout (${stats.lowStock})`}
          onActionPress={() => router.push('/(tabs)/products')}
        />

        <View style={styles.listSection}>
          {displayedLowStock.length > 0 ? (
            displayedLowStock.map((prod) => (
              <ProductRow
                key={prod.id}
                product={prod}
                variant="compact"
                onPress={() => router.push(`/products/${prod.id}`)}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
              <Text style={styles.emptyText}>Tous les produits ont un niveau de stock adéquat</Text>
            </View>
          )}
        </View>

        {/* Recent Movements Section */}
        <SectionHeader
          title="Mouvements récents"
          actionText="Voir tout"
          onActionPress={() => router.push('/(tabs)/products')}
        />

        <View style={styles.listSection}>
          {displayedMovements.length > 0 ? (
            displayedMovements.map((movement) => (
              <MovementRow key={movement.id} movement={movement} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={20} color={COLORS.secondaryText} />
              <Text style={styles.emptyText}>Aucun mouvement récent enregistré</Text>
            </View>
          )}
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: 2,
    fontWeight: '500',
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dangerText,
    borderWidth: 1.5,
    borderColor: COLORS.cardBackground,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aiActionWrapper: {
    marginBottom: 10,
  },
  listSection: {
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.secondaryText,
    flex: 1,
  },
});
