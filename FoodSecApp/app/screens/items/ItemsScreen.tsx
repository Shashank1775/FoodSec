import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, Searchbar, Chip, FAB, Menu, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { itemService } from '../../services/api/ItemService';
import { Item } from '../../services/api/models';
import { expirationService } from '../../services/ExpirationService';
import { ItemsStackScreenProps } from '../../navigation/types';

type Props = ItemsStackScreenProps<'ItemsList'>;

const SORT_LABELS = { expiry: 'Expiry date', name: 'Name', category: 'Category' } as const;
type SortKey = keyof typeof SORT_LABELS;

const ItemsScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('expiry');
  const [showMenu, setShowMenu] = useState(false);
  const theme = useTheme();

  // Reload on every focus (not just mount) so items saved from the Scan tab or
  // deleted from the details screen are reflected; `cancelled` guards against
  // setState after the screen is left mid-request.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!user) return undefined;
      itemService
        .getItemsByUserId(user._id)
        .then((userItems) => {
          if (!cancelled) setItems(userItems);
        })
        .catch((error) => console.error('Error loading items:', error));
      return () => {
        cancelled = true;
      };
    }, [user])
  );

  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort();

  const filteredItems = items
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'expiry':
          return a.estimatedExpiry.getTime() - b.estimatedExpiry.getTime();
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });

  const confirmDelete = (item: Item) => {
    Alert.alert('Delete item', `Remove "${item.name}" from your inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await itemService.deleteItem(item._id);
            setItems((current) => current.filter((i) => i._id !== item._id));
          } catch (error) {
            console.error('Error deleting item:', error);
            Alert.alert('Error', 'Could not delete the item.');
          }
        },
      },
    ]);
  };

  const selectSort = (key: SortKey) => {
    setSortBy(key);
    setShowMenu(false);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <Card style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <Text variant="titleMedium" style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.statusIndicator, { backgroundColor: expirationService.getStatusColor(item.status) }]} />
        </View>
        <Text variant="bodyMedium">Category: {item.category}</Text>
        <Text variant="bodyMedium">Expires: {expirationService.getExpirationMessage(item)}</Text>
        <Text variant="bodyMedium">Quantity: {item.quantity}</Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => navigation.navigate('ItemDetails', { itemId: item._id })}>View Details</Button>
        <Button onPress={() => confirmDelete(item)}>Delete</Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar placeholder="Search items" onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />

        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip selected={!selectedCategory} onPress={() => setSelectedCategory(null)} style={styles.chip}>
              All
            </Chip>
            {categories.map((category) => (
              <Chip
                key={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
                style={styles.chip}
              >
                {category}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={<Button onPress={() => setShowMenu(true)}>Sort by: {SORT_LABELS[sortBy]}</Button>}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <Menu.Item key={key} onPress={() => selectSort(key)} title={SORT_LABELS[key]} />
          ))}
        </Menu>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{items.length === 0 ? 'No items yet' : 'No items match'}</Text>
            {items.length === 0 && (
              <Button mode="contained" onPress={() => navigation.navigate('Scan')} style={styles.scanButton}>
                Scan a Receipt
              </Button>
            )}
          </View>
        }
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="camera"
        onPress={() => navigation.navigate('Scan')}
        label="Scan Receipt"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  searchBar: {
    marginBottom: 8,
  },
  filterContainer: {
    marginBottom: 8,
  },
  chip: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  itemCard: {
    marginBottom: 16,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    marginRight: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  scanButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default ItemsScreen;
