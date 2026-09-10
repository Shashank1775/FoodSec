import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, Card, Button, Searchbar, Chip, FAB, Menu, Divider, useTheme } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { databaseService } from '../../services/api/DatabaseService';
import { Item } from '../../services/api/models';
import { expirationService } from '../../services/ExpirationService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type ItemsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Items'>;

interface Props {
  navigation: ItemsScreenNavigationProp;
}

const ItemsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'category'>('name');
  const [showMenu, setShowMenu] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      if (!user) return;
      const userItems = await databaseService.getItemsByUserId(user._id);
      setItems(userItems);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fresh':
        return '#4CAF50';
      case 'soon':
        return '#FFC107';
      case 'expired':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getCategories = () => {
    const categories = new Set<string>();
    items.forEach((item: Item) => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories);
  };

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'expiry':
          return new Date(a.estimatedExpiry).getTime() - new Date(b.estimatedExpiry).getTime();
        case 'category':
          return (a.category || '').localeCompare(b.category || '');
        default:
          return 0;
      }
    });

  const renderItem = ({ item }: { item: Item }) => (
    <Card style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <Text variant="titleMedium">{item.name}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
        </View>
        <Text variant="bodyMedium">Category: {item.category}</Text>
        <Text variant="bodyMedium">
          Expires: {expirationService.getExpirationMessage(item)}
        </Text>
        <Text variant="bodyMedium">
          Quantity: {item.quantity} {item.unit}
        </Text>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => navigation.navigate('ItemDetails', { itemId: item._id })}>
          View Details
        </Button>
        <Button onPress={() => handleDeleteItem(item._id)}>Delete</Button>
      </Card.Actions>
    </Card>
  );

  const handleDeleteItem = async (itemId: string) => {
    try {
      await databaseService.deleteItem(itemId);
      setItems(items.filter(item => item._id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search items"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chip
              selected={!selectedCategory}
              onPress={() => setSelectedCategory(null)}
              style={styles.chip}
            >
              All
            </Chip>
            {getCategories().map(category => (
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
          anchor={
            <Button onPress={() => setShowMenu(true)}>
              Sort by: {sortBy}
            </Button>
          }
        >
          <Menu.Item onPress={() => setSortBy('name')} title="Name" />
          <Menu.Item onPress={() => setSortBy('expiry')} title="Expiry Date" />
          <Menu.Item onPress={() => setSortBy('category')} title="Category" />
        </Menu>
      </View>

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No items found</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Scan')}
              style={styles.scanButton}
            >
              Scan a Receipt
            </Button>
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