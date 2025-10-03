import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDatabase, DatabaseService } from '@/services/database';
import { useMigration } from './MigrationContext';
import { MigrationStatus } from '@/services/uuidMigrationService';

interface DatabaseContextType {
  db: DatabaseService | null;
  isReady: boolean;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
  refreshTrigger: 0,
  triggerRefresh: () => {},
});

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [db, setDb] = useState<DatabaseService | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { updateMigrationStatus, setMigrationInProgress } = useMigration();

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        setMigrationInProgress(true);

        const database = await initializeDatabase((status: MigrationStatus) => {
          updateMigrationStatus(status);
        });

        setDb(database);
        setIsReady(true);
        setMigrationInProgress(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setMigrationInProgress(false);
      }
    };

    setupDatabase();
  }, [updateMigrationStatus, setMigrationInProgress]);

  return (
    <DatabaseContext.Provider
      value={{ db, isReady, refreshTrigger, triggerRefresh }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};
