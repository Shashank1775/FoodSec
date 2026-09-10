import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, FAB, IconButton } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { itemService } from '../../services/api/ItemService';
import { Item } from '../../services/api/models';
import { expirationService } from '../../services/ExpirationService';
import { MainTabScreenProps } from '../../navigation/types';

type Props = MainTabScreenProps<'Home'>;

const HomeScreen = ({ navigation }: Props) => {
  const { user, logout } = useAuth();
  const [attentionItems, setAttentionItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Re-query whenever the tab gains focus so items saved from a scan show up immediately.
  // The `cancelled` flag stops setState after the screen loses focus / unmounts mid-request.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!user) return undefined;

      itemService
        .getItemsByUserId(user._id)
        .then((items) => {
          if (cancelled) return;
          const needsAttention = items
            .filter((item) => item.status !== 'fresh')
            .sort((a, b) => a.estimatedExpiry.getTime() - b.estimatedExpiry.getTime());
          setAttentionItems(needsAttention);
        })
        .catch((error) => console.error('Error loading expiring items:', error))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [user])
  );

  const expiringSoon = attentionItems.filter((item) => item.status === 'soon').length;
  const expired = attentionItems.length - expiringSoon;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="headlineMedium">Welcome back!</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {expiringSoon} expiring soon{expired > 0 ? `, ${expired} expired` : ''}
            </Text>
          </View>
          <IconButton icon="logout" accessibilityLabel="Log out" onPress={logout} />
        </View>

        {attentionItems.map((item) => (
          <Card key={item._id} style={styles.card}>
            <Card.Content>
              <View style={styles.itemHeader}>
                <Text variant="titleMedium">{item.name}</Text>
                <View
                  style={[styles.statusIndicator, { backgroundColor: expirationService.getStatusColor(item.status) }]}
                />
              </View>
              <Text variant="bodyMedium">{expirationService.getExpirationMessage(item)}</Text>
              <Text variant="bodySmall" style={styles.store}>
                {item.category}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                onPress={() =>
                  navigation.navigate('Items', { screen: 'ItemDetails', params: { itemId: item._id } })
                }
              >
                View Details
              </Button>
            </Card.Actions>
          </Card>
        ))}

        {attentionItems.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Nothing needs attention right now</Text>
            <Button mode="contained" onPress={() => navigation.navigate('Scan')} style={styles.scanButton}>
              Scan a Receipt
            </Button>
          </View>
        )}
      </ScrollView>

      <FAB icon="camera" style={styles.fab} onPress={() => navigation.navigate('Scan')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 56,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    color: '#666',
    marginTop: 8,
  },
  card: {
    marginBottom: 16,
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
  store: {
    marginTop: 8,
    color: '#666',
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
    right: 16,
    bottom: 16,
  },
});

export default HomeScreen;
