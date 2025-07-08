import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDatabase, DatabaseService } from '@/services/database';

interface DatabaseContextType {
  db: DatabaseService | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
});

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseService | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        const database = await initializeDatabase();
        setDb(database);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    setupDatabase();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
};