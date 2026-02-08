import React, { createContext, useContext, useState, ReactNode } from 'react';

/**
 * Drawer context type definition
 * Provides methods to control drawer state (open/closed)
 */
interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

/**
 * Create the drawer context
 * Initially undefined to enforce provider usage
 */
const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

/**
 * DrawerProvider component props
 */
interface DrawerProviderProps {
  children: ReactNode;
}

/**
 * DrawerProvider component
 * Wraps the application to provide drawer state management
 *
 * @param children - Child components that need access to drawer state
 */
export function DrawerProvider({ children }: DrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const drawerContext: DrawerContextType = {
    isOpen,
    openDrawer: () => setIsOpen(true),
    closeDrawer: () => setIsOpen(false),
    toggleDrawer: () => setIsOpen(!isOpen),
  };

  return (
    <DrawerContext.Provider value={drawerContext}>
      {children}
    </DrawerContext.Provider>
  );
}

/**
 * Custom hook for accessing drawer state
 * Must be used within a DrawerProvider
 *
 * @throws Error if used outside of DrawerProvider
 * @returns DrawerContextType with drawer state and control methods
 */
export function useDrawer(): DrawerContextType {
  const context = useContext(DrawerContext);

  if (!context) {
    throw new Error(
      'useDrawer must be used within a DrawerProvider. ' +
        'Wrap your component tree with <DrawerProvider>.',
    );
  }

  return context;
}
