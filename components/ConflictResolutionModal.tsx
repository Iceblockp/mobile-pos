import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
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

    return (
      <View style={styles.statisticsContainer}>
        <Text style={styles.statisticsTitle}>
          {t('dataImport.conflictStatistics')}
        </Text>
        <View style={styles.statisticsGrid}>
          {Object.entries(conflictSummary.conflictStatistics).map(
            ([dataType, stats]) => {
              if (stats.total === 0) return null;

              return (
                <TouchableOpacity
                  key={dataType}
                  style={[
                    styles.statisticsCard,
                    selectedDataType === dataType &&
                      styles.statisticsCardSelected,
                  ]}
                  onPress={() =>
                    setSelectedDataType(
                      selectedDataType === dataType ? null : dataType
                    )
                  }
                >
                  <Text style={styles.statisticsDataType}>
                    {dataType.charAt(0).toUpperCase() + dataType.slice(1)}
                  </Text>
                  <Text style={styles.statisticsTotal}>
                    {stats.total} {t('dataImport.conflicts')}
                  </Text>
                  <View style={styles.statisticsBreakdown}>
                    {stats.duplicate > 0 && (
                      <Text
                        style={[styles.statisticsDetail, { color: '#F59E0B' }]}
                      >
                        {stats.duplicate} {t('dataImport.duplicates')}
                      </Text>
                    )}
                    {stats.reference_missing > 0 && (
                      <Text
                        style={[styles.statisticsDetail, { color: '#EF4444' }]}
                      >
                        {stats.reference_missing}{' '}
                        {t('dataImport.missingReferences')}
                      </Text>
                    )}
                    {stats.validation_failed > 0 && (
                      <Text
                        style={[styles.statisticsDetail, { color: '#8B5CF6' }]}
                      >
                        {stats.validation_failed}{' '}
                        {t('dataImport.validationErrors')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }
          )}
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
                <Text style={styles.dataTypeTitle}>
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
        <Text style={[styles.matchingText, { color: getMatchingColor() }]}>
          {getMatchingText()}
        </Text>
      </View>
    );
  };

  const renderConflictComparison = (conflict: DataConflict) => {
    if (conflict.type !== 'duplicate' || !conflict.existingRecord) {
      return null;
    }

    return (
      <View style={styles.comparisonContainer}>
        {/* Matching Criteria Indicator */}
        {renderMatchingCriteria(conflict)}

        <View style={styles.recordsComparison}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonTitle}>
              {t('dataImport.existingRecord')}
            </Text>
            <View style={styles.recordCard}>
              <Text style={styles.recordName}>
                {conflict.existingRecord.name || t('dataImport.unnamedRecord')}
              </Text>

              {/* UUID Information for existing record */}
              {renderUUIDInfo(conflict.existingRecord)}

              {/* Other record details */}
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
              {conflict.existingRecord.barcode && (
                <Text style={styles.recordDetail}>
                  {t('products.barcode')}: {conflict.existingRecord.barcode}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonTitle}>
              {t('dataImport.importedRecord')}
            </Text>
            <View style={styles.recordCard}>
              <Text style={styles.recordName}>
                {conflict.record.name || t('dataImport.unnamedRecord')}
              </Text>

              {/* UUID Information for imported record */}
              {renderUUIDInfo(conflict.record)}

              {/* Other record details */}
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
              {conflict.record.barcode && (
                <Text style={styles.recordDetail}>
                  {t('products.barcode')}: {conflict.record.barcode}
                </Text>
              )}
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
                  >
                    {t('dataImport.listView')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Conflict Statistics */}
          {conflictSummary && showGroupedView && renderConflictStatistics()}

          {/* Conflicts List */}
          <ScrollView
            style={styles.conflictsList}
            showsVerticalScrollIndicator={false}
          >
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
                      <Text style={styles.seeMoreButtonText}>
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
    fontFamily: 'Inter-SemiBold',
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
    marginBottom: 6,
  },
  recordDetail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  uuidValue: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  seeMoreContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  moreConflictsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
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
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  viewToggleTextActive: {
    color: '#374151',
  },
  statisticsContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statisticsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
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
  },
  statisticsDataType: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 4,
  },
  statisticsTotal: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  statisticsBreakdown: {
    gap: 2,
  },
  statisticsDetail: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  conflictTypeIndicator: {
    marginRight: 6,
  },
  conflictDataType: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 'auto',
  },
  moreConflictsInType: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
});
