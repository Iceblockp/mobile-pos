import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  X,
  AlertTriangle,
  Check,
  Plus,
  SkipForward,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { DataConflict, ConflictResolution } from '@/services/dataImportService';

interface ConflictResolutionModalProps {
  visible: boolean;
  conflicts: DataConflict[];
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<
  ConflictResolutionModalProps
> = ({ visible, conflicts, onResolve, onCancel }) => {
  const { t } = useTranslation();
  const [selectedResolution, setSelectedResolution] = useState<
    'update' | 'skip' | 'create_new'
  >('update');
  const [applyToAll, setApplyToAll] = useState(false);

  const handleResolve = () => {
    const resolution: ConflictResolution = {
      action: selectedResolution,
      applyToAll,
    };
    onResolve(resolution);
  };

  const getConflictTypeColor = (type: string) => {
    switch (type) {
      case 'duplicate':
        return '#F59E0B';
      case 'reference_missing':
        return '#EF4444';
      case 'validation_failed':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getConflictTypeIcon = (type: string) => {
    switch (type) {
      case 'duplicate':
        return AlertTriangle;
      case 'reference_missing':
        return X;
      case 'validation_failed':
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  const renderConflictComparison = (conflict: DataConflict) => {
    if (conflict.type !== 'duplicate' || !conflict.existingRecord) {
      return null;
    }

    return (
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonTitle}>
            {t('dataImport.existingRecord')}
          </Text>
          <View style={styles.recordCard}>
            <Text style={styles.recordName}>
              {conflict.existingRecord.name}
            </Text>
            {conflict.existingRecord.price && (
              <Text style={styles.recordDetail}>
                {t('products.price')}: {conflict.existingRecord.price}
              </Text>
            )}
            {conflict.existingRecord.phone && (
              <Text style={styles.recordDetail}>
                {t('customers.phone')}: {conflict.existingRecord.phone}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.comparisonColumn}>
          <Text style={styles.comparisonTitle}>
            {t('dataImport.importedRecord')}
          </Text>
          <View style={styles.recordCard}>
            <Text style={styles.recordName}>{conflict.record.name}</Text>
            {conflict.record.price && (
              <Text style={styles.recordDetail}>
                {t('products.price')}: {conflict.record.price}
              </Text>
            )}
            {conflict.record.phone && (
              <Text style={styles.recordDetail}>
                {t('customers.phone')}: {conflict.record.phone}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <AlertTriangle size={24} color="#F59E0B" />
              <Text style={styles.title}>
                {t('dataImport.conflictsDetected')}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Conflicts Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              {conflicts.length} {t('dataImport.conflictsFound')}
            </Text>
          </View>

          {/* Conflicts List */}
          <ScrollView
            style={styles.conflictsList}
            showsVerticalScrollIndicator={false}
          >
            {conflicts.slice(0, 5).map((conflict, index) => {
              const IconComponent = getConflictTypeIcon(conflict.type);
              const color = getConflictTypeColor(conflict.type);

              return (
                <View key={index} style={styles.conflictItem}>
                  <View style={styles.conflictHeader}>
                    <IconComponent size={16} color={color} />
                    <Text style={[styles.conflictType, { color }]}>
                      {conflict.type.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.conflictMessage}>{conflict.message}</Text>

                  {renderConflictComparison(conflict)}
                </View>
              );
            })}

            {conflicts.length > 5 && (
              <View style={styles.moreConflictsContainer}>
                <Text style={styles.moreConflictsText}>
                  {t('dataImport.andMoreConflicts', {
                    count: conflicts.length - 5,
                  })}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Resolution Options */}
          <View style={styles.resolutionContainer}>
            <Text style={styles.resolutionTitle}>
              {t('dataImport.chooseResolution')}
            </Text>

            <View style={styles.resolutionOptions}>
              <TouchableOpacity
                style={[
                  styles.resolutionOption,
                  selectedResolution === 'update' &&
                    styles.resolutionOptionSelected,
                ]}
                onPress={() => setSelectedResolution('update')}
              >
                <Check
                  size={20}
                  color={
                    selectedResolution === 'update' ? '#FFFFFF' : '#3B82F6'
                  }
                />
                <View style={styles.resolutionContent}>
                  <Text
                    style={[
                      styles.resolutionOptionTitle,
                      selectedResolution === 'update' &&
                        styles.resolutionOptionTitleSelected,
                    ]}
                  >
                    {t('dataImport.updateExisting')}
                  </Text>
                  <Text
                    style={[
                      styles.resolutionOptionDesc,
                      selectedResolution === 'update' &&
                        styles.resolutionOptionDescSelected,
                    ]}
                  >
                    {t('dataImport.updateExistingDesc')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resolutionOption,
                  selectedResolution === 'skip' &&
                    styles.resolutionOptionSelected,
                ]}
                onPress={() => setSelectedResolution('skip')}
              >
                <SkipForward
                  size={20}
                  color={selectedResolution === 'skip' ? '#FFFFFF' : '#F59E0B'}
                />
                <View style={styles.resolutionContent}>
                  <Text
                    style={[
                      styles.resolutionOptionTitle,
                      selectedResolution === 'skip' &&
                        styles.resolutionOptionTitleSelected,
                    ]}
                  >
                    {t('dataImport.skipConflicts')}
                  </Text>
                  <Text
                    style={[
                      styles.resolutionOptionDesc,
                      selectedResolution === 'skip' &&
                        styles.resolutionOptionDescSelected,
                    ]}
                  >
                    {t('dataImport.skipConflictsDesc')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.resolutionOption,
                  selectedResolution === 'create_new' &&
                    styles.resolutionOptionSelected,
                ]}
                onPress={() => setSelectedResolution('create_new')}
              >
                <Plus
                  size={20}
                  color={
                    selectedResolution === 'create_new' ? '#FFFFFF' : '#10B981'
                  }
                />
                <View style={styles.resolutionContent}>
                  <Text
                    style={[
                      styles.resolutionOptionTitle,
                      selectedResolution === 'create_new' &&
                        styles.resolutionOptionTitleSelected,
                    ]}
                  >
                    {t('dataImport.createNew')}
                  </Text>
                  <Text
                    style={[
                      styles.resolutionOptionDesc,
                      selectedResolution === 'create_new' &&
                        styles.resolutionOptionDescSelected,
                    ]}
                  >
                    {t('dataImport.createNewDesc')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Apply to All Option */}
            <TouchableOpacity
              style={styles.applyToAllContainer}
              onPress={() => setApplyToAll(!applyToAll)}
            >
              <View
                style={[styles.checkbox, applyToAll && styles.checkboxSelected]}
              >
                {applyToAll && <Check size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.applyToAllText}>
                {t('dataImport.applyToAllConflicts')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleResolve}
            >
              <Text style={styles.resolveButtonText}>
                {t('dataImport.resolveConflicts')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    maxWidth: '95%',
    maxHeight: '90%',
    width: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  summaryContainer: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#7F1D1D',
    textAlign: 'center',
  },
  conflictsList: {
    maxHeight: 200,
    padding: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  conflictItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conflictType: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  conflictMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginBottom: 8,
  },
  comparisonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonColumn: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 4,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recordName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  recordDetail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  moreConflictsContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  moreConflictsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  resolutionContainer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resolutionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  resolutionOptions: {
    gap: 8,
    marginBottom: 16,
  },
  resolutionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  resolutionOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  resolutionContent: {
    marginLeft: 12,
    flex: 1,
  },
  resolutionOptionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  resolutionOptionTitleSelected: {
    color: '#FFFFFF',
  },
  resolutionOptionDesc: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  resolutionOptionDescSelected: {
    color: '#E5E7EB',
  },
  applyToAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  applyToAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  resolveButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  resolveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
