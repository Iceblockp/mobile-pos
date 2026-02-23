import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';
import { X, Check } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';

export interface PickerItem {
  id: string;
  name: string;
}

interface SearchablePickerModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: PickerItem[];
  selectedId?: string;
  onSelect: (id?: string) => void;
  placeholder?: string;
  allOptionLabel?: string;
}

export const SearchablePickerModal: React.FC<SearchablePickerModalProps> = ({
  visible,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
  placeholder = 'Search...',
  allOptionLabel = 'All',
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [items, searchQuery]);

  const handleSelect = (id?: string) => {
    onSelect(id);
    onClose();
    setSearchQuery('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title} weight="bold">
            {title}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>

        {/* Items List */}
        <FlatList
          data={[{ id: undefined, name: allOptionLabel }, ...filteredItems]}
          keyExtractor={(item) => item.id || 'all'}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedId;
            const isAllOption = !item.id;
            const isAllSelected = !selectedId && isAllOption;

            return (
              <TouchableOpacity
                style={[
                  styles.item,
                  (isSelected || isAllSelected) && styles.itemSelected,
                ]}
                onPress={() => handleSelect(item.id)}
              >
                <Text
                  style={[
                    styles.itemText,
                    (isSelected || isAllSelected) && styles.itemTextSelected,
                  ]}
                  weight={isSelected || isAllSelected ? 'bold' : 'regular'}
                >
                  {item.name}
                </Text>
                {(isSelected || isAllSelected) && (
                  <Check size={20} color="#059669" />
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {t('stockMovement.noResultsFound')}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  listContent: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemSelected: {
    backgroundColor: '#F0FDF4',
  },
  itemText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  itemTextSelected: {
    color: '#059669',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});
