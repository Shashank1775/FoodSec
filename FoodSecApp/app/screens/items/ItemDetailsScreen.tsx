import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { Item } from '../../types/Item';
import { expirationService } from '../../services/expiration/ExpirationService';

type ItemDetailsRouteProp = RouteProp<RootStackParamList, 'ItemDetails'>;

export const ItemDetailsScreen = () => {
  const route = useRoute<ItemDetailsRouteProp>();
  const theme = useTheme();
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    // TODO: Fetch item details from API
    // For now, we'll use mock data
    setItem({
      _id: route.params.itemId,
      name: 'Sample Item',
      category: 'Dairy',
      quantity: 1,
      unit: 'piece',
      estimatedExpiry: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      status: 'expiring',
      purchaseDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }, [route.params.itemId]);

  if (!item) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const status = expirationService.getExpirationStatus(item);
  const statusColor = expirationService.getStatusColor(status);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            {item.name}
          </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: statusColor },
              ]}
            />
            <Text style={styles.statusText}>
              {expirationService.getExpirationMessage(item)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Details
          </Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text>{item.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity:</Text>
            <Text>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Added on:</Text>
            <Text>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={() => {
            // TODO: Implement edit functionality
          }}
          style={styles.actionButton}
        >
          Edit Item
        </Button>
        <Button
          mode="outlined"
          onPress={() => {
            // TODO: Implement delete functionality
          }}
          style={styles.actionButton}
        >
          Delete Item
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
}); 