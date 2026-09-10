import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Dialog, Portal, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { ItemsStackScreenProps } from '../../navigation/types';
import { Item } from '../../services/api/models';
import { itemService } from '../../services/api/ItemService';
import { expirationService } from '../../services/ExpirationService';

type Props = ItemsStackScreenProps<'ItemDetails'>;

const formatDate = (date: Date) => date.toLocaleDateString();

export const ItemDetailsScreen = ({ route, navigation }: Props) => {
  const { itemId } = route.params;
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit dialog state. Expiry is edited as "days from today" because that is how
  // people think about leftovers, and it sidesteps a date-picker dependency.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [daysLeft, setDaysLeft] = useState('7');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      itemService
        .getItemById(itemId)
        .then((loaded) => {
          if (!cancelled) setItem(loaded);
        })
        .catch((error) => console.error('Error loading item:', error))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [itemId])
  );

  const openEditor = () => {
    if (!item) return;
    setName(item.name);
    setQuantity(String(item.quantity));
    setDaysLeft(String(Math.max(0, expirationService.getDaysUntilExpiry(item.estimatedExpiry))));
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!item) return;
    const trimmedName = name.trim();
    const parsedQuantity = parseInt(quantity, 10);
    const parsedDays = parseInt(daysLeft, 10);
    if (!trimmedName || Number.isNaN(parsedQuantity) || parsedQuantity < 1 || Number.isNaN(parsedDays) || parsedDays < 0) {
      Alert.alert('Check your input', 'Name is required; quantity must be at least 1; days must be 0 or more.');
      return;
    }
    const estimatedExpiry = new Date();
    estimatedExpiry.setHours(0, 0, 0, 0);
    estimatedExpiry.setDate(estimatedExpiry.getDate() + parsedDays);

    setSaving(true);
    try {
      const updated = await itemService.updateItem(item._id, {
        name: trimmedName,
        quantity: parsedQuantity,
        estimatedExpiry,
        expirySource: 'manual',
        expiryNote: 'Set manually',
      });
      setItem(updated);
      setEditing(false);
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!item) return;
    Alert.alert('Delete item', `Remove "${item.name}" from your inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await itemService.deleteItem(item._id);
            navigation.goBack();
          } catch (error) {
            console.error('Error deleting item:', error);
            Alert.alert('Error', 'Could not delete the item.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>This item no longer exists.</Text>
        <Button onPress={() => navigation.goBack()} style={styles.actionButton}>
          Back to items
        </Button>
      </View>
    );
  }

  const statusColor = expirationService.getStatusColor(item.status);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            {item.name}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{expirationService.getExpirationMessage(item)}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Details
          </Text>
          <DetailRow label="Category" value={item.category} />
          <DetailRow label="Quantity" value={String(item.quantity)} />
          <DetailRow label="Added on" value={formatDate(item.dateAdded)} />
          <DetailRow label="Expires on" value={formatDate(item.estimatedExpiry)} />
          {item.receiptTotal > 0 && <DetailRow label="Price" value={item.receiptTotal.toFixed(2)} />}
          {item.expiryNote && (
            <Text variant="bodySmall" style={styles.note}>
              {item.expiryNote}
            </Text>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actionsContainer}>
        <Button mode="contained" onPress={openEditor} style={styles.actionButton}>
          Edit Item
        </Button>
        <Button mode="outlined" onPress={confirmDelete} style={styles.actionButton}>
          Delete Item
        </Button>
      </View>

      <Portal>
        <Dialog visible={editing} onDismiss={() => setEditing(false)}>
          <Dialog.Title>Edit item</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />
            <TextInput label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={styles.input} />
            <TextInput
              label="Days until it expires"
              value={daysLeft}
              onChangeText={setDaysLeft}
              keyboardType="number-pad"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button mode="contained" onPress={saveEdits} loading={saving} disabled={saving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
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
  note: {
    marginTop: 8,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 16,
    marginBottom: 32,
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
  },
});

export default ItemDetailsScreen;
