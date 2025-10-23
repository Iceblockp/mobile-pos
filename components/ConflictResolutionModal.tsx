import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  X,
  AlertTriangle,
  Check,
  Plus,
  SkipForward,
  Key,
  User,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import {
  DataConflict,
  ConflictResolution,
  ConflictSummary,
} from '@/services/dataImportService';
import { isValidUUID } from '@/utils/uuid';

interface ConflictResolutionModalProps {
  visible: boolean;
  conflicts: DataConflict[];
  conflictSummary?: ConflictSummary;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal: React.FC<
  ConflictResolutionModalProps
> = ({ visible, conflicts, conflictSummary, onResolve, onCancel }) => {
  const { t } = useTranslation();
  const [selectedResolution, setSelectedResolution] = useState<
    'update' | 'skip' | 'create_new'
  >('update');
  const [applyToAll, setApplyToAll] = useState(false);
  const [showAllConflicts, setShowAllConflicts] = useState(false);
  const [selectedDataType, setSelectedDataType] = useState<string | null>(null);
  const [showGroupedView, setShowGroupedView] = useState(true);

  const handleResolve = () => {
    const resolution: ConflictResolution = {
      action: selectedResolution,
      applyToAll,
    };
    onResolve(resolution);
  };

  const renderConflictStatistics = () => {
    if (!conflictSummary) return null;

    const totalConflicts = conflictSummary.totalConflicts;
    const dataTypesWithConflicts = Object.entries(
      conflictSummary.conflictStatistics
    ).filter(([_, stats]) => stats.total > 0);

    return (
      <View style={styles.statisticsContainer}>
        <View style={styles.statisticsHeader}>
          <Text style={styles.statisticsTitle} weight="medium">
            Conflict Summary
          </Text>
          <View style={styles.totalConflictsBadge}>
            <Text style={styles.totalConflictsText} weight="medium">
              {totalConflicts} total conflicts
            </Text>
          </View>
        </View>

        <Text style={styles.statisticsSubtitle}>
          Tap a data type to filter conflicts below
        </Text>

        <View style={styles.statisticsGrid}>
          {dataTypesWithConflicts.map(([dataType, stats]) => {
            const isSelected = selectedDataType === dataType;

            return (
              <TouchableOpacity
                key={dataType}
                style={[
                  styles.statisticsCard,
                  isSelected && styles.statisticsCardSelected,
                ]}
                onPress={() =>
                  setSelectedDataType(isSelected ? null : dataType)
                }
              >
                <View style={styles.statisticsCardHeader}>
                  <Text style={styles.statisticsDataType} weight="medium">
                    {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
                  </Text>
                  <View
                    style={[
                      styles.conflictCountBadge,
                      isSelected && styles.conflictCountBadgeSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.conflictCountText,
                        isSelected && styles.conflictCountTextSelected,
                      ]}
                      weight="bold"
                    >
                      {stats.total}
                    </Text>
                  </View>
                </View>

                <View style={styles.statisticsBreakdown}>
                  {stats.duplicate > 0 && (
                    <View style={styles.statisticsDetailRow}>
                      <View
                        style={[
                          styles.conflictTypeDot,
                          { backgroundColor: '#F59E0B' },
                        ]}
                      />
                      <Text
                        style={[styles.statisticsDetail, { color: '#F59E0B' }]}
                      >
                        {stats.duplicate} duplicates
                      </Text>
                    </View>
                  )}
                  {stats.reference_missing > 0 && (
                    <View style={styles.statisticsDetailRow}>
                      <View
                        style={[
                          styles.conflictTypeDot,
                          { backgroundColor: '#EF4444' },
                        ]}
                      />
                      <Text
                        style={[styles.statisticsDetail, { color: '#EF4444' }]}
                      >
                        {stats.reference_missing} missing refs
                      </Text>
                    </View>
                  )}
                  {stats.validation_failed > 0 && (
                    <View style={styles.statisticsDetailRow}>
                      <View
                        style={[
                          styles.conflictTypeDot,
                          { backgroundColor: '#8B5CF6' },
                        ]}
                      />
                      <Text
                        style={[styles.statisticsDetail, { color: '#8B5CF6' }]}
                      >
                        {stats.validation_failed} validation errors
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderGroupedConflicts = () => {
    if (!conflictSummary || !showGroupedView) return null;

    const dataTypesToShow = selectedDataType
      ? [selectedDataType]
      : Object.keys(conflictSummary.conflictsByType).filter(
          (dataType) => conflictSummary.conflictsByType[dataType].length > 0
        );

    return (
      <View style={styles.groupedConflictsContainer}>
        {dataTypesToShow.map((dataType) => {
          const typeConflicts = conflictSummary.conflictsByType[dataType];
          if (typeConflicts.length === 0) return null;

          return (
            <View key={dataType} style={styles.dataTypeGroup}>
              <View style={styles.dataTypeHeader}>
                <Text style={styles.dataTypeTitle} weight="medium">
                  {dataType.charAt(0).toUpperCase() + dataType.slice(1)}(
                  {typeConflicts.length})
                </Text>
              </View>
              {typeConflicts
                .slice(0, showAllConflicts ? undefined : 3)
                .map((conflict, index) => (
                  <View
                    key={`${dataType}-${index}`}
                    style={styles.conflictItem}
                  >
                    <View style={styles.conflictHeader}>
                      <View style={styles.conflictTypeIndicator}>
                        {React.createElement(
                          getConflictTypeIcon(conflict.type),
                          {
                            size: 16,
                            color: getConflictTypeColor(conflict.type),
                          }
                        )}
                      </View>
                      <Text
                        style={[
                          styles.conflictType,
                          { color: getConflictTypeColor(conflict.type) },
                        ]}
                        weight="medium"
                      >
                        {conflict.type.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.conflictMessage}>
                      {conflict.message}
                    </Text>
                    {renderConflictComparison(conflict)}
                  </View>
                ))}
              {typeConflicts.length > 3 && !showAllConflicts && (
                <Text style={styles.moreConflictsInType}>
                  {t('dataImport.andMoreInType', {
                    count: typeConflicts.length - 3,
                  })}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
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

  const renderUUIDInfo = (record: any) => {
    const hasValidUUID = record?.id && isValidUUID(record.id);

    return (
      <View style={styles.uuidContainer}>
        <View style={styles.uuidHeader}>
          <Key size={12} color={hasValidUUID ? '#10B981' : '#6B7280'} />
          <Text
            style={[
              styles.uuidLabel,
              { color: hasValidUUID ? '#10B981' : '#6B7280' },
            ]}
            weight="medium"
          >
            UUID:
          </Text>
        </View>
        <Text
          style={[
            styles.uuidValue,
            { color: hasValidUUID ? '#374151' : '#9CA3AF' },
          ]}
        >
          {hasValidUUID ? record.id : t('dataImport.noUUID')}
        </Text>
      </View>
    );
  };

  const renderMatchingCriteria = (conflict: DataConflict) => {
    const getMatchingIcon = () => {
      switch (conflict.matchedBy) {
        case 'uuid':
          return <Key size={14} color="#10B981" />;
        case 'name':
          return <User size={14} color="#F59E0B" />;
        default:
          return <AlertTriangle size={14} color="#6B7280" />;
      }
    };

    const getMatchingColor = () => {
      switch (conflict.matchedBy) {
        case 'uuid':
          return '#10B981';
        case 'name':
          return '#F59E0B';
        default:
          return '#6B7280';
      }
    };

    const getMatchingText = () => {
      switch (conflict.matchedBy) {
        case 'uuid':
          return t('dataImport.matchedByUUID');
        case 'name':
          return t('dataImport.matchedByName');
        default:
          return t('dataImport.matchedByOther');
      }
    };

    return (
      <View
        style={[styles.matchingCriteria, { borderColor: getMatchingColor() }]}
      >
        {getMatchingIcon()}
        <Text
          style={[styles.matchingText, { color: getMatchingColor() }]}
          weight="medium"
        >
          {getMatchingText()}
        </Text>
      </View>
    );
  };

  const renderConflictComparison = (conflict: DataConflict) => {
    if (conflict.type !== 'duplicate' || !conflict.existingRecord) {
      return null;
    }

    const renderRecordDetails = (record: any, isExisting: boolean) => {
      const details = [];

      // Common fields for all record types
      if (record.name) {
        details.push({ label: 'Name', value: record.name, key: 'name' });
      }

      // Product-specific fields
      if (record.price !== undefined) {
        details.push({
          label: 'Price',
          value: `${record.price} MMK`,
          key: 'price',
        });
      }
      if (record.cost !== undefined) {
        details.push({
          label: 'Cost',
          value: `${record.cost} MMK`,
          key: 'cost',
        });
      }
      if (record.barcode) {
        details.push({
          label: 'Barcode',
          value: record.barcode,
          key: 'barcode',
        });
      }
      if (record.stock !== undefined) {
        details.push({
          label: 'Stock',
          value: record.stock.toString(),
          key: 'stock',
        });
      }

      // Customer-specific fields
      if (record.phone) {
        details.push({ label: 'Phone', value: record.phone, key: 'phone' });
      }
      if (record.email) {
        details.push({ label: 'Email', value: record.email, key: 'email' });
      }
      if (record.address) {
        details.push({
          label: 'Address',
          value: record.address,
          key: 'address',
        });
      }

      // Expense-specific fields
      if (record.amount !== undefined) {
        details.push({
          label: 'Amount',
          value: `${record.amount} MMK`,
          key: 'amount',
        });
      }
      if (record.description) {
        details.push({
          label: 'Description',
          value: record.description,
          key: 'description',
        });
      }

      // Date fields
      if (record.createdAt) {
        const date = new Date(record.createdAt).toLocaleDateString();
        details.push({ label: 'Created', value: date, key: 'createdAt' });
      }
      if (record.updatedAt) {
        const date = new Date(record.updatedAt).toLocaleDateString();
        details.push({ label: 'Updated', value: date, key: 'updatedAt' });
      }

      return details;
    };

    const existingDetails = renderRecordDetails(conflict.existingRecord, true);
    const importedDetails = renderRecordDetails(conflict.record, false);

    return (
      <View style={styles.comparisonContainer}>
        {/* Matching Criteria Indicator */}
        {renderMatchingCriteria(conflict)}

        <View style={styles.recordsComparison}>
          <View style={styles.comparisonColumn}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle} weight="medium">
                Existing Record
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: '#DC2626' }]}
                  weight="medium"
                >
                  Current
                </Text>
              </View>
            </View>
            <View style={[styles.recordCard, { borderColor: '#FECACA' }]}>
              <Text style={styles.recordName} weight="medium">
                {conflict.existingRecord.name || 'Unnamed Record'}
              </Text>

              {/* UUID Information for existing record */}
              {renderUUIDInfo(conflict.existingRecord)}

              {/* Detailed record information */}
              <View style={styles.recordDetailsContainer}>
                {existingDetails.map((detail, index) => (
                  <View key={detail.key} style={styles.recordDetailRow}>
                    <Text style={styles.recordDetailLabel} weight="medium">
                      {detail.label}:
                    </Text>
                    <Text style={styles.recordDetailValue}>{detail.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.comparisonColumn}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle} weight="medium">
                Import Data
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: '#2563EB' }]}
                  weight="medium"
                >
                  New
                </Text>
              </View>
            </View>
            <View style={[styles.recordCard, { borderColor: '#BFDBFE' }]}>
              <Text style={styles.recordName} weight="medium">
                {conflict.record.name || 'Unnamed Record'}
              </Text>

              {/* UUID Information for imported record */}
              {renderUUIDInfo(conflict.record)}

              {/* Detailed record information */}
              <View style={styles.recordDetailsContainer}>
                {importedDetails.map((detail, index) => {
                  const existingDetail = existingDetails.find(
                    (d) => d.key === detail.key
                  );
                  const isDifferent =
                    existingDetail && existingDetail.value !== detail.value;

                  return (
                    <View key={detail.key} style={styles.recordDetailRow}>
                      <Text style={styles.recordDetailLabel} weight="medium">
                        {detail.label}:
                      </Text>
                      <Text
                        style={[
                          styles.recordDetailValue,
                          isDifferent && styles.recordDetailValueChanged,
                        ]}
                        weight={isDifferent ? 'medium' : undefined}
                      >
                        {detail.value}
                      </Text>
                      {isDifferent && (
                        <View style={styles.changeIndicator}>
                          <Text
                            style={styles.changeIndicatorText}
                            weight="bold"
                          >
                            •
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <AlertTriangle size={24} color="#F59E0B" />
            <Text style={styles.title} weight="medium">
              {t('dataImport.conflictsDetected')}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Conflicts Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText} weight="medium">
            {conflicts.length} {t('dataImport.conflictsFound')}
          </Text>
          {conflictSummary && (
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.viewToggle,
                  showGroupedView && styles.viewToggleActive,
                ]}
                onPress={() => setShowGroupedView(true)}
              >
                <Text
                  style={[
                    styles.viewToggleText,
                    showGroupedView && styles.viewToggleTextActive,
                  ]}
                  weight="medium"
                >
                  {t('dataImport.groupedView')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewToggle,
                  !showGroupedView && styles.viewToggleActive,
                ]}
                onPress={() => setShowGroupedView(false)}
              >
                <Text
                  style={[
                    styles.viewToggleText,
                    !showGroupedView && styles.viewToggleTextActive,
                  ]}
                  weight="medium"
                >
                  {t('dataImport.listView')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Conflict Statistics */}

        {/* Conflicts List */}
        <ScrollView
          style={styles.conflictsList}
          showsVerticalScrollIndicator={false}
        >
          {conflictSummary && showGroupedView && renderConflictStatistics()}
          {showGroupedView ? (
            renderGroupedConflicts()
          ) : (
            <>
              {(showAllConflicts ? conflicts : conflicts.slice(0, 5)).map(
                (conflict, index) => {
                  const IconComponent = getConflictTypeIcon(conflict.type);
                  const color = getConflictTypeColor(conflict.type);

                  return (
                    <View key={index} style={styles.conflictItem}>
                      <View style={styles.conflictHeader}>
                        <View style={styles.conflictTypeIndicator}>
                          <IconComponent size={16} color={color} />
                        </View>
                        <Text style={[styles.conflictType, { color }]}>
                          {conflict.type.replace('_', ' ').toUpperCase()}
                        </Text>
                        <Text style={styles.conflictDataType}>
                          ({conflict.recordType})
                        </Text>
                      </View>

                      <Text style={styles.conflictMessage}>
                        {conflict.message}
                      </Text>

                      {renderConflictComparison(conflict)}
                    </View>
                  );
                }
              )}

              {conflicts.length > 5 && (
                <View style={styles.seeMoreContainer}>
                  {!showAllConflicts && (
                    <Text style={styles.moreConflictsText}>
                      {t('dataImport.andMoreConflicts', {
                        count: conflicts.length - 5,
                      })}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => setShowAllConflicts(!showAllConflicts)}
                  >
                    <Text style={styles.seeMoreButtonText} weight="medium">
                      {showAllConflicts
                        ? t('dataImport.seeLess')
                        : t('dataImport.seeMore')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Resolution Options */}
        <View style={styles.resolutionContainer}>
          <Text style={styles.resolutionTitle} weight="medium">
            {t('dataImport.chooseResolution')}
          </Text>

          <View style={styles.resolutionOptions}>
            <TouchableOpacity
              style={[
                styles.resolutionOption,
                selectedResolution === 'update' &&
                  styles.resolutionOptionSelected,
                { borderColor: '#3B82F6' },
              ]}
              onPress={() => setSelectedResolution('update')}
            >
              {/* <Check
                size={16}
                color={selectedResolution === 'update' ? '#FFFFFF' : '#3B82F6'}
              /> */}
              <View style={styles.resolutionContent}>
                <Text
                  style={[
                    styles.resolutionOptionTitle,
                    selectedResolution === 'update' &&
                      styles.resolutionOptionTitleSelected,
                  ]}
                  weight="medium"
                >
                  Use Import Data
                </Text>
                {/* <Text
                  style={[
                    styles.resolutionOptionDesc,
                    selectedResolution === 'update' &&
                      styles.resolutionOptionDescSelected,
                  ]}
                >
                  Replace existing records
                </Text> */}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resolutionOption,
                selectedResolution === 'skip' &&
                  styles.resolutionOptionSelected,
                { borderColor: '#F59E0B' },
              ]}
              onPress={() => setSelectedResolution('skip')}
            >
              {/* <SkipForward
                size={16}
                color={selectedResolution === 'skip' ? '#FFFFFF' : '#F59E0B'}
              /> */}
              <View style={styles.resolutionContent}>
                <Text
                  style={[
                    styles.resolutionOptionTitle,
                    selectedResolution === 'skip' &&
                      styles.resolutionOptionTitleSelected,
                  ]}
                  weight="medium"
                >
                  Keep Existing
                </Text>
                {/* <Text
                  style={[
                    styles.resolutionOptionDesc,
                    selectedResolution === 'skip' &&
                      styles.resolutionOptionDescSelected,
                  ]}
                >
                  Keep existing records
                </Text> */}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.resolutionOption,
                selectedResolution === 'create_new' &&
                  styles.resolutionOptionSelected,
                { borderColor: '#10B981' },
              ]}
              onPress={() => setSelectedResolution('create_new')}
            >
              {/* <Plus
                size={16}
                color={
                  selectedResolution === 'create_new' ? '#FFFFFF' : '#10B981'
                }
              /> */}
              <View style={styles.resolutionContent}>
                <Text
                  style={[
                    styles.resolutionOptionTitle,
                    selectedResolution === 'create_new' &&
                      styles.resolutionOptionTitleSelected,
                  ]}
                  weight="medium"
                >
                  Skip
                </Text>
                {/* <Text
                  style={[
                    styles.resolutionOptionDesc,
                    selectedResolution === 'create_new' &&
                      styles.resolutionOptionDescSelected,
                  ]}
                >
                  Skip these conflicts
                </Text> */}
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
            <X size={16} color="#6B7280" />
            <Text style={styles.cancelButtonText} weight="medium">
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.resolveButton,
              selectedResolution === 'update' && {
                backgroundColor: '#3B82F6',
              },
              selectedResolution === 'skip' && { backgroundColor: '#F59E0B' },
              selectedResolution === 'create_new' && {
                backgroundColor: '#10B981',
              },
            ]}
            onPress={handleResolve}
          >
            {selectedResolution === 'update' && (
              <Check size={16} color="#FFFFFF" />
            )}
            {selectedResolution === 'skip' && (
              <SkipForward size={16} color="#FFFFFF" />
            )}
            {selectedResolution === 'create_new' && (
              <Plus size={16} color="#FFFFFF" />
            )}
            <Text style={styles.resolveButtonText} weight="medium">
              {selectedResolution === 'update' && 'Use Import Data'}
              {selectedResolution === 'skip' && 'Keep Existing'}
              {selectedResolution === 'create_new' && 'Skip Conflicts'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    color: '#111827',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  summaryContainer: {
    padding: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 14,
    color: '#7F1D1D',
    textAlign: 'center',
  },
  conflictsList: {
    flex: 1,
    padding: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  conflictItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
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
    marginLeft: 6,
  },
  conflictMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  comparisonContainer: {
    marginTop: 8,
  },
  matchingCriteria: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  matchingText: {
    fontSize: 11,
    marginLeft: 4,
  },
  recordsComparison: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonColumn: {
    flex: 1,
  },
  comparisonTitle: {
    fontSize: 12,
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
    color: '#111827',
    marginBottom: 6,
  },
  recordDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  uuidContainer: {
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  uuidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  uuidLabel: {
    fontSize: 10,
    marginLeft: 4,
  },
  uuidValue: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  seeMoreContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  moreConflictsText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  seeMoreButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  seeMoreButtonText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  resolutionContainer: {
    padding: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resolutionTitle: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  resolutionOptions: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  resolutionOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 60,
    justifyContent: 'center',
  },
  resolutionOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  resolutionContent: {
    marginTop: 4,
    alignItems: 'center',
  },
  resolutionOptionTitle: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'center',
    marginBottom: 2,
  },
  resolutionOptionTitleSelected: {
    color: '#FFFFFF',
  },
  resolutionOptionDesc: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  resolutionOptionDescSelected: {
    color: '#E5E7EB',
  },
  applyToAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
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
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 4,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resolveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    gap: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resolveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  // Enhanced conflict display styles
  viewToggleContainer: {
    flexDirection: 'row',
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 2,
  },
  viewToggle: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  viewToggleActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewToggleText: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewToggleTextActive: {
    color: '#374151',
  },
  statisticsContainer: {
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statisticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statisticsTitle: {
    fontSize: 14,
    color: '#374151',
  },
  totalConflictsBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  totalConflictsText: {
    fontSize: 11,
    color: '#DC2626',
  },
  statisticsSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  statisticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statisticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 120,
    flex: 1,
  },
  statisticsCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statisticsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statisticsDataType: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  conflictCountBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  conflictCountBadgeSelected: {
    backgroundColor: '#3B82F6',
  },
  conflictCountText: {
    fontSize: 11,
    color: '#374151',
  },
  conflictCountTextSelected: {
    color: '#FFFFFF',
  },
  statisticsBreakdown: {
    gap: 4,
  },
  statisticsDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  conflictTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statisticsDetail: {
    fontSize: 10,
    flex: 1,
  },
  groupedConflictsContainer: {
    gap: 16,
  },
  dataTypeGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  dataTypeHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dataTypeTitle: {
    fontSize: 14,
    color: '#374151',
  },
  conflictTypeIndicator: {
    marginRight: 6,
  },
  conflictDataType: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 'auto',
  },
  moreConflictsInType: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  // Enhanced comparison styles
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
  },
  recordDetailsContainer: {
    marginTop: 8,
    gap: 4,
  },
  recordDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  recordDetailLabel: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  recordDetailValue: {
    fontSize: 11,
    color: '#374151',
    flex: 2,
    textAlign: 'right',
  },
  recordDetailValueChanged: {
    color: '#2563EB',
  },
  changeIndicator: {
    marginLeft: 4,
    width: 8,
    alignItems: 'center',
  },
  changeIndicatorText: {
    fontSize: 12,
    color: '#2563EB',
  },
});
