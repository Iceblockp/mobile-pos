import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  MigrationStatus,
  MigrationReport,
} from '@/services/uuidMigrationService';

interface MigrationContextType {
  migrationStatus: MigrationStatus | null;
  migrationReport: MigrationReport | null;
  isMigrationInProgress: boolean;
  updateMigrationStatus: (status: MigrationStatus) => void;
  setMigrationReport: (report: MigrationReport) => void;
  setMigrationInProgress: (inProgress: boolean) => void;
  clearMigrationData: () => void;
}

const MigrationContext = createContext<MigrationContextType>({
  migrationStatus: null,
  migrationReport: null,
  isMigrationInProgress: false,
  updateMigrationStatus: () => {},
  setMigrationReport: () => {},
  setMigrationInProgress: () => {},
  clearMigrationData: () => {},
});

export const useMigration = () => {
  const context = useContext(MigrationContext);
  if (!context) {
    throw new Error('useMigration must be used within a MigrationProvider');
  }
  return context;
};

export const MigrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatus | null>(null);
  const [migrationReport, setMigrationReport] =
    useState<MigrationReport | null>(null);
  const [isMigrationInProgress, setIsMigrationInProgress] = useState(false);

  const updateMigrationStatus = useCallback((status: MigrationStatus) => {
    setMigrationStatus(status);
  }, []);

  const setMigrationReportCallback = useCallback((report: MigrationReport) => {
    setMigrationReport(report);
  }, []);

  const setMigrationInProgress = useCallback((inProgress: boolean) => {
    setIsMigrationInProgress(inProgress);
  }, []);

  const clearMigrationData = useCallback(() => {
    setMigrationStatus(null);
    setMigrationReport(null);
    setIsMigrationInProgress(false);
  }, []);

  return (
    <MigrationContext.Provider
      value={{
        migrationStatus,
        migrationReport,
        isMigrationInProgress,
        updateMigrationStatus,
        setMigrationReport: setMigrationReportCallback,
        setMigrationInProgress,
        clearMigrationData,
      }}
    >
      {children}
    </MigrationContext.Provider>
  );
};
