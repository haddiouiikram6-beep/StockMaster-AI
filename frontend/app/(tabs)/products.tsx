import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../src/utils/currency';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../../src/components/SearchBar';
import { FilterChip } from '../../src/components/FilterChip';
import { ProductRow } from '../../src/components/ProductRow';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { useProducts } from '../../src/hooks/useQueries';
import { Product } from '../../src/types';
import { COLORS, SHADOWS } from '../../src/constants/theme';

export default function ProductsScreen() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  const {
    data: productsData,
    isLoading,
    refetch,
    isRefetching,
  } = useProducts({ limit: 100 });

  // Real products from API
  const rawProducts: Product[] = useMemo(() => {
    return productsData?.data || [];
  }, [productsData]);

  // Counts for filter chips
  const counts = useMemo(() => {
    const total = rawProducts.length;
    const low = rawProducts.filter(
      (p) => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.minStock)
    ).length;
    const out = rawProducts.filter((p) => Number(p.quantity) === 0).length;
    return { total, low, out };
  }, [rawProducts]);

  // Filter and search
  const filteredProducts = useMemo(() => {
    let result = rawProducts;

    if (activeFilter === 'LOW') {
      result = result.filter(
        (p) => Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.minStock)
      );
    } else if (activeFilter === 'OUT') {
      result = result.filter((p) => Number(p.quantity) === 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.reference.toLowerCase().includes(q) ||
          (p.category && p.category.name.toLowerCase().includes(q))
      );
    }

    return result;
  }, [rawProducts, activeFilter, search]);

  // Quick stats: Total stock items and total value
  const stats = useMemo(() => {
    const totalItems = rawProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const totalValue = rawProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.price) || 0),
      0
    );
    return { totalItems, totalValue };
  }, [rawProducts]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Produits</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/products/create')}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par nom, SKU..."
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filtersWrapper}>
          <FilterChip
            label="Tous"
            count={counts.total}
            active={activeFilter === 'ALL'}
            onPress={() => setActiveFilter('ALL')}
          />
          <FilterChip
            label="Stock faible"
            count={counts.low}
            active={activeFilter === 'LOW'}
            onPress={() => setActiveFilter('LOW')}
          />
          <FilterChip
            label="Épuisé"
            count={counts.out}
            active={activeFilter === 'OUT'}
            onPress={() => setActiveFilter('OUT')}
          />
        </View>

        {/* Catalog Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconBox, { backgroundColor: COLORS.infoBg }]}>
              <Ionicons name="cube-outline" size={16} color={COLORS.primaryBlue} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Total Unités</Text>
              <Text style={styles.summaryValue}>{stats.totalItems.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.summaryIconBox, { backgroundColor: COLORS.successBg }]}>
              <Ionicons name="cash-outline" size={16} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Valeur du Stock</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(stats.totalValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Product List */}
        {isLoading ? (
          <LoadingState message="Chargement du catalogue..." />
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ProductRow
                product={item}
                onPress={() => router.push(`/products/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={COLORS.primaryBlue}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="cube-outline"
                title="Aucun produit trouvé"
                description={
                  search
                    ? `Aucun résultat pour "${search}". Essayez un autre terme.`
                    : 'Commencez par ajouter des produits à votre inventaire.'
                }
              />
            }
            ListFooterComponent={
              /* AI Prompt Shortcut Banner */
              <TouchableOpacity
                style={styles.aiBanner}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/ai')}
              >
                <View style={styles.aiBannerIcon}>
                  <Ionicons name="sparkles" size={16} color={COLORS.primaryBlue} />
                </View>
                <View style={styles.aiBannerText}>
                  <View style={styles.aiBannerHeader}>
                    <Text style={styles.aiBannerTitle}>Besoin de réapprovisionner ?</Text>
                    <Text style={styles.aiBannerAction}>Consulter l'IA →</Text>
                  </View>
                  <Text style={styles.aiBannerBody}>
                    Demandez des recommandations d'achat automatiques à l'agent StockMaster.
                  </Text>
                </View>
              </TouchableOpacity>
            }
          />
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryDarkNavy,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filtersWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.secondaryText,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: '80%',
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 111, 166, 0.25)',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryBlue,
    ...SHADOWS.sm,
  },
  aiBannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.infoBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiBannerText: {
    flex: 1,
  },
  aiBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  aiBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  aiBannerAction: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryBlue,
  },
  aiBannerBody: {
    fontSize: 12,
    color: COLORS.secondaryText,
    lineHeight: 16,
  },
});
